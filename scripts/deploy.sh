#!/usr/bin/env bash
set -euo pipefail
APP=/var/www/cop31
cd "$APP"

bash "$APP/scripts/keep-data.sh" save

git fetch origin master
git reset --hard origin/master
git clean -fd -e .env -e .pavilion-program-applied -e .stands-off-agenda -e .session-calendar-only -e .hatira-shots-cleared -e prisma/dev.db -e prisma/dev.db-journal -e prisma/dev.db-wal -e prisma/dev.db-shm -e public/uploads

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
NODE_OPTIONS=--max-old-space-size=3072 npx next build

if pm2 describe cop31 >/dev/null 2>&1; then
  pm2 restart cop31
else
  pm2 start node --name cop31 --cwd "$APP" -- ./node_modules/next/dist/bin/next start -H 0.0.0.0 -p 3000
fi
pm2 save

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

echo DEPLOY_OK
