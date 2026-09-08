#!/usr/bin/env bash
# Start Hous on Linux VPS (production)
# Usage: bash scripts/start-production.sh [/var/www/hous]

set -euo pipefail

APP_ROOT="${1:-$(cd "$(dirname "$0")/.." && pwd)}"
SERVER_DIR="$APP_ROOT/server"
CLIENT_DIR="$APP_ROOT/client"
UPLOADS_DIR="$APP_ROOT/uploads"
LOG_DIR="/var/log/hous"

echo "==> Hous production start"
echo "    App root: $APP_ROOT"

command -v node >/dev/null || { echo "Node.js required (v20+)"; exit 1; }
command -v pm2 >/dev/null || { echo "Install PM2: npm i -g pm2"; exit 1; }

mkdir -p "$UPLOADS_DIR" "$LOG_DIR"

if [ ! -f "$SERVER_DIR/.env" ]; then
  echo "Missing $SERVER_DIR/.env — copy from .env.example and set production values."
  exit 1
fi

echo "==> Installing dependencies"
npm ci --prefix "$SERVER_DIR"
npm ci --prefix "$CLIENT_DIR"

echo "==> Building frontend"
npm run build --prefix "$CLIENT_DIR"

echo "==> Running migrations"
npm run migrate --prefix "$SERVER_DIR"

echo "==> Starting API with PM2"
export HOUS_APP_ROOT="$APP_ROOT"
pm2 delete hous-api 2>/dev/null || true
pm2 start "$APP_ROOT/deploy/ecosystem.config.cjs"
pm2 save

echo ""
echo "Done."
echo "  API (local):  http://127.0.0.1:5000/api/v1/health"
echo "  Frontend:     serve $CLIENT_DIR/dist via Nginx (see deploy/nginx.conf.example)"
echo "  PM2 status:   pm2 status"
echo "  PM2 logs:     pm2 logs hous-api"
