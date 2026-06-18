# WhatsApp Gesture — Frontend

Panel web (React + Vite) para gestionar campañas, clientes, plantillas y conversaciones de WhatsApp.

Repositorio independiente del backend API. El frontend se despliega en **Vercel**; la API corre en **Digital Ocean** (u otro host).

## Requisitos

- Node.js 18+
- API backend en ejecución (por defecto `http://localhost:3000`)

## Inicio rápido

```bash
cp .env.example .env
# Edita VITE_API_URL si tu API no está en localhost:3000

npm install
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173).

## Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `VITE_API_URL` | URL base de la API (ej. `https://api.tudominio.com/api/v1`) |
| `VITE_EVENT_NAME` | Nombre del evento (branding) |
| `VITE_EVENT_SHORT` | Sigla o icono corto del logo |
| `VITE_EVENT_TAGLINE` | Frase bajo el título |

## Scripts

| Comando | Acción |
|---------|--------|
| `npm run dev` | Servidor de desarrollo (puerto 5173) |
| `npm run build` | Build de producción en `dist/` |
| `npm run preview` | Vista previa del build |

## Despliegue en Vercel

1. Importa este repositorio en Vercel.
2. Framework: **Vite** (detectado automáticamente vía `vercel.json`).
3. Define `VITE_API_URL` apuntando a tu API en producción.
4. Deploy.

## Estructura

```
src/
  api/          # Cliente HTTP hacia la API
  auth/         # Contexto de autenticación JWT
  components/   # UI reutilizable
  pages/        # Pantallas (Dashboard, Campañas, Clientes…)
```

## Versión

**v1.0.0** — primera release del frontend como repositorio independiente.
