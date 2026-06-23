import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api, clearTokens, getRefreshToken, getToken, setTokens } from '../api/client';
import type { LoginResponse, User } from '../types';

function isMfaLogin(res: LoginResponse): res is Extract<LoginResponse, { requiresMfa: true }> {
  return 'requiresMfa' in res && res.requiresMfa === true;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<LoginResponse>;
  verifyMfa: (mfaToken: string, code: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

async function loadCurrentUser(): Promise<User | null> {
  const token = getToken();
  if (!token) return null;

  try {
    return await api<User>('/auth/me');
  } catch {
    const refresh = getRefreshToken();
    if (!refresh) {
      clearTokens();
      return null;
    }

    try {
      const refreshed = await api<{ token: string; refreshToken?: string }>('/auth/refresh', {
        method: 'POST',
        body: { refreshToken: refresh },
        auth: false,
      });
      setTokens(refreshed.token, refreshed.refreshToken);
      return await api<User>('/auth/me');
    } catch {
      clearTokens();
      return null;
    }
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCurrentUser()
      .then(setUser)
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string): Promise<LoginResponse> => {
    const res = await api<LoginResponse>('/auth/login', {
      method: 'POST',
      body: { email, password },
      auth: false,
    });
    if (!isMfaLogin(res)) {
      setTokens(res.token, res.refreshToken);
      setUser(res.user);
    }
    return res;
  };

  const verifyMfa = async (mfaToken: string, code: string) => {
    const res = await api<Extract<LoginResponse, { token: string }>>('/auth/mfa/verify', {
      method: 'POST',
      body: { mfaToken, code },
      auth: false,
    });
    setTokens(res.token, res.refreshToken);
    setUser(res.user);
  };

  const logout = () => {
    clearTokens();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, verifyMfa, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
