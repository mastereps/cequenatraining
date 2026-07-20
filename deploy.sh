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

main() {
  require_cmd git
  require_cmd npm
  require_cmd pm2

  if [[ ! -f "$SERVER_DIR/.env" ]]; then
    echo "Missing $SERVER_DIR/.env. Create it from $SERVER_DIR/.env.example before deploy." >&2
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
