/**
 * Rotas de identidade e autenticação (Fase 1). Doc 1 §5/§9/§10; Doc 2 §25-§28.
 *
 * Autenticação é delegada ao Supabase Auth (ADR-0003). Esta camada adiciona:
 * rate limiting + brute-force lockout, sessão institucional (app.sessions),
 * auditoria e separação identidade/autorização.
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AppError, ErrorCategory } from '@vitaloop/shared';
import { success } from '../http/envelope.js';
import type { SupabaseAuthClient } from '../security/supabase-auth-client.js';
import type { RateLimiter } from '../security/rate-limiter.js';
import { sha256Hex } from '../security/hash.js';
import { requireAuth } from '../security/require-auth.js';
import { extractBearerToken } from '../security/request-identity.js';
import type pg from 'pg';

const LoginBody = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

// Supabase Auth exige um e-mail. O login do Vitaloop é por username (decisão
// institucional — não usar e-mail pessoal/corporativo como identificador,
// já que a instituição pode não ter esse dado organizado). Constrói um
// e-mail sintético, nunca exposto ao usuário nem usado para envio real.
const syntheticEmail = (username: string): string => `${username.toLowerCase()}@vitaloop.local`;

const ChangePasswordBody = z.object({ newPassword: z.string().min(8) });

export interface AuthRoutesDeps {
  readonly authClient: SupabaseAuthClient;
  readonly db: pg.Pool | null;
  readonly loginLimiter: RateLimiter;
}

export const registerAuthRoutes = (app: FastifyInstance, deps: AuthRoutesDeps): void => {
  const { authClient, db, loginLimiter } = deps;

  app.post('/api/v1/auth/login', async (req, reply) => {
    const parsed = LoginBody.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError({
        category: ErrorCategory.VALIDATION,
        code: 'VALIDATION_INVALID_BODY',
        message: 'Corpo da requisição inválido.',
      });
    }
    const username = parsed.data.username.toLowerCase().trim();
    const { password } = parsed.data;
    const email = syntheticEmail(username);
    const ipHash = sha256Hex(req.ip);

    // Rate limit em memória por usuário+IP (defesa imediata, Doc 3 SEC-011).
    const rl = loginLimiter.attempt(`${username}:${req.ip}`);
    if (!rl.allowed) {
      throw new AppError({
        category: ErrorCategory.RATE_LIMIT,
        code: 'RATE_LIMIT_LOGIN',
        message: 'Muitas tentativas. Tente novamente mais tarde.',
      });
    }

    // Brute-force lockout persistido (Doc 3 SEC-012), quando o banco existe.
    if (db) {
      const locked = await db.query<{ locked: boolean }>(
        'select app.is_locked_out($1) as locked',
        [username],
      );
      if (locked.rows[0]?.locked) {
        throw new AppError({
          category: ErrorCategory.RATE_LIMIT,
          code: 'RATE_LIMIT_ACCOUNT_LOCKED',
          message: 'Conta temporariamente bloqueada por excesso de tentativas.',
        });
      }
    }

    const result = await authClient.signInWithPassword(email, password);

    if (db) {
      await db.query('select app.record_login_attempt($1,$2,$3,$4)', [
        username,
        result.ok,
        ipHash,
        result.ok ? null : result.errorCode,
      ]);
    }

    if (!result.ok) {
      // Mensagem genérica — não diferencia usuário inexistente de senha errada.
      throw new AppError({
        category: ErrorCategory.AUTH,
        code: 'AUTH_INVALID_CREDENTIALS',
        message: 'Credenciais inválidas.',
      });
    }

    // Sessão institucional (Doc 2 §24) — complementar ao token do Supabase.
    if (db) {
      const expiresAt = new Date(Date.now() + result.data.expires_in * 1000);
      const tokenHash = sha256Hex(result.data.access_token);
      const authIdRes = await db.query<{ id: string }>(
        `select id from app.users where username = $1`,
        [username],
      );
      const appUserId = authIdRes.rows[0]?.id;
      if (appUserId) {
        await db.query(
          `insert into app.sessions(user_id, token_hash, expires_at, ip_hash, user_agent)
           values ($1,$2,$3,$4,$5)`,
          [appUserId, tokenHash, expiresAt, ipHash, req.headers['user-agent'] ?? null],
        );
      }
    }

    loginLimiter.reset(`${username}:${req.ip}`);
    reply.code(200).send(
      success(
        {
          accessToken: result.data.access_token,
          refreshToken: result.data.refresh_token,
          expiresIn: result.data.expires_in,
          tokenType: result.data.token_type,
        },
        req.id,
      ),
    );
  });

  app.post('/api/v1/auth/logout', async (req, reply) => {
    const token = extractBearerToken(req.headers.authorization);
    if (!token) {
      throw new AppError({
        category: ErrorCategory.AUTH,
        code: 'AUTH_REQUIRED',
        message: 'Autenticação necessária.',
      });
    }
    const result = await authClient.signOut(token, 'global');
    if (db) {
      await db.query(
        `update app.sessions set revoked_at = now() where token_hash = $1 and revoked_at is null`,
        [sha256Hex(token)],
      );
    }
    if (!result.ok) {
      throw new AppError({
        category: ErrorCategory.AUTH,
        code: 'AUTH_LOGOUT_FAILED',
        message: 'Não foi possível encerrar a sessão.',
      });
    }
    reply.code(204).send();
  });

  app.post('/api/v1/auth/password/change', { preHandler: requireAuth }, async (req, reply) => {
    const parsed = ChangePasswordBody.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError({
        category: ErrorCategory.VALIDATION,
        code: 'VALIDATION_WEAK_PASSWORD',
        message: 'Nova senha inválida (mínimo 8 caracteres).',
      });
    }
    const token = extractBearerToken(req.headers.authorization);
    if (!token) {
      throw new AppError({
        category: ErrorCategory.AUTH,
        code: 'AUTH_REQUIRED',
        message: 'Autenticação necessária.',
      });
    }
    const result = await authClient.updatePassword(token, parsed.data.newPassword);
    if (!result.ok) {
      throw new AppError({
        category: ErrorCategory.VALIDATION,
        code: 'AUTH_PASSWORD_CHANGE_FAILED',
        message: 'Não foi possível alterar a senha.',
      });
    }
    if (db && req.identity?.appUserId) {
      await db.query(
        `insert into app.audit_events(actor_user_id, action, resource_type, reason, request_id, severity)
         values ($1,'update','auth_password','alteracao de senha',$2,'notice')`,
        [req.identity.appUserId, req.id],
      );
      // Revoga demais sessões institucionais por segurança.
      await db.query(
        `update app.sessions set revoked_at = now()
         where user_id = $1 and revoked_at is null`,
        [req.identity.appUserId],
      );
    }
    reply.code(200).send(success({ changed: true }, req.id));
  });
};
