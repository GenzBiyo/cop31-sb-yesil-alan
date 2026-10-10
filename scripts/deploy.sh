#!/usr/bin/env bash
set -euo pipefail
APP=/var/www/cop31
cd "$APP"

start_app() {
  if pm2 describe cop31 >/dev/null 2>&1; then
    pm2 restart cop31
  else
    pm2 start node --name cop31 --cwd "$APP" -- ./node_modules/next/dist/bin/next start -H 0.0.0.0 -p 3000
  fi
}

revive_if_down() {
  if [ -f /tmp/cop31-deploying ]; then
    return 0
  fi
  if ! command -v pm2 >/dev/null 2>&1; then
    return 0
  fi
  if ! pm2 describe cop31 >/dev/null 2>&1; then
    if [ -d "$APP/.next" ]; then
      pm2 start node --name cop31 --cwd "$APP" -- ./node_modules/next/dist/bin/next start -H 0.0.0.0 -p 3000 || true
    fi
    return 0
  fi
  pid="$(pm2 pid cop31 2>/dev/null | tr -d '[:space:]' || true)"
  if [ -z "$pid" ] || [ "$pid" = "0" ]; then
    pm2 restart cop31 >/dev/null 2>&1 || true
  fi
}

trap revive_if_down EXIT

bash "$APP/scripts/keep-data.sh" save

git fetch origin master
git reset --hard origin/master
git clean -fd -e .env -e .pavilion-program-applied -e .stands-off-agenda -e .session-calendar-only -e .hatira-shots-cleared -e .mail-cop31-tr -e prisma/dev.db -e prisma/dev.db-journal -e prisma/dev.db-wal -e prisma/dev.db-shm -e public/uploads

bash "$APP/scripts/keep-data.sh" restore

python3 - <<'PY'
from pathlib import Path
path = Path(".env")
text = path.read_text(encoding="utf-8") if path.exists() else ""
lines = []
seen = set()
for line in text.splitlines():
    key = line.split("=", 1)[0]
    if key in ("PUBLIC_APP_URL", "NEXT_PUBLIC_APP_URL"):
        lines.append(f"{key}=https://cop31saglik.com")
        seen.add(key)
    else:
        lines.append(line)
for key in ("PUBLIC_APP_URL", "NEXT_PUBLIC_APP_URL"):
    if key not in seen:
        lines.append(f"{key}=https://cop31saglik.com")
path.write_text("\n".join(lines) + "\n", encoding="utf-8")
PY

npm install
npx prisma generate
npx prisma db push
revive_if_down

rm -rf .next-staging
NEXT_DIST_DIR=.next-staging NODE_OPTIONS=--max-old-space-size=3072 npx next build

touch /tmp/cop31-deploying
if pm2 describe cop31 >/dev/null 2>&1; then
  pm2 stop cop31 || true
fi
rm -rf .next-old
if [ -d .next ]; then
  mv .next .next-old
fi
if ! mv .next-staging .next; then
  if [ -d .next-old ]; then
    mv .next-old .next
  fi
  start_app || true
  rm -f /tmp/cop31-deploying
  exit 1
fi
if ! start_app; then
  rm -rf .next
  if [ -d .next-old ]; then
    mv .next-old .next
  fi
  start_app || true
  rm -f /tmp/cop31-deploying
  exit 1
fi
pm2 save
rm -f /tmp/cop31-deploying

if ! systemctl is-enabled pm2-root.service >/dev/null 2>&1; then
  pm2 startup systemd -u root --hp /root >/dev/null 2>&1 || true
  pm2 save || true
fi

CURL="$(command -v curl || true)"
PM2="$(command -v pm2 || true)"
if [ -n "$CURL" ] && [ -n "$PM2" ]; then
  line="*/2 * * * * test -f /tmp/cop31-deploying && exit 0; $CURL -fsS --max-time 20 http://127.0.0.1:3000/ >/dev/null || $PM2 restart cop31 >/dev/null 2>&1 # cop31-stay-up"
  (crontab -l 2>/dev/null | grep -v 'cop31-stay-up' || true; echo "$line") | crontab -
fi

if sudo -n true >/dev/null 2>&1; then
  if ! sudo nginx -T 2>/dev/null | grep -q "gzip on;"; then
    sudo tee /etc/nginx/conf.d/cop31-speed.conf >/dev/null <<'EOF'
gzip on;
gzip_vary on;
gzip_proxied any;
gzip_comp_level 5;
gzip_min_length 1024;
gzip_types text/plain text/css text/javascript application/javascript application/json application/manifest+json image/svg+xml font/woff2;
EOF
    if sudo nginx -t; then
      sudo systemctl reload nginx || true
    else
      sudo rm -f /etc/nginx/conf.d/cop31-speed.conf
    fi
  fi
fi

bash "$APP/scripts/point-domain.sh"

if [ ! -f "$APP/.pavilion-program-applied" ]; then
  npx tsx scripts/apply-pavilion-program.ts
  touch "$APP/.pavilion-program-applied"
fi

if [ ! -f "$APP/.stands-off-agenda" ]; then
  npx tsx scripts/clear-stand-agenda.ts
  touch "$APP/.stands-off-agenda"
fi

if [ ! -f "$APP/.session-calendar-only" ]; then
  npx tsx scripts/clear-stand-agenda.ts
  touch "$APP/.session-calendar-only"
fi

if [ ! -f "$APP/.hatira-shots-cleared" ]; then
  npx tsx scripts/clear-hatira-shots.ts
  touch "$APP/.hatira-shots-cleared"
fi

if [ ! -f "$APP/.mail-cop31-tr" ]; then
  npx tsx scripts/mail-cop31-tr.ts
  touch "$APP/.mail-cop31-tr"
fi

echo DEPLOY_OK
