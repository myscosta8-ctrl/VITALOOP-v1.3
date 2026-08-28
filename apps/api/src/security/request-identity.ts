/**
 * Identidade da requisição (Doc 1 §7; Doc 4 §7/§15).
 *
 * Separa explicitamente:
 *  - authUserId  : identidade de credencial (Supabase auth.users.id / JWT sub);
 *  - appUserId   : identidade institucional (app.users.id);
 *  - roles       : papéis ativos (RBAC) — NÃO é autorização em si, apenas insumo.
 *
 * "Usuário autenticado" (authUserId presente) NÃO implica acesso a nada —
 * RBAC e Need-to-Know são avaliados separadamente, sempre no banco (RLS/funções).
 */

import type { JwtVerifier } from './jwt-verifier.js';
import { InvalidTokenError } from './jwt-verifier.js';
import { sha256Hex } from './hash.js';
import type pg from 'pg';

export interface RequestIdentity {
  readonly authUserId: string;
  readonly appUserId: string | null;
  readonly appUserStatus: string | null;
  readonly roles: readonly string[];
}

export const extractBearerToken = (
  authorizationHeader: string | undefined,
): string | null => {
  if (!authorizationHeader) return null;
  const match = /^Bearer\s+(.+)$/i.exec(authorizationHeader);
  return match?.[1]?.trim() || null;
};

/**
 * Verifica o token e resolve a identidade institucional correspondente.
 * Retorna null se não houver token — chamador decide se autenticação é obrigatória.
 * Lança InvalidTokenError se o token existir mas for inválido/expirado.
 */
export const resolveRequestIdentity = async (
  authorizationHeader: string | undefined,
  verifier: JwtVerifier,
  db: pg.Pool | null,
): Promise<RequestIdentity | null> => {
  const token = extractBearerToken(authorizationHeader);
  if (!token) return null;

  const claims = await verifier.verify(token);

  if (!db) {
    // Banco não configurado: identidade de credencial confirmada, mas não é
    // possível resolver a identidade institucional/papéis (Fase 0 sem DB).
    return { authUserId: claims.sub, appUserId: null, appUserStatus: null, roles: [] };
  }

  // Sessão institucional precisa estar ativa (Doc 2 §24; SEC-005). Um JWT do
  // Supabase é stateless — sua assinatura continua válida até a expiração
  // natural mesmo após logout. A revogação real só é garantida verificando
  // app.sessions, que nosso /auth/logout marca como revogada (achado real do
  // microfechamento técnico da Fase 1: sem esta checagem, um token "deslogado"
  // continuava sendo aceito por esta API).
  const sessionCheck = await db.query<{ ok: boolean }>(
    `select true as ok from app.sessions
     where token_hash = $1 and revoked_at is null and expires_at > now()`,
    [sha256Hex(token)],
  );
  if (sessionCheck.rowCount === 0) {
    throw new InvalidTokenError('sessão institucional revogada, expirada ou inexistente');
  }

  const result = await db.query<{ user_id: string; status: string; roles: string[] }>(
    'select * from app.resolve_app_identity($1)',
    [claims.sub],
  );
  const row = result.rows[0];
  if (!row || !row.user_id) {
    // Credencial válida, mas sem identidade institucional provisionada/ativa.
    return { authUserId: claims.sub, appUserId: null, appUserStatus: null, roles: [] };
  }
  return {
    authUserId: claims.sub,
    appUserId: row.user_id,
    appUserStatus: row.status,
    roles: row.roles ?? [],
  };
};

export { InvalidTokenError };
