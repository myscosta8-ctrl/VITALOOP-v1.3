/**
 * Contexto de sessão do usuário (Doc 4 §7/§24). Mantém token em memória
 * (não em localStorage — reduz superfície de XSS para o token de sessão).
 * Distingue estados: carregando, não autenticado, autenticado.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { createApiClient, ApiError, type ApiClient } from '../lib/api-client.js';

export interface MeResponse {
  readonly authUserId: string;
  readonly appUserId: string | null;
  readonly status: string | null;
  readonly roles: readonly string[];
}

export interface SessionState {
  readonly status: 'idle' | 'authenticating' | 'authenticated' | 'error';
  readonly identity: MeResponse | null;
  readonly error: string | null;
}

export interface SessionContextValue extends SessionState {
  readonly api: ApiClient;
  login(username: string, password: string): Promise<void>;
  loginDemo(): void;
  logout(): Promise<void>;
  refreshIdentity(): Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

const API_BASE_URL =
  (import.meta as unknown as { env?: { VITE_API_BASE_URL?: string } }).env
    ?.VITE_API_BASE_URL ?? 'http://localhost:3000';

export const SessionProvider = ({ children }: { children: ReactNode }): JSX.Element => {
  const [token, setToken] = useState<string | null>(null);
  const [state, setState] = useState<SessionState>({
    status: 'idle',
    identity: null,
    error: null,
  });

  const api = useMemo(
    () => createApiClient({ baseUrl: API_BASE_URL, getAccessToken: () => token }),
    [token],
  );

  const loginDemo = useCallback(() => {
    setState({
      status: 'authenticated',
      identity: {
        authUserId: 'demo-user-123',
        appUserId: 'demo-app-user-123',
        status: 'active',
        roles: ['doctor', 'nurse', 'admin', 'manager', 'receptionist'],
      },
      error: null,
    });
  }, []);

  const refreshIdentity = useCallback(async () => {
    try {
      const identity = await api.get<MeResponse>('/api/v1/me');
      setState({ status: 'authenticated', identity, error: null });
    } catch (e) {
      const message = e instanceof ApiError ? e.message : 'Falha ao carregar identidade.';
      setState({ status: 'error', identity: null, error: message });
    }
  }, [api]);

  const login = useCallback(
    async (username: string, password: string) => {
      setState({ status: 'authenticating', identity: null, error: null });
      try {
        const result = await api.post<{ accessToken: string }>('/api/v1/auth/login', {
          username,
          password,
        });
        setToken(result.accessToken);
      } catch (e) {
        const message = e instanceof ApiError ? e.message : 'Falha no login.';
        setState({ status: 'error', identity: null, error: message });
      }
    },
    [api],
  );

  const logout = useCallback(async () => {
    try {
      await api.post('/api/v1/auth/logout');
    } finally {
      setToken(null);
      setState({ status: 'idle', identity: null, error: null });
    }
  }, [api]);

  useEffect(() => {
    if (token) void refreshIdentity();
  }, [token]);

  const value: SessionContextValue = { ...state, api, login, loginDemo, logout, refreshIdentity };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};

export const useSession = (): SessionContextValue => {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession deve ser usado dentro de SessionProvider');
  return ctx;
};
