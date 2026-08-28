/**
 * Rotas de Atendimento Assistencial (Fase 2, Etapa 5/6) — Doc 1 §13/§14; Doc 2 §64; ENC-001..013.
 *
 * Consome integralmente as regras de `@vitaloop/domain` (packages/domain/src/encounter).
 * Conexão com Supabase via `vitaloop_app` (RLS ativa). Transações executadas com `withSecurityContext`.
 */

import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type pg from 'pg';
import { AppError, ErrorCategory, type UUID } from '@vitaloop/shared';
import {
  assertValidEncounterStatusTransition,
  createEncounterClosedEvent,
  createEncounterOpenedEvent,
  createEncounterStatusChangedEvent,
  isTerminalEncounterStatus,
  validateEncounterCreateInput,
  type Encounter,
  type EncounterOrigin,
  type EncounterStatus,
  type EncounterType,
} from '@vitaloop/domain';
import { success } from '../http/envelope.js';
import { requirePermission } from '../security/require-auth.js';
import { withSecurityContext } from '../db/security-context.js';
import { sha256Hex } from '../security/hash.js';

const requireReadAndWrite = (db: pg.Pool | null, writePerm: string, readPerm: string) => [
  requirePermission(db, writePerm),
  requirePermission(db, readPerm),
];

interface DomainEventRecord {
  readonly id: UUID;
  readonly eventType: string;
  readonly aggregateType: string;
  readonly aggregateId: UUID;
  readonly actorUserId: UUID | null;
  readonly patientId: UUID;
  readonly payload: unknown;
  readonly schemaVersion: number;
}

const persistDomainEvent = async (client: pg.PoolClient, ev: DomainEventRecord): Promise<void> => {
  await client.query(
    `insert into app.domain_events (id, event_type, aggregate_type, aggregate_id, actor_user_id, patient_id, payload, schema_version, occurred_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, now())`,
    [
      ev.id,
      ev.eventType,
      ev.aggregateType,
      ev.aggregateId,
      ev.actorUserId,
      ev.patientId,
      JSON.stringify(ev.payload),
      ev.schemaVersion,
    ],
  );
};

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

