#!/usr/bin/env bash
# Publica frontend/ → https://github.com/afibarra68/whatsapp-gesture-frontend-app
#
# Uso:
#   ./scripts/push-to-github.sh
#   ./scripts/push-to-github.sh "mensaje de commit"
#
set -euo pipefail

FRONTEND_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REPO="https://github.com/afibarra68/whatsapp-gesture-frontend-app.git"
MSG="${1:-sync: frontend producción con API DigitalOcean}"
WORK="$(mktemp -d)"

cleanup() { rm -rf "$WORK"; }
trap cleanup EXIT

echo "==> Clonando whatsapp-gesture-frontend-app..."
git clone --depth 1 "$REPO" "$WORK/repo"

echo "==> Copiando archivos..."
rsync -a --delete \
  --exclude node_modules \
  --exclude dist \
  --exclude .env \
  --exclude .env.local \
  --exclude .git \
  --exclude .vercel \
  "$FRONTEND_DIR/" "$WORK/repo/"

cd "$WORK/repo"
git add -A
if git diff --cached --quiet; then
  echo "Sin cambios que publicar."
  exit 0
fi

git commit -m "$MSG"
git push origin main

echo "Publicado en $REPO (main) — Vercel redeployará si está conectado."
