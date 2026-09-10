/**
 * CORS com negação por padrão (Doc 2 §51; Doc 3 SEC-T-008).
 * Só reflete a origem quando ela consta explicitamente na allowlist configurada.
 */

import type { FastifyReply, FastifyRequest } from 'fastify';

export const makeCorsHook =
  (allowedOrigins: readonly string[]) =>
  (req: FastifyRequest, reply: FastifyReply, done: () => void): void => {
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      reply.header('Access-Control-Allow-Origin', origin);
      reply.header('Vary', 'Origin');
      reply.header('Access-Control-Allow-Credentials', 'true');
      reply.header(
        'Access-Control-Allow-Headers',
        'content-type, authorization, x-request-id, idempotency-key, x-test-identity',
      );
      reply.header(
        'Access-Control-Allow-Methods',
        'GET, POST, PATCH, DELETE, OPTIONS',
      );
    }
    // Origem não permitida => nenhum header CORS é emitido (bloqueio pelo navegador).
    done();
  };
