/**
 * GET /api/v1/me — identidade institucional do usuário autenticado (Doc 4 §7).
 * Não expõe módulos clínicos; apenas identidade + papéis (RBAC insumo).
 */

import type { FastifyInstance } from 'fastify';
import { success } from '../http/envelope.js';
import { requireAuth } from '../security/require-auth.js';

export const registerMeRoutes = (app: FastifyInstance): void => {
  app.get('/api/v1/me', { preHandler: requireAuth }, (req, reply) => {
    const identity = req.identity!;
    reply.code(200).send(
      success(
        {
          authUserId: identity.authUserId,
          appUserId: identity.appUserId,
          status: identity.appUserStatus,
          roles: identity.roles,
        },
        req.id,
      ),
    );
  });
};
