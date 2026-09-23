#!/usr/bin/env bash
set -euo pipefail
APP=/var/www/cop31
cd "$APP"

git fetch origin master
git reset --hard origin/master
git clean -fd -e .env -e prisma/dev.db -e prisma/dev.db-journal -e prisma/dev.db-wal -e prisma/dev.db-shm -e public/uploads

npm install
npx prisma generate
NODE_OPTIONS=--max-old-space-size=3072 npx next build

if pm2 describe cop31 >/dev/null 2>&1; then
  pm2 restart cop31
else
  pm2 start node --name cop31 --cwd "$APP" -- ./node_modules/next/dist/bin/next start -H 0.0.0.0 -p 3000
fi
pm2 save
echo DEPLOY_OK
