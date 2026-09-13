import type { FastifyInstance } from 'fastify';
import pg from 'pg';
import { z } from 'zod';
import type { UUID } from '@vitaloop/shared';
import {
  createShiftHandoverRecordedEvent,
  validateShiftHandoverCreateInput,
  type ShiftHandover,
  type ShiftPeriod,
} from '@vitaloop/domain';
import { success } from '../http/envelope.js';
import { withSecurityContext } from '../db/security-context.js';
import { requirePermission } from '../security/require-auth.js';

const persistDomainEvent = async (
  client: pg.PoolClient,
  ev: { id: UUID; eventType: string; aggregateType: string; aggregateId: UUID; actorUserId: UUID | null; patientId: UUID | null; payload: unknown; schemaVersion: number },
): Promise<void> => {
  await client.query(
    `insert into app.domain_events (id, event_type, aggregate_type, aggregate_id, actor_user_id, patient_id, payload, schema_version, occurred_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, now())`,
    [ev.id, ev.eventType, ev.aggregateType, ev.aggregateId, ev.actorUserId, ev.patientId, JSON.stringify(ev.payload), ev.schemaVersion],
  );
};

const mapRow = (r: pg.QueryResultRow): ShiftHandover => ({
  id: r.id,
  sectorId: r.sector_id,
  shiftPeriod: r.shift_period as ShiftPeriod,
  handoverDate: r.handover_date instanceof Date ? r.handover_date.toISOString().slice(0, 10) : r.handover_date,
  outgoingProfessionalId: r.outgoing_professional_id,
  incomingProfessionalId: r.incoming_professional_id,
  patientCensus: r.patient_census,
  criticalAlerts: r.critical_alerts,
  pendingTasks: r.pending_tasks,
  summaryNotes: r.summary_notes,
  createdAt: r.created_at.toISOString(),
});

const createHandoverSchema = z.object({
  sectorId: z.string().uuid().optional().nullable().transform((v) => v ?? null),
  shiftPeriod: z.enum(['manha', 'tarde', 'noite']),
  incomingProfessionalId: z.string().uuid().optional().nullable().transform((v) => v ?? null),
  patientCensus: z.number().optional().nullable().transform((v) => v ?? null),
  criticalAlerts: z.string().optional().nullable().transform((v) => v ?? null),
  pendingTasks: z.string().optional().nullable().transform((v) => v ?? null),
  summaryNotes: z.string(),
});

export const registerShiftHandoverRoutes = (app: FastifyInstance, pool: pg.Pool | null): void => {
  app.get<{ Querystring: { sectorId?: string } }>(
    '/api/v1/shift-handovers',
    { preHandler: requirePermission(pool, 'shift_handover.read') },
    async (req, reply) => {
      const identity = req.identity!;
      const { sectorId } = req.query;

      const handovers = await withSecurityContext(pool!, { userId: identity.appUserId!, roles: identity.roles }, async (client) => {
        const res = await client.query(
          `select * from app.shift_handovers
           where ($1::uuid is null or sector_id = $1)
           order by handover_date desc, created_at desc
           limit 50`,
          [sectorId ?? null],
        );
        return res.rows.map(mapRow);
      });

      return reply.send(success(handovers, req.id));
    },
  );

  app.post(
    '/api/v1/shift-handovers',
    { preHandler: requirePermission(pool, 'shift_handover.write') },
    async (req, reply) => {
      const parsedBody = createHandoverSchema.parse(req.body);
      const identity = req.identity!;
      const outgoingProfessionalId = identity.appUserId!;

      const handover = await withSecurityContext(pool!, { userId: outgoingProfessionalId, roles: identity.roles }, async (client) => {
        const validated = validateShiftHandoverCreateInput(parsedBody);

        const insertRes = await client.query(
          `insert into app.shift_handovers (
             sector_id, shift_period, outgoing_professional_id, incoming_professional_id,
             patient_census, critical_alerts, pending_tasks, summary_notes
           ) values ($1, $2, $3, $4, $5, $6, $7, $8)
           returning *`,
          [
            validated.sectorId ?? null,
            validated.shiftPeriod,
            outgoingProfessionalId,
            validated.incomingProfessionalId ?? null,
            validated.patientCensus ?? null,
            validated.criticalAlerts,
            validated.pendingTasks,
            validated.summaryNotes,
          ],
        );
        const newHandover = mapRow(insertRes.rows[0]!);

        const event = createShiftHandoverRecordedEvent(newHandover, outgoingProfessionalId as UUID);
        await persistDomainEvent(client, {
          id: event.eventId as UUID, eventType: event.type, aggregateType: event.aggregateType,
          aggregateId: event.aggregateId as UUID, actorUserId: outgoingProfessionalId as UUID, patientId: null,
          payload: event.payload, schemaVersion: event.schemaVersion,
        });

        return newHandover;
      });

      return reply.status(201).send(success(handover, req.id));
    },
  );
};
