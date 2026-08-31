import type { FastifyInstance, FastifyRequest } from 'fastify';
import type pg from 'pg';
import { z } from 'zod';
import type { UUID } from '@vitaloop/shared';
import { AppError, ErrorCategory } from '@vitaloop/shared';
import {
  validateRegulationInput,
  validateRegulationStatusTransition,
  type ExternalRegulation,
  type RegulationStatus,
  type RegulationPriority,
  type TransportType,
} from '@vitaloop/domain';
import { success } from '../http/envelope.js';
import { withSecurityContext } from '../db/security-context.js';
import { requirePermission } from '../security/require-auth.js';
import { sha256Hex } from '../security/hash.js';

const auditAction = async (
  client: pg.PoolClient,
  actorUserId: string,
  action: 'create' | 'update' | 'download' | 'view',
  resourceType: string,
  resourceId: string | null,
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

const createRegulationSchema = z.object({
  encounterId: z.string().uuid(),
  patientId: z.string().uuid(),
  aihRequestId: z.string().uuid().optional().nullable(),
  destinationFacility: z.string().min(3),
  specialty: z.string().min(3),
  priority: z.enum(['low', 'medium', 'high', 'emergency']).default('high'),
  transportType: z.enum(['basic_ambulance', 'uti_mobile', 'samu', 'own_means']).default('basic_ambulance'),
  documents: z.array(z.object({
    documentType: z.enum(['clinical_report', 'exam_result', 'aih_form']),
    documentId: z.string().uuid().optional().nullable(),
    notes: z.string().optional().nullable(),
  })).optional(),
});

const updateStatusSchema = z.object({
  targetStatus: z.enum(['requested', 'in_regulation', 'accepted', 'transferred', 'canceled']),
  cancellationReason: z.string().optional().nullable(),
});

export const registerRegulationRoutes = (app: FastifyInstance, pool: pg.Pool | null): void => {
  // POST /api/v1/regulation/requests (Solicitação de Regulação Médica SUS-007, SUS-009)
  app.post(
    '/api/v1/regulation/requests',
    { preHandler: requirePermission(pool, 'regulation.manage') },
    async (req, reply) => {
      const parsed = createRegulationSchema.parse(req.body);
      const identity = req.identity!;
      const requesterId = identity.appUserId!;

      validateRegulationInput({
        encounterId: parsed.encounterId as UUID,
        patientId: parsed.patientId as UUID,
        aihRequestId: (parsed.aihRequestId as UUID) ?? null,
        destinationFacility: parsed.destinationFacility,
        specialty: parsed.specialty,
        priority: parsed.priority as RegulationPriority,
        transportType: parsed.transportType as TransportType,
      });

      const regulation = await withSecurityContext(
        pool!,
        { userId: requesterId, roles: identity.roles },
        async (client) => {
          const res = await client.query(
            `insert into app.external_regulations
               (encounter_id, patient_id, requester_id, aih_request_id, destination_facility, specialty, priority, transport_type, status)
             values ($1, $2, $3, $4, $5, $6, $7, $8, 'requested')
             returning *`,
            [
              parsed.encounterId,
              parsed.patientId,
              requesterId,
              parsed.aihRequestId ?? null,
              parsed.destinationFacility,
              parsed.specialty,
              parsed.priority,
              parsed.transportType,
            ],
          );
          const r = res.rows[0];

          if (parsed.documents && parsed.documents.length > 0) {
            for (const doc of parsed.documents) {
              await client.query(
                `insert into app.regulation_documents (regulation_id, document_type, document_id, notes, attached_by)
                 values ($1, $2, $3, $4, $5)`,
                [r.id, doc.documentType, doc.documentId ?? null, doc.notes ?? null, requesterId],
              );
            }
          }

          const reg: ExternalRegulation = {
            id: r.id,
            encounterId: r.encounter_id,
            patientId: r.patient_id,
            requesterId: r.requester_id,
            aihRequestId: r.aih_request_id,
            destinationFacility: r.destination_facility,
            specialty: r.specialty,
            priority: r.priority,
            transportType: r.transport_type,
            status: r.status,
            cancellationReason: r.cancellation_reason,
            confirmedAt: r.confirmed_at ? r.confirmed_at.toISOString() : null,
            confirmedBy: r.confirmed_by,
            createdAt: r.created_at.toISOString(),
            updatedAt: r.updated_at.toISOString(),
          };

          await auditAction(client, requesterId, 'create', 'external_regulation', reg.id, req, {
            destinationFacility: reg.destinationFacility,
            specialty: reg.specialty,
          });

          return reg;
        },
      );

      return reply.status(201).send(success(regulation, req.id));
    },
  );

  // GET /api/v1/regulation/requests (Listagem SUS-007)
  app.get(
    '/api/v1/regulation/requests',
    { preHandler: requirePermission(pool, 'regulation.read') },
    async (req, reply) => {
      const identity = req.identity!;

      const list = await withSecurityContext(
        pool!,
        { userId: identity.appUserId!, roles: identity.roles },
        async (client) => {
          const res = await client.query('select * from app.external_regulations order by created_at desc limit 50');
          return res.rows.map((r): ExternalRegulation => ({
            id: r.id,
            encounterId: r.encounter_id,
            patientId: r.patient_id,
            requesterId: r.requester_id,
            aihRequestId: r.aih_request_id,
            destinationFacility: r.destination_facility,
            specialty: r.specialty,
            priority: r.priority,
            transportType: r.transport_type,
            status: r.status,
            cancellationReason: r.cancellation_reason,
            confirmedAt: r.confirmed_at ? r.confirmed_at.toISOString() : null,
            confirmedBy: r.confirmed_by,
            createdAt: r.created_at.toISOString(),
            updatedAt: r.updated_at.toISOString(),
          }));
        },
      );

      return reply.status(200).send(success(list, req.id));
    },
  );

  // GET /api/v1/regulation/requests/:id (Detalhes com documentos SUS-007, SUS-009)
  app.get(
    '/api/v1/regulation/requests/:id',
    { preHandler: requirePermission(pool, 'regulation.read') },
    async (req, reply) => {
      const { id } = req.params as { id: UUID };
      const identity = req.identity!;

      const result = await withSecurityContext(
        pool!,
        { userId: identity.appUserId!, roles: identity.roles },
        async (client) => {
          const res = await client.query('select * from app.external_regulations where id = $1', [id]);
          if (res.rows.length === 0) {
            throw new AppError({
              category: ErrorCategory.NOT_FOUND,
              code: 'REGULATION_NOT_FOUND',
              message: 'Solicitação de regulação não encontrada.',
            });
          }
          const r = res.rows[0];

          const docRes = await client.query('select * from app.regulation_documents where regulation_id = $1', [id]);

          return {
            regulation: {
              id: r.id,
              encounterId: r.encounter_id,
              patientId: r.patient_id,
              requesterId: r.requester_id,
              aihRequestId: r.aih_request_id,
              destinationFacility: r.destination_facility,
              specialty: r.specialty,
              priority: r.priority,
              transportType: r.transport_type,
              status: r.status,
              cancellationReason: r.cancellation_reason,
              confirmedAt: r.confirmed_at ? r.confirmed_at.toISOString() : null,
              confirmedBy: r.confirmed_by,
              createdAt: r.created_at.toISOString(),
              updatedAt: r.updated_at.toISOString(),
            },
            documents: docRes.rows.map((d) => ({
              id: d.id,
              regulationId: d.regulation_id,
              documentType: d.document_type,
              documentId: d.document_id,
              notes: d.notes,
              attachedBy: d.attached_by,
              createdAt: d.created_at.toISOString(),
            })),
          };
        },
      );

      return reply.status(200).send(success(result, req.id));
    },
  );

  // PATCH /api/v1/regulation/requests/:id/status (Atualização de status/transferência SUS-008)
  app.patch(
    '/api/v1/regulation/requests/:id/status',
    { preHandler: requirePermission(pool, 'regulation.manage') },
    async (req, reply) => {
      const { id } = req.params as { id: UUID };
      const parsed = updateStatusSchema.parse(req.body);
      const identity = req.identity!;
      const actorId = identity.appUserId!;

      const updated = await withSecurityContext(
        pool!,
        { userId: actorId, roles: identity.roles },
        async (client) => {
          const resCurrent = await client.query('select * from app.external_regulations where id = $1', [id]);
          if (resCurrent.rows.length === 0) {
            throw new AppError({
              category: ErrorCategory.NOT_FOUND,
              code: 'REGULATION_NOT_FOUND',
              message: 'Solicitação de regulação não encontrada.',
            });
          }
          const current = resCurrent.rows[0];

          validateRegulationStatusTransition(
            current.status as RegulationStatus,
            parsed.targetStatus as RegulationStatus,
            parsed.cancellationReason,
          );

          const isConfirmed = parsed.targetStatus === 'accepted' || parsed.targetStatus === 'transferred';
          const updateRes = await client.query(
            `update app.external_regulations
             set status = $1,
                 cancellation_reason = $2,
                 confirmed_at = case when $3::boolean then now() else confirmed_at end,
                 confirmed_by = case when $3::boolean then $4::uuid else confirmed_by end,
                 updated_at = now()
             where id = $5
             returning *`,
            [parsed.targetStatus, parsed.cancellationReason ?? null, isConfirmed, actorId, id],
          );
          const r = updateRes.rows[0];

          await auditAction(client, actorId, 'update', 'external_regulation', id, req, {
            previousStatus: current.status,
            newStatus: r.status,
          });

          return {
            id: r.id,
            encounterId: r.encounter_id,
            patientId: r.patient_id,
            requesterId: r.requester_id,
            aihRequestId: r.aih_request_id,
            destinationFacility: r.destination_facility,
            specialty: r.specialty,
            priority: r.priority,
            transportType: r.transport_type,
            status: r.status,
            cancellationReason: r.cancellation_reason,
            confirmedAt: r.confirmed_at ? r.confirmed_at.toISOString() : null,
            confirmedBy: r.confirmed_by,
            createdAt: r.created_at.toISOString(),
            updatedAt: r.updated_at.toISOString(),
          };
        },
      );

      return reply.status(200).send(success(updated, req.id));
    },
  );

  // POST /api/v1/sus/aih-requests/:id/close (Fechamento final do lote da AIH SUS-010)
  app.post(
    '/api/v1/sus/aih-requests/:id/close',
    { preHandler: requirePermission(pool, 'sus.issue_aih') },
    async (req, reply) => {
      const { id } = req.params as { id: UUID };
      const identity = req.identity!;
      const actorId = identity.appUserId!;

      const closed = await withSecurityContext(
        pool!,
        { userId: actorId, roles: identity.roles },
        async (client) => {
          const resCurrent = await client.query('select * from app.aih_requests where id = $1', [id]);
          if (resCurrent.rows.length === 0) {
            throw new AppError({
              category: ErrorCategory.NOT_FOUND,
              code: 'AIH_NOT_FOUND',
              message: 'Laudo de AIH não encontrado.',
            });
          }

          const resUpdate = await client.query(
            `update app.aih_requests
             set closed_at = now(),
                 closed_by = $1,
                 updated_at = now()
             where id = $2
             returning *`,
            [actorId, id],
          );
          const r = resUpdate.rows[0];

          await auditAction(client, actorId, 'update', 'aih_request_close', id, req, {
            closedAt: r.closed_at,
          });

          return {
            id: r.id,
            encounterId: r.encounter_id,
            patientId: r.patient_id,
            requesterId: r.requester_id,
            mainProcedureCode: r.main_procedure_code,
            status: r.status,
            closedAt: r.closed_at ? r.closed_at.toISOString() : null,
            closedBy: r.closed_by,
          };
        },
      );

      return reply.status(200).send(success(closed, req.id));
    },
  );
};
