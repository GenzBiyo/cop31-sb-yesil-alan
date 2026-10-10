#!/usr/bin/env bash
# Copy the live database, uploads, and env aside so a code update can restore them.
# The running site is left in place. SQLite is snapshotted online.
set -euo pipefail

APP=/var/www/cop31
KEEP=/var/www/cop31-keep
cd "$APP"

save() {
  mkdir -p "$KEEP/prisma" "$KEEP/markers"
  if [ -d public/uploads ] && [ -n "$(ls -A public/uploads 2>/dev/null || true)" ]; then
    rm -rf "$KEEP/uploads"
    mkdir -p "$KEEP/uploads"
    cp -a public/uploads/. "$KEEP/uploads/"
  fi
  if [ -f prisma/dev.db ]; then
    if command -v sqlite3 >/dev/null 2>&1; then
      sqlite3 prisma/dev.db ".backup '$KEEP/prisma/dev.db'"
    else
      cp -a prisma/dev.db "$KEEP/prisma/dev.db"
      for name in dev.db-journal dev.db-wal dev.db-shm; do
        if [ -f "prisma/$name" ]; then
          cp -a "prisma/$name" "$KEEP/prisma/$name"
        fi
      done
    fi
  fi
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
  # Leave a live database alone. Replacing it under the running app corrupts SQLite.
  if [ ! -f prisma/dev.db ] && [ -f "$KEEP/prisma/dev.db" ]; then
    mkdir -p prisma
    cp -a "$KEEP/prisma/dev.db" prisma/dev.db
    rm -f prisma/dev.db-journal prisma/dev.db-wal prisma/dev.db-shm
  fi
  if [ ! -f .env ] && [ -f "$KEEP/.env" ]; then
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
