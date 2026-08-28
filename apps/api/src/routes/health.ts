/**
 * Health (liveness) e Readiness (Doc 2 §54; Doc 3 PRD-005/PRD-006; FND-019).
 *
 * - GET /health  : o processo está vivo (não depende de banco/auth).
 * - GET /ready   : dependências reais. Cada dependência reporta seu próprio
 *                  status ('ok' | 'down' | 'not_configured'); nunca expõe
 *                  connection string, secrets ou stack trace (Doc 4 §13).
 */

import type { FastifyInstance } from 'fastify';
import { success } from '../http/envelope.js';
import { pingDb, type Db } from '../db/pool.js';

export interface ReadyDeps {
  readonly db: Db;
  /** URL pública do Supabase, se configurada — usada só para checar o JWKS (sem segredo). */
  readonly supabaseUrl?: string;
  readonly fetchImpl?: typeof fetch;
  /** Timeout por dependência checada (protege contra travamento do /ready). */
  readonly timeoutMs?: number;
}

type DepStatus = 'ok' | 'down' | 'not_configured';

const withTimeout = async <T>(p: Promise<T>, ms: number): Promise<T> => {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('timeout')), ms);
  });
  try {
    return await Promise.race([p, timeout]);
  } finally {
    clearTimeout(timer!);
  }
};

const checkDb = async (db: Db, timeoutMs: number): Promise<DepStatus> => {
  if (!db) return 'not_configured';
  try {
    return (await withTimeout(pingDb(db), timeoutMs)) ? 'ok' : 'down';
  } catch {
    return 'down';
  }
};

const checkAuth = async (
  supabaseUrl: string | undefined,
  fetchImpl: typeof fetch,
  timeoutMs: number,
): Promise<DepStatus> => {
  if (!supabaseUrl) return 'not_configured';
  try {
    const res = await withTimeout(
      fetchImpl(new URL('/auth/v1/.well-known/jwks.json', supabaseUrl)),
      timeoutMs,
    );
    return res.ok ? 'ok' : 'down';
  } catch {
    return 'down';
  }
};

export const registerHealthRoutes = (app: FastifyInstance, deps: ReadyDeps): void => {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const timeoutMs = deps.timeoutMs ?? 3000;

  app.get('/health', (req, reply) => {
    reply.code(200).send(success({ status: 'ok' }, req.id));
  });

  app.get('/ready', async (req, reply) => {
    const [dbStatus, authStatus] = await Promise.all([
      checkDb(deps.db, timeoutMs),
      checkAuth(deps.supabaseUrl, fetchImpl, timeoutMs),
    ]);
    const ready = dbStatus !== 'down' && authStatus !== 'down';
    reply
      .code(ready ? 200 : 503)
      .send(success({ ready, db: dbStatus, auth: authStatus }, req.id));
  });
};
