#!/usr/bin/env bash
# Builds upload-ready archives for Hostinger:
#   release/dilgo-web.zip  → extract into the main domain's public_html
#   release/dilgo-api.zip  → extract into ~/dilgo-api (outside public_html)
# Usage: VITE_API_URL=https://api.dilgo.app/api ./scripts/build-release.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/release"
mkdir -p "$OUT"

: "${VITE_API_URL:?Set VITE_API_URL, e.g. https://api.dilgo.app/api}"

echo "▸ Building web app (API: $VITE_API_URL)"
cd "$ROOT/frontend"
npm ci --silent
VITE_API_URL="$VITE_API_URL" npm run build
(cd dist && zip -qr "$OUT/dilgo-web.zip" . -x '*.map')

echo "▸ Packaging API (production dependencies only)"
TMP="$(mktemp -d)"
rsync -a --exclude node_modules --exclude vendor --exclude .env --exclude 'storage/logs/*' \
  --exclude 'database/*.sqlite' --exclude tests "$ROOT/backend/" "$TMP/dilgo-api/"
(cd "$TMP/dilgo-api" && composer install --no-dev --optimize-autoloader --no-interaction --quiet)
(cd "$TMP" && zip -qr "$OUT/dilgo-api.zip" dilgo-api)
rm -rf "${TMP:?}"

echo "✔ Done: $OUT/dilgo-web.zip and $OUT/dilgo-api.zip"
