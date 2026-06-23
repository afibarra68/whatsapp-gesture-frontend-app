import { appConfig } from '../config';
import type { LoginResponse } from '../types';

const { baseUrl: API_URL } = appConfig.api;
const TOKEN_KEY = appConfig.auth.tokenStorageKey;
const REFRESH_KEY = appConfig.auth.refreshStorageKey;

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
  /** Uso interno: evita bucle al reintentar tras refresh */
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
    let data: LoginResponse | { error?: { message?: string; code?: string } } | null = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      return null;
    }

    if (!res.ok || !data || !('token' in data)) return null;

    setTokens(data.token, data.refreshToken);
    return data.token;
  } catch {
    return null;
  }
}

export async function api<T>(path: string, opts: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true, _retried = false } = opts;
  const headers: Record<string, string> = { 'Content-Type': 'application/json; charset=utf-8' };

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
    const err = (data as { error?: { message?: string; code?: string } })?.error;
    if (res.status === 401) clearTokens();
    throw new ApiError(res.status, err?.message || `Error ${res.status}`, err?.code);
  }

  return data as T;
}

export const apiBaseUrl = API_URL;
