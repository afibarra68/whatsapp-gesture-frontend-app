/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base de la API (obligatoria en producción). Ej: https://api.example.com/api/v1 */
  readonly VITE_API_URL?: string;
  /** Nombre del evento o producto mostrado en login y sidebar */
  readonly VITE_EVENT_NAME?: string;
  /** Sigla o icono corto del logo */
  readonly VITE_EVENT_SHORT?: string;
  /** Frase bajo el título en la pantalla de login */
  readonly VITE_EVENT_TAGLINE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
