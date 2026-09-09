/**
 * Cliente administrativo do Supabase Auth (2026-09-09).
 *
 * Usa a chave `service_role` — segredo forte, NUNCA enviado ao frontend,
 * NUNCA usado no fluxo de login comum (esse continua em
 * supabase-auth-client.ts, com a chave `anon`). Único propósito: permitir
 * que um administrador (papel `system_admin`) crie a conta de login de um
 * profissional — algo que a API pública do Supabase Auth não permite (só
 * cadastro pelo próprio usuário, com confirmação de e-mail, que não existe
 * aqui — login é por usuário, não e-mail).
 */

export interface SupabaseAdminClientOptions {
  readonly supabaseUrl: string;
  readonly serviceRoleKey: string;
  readonly fetchImpl?: typeof fetch;
}

export interface AdminCreatedUser {
  readonly id: string;
}

export type AdminResult<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly status: number; readonly message: string };

export interface SupabaseAdminClient {
  createUser(email: string, password: string): Promise<AdminResult<AdminCreatedUser>>;
}

export const createSupabaseAdminClient = (
  opts: SupabaseAdminClientOptions,
): SupabaseAdminClient => {
  const f = opts.fetchImpl ?? fetch;
  const base = opts.supabaseUrl.replace(/\/$/, '');

  return {
    async createUser(email, password) {
      const res = await f(`${base}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
          apikey: opts.serviceRoleKey,
          Authorization: `Bearer ${opts.serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        // email_confirm: true — não há caixa de e-mail real (@vitaloop.local)
        // para confirmar; o admin já validou a identidade ao criar a conta.
        body: JSON.stringify({ email, password, email_confirm: true }),
      });
      if (!res.ok) {
        let message = 'Falha ao criar conta no Supabase Auth.';
        try {
          const body = (await res.json()) as { msg?: string; message?: string };
          message = body.msg ?? body.message ?? message;
        } catch {
          /* corpo não-JSON; segue com mensagem genérica */
        }
        return { ok: false, status: res.status, message };
      }
      const data = (await res.json()) as { id: string };
      return { ok: true, data: { id: data.id } };
    },
  };
};
