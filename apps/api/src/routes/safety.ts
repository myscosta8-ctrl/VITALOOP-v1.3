import type { FastifyInstance, FastifyRequest } from 'fastify';
import type pg from 'pg';
import { z } from 'zod';
import type { UUID } from '@vitaloop/shared';
import { AppError, ErrorCategory } from '@vitaloop/shared';
import {
  validateAdverseEventInput,
  validatePatientIsolationInput,
  createAdverseEventReportedEvent,
  createPatientIsolationPrescribedEvent,
  createPatientIsolationEndedEvent,
  type AdverseEvent,
  type PatientIsolation,
  type DomainEvent,
} from '@vitaloop/domain';
import { success } from '../http/envelope.js';
import { withSecurityContext } from '../db/security-context.js';
import { requirePermission } from '../security/require-auth.js';
import { sha256Hex } from '../security/hash.js';

const auditAction = async (
  client: pg.PoolClient,
  actorUserId: string,
  action: 'create' | 'update',
  resourceType: string,
  resourceId: string,
  req: FastifyRequest,
  details?: Record<string, unknown>,
): Promise<void> => {
  const ip = (req.headers['x-forwarded-for'] as string) || req.ip || '127.0.0.1';
  const ipHash = sha256Hex(ip);

  await client.query(
    `insert into app.audit_events (actor_user_id, action, resource_type, resource_id, request_id, ip_hash, after_data)
     values ($1, $2, $3, $4, $5, $6, $7)`,
    [actorUserId, action, resourceType, resourceId, req.id, ipHash, details ? JSON.stringify(details) : null],
  );
};

const persistDomainEvent = async (client: pg.PoolClient, ev: DomainEvent, patientId: UUID | null): Promise<void> => {
  await client.query(
    `insert into app.domain_events (id, event_type, aggregate_type, aggregate_id, actor_user_id, patient_id, payload, schema_version, occurred_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, now())`,
    [
      ev.eventId,
      ev.type,
      ev.aggregateType,
      ev.aggregateId,
      ev.actorId,
      patientId,
      JSON.stringify(ev.payload),
      ev.schemaVersion,
    ],
  );
};

const createAdverseEventSchema = z.object({
  encounterId: z.string().uuid().optional().nullable(),
  patientId: z.string().uuid().optional().nullable(),
  isAnonymous: z.boolean().optional(),
  eventCategory: z.string().min(3),
  severity: z.enum(['near_miss', 'no_harm', 'mild', 'moderate', 'severe', 'death']),
  description: z.string().min(15),
  immediateAction: z.string().optional().nullable(),
  isEpidemiologicalNotification: z.boolean().optional(),
  sinanCode: z.string().optional().nullable(),
});

const createIsolationSchema = z.object({
  isolationType: z.enum(['standard', 'contact', 'droplet', 'airborne', 'protective']),
  reason: z.string().min(10),
  pathogenSuspected: z.string().optional().nullable(),
});

