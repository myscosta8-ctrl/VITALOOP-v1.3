/**
 * Cabeçalhos de segurança aplicados a toda resposta (Doc 2 §51; Doc 3 SEC-T-009).
 * Baseline mínimo, sem dependência externa. CSP restritiva para API JSON.
 */

import type { FastifyReply, FastifyRequest } from 'fastify';

export const securityHeaders = (
  _req: FastifyRequest,
  reply: FastifyReply,
  done: () => void,
): void => {
  reply.header('X-Content-Type-Options', 'nosniff');
  reply.header('X-Frame-Options', 'DENY');
  reply.header('Referrer-Policy', 'no-referrer');
  reply.header('Cross-Origin-Resource-Policy', 'same-origin');
  reply.header('Cross-Origin-Opener-Policy', 'same-origin');
  reply.header(
    'Content-Security-Policy',
    "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
  );
  reply.header('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
  reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  done();
};
