#!/usr/bin/env bash
# Despliegue del frontend en Vercel (requiere login previo).
#
# Uso:
#   cd frontend
#   npx vercel login
#   VITE_API_URL=https://api.tudominio.com/api/v1 ./scripts/deploy.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ -z "${VITE_API_URL:-}" ]; then
  echo "Define VITE_API_URL con la URL pública de tu API."
  echo "Ejemplo: VITE_API_URL=https://api.tudominio.com/api/v1 ./scripts/deploy.sh"
  exit 1
fi

npm ci
npm run build
npx vercel deploy --prod --yes \
  --env "VITE_API_URL=$VITE_API_URL"

echo ""
echo "Frontend desplegado. Añade VITE_API_URL en el dashboard de Vercel si hace falta."
