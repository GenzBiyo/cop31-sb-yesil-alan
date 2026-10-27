#!/usr/bin/env bash
# Starts the same GitHub update the deploy workflow runs.
# No arguments. Paths are fixed so the admin button cannot pass a command.
set -euo pipefail
APP=/var/www/cop31
LOCK=/tmp/cop31-admin-update.lock
LOG=/tmp/cop31-admin-deploy.log

if [ -d "$LOCK" ]; then
  now=$(date +%s)
  touched=$(stat -c %Y "$LOCK" 2>/dev/null || echo "$now")
  if [ $((now - touched)) -gt 2700 ]; then
    rmdir "$LOCK" 2>/dev/null || true
  fi
fi

if ! mkdir "$LOCK" 2>/dev/null; then
  echo "$(date -Is) already running" >> "$LOG"
  exit 0
fi

cleanup() {
  rmdir "$LOCK" 2>/dev/null || true
}
trap cleanup EXIT

cd "$APP"
echo "$(date -Is) admin update start" >> "$LOG"
bash "$APP/scripts/deploy.sh" >> "$LOG" 2>&1
echo "$(date -Is) admin update done" >> "$LOG"
