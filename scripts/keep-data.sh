#!/usr/bin/env bash
# Copy the live database, uploads, and env aside so a code update can restore them.
set -euo pipefail

APP=/var/www/cop31
KEEP=/var/www/cop31-keep
cd "$APP"

save() {
  if command -v pm2 >/dev/null 2>&1 && pm2 describe cop31 >/dev/null 2>&1; then
    pm2 stop cop31 || true
  fi
  mkdir -p "$KEEP/prisma" "$KEEP/markers"
  if [ -d public/uploads ] && [ -n "$(ls -A public/uploads 2>/dev/null || true)" ]; then
    rm -rf "$KEEP/uploads"
    mkdir -p "$KEEP/uploads"
    cp -a public/uploads/. "$KEEP/uploads/"
  fi
  for name in dev.db dev.db-journal dev.db-wal dev.db-shm; do
    if [ -f "prisma/$name" ]; then
      cp -a "prisma/$name" "$KEEP/prisma/$name"
    fi
  done
  if [ -f .env ]; then
    cp -a .env "$KEEP/.env"
  fi
  for name in .pavilion-program-applied .stands-off-agenda .session-calendar-only .hatira-shots-cleared .mail-cop31-tr; do
    if [ -f "$name" ]; then
      cp -a "$name" "$KEEP/markers/$name"
    fi
  done
  echo KEEP_SAVED
}

restore() {
  if [ -d "$KEEP/uploads" ] && [ -n "$(ls -A "$KEEP/uploads" 2>/dev/null || true)" ]; then
    mkdir -p public/uploads
    cp -a "$KEEP/uploads/." public/uploads/
  fi
  if [ -d "$KEEP/prisma" ]; then
    mkdir -p prisma
    for name in dev.db dev.db-journal dev.db-wal dev.db-shm; do
      if [ -f "$KEEP/prisma/$name" ]; then
        cp -a "$KEEP/prisma/$name" "prisma/$name"
      fi
    done
  fi
  if [ -f "$KEEP/.env" ]; then
    cp -a "$KEEP/.env" .env
  fi
  if [ -d "$KEEP/markers" ]; then
    for file in "$KEEP/markers"/.*; do
      if [ -f "$file" ]; then
        cp -a "$file" "./$(basename "$file")"
      fi
    done
  fi
  echo KEEP_RESTORED
}

case "${1:-save}" in
  save) save ;;
  restore) restore ;;
  *) echo "usage: keep-data.sh save|restore" >&2; exit 1 ;;
esac
