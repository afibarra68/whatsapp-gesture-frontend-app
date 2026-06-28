const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? '/api/v1' : 'http://localhost:3000/api/v1');

const TOKEN_KEY = 'wc_token';
const REFRESH_KEY = 'wc_refresh';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function setTokens(token: string, refresh?: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

interface ApiOptions {
  method?: string;
  body?: unknown;
  auth?: boolean;
  _retried?: boolean;
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    const text = await res.text();
    let data: { token?: string; refreshToken?: string } | null = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      return null;
    }

    if (!res.ok || !data?.token) return null;

    setTokens(data.token, data.refreshToken);
    return data.token;
  } catch {
    return null;
  }
}

export async function api<T>(path: string, opts: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true, _retried = false } = opts;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && auth && !_retried && path !== '/auth/login' && path !== '/auth/refresh') {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return api<T>(path, { ...opts, _retried: true });
    }
    clearTokens();
  }

  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const err = (data as { error?: { message?: string; code?: string; details?: unknown } })?.error;
    if (res.status === 401) clearTokens();
    let message = err?.message || `Error ${res.status}`;
    if (err?.code === 'VALIDATION_ERROR' && Array.isArray(err.details)) {
      const parts = err.details
        .map((d: { path?: string; message?: string }) =>
          d.path ? `${d.path}: ${d.message}` : d.message,
        )
        .filter(Boolean);
      if (parts.length) message = parts.join(' · ');
    }
    throw new ApiError(res.status, message, err?.code);
  }

  return data as T;
}

export const apiBaseUrl = API_URL;