interface DbEncounterRow {
  id: string;
  patient_id: string;
  institution_id: string;
  unit_id: string | null;
  sector_id: string | null;
  encounter_type: EncounterType;
  origin: EncounterOrigin;
  chief_complaint: string;
  status: EncounterStatus;
  cancel_reason: string | null;
  assigned_user_id: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

const mapRowToEncounter = (row: DbEncounterRow): Encounter => ({
  id: row.id,
  patientId: row.patient_id,
  institutionId: row.institution_id,
  unitId: row.unit_id,
  sectorId: row.sector_id,
  encounterType: row.encounter_type,
  origin: row.origin,
  chiefComplaint: row.chief_complaint,
  status: row.status,
  cancelReason: row.cancel_reason,
  assignedUserId: row.assigned_user_id,
  createdBy: row.created_by,
  updatedBy: row.updated_by,
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
});

// ---------- Schemas Zod ----------

const createEncounterSchema = z.object({
  patientId: z.string().uuid('ID do paciente inválido.'),
  institutionId: z.string().uuid('ID da instituição inválido.').optional(),
  unitId: z.string().uuid('ID da unidade inválido.').optional().nullable(),
  sectorId: z.string().uuid('ID do setor inválido.').optional().nullable(),
  encounterType: z.enum(['urgency', 'emergency', 'elective', 'return']),
  origin: z.enum(['spontaneous', 'samu', 'transfer', 'rescue_other']),
  chiefComplaint: z.string().min(1, 'A queixa principal é obrigatória.'),
  assignedUserId: z.string().uuid('ID do profissional atribuído inválido.').optional().nullable(),
});

const updateEncounterStatusSchema = z.object({
  status: z.enum([
    'created',
    'triage_pending',
    'triaged',
    'consultation_pending',
    'in_consultation',
    'completed',
    'canceled',
  ]),
  cancelReason: z.string().optional().nullable(),
  expectedUpdatedAt: z.string().datetime('A data expectedUpdatedAt deve estar no formato ISO8601 (UTC).'),
});

export const registerEncounterRoutes = (app: FastifyInstance, pool: pg.Pool | null): void => {
  // ---------- POST /api/v1/encounters (Abertura de atendimento) ----------
  app.post(
    '/api/v1/encounters',
    { preHandler: requireReadAndWrite(pool, 'encounter.write', 'encounter.read') },
    async (req, reply) => {
      const parsed = createEncounterSchema.parse(req.body);
      const identity = req.identity!;

      if (!identity.appUserId) {
        throw new AppError({
          category: ErrorCategory.AUTH,
          code: 'AUTH_REQUIRED',
          message: 'Usuário não possui ID de aplicação associado.',
        });
      }

      const appUserId = identity.appUserId;
      const institutionId = parsed.institutionId || '11c93126-f2b2-47d4-9dd4-88dd547becc1';

      const validatedInput = validateEncounterCreateInput({
        patientId: parsed.patientId,
        institutionId,
        unitId: parsed.unitId ?? null,
        sectorId: parsed.sectorId ?? null,
        encounterType: parsed.encounterType,
        origin: parsed.origin,
        chiefComplaint: parsed.chiefComplaint,
        assignedUserId: parsed.assignedUserId ?? null,
      });

      const encounter = await withSecurityContext(
        pool!,
        { userId: appUserId, roles: identity.roles },
        async (client) => {
          // Verifica se o paciente existe
          const patientCheck = await client.query('select id from app.patients where id = $1', [
            validatedInput.patientId,
          ]);
          if (patientCheck.rowCount === 0) {
            throw new AppError({
              category: ErrorCategory.NOT_FOUND,
              code: 'PATIENT_NOT_FOUND',
              message: 'Paciente não encontrado para abertura de atendimento.',
            });
          }

          // Verifica se já existe atendimento ativo para este paciente na mesma instituição
          const activeCheck = await client.query(
            `select id from app.encounters
             where institution_id = $1 and patient_id = $2 and status not in ('completed', 'canceled')`,
            [validatedInput.institutionId, validatedInput.patientId],
          );
          if ((activeCheck.rowCount ?? 0) > 0) {
            throw new AppError({
              category: ErrorCategory.CONFLICT,
              code: 'ACTIVE_ENCOUNTER_EXISTS',
              message: 'O paciente já possui um atendimento em andamento nesta instituição.',
            });
          }

          // Inserção do atendimento
          const insertRes = await client.query<DbEncounterRow>(
            `insert into app.encounters (
              patient_id, institution_id, unit_id, sector_id, encounter_type, origin,
              chief_complaint, status, assigned_user_id, created_by, updated_by
             ) values ($1, $2, $3, $4, $5, $6, $7, 'created', $8, $9, $9)
             returning *`,
            [
              validatedInput.patientId,
              validatedInput.institutionId,
              validatedInput.unitId ?? null,
              validatedInput.sectorId ?? null,
              validatedInput.encounterType,
              validatedInput.origin,
              validatedInput.chiefComplaint,
              validatedInput.assignedUserId ?? null,
              appUserId,
            ],
          );

          const encRow = insertRes.rows[0];
          if (!encRow) {
            throw new AppError({
              category: ErrorCategory.INTERNAL,
              code: 'ENCOUNTER_INSERT_FAILED',
              message: 'Falha ao inserir registro de atendimento no banco de dados.',
            });
          }

          const enc = mapRowToEncounter(encRow);

          // Evento de domínio + Auditoria
          const openedEvent = createEncounterOpenedEvent(enc, appUserId as UUID);
          await persistDomainEvent(client, {
            id: openedEvent.eventId as UUID,
            eventType: openedEvent.type,
            aggregateType: openedEvent.aggregateType,
            aggregateId: openedEvent.aggregateId as UUID,
            actorUserId: appUserId as UUID,
            patientId: enc.patientId as UUID,
            payload: openedEvent.payload,
            schemaVersion: openedEvent.schemaVersion,
          });

          await auditAction(client, appUserId, 'create', 'encounter', enc.id, req, {
            patientId: enc.patientId,
            encounterType: enc.encounterType,
            origin: enc.origin,
          });

          return enc;
        },
      );

      return reply.code(201).send(success(encounter, req.id));
    },
  );

  // ---------- GET /api/v1/encounters (Listagem/Fila) ----------
  app.get(
    '/api/v1/encounters',
    { preHandler: requirePermission(pool, 'encounter.read') },
    async (req, reply) => {
      const querySchema = z.object({
        patientId: z.string().uuid().optional(),
        status: z
          .enum([
            'created',
            'triage_pending',
            'triaged',
            'consultation_pending',
            'in_consultation',
            'completed',
            'canceled',
          ])
          .optional(),
        sectorId: z.string().uuid().optional(),
      });
      const query = querySchema.parse(req.query);
      const identity = req.identity!;

      if (!identity.appUserId) {
        throw new AppError({
          category: ErrorCategory.AUTH,
          code: 'AUTH_REQUIRED',
          message: 'Usuário não possui ID de aplicação associado.',
        });
      }

      const encounters = await withSecurityContext(
        pool!,
        { userId: identity.appUserId, roles: identity.roles },
        async (client) => {
          const conditions: string[] = [];
          const params: unknown[] = [];

          if (query.patientId) {
            params.push(query.patientId);
            conditions.push(`patient_id = $${params.length}`);
          }
          if (query.status) {
            params.push(query.status);
            conditions.push(`status = $${params.length}`);
          }
          if (query.sectorId) {
            params.push(query.sectorId);
            conditions.push(`sector_id = $${params.length}`);
          }

          const whereClause = conditions.length > 0 ? `where ${conditions.join(' and ')}` : '';
          const res = await client.query<DbEncounterRow>(
            `select * from app.encounters ${whereClause} order by created_at desc limit 100`,
            params,
          );
          return res.rows.map(mapRowToEncounter);
        },
      );

      return reply.send(success(encounters, req.id));
    },
  );

  // ---------- GET /api/v1/encounters/:id (Detalhes) ----------
  app.get(
    '/api/v1/encounters/:id',
    { preHandler: requirePermission(pool, 'encounter.read') },
    async (req, reply) => {
      const paramsSchema = z.object({ id: z.string().uuid('ID de atendimento inválido.') });
      const { id } = paramsSchema.parse(req.params);
      const identity = req.identity!;

      if (!identity.appUserId) {
        throw new AppError({
          category: ErrorCategory.AUTH,
          code: 'AUTH_REQUIRED',
          message: 'Usuário não possui ID de aplicação associado.',
        });
      }

      const encounter = await withSecurityContext(
        pool!,
        { userId: identity.appUserId, roles: identity.roles },
        async (client) => {
          const res = await client.query<DbEncounterRow>('select * from app.encounters where id = $1', [
            id,
          ]);
          if (res.rowCount === 0 || !res.rows[0]) {
            throw new AppError({
              category: ErrorCategory.NOT_FOUND,
              code: 'ENCOUNTER_NOT_FOUND',
              message: 'Atendimento não encontrado.',
            });
          }
          return mapRowToEncounter(res.rows[0]);
        },
      );

      return reply.send(success(encounter, req.id));
    },
  );

  // ---------- PATCH /api/v1/encounters/:id/status (Mudança de Estado / Concorrência Otimista) ----------
  app.patch(
    '/api/v1/encounters/:id/status',
    { preHandler: requireReadAndWrite(pool, 'encounter.write', 'encounter.read') },
    async (req, reply) => {
      const paramsSchema = z.object({ id: z.string().uuid('ID de atendimento inválido.') });
      const { id } = paramsSchema.parse(req.params);
      const parsed = updateEncounterStatusSchema.parse(req.body);
      const identity = req.identity!;

      if (!identity.appUserId) {
        throw new AppError({
          category: ErrorCategory.AUTH,
          code: 'AUTH_REQUIRED',
          message: 'Usuário não possui ID de aplicação associado.',
        });
      }

      const appUserId = identity.appUserId;

      const updatedEncounter = await withSecurityContext(
        pool!,
        { userId: appUserId, roles: identity.roles },
        async (client) => {
          // 1. Busca o estado atual para validar transição no domínio
          const currentRes = await client.query<DbEncounterRow>(
            'select * from app.encounters where id = $1',
            [id],
          );
          if (currentRes.rowCount === 0 || !currentRes.rows[0]) {
            throw new AppError({
              category: ErrorCategory.NOT_FOUND,
              code: 'ENCOUNTER_NOT_FOUND',
              message: 'Atendimento não encontrado para atualização de status.',
            });
          }

          const currentEncounter = mapRowToEncounter(currentRes.rows[0]);
          const oldStatus = currentEncounter.status;

          // Valida transição de estado da máquina de estados (ENC-006)
          assertValidEncounterStatusTransition(oldStatus, parsed.status, parsed.cancelReason);

          // 2. Atualização com LOCK OTIMISTA REAL (`updated_at = expectedUpdatedAt`)
          const updateRes = await client.query<DbEncounterRow>(
            `update app.encounters
             set status = $1, cancel_reason = $2, updated_by = $3, updated_at = now()
             where id = $4 and (updated_at = $5::timestamptz or date_trunc('milliseconds', updated_at) = date_trunc('milliseconds', $5::timestamptz))
             returning *`,
            [parsed.status, parsed.cancelReason || null, appUserId, id, parsed.expectedUpdatedAt],
          );

          if (updateRes.rowCount === 0 || !updateRes.rows[0]) {
            throw new AppError({
              category: ErrorCategory.CONFLICT,
              code: 'CONCURRENCY_CONFLICT',
              message:
                'O registro de atendimento foi modificado por outra operação simultânea. Atualize os dados e tente novamente.',
            });
          }

          const updated = mapRowToEncounter(updateRes.rows[0]);

          // Evento de Mudança de Status
          const statusEvent = createEncounterStatusChangedEvent(
            updated,
            oldStatus,
            appUserId as UUID,
          );
          await persistDomainEvent(client, {
            id: statusEvent.eventId as UUID,
            eventType: statusEvent.type,
            aggregateType: statusEvent.aggregateType,
            aggregateId: statusEvent.aggregateId as UUID,
            actorUserId: appUserId as UUID,
            patientId: updated.patientId as UUID,
            payload: statusEvent.payload,
            schemaVersion: statusEvent.schemaVersion,
          });

          // Se transitou para um estado terminal, emite também o evento EncounterClosed
          if (isTerminalEncounterStatus(updated.status)) {
            const closedEvent = createEncounterClosedEvent(updated, appUserId as UUID);
            await persistDomainEvent(client, {
              id: closedEvent.eventId as UUID,
              eventType: closedEvent.type,
              aggregateType: closedEvent.aggregateType,
              aggregateId: closedEvent.aggregateId as UUID,
              actorUserId: appUserId as UUID,
              patientId: updated.patientId as UUID,
              payload: closedEvent.payload,
              schemaVersion: closedEvent.schemaVersion,
            });
          }

          await auditAction(client, appUserId, 'update', 'encounter', updated.id, req, {
            oldStatus,
            newStatus: updated.status,
            cancelReason: updated.cancelReason ?? null,
          });

          return updated;
        },
      );

      return reply.send(success(updatedEncounter, req.id));
    },
  );
};
