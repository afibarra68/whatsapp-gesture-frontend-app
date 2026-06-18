#!/usr/bin/env bash
# Despliegue del frontend en Vercel.
#
# Uso:
#   cd frontend
#   npx vercel login                    # primera vez
#   ./scripts/deploy.sh dev             # preview (dev) en Vercel
#   ./scripts/deploy.sh prod            # producción → whatsapp-gesture-frontend-app.vercel.app
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

MODE="${1:-dev}"
API_URL="${VITE_API_URL:-https://whatsapiteller-ia7n8.ondigitalocean.app/api/v1}"

export VITE_API_URL="$API_URL"
export VITE_EVENT_NAME="${VITE_EVENT_NAME:-Evento Cristiano}"
export VITE_EVENT_SHORT="${VITE_EVENT_SHORT:-✝}"
export VITE_EVENT_TAGLINE="${VITE_EVENT_TAGLINE:-Panel de mensajería del evento}"

echo "==> VITE_API_URL=$VITE_API_URL"
echo "==> Modo: $MODE"

npm ci
npm run build

if [ "$MODE" = "prod" ]; then
  npx vercel deploy --prod --yes \
    --env "VITE_API_URL=$VITE_API_URL" \
    --env "VITE_EVENT_NAME=$VITE_EVENT_NAME" \
    --env "VITE_EVENT_SHORT=$VITE_EVENT_SHORT" \
    --env "VITE_EVENT_TAGLINE=$VITE_EVENT_TAGLINE"
else
  npx vercel deploy --yes \
    --env "VITE_API_URL=$VITE_API_URL" \
    --env "VITE_EVENT_NAME=$VITE_EVENT_NAME" \
    --env "VITE_EVENT_SHORT=$VITE_EVENT_SHORT" \
    --env "VITE_EVENT_TAGLINE=$VITE_EVENT_TAGLINE"
fi

echo ""
echo "Despliegue Vercel ($MODE) completado."
