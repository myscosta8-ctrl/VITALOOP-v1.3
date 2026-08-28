/**
 * Popula req.identity a partir do header Authorization em toda requisição.
 * Não força autenticação (rotas públicas continuam funcionando); apenas
 * resolve quem é o chamador quando um token é apresentado.
 */

import type { FastifyInstance } from 'fastify';
import { AppError, ErrorCategory } from '@vitaloop/shared';
import { resolveRequestIdentity, InvalidTokenError } from './request-identity.js';
import type { JwtVerifier } from './jwt-verifier.js';
import type pg from 'pg';

export const registerIdentityPlugin = (
  app: FastifyInstance,
  verifier: JwtVerifier | null,
  db: pg.Pool | null,
): void => {
  app.addHook('onRequest', async (req) => {
    if (!verifier) {
      req.identity = null;
      return;
    }
    try {
      req.identity = await resolveRequestIdentity(
        req.headers.authorization,
        verifier,
        db,
      );
    } catch (e) {
      if (e instanceof InvalidTokenError) {
        throw new AppError({
          category: ErrorCategory.AUTH,
          code: 'AUTH_INVALID_TOKEN',
          message: 'Token inválido ou expirado.',
        });
      }
      throw e;
    }
  });
};
