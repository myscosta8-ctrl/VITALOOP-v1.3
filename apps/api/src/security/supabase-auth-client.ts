/**
 * Cliente mínimo do Supabase Auth REST (Doc 2 §25/§26; ADR-0003).
 *
 * Usa apenas a chave `anon`/publishable — pública por design, segura para uso
 * de servidor ou cliente. NUNCA usa service_role aqui. Sem SDK pesado.
 */

export interface SupabaseAuthClientOptions {
  readonly supabaseUrl: string;
  readonly anonKey: string;
  readonly fetchImpl?: typeof fetch;
}

export interface AuthTokenResponse {
  readonly access_token: string;
  readonly refresh_token: string;
  readonly expires_in: number;
  readonly token_type: string;
}

export interface AuthErrorBody {
  readonly error_code?: string;
  readonly msg?: string;
  readonly code?: number;
}

export type AuthResult<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly status: number; readonly errorCode: string; readonly message: string };

export interface SupabaseAuthClient {
  signInWithPassword(email: string, password: string): Promise<AuthResult<AuthTokenResponse>>;
  signOut(accessToken: string, scope?: 'global' | 'local' | 'others'): Promise<AuthResult<null>>;
  requestPasswordRecovery(email: string): Promise<AuthResult<null>>;
  updatePassword(accessToken: string, newPassword: string): Promise<AuthResult<null>>;
}

export const createSupabaseAuthClient = (
  opts: SupabaseAuthClientOptions,
): SupabaseAuthClient => {
  const f = opts.fetchImpl ?? fetch;
  const base = opts.supabaseUrl.replace(/\/$/, '');

  const parseError = async (res: Response): Promise<AuthResult<never>> => {
    let body: AuthErrorBody = {};
    try {
      body = (await res.json()) as AuthErrorBody;
    } catch {
      /* corpo não-JSON; segue com mensagem genérica */
    }
    return {
      ok: false,
      status: res.status,
      errorCode: body.error_code ?? 'unknown_error',
      message: body.msg ?? 'Falha na autenticação.',
    };
  };

  return {
    async signInWithPassword(email, password) {
      const res = await f(`${base}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { apikey: opts.anonKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) return parseError(res);
      return { ok: true, data: (await res.json()) as AuthTokenResponse };
    },

    async signOut(accessToken, scope = 'global') {
      const res = await f(`${base}/auth/v1/logout?scope=${scope}`, {
        method: 'POST',
        headers: { apikey: opts.anonKey, Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok && res.status !== 204) return parseError(res);
      return { ok: true, data: null };
    },

    async requestPasswordRecovery(email) {
      const res = await f(`${base}/auth/v1/recover`, {
        method: 'POST',
        headers: { apikey: opts.anonKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) return parseError(res);
      return { ok: true, data: null };
    },

    async updatePassword(accessToken, newPassword) {
      const res = await f(`${base}/auth/v1/user`, {
        method: 'PUT',
        headers: {
          apikey: opts.anonKey,
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: newPassword }),
      });
      if (!res.ok) return parseError(res);
      return { ok: true, data: null };
    },
  };
};
