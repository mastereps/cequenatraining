#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$ROOT_DIR/server"
WEB_DIR="$ROOT_DIR/webinar"
APP_NAME="${PM2_APP_NAME:-webinar-api}"

log() {
  printf "\n[%s] %s\n" "$(date +"%Y-%m-%d %H:%M:%S")" "$*"
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

# Reads one key from .env without sourcing the file.
env_value() {
  sed -n "s/^$1=//p" "$SERVER_DIR/.env" | tail -n 1 | tr -d '\r'
}

# A secret left at its .env.example placeholder is public knowledge - anyone
# reading the repo could sign their own admin session cookie. Checked here, before
# the restart, so a misconfigured host aborts the deploy instead of going live.
require_real_secret() {
  local key="$1"
  local value
  value="$(env_value "$key")"

  if [[ -z "$value" || "$value" == replace-with-* || "$value" == change* ]]; then
    echo "$key in $SERVER_DIR/.env is unset or still a placeholder." >&2
    echo "Generate one with: openssl rand -hex 32" >&2
    exit 1
  fi
  if [[ "${#value}" -lt 32 ]]; then
    echo "$key in $SERVER_DIR/.env is too short (need at least 32 characters)." >&2
    exit 1
  fi
}

main() {
  require_cmd git
  require_cmd npm
  require_cmd pm2

  if [[ ! -f "$SERVER_DIR/.env" ]]; then
    echo "Missing $SERVER_DIR/.env. Create it from $SERVER_DIR/.env.example before deploy." >&2
    exit 1
  fi

  log "Checking production secrets"
  require_real_secret AUTH_SESSION_SECRET
  require_real_secret VERIFY_TOKEN_SECRET

  if [[ "$(env_value NODE_ENV)" != "production" ]]; then
    echo "NODE_ENV in $SERVER_DIR/.env must be 'production'." >&2
    echo "Without it, session cookies are sent without the Secure flag." >&2
    exit 1
  fi

  log "Pulling latest code"
  git -C "$ROOT_DIR" pull --ff-only

  log "Installing backend dependencies"
  npm --prefix "$SERVER_DIR" ci

  log "Installing frontend dependencies"
  npm --prefix "$WEB_DIR" ci

  # Before the build so a failed migration aborts while the served frontend and
  # the running backend are both still the previous version. Migrations here are
  # additive, so the old code tolerates the new schema until the restart.
  log "Applying database migrations"
  npm --prefix "$SERVER_DIR" run migrate

  log "Building frontend"
  npm --prefix "$WEB_DIR" run build

  if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
    log "Restarting PM2 app: $APP_NAME"
    pm2 restart "$APP_NAME" --update-env
  else
    log "Starting PM2 app: $APP_NAME"
    pm2 start "$SERVER_DIR/server.js" --name "$APP_NAME"
  fi

  log "Saving PM2 process list"
  pm2 save

  log "Deploy complete"
}

main "$@"
