/**
 * Escolha de setor no login diário (plantão) — só faz sentido pro técnico
 * de enfermagem (única role restrita por setor, ver migration 0072). Não
 * exige permissão específica além de estar autenticado: o profissional só
 * lê/grava a própria escolha (RLS: user_id = app.ctx_user_id()).
 */
import type { FastifyInstance } from 'fastify';
import pg from 'pg';
import { z } from 'zod';
import { AppError, ErrorCategory } from '@vitaloop/shared';
import { success } from '../http/envelope.js';
import { withSecurityContext } from '../db/security-context.js';
import { requireAuth } from '../security/require-auth.js';

const SHIFT_HOURS = 12;

const selectSectorSchema = z
  .object({
    area: z.enum(['pronto_atendimento', 'internacao']),
    bedSectorId: z.string().uuid().optional().nullable(),
  })
  .refine((v) => (v.area === 'internacao' ? !!v.bedSectorId : !v.bedSectorId), {
    message: 'bedSectorId é obrigatório quando area = internacao, e deve ficar vazio quando area = pronto_atendimento.',
  });

interface SelectionRow {
  id: string;
  area: 'pronto_atendimento' | 'internacao';
  bed_sector_id: string | null;
  selected_at: Date;
  expires_at: Date;
}

export const registerShiftSectorSelectionRoutes = (app: FastifyInstance, pool: pg.Pool | null): void => {
  // GET /api/v1/shift-sector-selection/me — escolha vigente (mais recente, ainda não expirada), ou null
  app.get(
    '/api/v1/shift-sector-selection/me',
    { preHandler: requireAuth },
    async (req, reply) => {
      const identity = req.identity!;
      if (!identity.appUserId) {
        throw new AppError({ category: ErrorCategory.AUTH, code: 'AUTH_REQUIRED', message: 'Usuário não possui ID de aplicação associado.' });
      }
      const current = await withSecurityContext(pool!, { userId: identity.appUserId, roles: identity.roles }, async (client) => {
        const { rows } = await client.query<SelectionRow>(
          `select * from app.shift_sector_selections
           where user_id = $1 and expires_at > now()
           order by selected_at desc limit 1`,
          [identity.appUserId],
        );
        return rows[0] ?? null;
      });

      return reply.send(
        success(
          current
            ? {
                area: current.area,
                bedSectorId: current.bed_sector_id,
                selectedAt: current.selected_at.toISOString(),
                expiresAt: current.expires_at.toISOString(),
              }
            : null,
          req.id,
        ),
      );
    },
  );

  // POST /api/v1/shift-sector-selection — registra a escolha do plantão atual
  app.post(
    '/api/v1/shift-sector-selection',
    { preHandler: requireAuth },
    async (req, reply) => {
      const parsed = selectSectorSchema.parse(req.body);
      const identity = req.identity!;
      if (!identity.appUserId) {
        throw new AppError({ category: ErrorCategory.AUTH, code: 'AUTH_REQUIRED', message: 'Usuário não possui ID de aplicação associado.' });
      }

      const created = await withSecurityContext(pool!, { userId: identity.appUserId, roles: identity.roles }, async (client) => {
        const { rows } = await client.query<SelectionRow>(
          `insert into app.shift_sector_selections (user_id, area, bed_sector_id, expires_at)
           values ($1, $2, $3, now() + make_interval(hours => $4))
           returning *`,
          [identity.appUserId, parsed.area, parsed.bedSectorId ?? null, SHIFT_HOURS],
        );
        return rows[0]!;
      });

      return reply.code(201).send(
        success(
          {
            area: created.area,
            bedSectorId: created.bed_sector_id,
            selectedAt: created.selected_at.toISOString(),
            expiresAt: created.expires_at.toISOString(),
          },
          req.id,
        ),
      );
    },
  );
};
