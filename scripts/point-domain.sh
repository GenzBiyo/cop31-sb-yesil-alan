#!/usr/bin/env bash
# Attach cop31saglik.com to the existing nginx site and certificate.
set -euo pipefail

if [ "$(id -u)" -eq 0 ]; then
  SUDO=""
else
  SUDO="sudo"
fi

python3 - <<'PY'
from pathlib import Path

extra = " cop31saglik.com www.cop31saglik.com"
roots = [Path("/etc/nginx/sites-enabled"), Path("/etc/nginx/sites-available"), Path("/etc/nginx/conf.d")]
seen = set()
changed = []
for root in roots:
    if not root.exists():
        continue
    for path in root.iterdir():
        if not path.is_file() and not path.is_symlink():
            continue
        real = path.resolve()
        if real in seen:
            continue
        seen.add(real)
        text = real.read_text(errors="ignore")
        if "cop31saglikbakanligi.com" not in text:
            continue
        out = []
        dirty = False
        for line in text.splitlines(keepends=True):
            if "server_name" in line and "cop31saglikbakanligi.com" in line and "cop31saglik.com" not in line and ";" in line:
                line = line.replace(";", extra + ";", 1)
                dirty = True
            out.append(line)
        if dirty:
            real.write_text("".join(out))
            changed.append(str(real))
        print(real)
        for line in real.read_text(errors="ignore").splitlines():
            if "server_name" in line:
                print(" ", line.strip())
if not seen:
    raise SystemExit("nginx site config not found")
print("CHANGED", changed or "already")
PY

$SUDO nginx -t
$SUDO systemctl reload nginx

if ! command -v certbot >/dev/null 2>&1; then
  $SUDO apt-get update
  $SUDO apt-get install -y certbot python3-certbot-nginx
fi

if $SUDO certbot --nginx --expand --non-interactive --agree-tos --redirect \
  -d cop31saglikbakanligi.com -d www.cop31saglikbakanligi.com \
  -d cop31saglik.com -d www.cop31saglik.com; then
  echo CERTBOT_OK
else
  $SUDO certbot --nginx --non-interactive --agree-tos --register-unsafely-without-email --redirect \
    -d cop31saglik.com -d www.cop31saglik.com
  echo CERTBOT_OK
fi
