/**
 * Configuración central del panel (Vite env).
 * Todas las variables públicas deben usar el prefijo VITE_.
 */

export interface AppBrandingConfig {
  name: string;
  short: string;
  tagline: string;
}

export interface AppApiConfig {
  /** URL base de la API, sin slash final (ej. https://api.example.com/api/v1) */
  baseUrl: string;
}

export interface AppAuthConfig {
  tokenStorageKey: string;
  refreshStorageKey: string;
  loginPath: string;
}

export interface AppConfig {
  branding: AppBrandingConfig;
  api: AppApiConfig;
  auth: AppAuthConfig;
  isProduction: boolean;
}

export type ConfigIssueSeverity = 'error' | 'warning';

export interface ConfigIssue {
  field: string;
  message: string;
  severity: ConfigIssueSeverity;
}

const viteEnv = import.meta.env;

function readString(key: keyof ImportMetaEnv, fallback = ''): string {
  const value = viteEnv[key];
  if (value === undefined || value === '') return fallback;
  return String(value).trim();
}

function resolveApiBaseUrl(): string {
  const fromEnv = readString('VITE_API_URL');
  if (fromEnv) return fromEnv.replace(/\/+$/, '');
  if (viteEnv.PROD) return '/api/v1';
  return 'http://localhost:3000/api/v1';
}

function buildConfig(): AppConfig {
  return {
    branding: {
      name: readString('VITE_EVENT_NAME', 'WhatsApp Control'),
      short: readString('VITE_EVENT_SHORT', 'WA'),
      tagline: readString('VITE_EVENT_TAGLINE', 'Panel de mensajería'),
    },
    api: {
      baseUrl: resolveApiBaseUrl(),
    },
    auth: {
      tokenStorageKey: 'wc_token',
      refreshStorageKey: 'wc_refresh',
      loginPath: '/login',
    },
    isProduction: viteEnv.PROD,
  };
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Valida la configuración cargada. Errores bloquean el login. */
export function validateAppConfig(config: AppConfig): ConfigIssue[] {
  const issues: ConfigIssue[] = [];

  if (!config.branding.name.trim()) {
    issues.push({
      field: 'VITE_EVENT_NAME',
      message: 'El nombre del evento no puede estar vacío.',
      severity: 'warning',
    });
  }

  if (!isValidHttpUrl(config.api.baseUrl)) {
    issues.push({
      field: 'VITE_API_URL',
      message: 'La URL de la API no es válida. Usa http:// o https://',
      severity: 'error',
    });
  }

  if (config.isProduction && !readString('VITE_API_URL')) {
    issues.push({
      field: 'VITE_API_URL',
      message:
        'En producción debes definir VITE_API_URL (ej. https://tu-api.com/api/v1).',
      severity: 'error',
    });
  }

  if (config.isProduction && config.api.baseUrl.startsWith('http://')) {
    issues.push({
      field: 'VITE_API_URL',
      message: 'En producción se recomienda HTTPS para la API.',
      severity: 'warning',
    });
  }

  return issues;
}

export const appConfig: AppConfig = buildConfig();

export const configIssues = validateAppConfig(appConfig);

export const configErrors = configIssues.filter((i) => i.severity === 'error');

export const isAppConfigReady = configErrors.length === 0;

/** Alias histórico usado en Layout y Login */
export const EVENT = appConfig.branding;
