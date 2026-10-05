#!/usr/bin/env bash
set -euo pipefail
APP=/var/www/cop31
cd "$APP"

git fetch origin master
git reset --hard origin/master
git clean -fd -e .env -e prisma/dev.db -e prisma/dev.db-journal -e prisma/dev.db-wal -e prisma/dev.db-shm -e public/uploads

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

echo DEPLOY_OK
