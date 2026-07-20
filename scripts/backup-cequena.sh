#!/usr/bin/env bash
set -Eeuo pipefail

PATH="/usr/local/bin:/usr/bin:/bin"
export PATH

APP_DIR="/var/www/react_webinar"
ENV_FILE="$APP_DIR/server/.env"
UPLOADS_DIR="$APP_DIR/server/uploads"

# Connection details come from the app's own .env so the backup can never drift
# from what the server actually uses. These are the standard libpq variable
# names (PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE), so pg_dump picks them up
# without being passed any connection flags.
#
# Read, never source: .env holds values with spaces (SMTP app passwords), which
# bash would try to execute as commands. This only ever assigns strings.
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE" >&2
  exit 1
fi

read_env() {
  local key="$1" line
  line="$(grep -E "^[[:space:]]*${key}=" "$ENV_FILE" | tail -n 1 || true)"
  [[ -n "$line" ]] || return 0
  line="${line#*=}"
  line="${line%$'\r'}"
  # Strip one layer of surrounding quotes if present.
  if [[ "$line" == \"*\" || "$line" == \'*\' ]]; then
    line="${line:1:${#line}-2}"
  fi
  printf '%s' "$line"
}

PGHOST="$(read_env PGHOST)"
PGPORT="$(read_env PGPORT)"
PGUSER="$(read_env PGUSER)"
PGPASSWORD="$(read_env PGPASSWORD)"
PGDATABASE="$(read_env PGDATABASE)"
export PGHOST PGPORT PGUSER PGPASSWORD PGDATABASE

if [[ -z "$PGDATABASE" ]]; then
  echo "PGDATABASE not found in $ENV_FILE" >&2
  exit 1
fi

BACKUP_NAME="cequena_prod"
LOCAL_DIR="$HOME/backups/cequena"
REMOTE_DIR="gdrive:Cequena Backups"
LOCK_FILE="$HOME/backups/cequena.lock"

TIMESTAMP="$(date +%Y-%m-%d_%H-%M-%S)"
FILENAME="${BACKUP_NAME}_${TIMESTAMP}.dump"
TEMP_FILE="${LOCAL_DIR}/.${FILENAME}.tmp"
FINAL_FILE="${LOCAL_DIR}/${FILENAME}"
CHECKSUM_FILE="${FINAL_FILE}.sha256"

# The database dump alone cannot restore the site: CMS sections reference images
# uploaded to server/uploads, which lives outside git and outside Postgres.
UPLOADS_NAME="${BACKUP_NAME}_${TIMESTAMP}_uploads.tar.gz"
UPLOADS_TEMP="${LOCAL_DIR}/.${UPLOADS_NAME}.tmp"
UPLOADS_FILE="${LOCAL_DIR}/${UPLOADS_NAME}"
UPLOADS_CHECKSUM="${UPLOADS_FILE}.sha256"

mkdir -p "$LOCAL_DIR"
umask 077

exec 9>"$LOCK_FILE"

if ! flock -n 9; then
  echo "Another Cequena backup is already running."
  exit 1
fi

cleanup() {
  rm -f "$TEMP_FILE" "$UPLOADS_TEMP"
}

trap cleanup EXIT

echo "[$(date --iso-8601=seconds)] Starting Cequena backup."

pg_dump \
  --format=custom \
  --file="$TEMP_FILE" \
  "$PGDATABASE"

# Fails if the dump is truncated or corrupt, so a broken file is never promoted.
pg_restore --list "$TEMP_FILE" > /dev/null

mv "$TEMP_FILE" "$FINAL_FILE"

sha256sum "$FINAL_FILE" > "$CHECKSUM_FILE"

# Uploaded content images. Stored relative to server/ so a restore untars
# straight into place. An absent directory is treated as empty rather than
# failing the run - a fresh server has no uploads yet.
if [[ -d "$UPLOADS_DIR" ]]; then
  tar -czf "$UPLOADS_TEMP" -C "$APP_DIR/server" uploads
else
  echo "No uploads directory at $UPLOADS_DIR, archiving empty set."
  tar -czf "$UPLOADS_TEMP" -C "$APP_DIR/server" --files-from=/dev/null
fi

tar -tzf "$UPLOADS_TEMP" > /dev/null

mv "$UPLOADS_TEMP" "$UPLOADS_FILE"

sha256sum "$UPLOADS_FILE" > "$UPLOADS_CHECKSUM"

rclone copyto "$FINAL_FILE" "${REMOTE_DIR}/${FILENAME}"
rclone copyto "$CHECKSUM_FILE" "${REMOTE_DIR}/${FILENAME}.sha256"
rclone copyto "$UPLOADS_FILE" "${REMOTE_DIR}/${UPLOADS_NAME}"
rclone copyto "$UPLOADS_CHECKSUM" "${REMOTE_DIR}/${UPLOADS_NAME}.sha256"

rclone lsf "$REMOTE_DIR" --files-only | grep -Fx "$FILENAME" > /dev/null
rclone lsf "$REMOTE_DIR" --files-only | grep -Fx "${FILENAME}.sha256" > /dev/null
rclone lsf "$REMOTE_DIR" --files-only | grep -Fx "$UPLOADS_NAME" > /dev/null
rclone lsf "$REMOTE_DIR" --files-only | grep -Fx "${UPLOADS_NAME}.sha256" > /dev/null

find "$LOCAL_DIR" -type f -mtime +30 -delete

echo "[$(date --iso-8601=seconds)] Backup uploaded successfully: ${FILENAME} + ${UPLOADS_NAME}"
