/**
 * Enforcement de autenticação e autorização (Doc 4 §12).
 *
 * "Autenticado" ≠ "autorizado". requireAuth garante identidade; requirePermission
 * consulta app.authorize() no banco (RBAC + Need-to-Know), nunca decide no frontend
 * nem confia apenas na presença de um token.
 */

import type { FastifyReply, FastifyRequest } from 'fastify';
import { AppError, ErrorCategory } from '@vitaloop/shared';
import type { RequestIdentity } from './request-identity.js';
import { withSecurityContext } from '../db/security-context.js';
import type pg from 'pg';

declare module 'fastify' {
  interface FastifyRequest {
    identity?: RequestIdentity | null;
  }
}

/**
 * IMPORTANTE: precisa ser `async` (mesmo sem `await` interno). Um preHandler
 * síncrono de 2 parâmetros que nem lança nem retorna Promise deixa o Fastify
 * sem sinal de conclusão (nem callback `done`, nem Promise) e a requisição
 * trava indefinidamente quando a autenticação é válida (bug real encontrado
 * e corrigido no microfechamento técnico da Fase 1 — nenhuma lógica mudou).
 */
export const requireAuth = async (
  req: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> => {
  if (!req.identity || !req.identity.appUserId) {
    throw new AppError({
      category: ErrorCategory.AUTH,
      code: 'AUTH_REQUIRED',
      message: 'Autenticação necessária.',
    });
  }
  if (req.identity.appUserStatus !== 'active') {
    throw new AppError({
      category: ErrorCategory.AUTH,
      code: 'AUTH_ACCOUNT_INACTIVE',
      message: 'Conta institucional inativa ou suspensa.',
    });
  }
};

/**
 * Verifica RBAC + Need-to-Know via app.authorize() no banco. Nega por padrão
 * quando o banco não está disponível (nunca "abre" autorização sem verificação real).
 */
export const requirePermission =
  (db: pg.Pool | null, permCode: string, scopeType?: string) =>
  async (req: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    await requireAuth(req, _reply);
    if (!db) {
      throw new AppError({
        category: ErrorCategory.INTERNAL,
        code: 'AUTHZ_BACKEND_UNAVAILABLE',
        message: 'Não foi possível avaliar autorização (banco indisponível).',
      });
    }
    const scopeId = (req.params as Record<string, string> | undefined)?.['scopeId'];
    const identity = req.identity!;

    const authorized = await withSecurityContext(
      db,
      { userId: identity.appUserId!, roles: identity.roles },
      async (client) => {
        const authz = await client.query<{ authorized: boolean }>(
          'select app.authorize($1,$2,$3) as authorized',
          [permCode, scopeType ?? null, scopeId ?? null],
        );
        const granted = authz.rows[0]?.authorized ?? false;
        await client.query('select app.log_authz($1,$2,$3,$4,$5,$6)', [
          identity.appUserId,
          granted,
          permCode,
          scopeId ?? null,
          null,
          req.id,
        ]);
        return granted;
      },
    );

    if (!authorized) {
      throw new AppError({
        category: ErrorCategory.ACCESS,
        code: 'ACCESS_DENIED',
        message: 'Acesso negado.',
      });
    }
  };

/**
 * Exige uma role literal (ex.: `system_admin`), não uma permissão do
 * catálogo `app.permissions`. Uso restrito: tabelas centrais de identidade/
 * RBAC (app.users, app.roles, app.user_roles, app.role_permissions...) têm
 * RLS que checa `ctx_has_role('system_admin')` diretamente (migration
 * 0010) — decisão institucional deliberada de isolar quem gerencia
 * identidade/RBAC numa role própria, fora do sistema de permissões (evita
 * que alguém com uma permissão administrativa qualquer se autoconceda
 * mais acesso). Este preHandler só dá um erro amigável ANTES de bater no
 * banco — o banco continua sendo a autoridade final via RLS.
 */
export const requireRole =
  (roleCode: string, message = 'Acesso negado.') =>
  async (req: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    await requireAuth(req, _reply);
    if (!req.identity!.roles.includes(roleCode)) {
      throw new AppError({
        category: ErrorCategory.ACCESS,
        code: 'ACCESS_DENIED',
        message,
      });
    }
  };
