import type { FastifyInstance, FastifyRequest } from 'fastify';
import pg from 'pg';
import { z } from 'zod';
import type { UUID } from '@vitaloop/shared';
import { AppError, ErrorCategory } from '@vitaloop/shared';
import {
  createVitalSignsRecordedEvent,
  validateVitalSignsRecordInput,
  type VitalSignsReading,
  type VitalSignsSource,
} from '@vitaloop/domain';
import { success } from '../http/envelope.js';
import { withSecurityContext } from '../db/security-context.js';
import { requirePermission } from '../security/require-auth.js';
import { sha256Hex } from '../security/hash.js';

const auditAction = async (
  client: pg.PoolClient,
  actorUserId: string,
  resourceId: string,
  req: FastifyRequest,
  details?: Record<string, unknown>,
): Promise<void> => {
  const ip = (req.headers['x-forwarded-for'] as string) || req.ip || '127.0.0.1';
  const ipHash = sha256Hex(ip);

  await client.query(
    `insert into app.audit_events (actor_user_id, action, resource_type, resource_id, request_id, ip_hash, after_data)
     values ($1, 'create', 'vital_sign_reading', $2, $3, $4, $5)`,
    [actorUserId, resourceId, req.id, ipHash, details ? JSON.stringify(details) : null],
  );
};

const persistDomainEvent = async (
  client: pg.PoolClient,
  ev: {
    id: UUID;
    eventType: string;
    aggregateType: string;
    aggregateId: UUID;
    actorUserId: UUID | null;
    patientId: UUID;
    payload: unknown;
    schemaVersion: number;
  },
): Promise<void> => {
  await client.query(
    `insert into app.domain_events (id, event_type, aggregate_type, aggregate_id, actor_user_id, patient_id, payload, schema_version, occurred_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, now())`,
    [ev.id, ev.eventType, ev.aggregateType, ev.aggregateId, ev.actorUserId, ev.patientId, JSON.stringify(ev.payload), ev.schemaVersion],
  );
};

const mapRow = (r: pg.QueryResultRow): VitalSignsReading => ({
  id: r.id,
  encounterId: r.encounter_id,
  patientId: r.patient_id,
  source: r.source as VitalSignsSource,
  vitals: r.vitals,
  notes: r.notes,
  recordedBy: r.recorded_by,
  createdAt: r.created_at.toISOString(),
});

const recordVitalsSchema = z.object({
  source: z.enum(['consulta', 'enfermagem']),
  vitals: z.object({
    systolicBp: z.number().nullable().optional().transform((v) => v ?? null),
    diastolicBp: z.number().nullable().optional().transform((v) => v ?? null),
    heartRate: z.number().nullable().optional().transform((v) => v ?? null),
    respiratoryRate: z.number().nullable().optional().transform((v) => v ?? null),
    temperature: z.number().nullable().optional().transform((v) => v ?? null),
    oxygenSaturation: z.number().nullable().optional().transform((v) => v ?? null),
  }),
  notes: z.string().optional().nullable(),
});

export const registerVitalSignsRoutes = (app: FastifyInstance, pool: pg.Pool | null): void => {
  // Histórico de reaferições do atendimento (a aferição da Triagem não entra
  // aqui — continua em GET .../triage).
  app.get(
    '/api/v1/encounters/:encounterId/vital-signs',
    { preHandler: requirePermission(pool, 'vital_signs.read') },
    async (req, reply) => {
      const { encounterId } = req.params as { encounterId: UUID };
      const identity = req.identity!;

      const readings = await withSecurityContext(
        pool!,
        { userId: identity.appUserId!, roles: identity.roles },
        async (client) => {
          const res = await client.query(
            'select * from app.vital_sign_readings where encounter_id = $1 order by created_at desc',
            [encounterId],
          );
          return res.rows.map(mapRow);
        },
      );

      return reply.send(success(readings, req.id));
    },
  );

  // Registra uma nova reaferição de sinais vitais (Consulta Médica ou Enfermagem).
  app.post(
    '/api/v1/encounters/:encounterId/vital-signs',
    { preHandler: requirePermission(pool, 'vital_signs.write') },
    async (req, reply) => {
      const { encounterId } = req.params as { encounterId: UUID };
      const parsedBody = recordVitalsSchema.parse(req.body);
      const identity = req.identity!;

      if (!identity.appUserId) {
        throw new AppError({
          category: ErrorCategory.AUTH,
          code: 'AUTH_REQUIRED',
          message: 'Usuário não possui ID de aplicação associado.',
        });
      }

      const recordedBy = identity.appUserId;

      const reading = await withSecurityContext(
        pool!,
        { userId: recordedBy, roles: identity.roles },
        async (client) => {
          const encRes = await client.query('select id, patient_id from app.encounters where id = $1', [encounterId]);
          if (encRes.rowCount === 0 || !encRes.rows[0]) {
            throw new AppError({
              category: ErrorCategory.NOT_FOUND,
              code: 'ENCOUNTER_NOT_FOUND',
              message: 'Atendimento não encontrado para registro de sinais vitais.',
            });
          }
          const patientId = encRes.rows[0].patient_id as string;

          const validated = validateVitalSignsRecordInput({
            encounterId,
            patientId,
            source: parsedBody.source,
            vitals: parsedBody.vitals,
            notes: parsedBody.notes ?? null,
          });

          const insertRes = await client.query(
            `insert into app.vital_sign_readings (encounter_id, patient_id, source, vitals, notes, recorded_by)
             values ($1, $2, $3, $4, $5, $6)
             returning *`,
            [encounterId, patientId, validated.source, JSON.stringify(validated.vitals), validated.notes, recordedBy],
          );
          const newReading = mapRow(insertRes.rows[0]!);

          const event = createVitalSignsRecordedEvent(newReading, recordedBy as UUID);
          await persistDomainEvent(client, {
            id: event.eventId as UUID,
            eventType: event.type,
            aggregateType: event.aggregateType,
            aggregateId: event.aggregateId as UUID,
            actorUserId: recordedBy as UUID,
            patientId: patientId as UUID,
            payload: event.payload,
            schemaVersion: event.schemaVersion,
          });

          await auditAction(client, recordedBy, newReading.id, req, { encounterId, source: newReading.source });

          return newReading;
        },
      );

      return reply.status(201).send(success(reading, req.id));
    },
  );
};
