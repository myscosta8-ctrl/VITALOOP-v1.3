/**
 * Consultórios disponíveis da unidade (Bloco 3 da Triagem, 14/09/2026).
 *
 * Não existia estrutura equivalente no projeto (investigado: app.bed_sectors
 * é leito/ocupação, não ambiente de consulta ambulatorial) — menor
 * estrutura necessária: nome + ativo/inativo, sem ocupação/status como um
 * leito. RLS/migration: db/migrations/0093_triage_destination.sql.
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type pg from 'pg';
import { success } from '../http/envelope.js';
import { requirePermission } from '../security/require-auth.js';
import { withSecurityContext } from '../db/security-context.js';

interface DbConsultationRoomRow {
  id: string;
  institution_id: string;
  name: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

interface ConsultationRoom {
  readonly id: string;
  readonly institutionId: string;
  readonly name: string;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

const mapRow = (row: DbConsultationRoomRow): ConsultationRoom => ({
  id: row.id,
  institutionId: row.institution_id,
  name: row.name,
  isActive: row.is_active,
  createdAt: new Date(row.created_at).toISOString(),
  updatedAt: new Date(row.updated_at).toISOString(),
});

const createRoomBodySchema = z.object({
  name: z.string().min(1, 'O nome do consultório é obrigatório.'),
});

export const registerConsultationRoomRoutes = (app: FastifyInstance, pool: pg.Pool | null): void => {
  // ---------- GET /api/v1/consultation-rooms (lista, só os ativos por padrão) ----------
  app.get(
    '/api/v1/consultation-rooms',
    { preHandler: requirePermission(pool, 'consultation_rooms.read') },
    async (req, reply) => {
      const identity = req.identity!;
      const rooms = await withSecurityContext(
        pool!,
        { userId: identity.appUserId!, roles: identity.roles },
        async (client) => {
          const res = await client.query<DbConsultationRoomRow>(
            'select * from app.consultation_rooms where is_active = true order by name',
          );
          return res.rows.map(mapRow);
        },
      );
      return reply.send(success(rooms, req.id));
    },
  );

  // ---------- POST /api/v1/consultation-rooms (configuração da unidade) ----------
  app.post(
    '/api/v1/consultation-rooms',
    { preHandler: requirePermission(pool, 'bed.write') },
    async (req, reply) => {
      const parsed = createRoomBodySchema.parse(req.body);
      const identity = req.identity!;

      const room = await withSecurityContext(
        pool!,
        { userId: identity.appUserId!, roles: identity.roles },
        async (client) => {
          // Sem vínculo institution_id em app.users (checado no schema) — mesma
          // convenção já usada em resolveDefaultQueueId (queue-enqueue.ts):
          // ambiente de instituição única, usa a primeira criada.
          const institutionRes = await client.query('select id from app.institutions order by created_at asc limit 1');
          const institutionId = institutionRes.rows[0]?.id;

          const res = await client.query<DbConsultationRoomRow>(
            `insert into app.consultation_rooms (institution_id, name)
             values ($1, $2)
             returning *`,
            [institutionId, parsed.name.trim()],
          );
          return mapRow(res.rows[0]!);
        },
      );
      return reply.status(201).send(success(room, req.id));
    },
  );
};