export const registerSafetyRoutes = (app: FastifyInstance, pool: pg.Pool | null): void => {
  // POST /api/v1/safety/adverse-events (Notificação de evento adverso)
  app.post(
    '/api/v1/safety/adverse-events',
    { preHandler: requirePermission(pool, 'safety.report') },
    async (req, reply) => {
      const parsedBody = createAdverseEventSchema.parse(req.body);
      const identity = req.identity!;
      const reporterId = parsedBody.isAnonymous ? null : identity.appUserId!;

      validateAdverseEventInput({
        encounterId: (parsedBody.encounterId as UUID) ?? null,
        patientId: (parsedBody.patientId as UUID) ?? null,
        isAnonymous: parsedBody.isAnonymous ?? false,
        eventCategory: parsedBody.eventCategory,
        severity: parsedBody.severity,
        description: parsedBody.description,
        immediateAction: parsedBody.immediateAction ?? null,
        isEpidemiologicalNotification: parsedBody.isEpidemiologicalNotification ?? false,
        sinanCode: parsedBody.sinanCode ?? null,
      });

      const eventRecord = await withSecurityContext(
        pool!,
        { userId: identity.appUserId!, roles: identity.roles },
        async (client) => {
          const res = await client.query(
            `insert into app.adverse_events
               (encounter_id, patient_id, reporter_id, is_anonymous, event_category, severity, description, immediate_action, is_epidemiological_notification, sinan_code)
             values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             returning *`,
            [
              parsedBody.encounterId ?? null,
              parsedBody.patientId ?? null,
              reporterId,
              parsedBody.isAnonymous ?? false,
              parsedBody.eventCategory,
              parsedBody.severity,
              parsedBody.description,
              parsedBody.immediateAction ?? null,
              parsedBody.isEpidemiologicalNotification ?? false,
              parsedBody.sinanCode ?? null,
            ],
          );
          const r = res.rows[0];

          const adverseEvent: AdverseEvent = {
            id: r.id,
            encounterId: r.encounter_id,
            patientId: r.patient_id,
            reporterId: r.reporter_id,
            isAnonymous: r.is_anonymous,
            eventCategory: r.event_category,
            severity: r.severity,
            eventDate: r.event_date.toISOString(),
            description: r.description,
            immediateAction: r.immediate_action,
            isEpidemiologicalNotification: r.is_epidemiological_notification,
            sinanCode: r.sinan_code,
            status: r.status,
            createdAt: r.created_at.toISOString(),
            updatedAt: r.updated_at.toISOString(),
          };

          const ev = createAdverseEventReportedEvent(
            adverseEvent.id,
            adverseEvent.encounterId as UUID | null,
            adverseEvent.patientId as UUID | null,
            reporterId as UUID | null,
            adverseEvent.severity,
            adverseEvent.eventCategory,
          );

          await persistDomainEvent(client, ev, adverseEvent.patientId as UUID | null);
          await auditAction(client, identity.appUserId!, 'create', 'adverse_event', adverseEvent.id, req, {
            severity: adverseEvent.severity,
            eventCategory: adverseEvent.eventCategory,
            isAnonymous: adverseEvent.isAnonymous,
          });

          return adverseEvent;
        },
      );

      return reply.status(201).send(success(eventRecord, req.id));
    },
  );

  // GET /api/v1/safety/adverse-events (Painel NSP)
  app.get(
    '/api/v1/safety/adverse-events',
    { preHandler: requirePermission(pool, 'safety.read') },
    async (req, reply) => {
      const identity = req.identity!;

      const events = await withSecurityContext(
        pool!,
        { userId: identity.appUserId!, roles: identity.roles },
        async (client) => {
          const res = await client.query('select * from app.adverse_events order by created_at desc');
          return res.rows.map((r): AdverseEvent => ({
            id: r.id,
            encounterId: r.encounter_id,
            patientId: r.patient_id,
            reporterId: r.reporter_id,
            isAnonymous: r.is_anonymous,
            eventCategory: r.event_category,
            severity: r.severity,
            eventDate: r.event_date.toISOString(),
            description: r.description,
            immediateAction: r.immediate_action,
            isEpidemiologicalNotification: r.is_epidemiological_notification,
            sinanCode: r.sinan_code,
            status: r.status,
            createdAt: r.created_at.toISOString(),
            updatedAt: r.updated_at.toISOString(),
          }));
        },
      );

      return reply.status(200).send(success(events, req.id));
    },
  );

  // POST /api/v1/encounters/:encounterId/isolations (Prescrição de Isolamento)
  app.post(
    '/api/v1/encounters/:encounterId/isolations',
    { preHandler: requirePermission(pool, 'safety.manage') },
    async (req, reply) => {
      const { encounterId } = req.params as { encounterId: UUID };
      const parsedBody = createIsolationSchema.parse(req.body);
      const identity = req.identity!;
      const prescribedBy = identity.appUserId!;

      const isolation = await withSecurityContext(
        pool!,
        { userId: prescribedBy, roles: identity.roles },
        async (client) => {
          const encRes = await client.query('select patient_id from app.encounters where id = $1', [encounterId]);
          if (encRes.rows.length === 0) {
            throw new AppError({
              category: ErrorCategory.NOT_FOUND,
              code: 'ENCOUNTER_NOT_FOUND',
              message: 'Atendimento não encontrado.',
            });
          }
          const patientId = encRes.rows[0].patient_id;

          validatePatientIsolationInput({
            encounterId,
            patientId,
            isolationType: parsedBody.isolationType,
            reason: parsedBody.reason,
            pathogenSuspected: parsedBody.pathogenSuspected ?? null,
          });

          const res = await client.query(
            `insert into app.patient_isolations
               (encounter_id, patient_id, isolation_type, reason, pathogen_suspected, prescribed_by)
             values ($1, $2, $3, $4, $5, $6)
             returning *`,
            [
              encounterId,
              patientId,
              parsedBody.isolationType,
              parsedBody.reason,
              parsedBody.pathogenSuspected ?? null,
              prescribedBy,
            ],
          );
          const r = res.rows[0];

          const iso: PatientIsolation = {
            id: r.id,
            encounterId: r.encounter_id,
            patientId: r.patient_id,
            isolationType: r.isolation_type,
            reason: r.reason,
            pathogenSuspected: r.pathogen_suspected,
            prescribedBy: r.prescribed_by,
            startAt: r.start_at.toISOString(),
            endAt: r.end_at ? r.end_at.toISOString() : null,
            endedBy: r.ended_by,
            isActive: r.is_active,
            createdAt: r.created_at.toISOString(),
          };

          const ev = createPatientIsolationPrescribedEvent(
            iso.id,
            encounterId,
            patientId,
            prescribedBy as UUID,
            iso.isolationType,
            iso.reason,
          );

          await persistDomainEvent(client, ev, patientId);
          await auditAction(client, prescribedBy, 'create', 'patient_isolation', iso.id, req, {
            encounterId,
            isolationType: iso.isolationType,
          });

          return iso;
        },
      );

      return reply.status(201).send(success(isolation, req.id));
    },
  );

  // GET /api/v1/encounters/:encounterId/isolations
  app.get(
    '/api/v1/encounters/:encounterId/isolations',
    { preHandler: requirePermission(pool, 'safety.read') },
    async (req, reply) => {
      const { encounterId } = req.params as { encounterId: UUID };
      const identity = req.identity!;

      const isolations = await withSecurityContext(
        pool!,
        { userId: identity.appUserId!, roles: identity.roles },
        async (client) => {
          const res = await client.query(
            'select * from app.patient_isolations where encounter_id = $1 order by created_at desc',
            [encounterId],
          );
          return res.rows.map((r): PatientIsolation => ({
            id: r.id,
            encounterId: r.encounter_id,
            patientId: r.patient_id,
            isolationType: r.isolation_type,
            reason: r.reason,
            pathogenSuspected: r.pathogen_suspected,
            prescribedBy: r.prescribed_by,
            startAt: r.start_at.toISOString(),
            endAt: r.end_at ? r.end_at.toISOString() : null,
            endedBy: r.ended_by,
            isActive: r.is_active,
            createdAt: r.created_at.toISOString(),
          }));
        },
      );

      return reply.status(200).send(success(isolations, req.id));
    },
  );

  // PATCH /api/v1/isolations/:id/end
  app.patch(
    '/api/v1/isolations/:id/end',
    { preHandler: requirePermission(pool, 'safety.manage') },
    async (req, reply) => {
      const { id } = req.params as { id: UUID };
      const identity = req.identity!;
      const endedBy = identity.appUserId!;

      const endedIso = await withSecurityContext(
        pool!,
        { userId: endedBy, roles: identity.roles },
        async (client) => {
          const checkRes = await client.query('select * from app.patient_isolations where id = $1', [id]);
          if (checkRes.rows.length === 0) {
            throw new AppError({
              category: ErrorCategory.NOT_FOUND,
              code: 'ISOLATION_NOT_FOUND',
              message: 'Registro de isolamento não encontrado.',
            });
          }
          const check = checkRes.rows[0];

          if (!check.is_active) {
            throw new AppError({
              category: ErrorCategory.CONFLICT,
              code: 'ISOLATION_ALREADY_ENDED',
              message: 'O isolamento assistencial já foi encerrado.',
            });
          }

          const res = await client.query(
            `update app.patient_isolations
             set is_active = false, end_at = now(), ended_by = $1
             where id = $2
             returning *`,
            [endedBy, id],
          );
          const r = res.rows[0];

          const ev = createPatientIsolationEndedEvent(
            id,
            r.encounter_id,
            r.patient_id,
            endedBy as UUID,
          );

          await persistDomainEvent(client, ev, r.patient_id);
          await auditAction(client, endedBy, 'update', 'patient_isolation', id, req, {
            isActive: false,
          });

          return {
            id: r.id,
            encounterId: r.encounter_id,
            patientId: r.patient_id,
            isolationType: r.isolation_type,
            reason: r.reason,
            prescribedBy: r.prescribed_by,
            startAt: r.start_at.toISOString(),
            endAt: r.end_at.toISOString(),
            endedBy: r.ended_by,
            isActive: r.is_active,
            createdAt: r.created_at.toISOString(),
          };
        },
      );

      return reply.status(200).send(success(endedIso, req.id));
    },
  );
};
