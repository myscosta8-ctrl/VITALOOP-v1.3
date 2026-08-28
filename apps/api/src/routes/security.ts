/**
 * Rotas de segurança: break-glass e configurações (Doc 1 §9; Doc 2 §23; Doc 4 §14).
 *
 * Break-glass exige permissão explícita `break_glass.use` — não é atalho de admin
 * (Doc 4 §21). Toda ativação é auditada dentro de app.activate_break_glass().
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AppError, ErrorCategory } from '@vitaloop/shared';
import { success } from '../http/envelope.js';
import { requireAuth, requirePermission } from '../security/require-auth.js';
import { withSecurityContext } from '../db/security-context.js';
import type pg from 'pg';

const BreakGlassBody = z.object({
  patientId: z.string().uuid().optional(),
  encounterId: z.string().uuid().optional(),
  reason: z.string().min(3),
  justification: z.string().min(10),
  minutes: z.number().int().positive().max(24 * 60).optional(),
});

export const registerSecurityRoutes = (app: FastifyInstance, db: pg.Pool | null): void => {
  app.post(
    '/api/v1/security/break-glass',
    { preHandler: db ? requirePermission(db, 'break_glass.use') : requireAuth },
    async (req, reply) => {
      const parsed = BreakGlassBody.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError({
          category: ErrorCategory.VALIDATION,
          code: 'VALIDATION_INVALID_BODY',
          message: 'motivo e justificativa são obrigatórios.',
        });
      }
      if (!db) {
        throw new AppError({
          category: ErrorCategory.INTERNAL,
          code: 'BREAK_GLASS_BACKEND_UNAVAILABLE',
          message: 'Banco indisponível.',
        });
      }
      const identity = req.identity!;
      const id = await withSecurityContext(
        db,
        { userId: identity.appUserId!, roles: identity.roles },
        async (client) => {
          const res = await client.query<{ activate_break_glass: string }>(
            'select app.activate_break_glass($1,$2,$3,$4,$5,$6) as activate_break_glass',
            [
              identity.appUserId,
              parsed.data.patientId ?? null,
              parsed.data.encounterId ?? null,
              parsed.data.reason,
              parsed.data.justification,
              parsed.data.minutes ?? null,
            ],
          );
          return res.rows[0]!.activate_break_glass;
        },
      );
      reply.code(201).send(success({ breakGlassId: id }, req.id));
    },
  );

  app.get('/api/v1/security/settings', { preHandler: requireAuth }, async (req, reply) => {
    if (!db) {
      throw new AppError({
        category: ErrorCategory.INTERNAL,
        code: 'SETTINGS_BACKEND_UNAVAILABLE',
        message: 'Banco indisponível.',
      });
    }
    const identity = req.identity!;
    const settings = await withSecurityContext(
      db,
      { userId: identity.appUserId!, roles: identity.roles },
      async (client) => {
        const res = await client.query(
          `select session_ttl_minutes, max_login_attempts, lockout_minutes,
                  break_glass_default_minutes, mfa_required_roles
           from app.security_settings`,
        );
        return res.rows[0];
      },
    );
    reply.code(200).send(success(settings, req.id));
  });
};
