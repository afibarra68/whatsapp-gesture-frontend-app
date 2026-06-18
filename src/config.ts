/**
 * Branding del evento. Personalízalo por variables de entorno (Vercel) o aquí mismo.
 *   VITE_EVENT_NAME   -> nombre del evento (ej. "Encuentro de Fe 2026")
 *   VITE_EVENT_SHORT  -> sigla corta para el logo (ej. "EF")
 *   VITE_EVENT_TAGLINE-> frase corta bajo el título
 */
const env = import.meta.env as unknown as {
  VITE_EVENT_NAME?: string;
  VITE_EVENT_SHORT?: string;
  VITE_EVENT_TAGLINE?: string;
};

export const EVENT = {
  name: env.VITE_EVENT_NAME || 'Evento Cristiano',
  short: env.VITE_EVENT_SHORT || '✝',
  tagline: env.VITE_EVENT_TAGLINE || 'Panel de mensajería del evento',
};
