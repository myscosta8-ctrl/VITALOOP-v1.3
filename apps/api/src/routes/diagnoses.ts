/**
 * Rotas de Diagnósticos Clínicos e Catálogo CID-10 (Fase 3, Etapa 3/6) — MED-005, MED-006.
 *
 * Consome integralmente as regras de `@vitaloop/domain` (packages/domain/src/diagnosis).
 * Conexão com Supabase via `vitaloop_app` (RLS ativa). Transações executadas com `withSecurityContext`.
 */

import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type pg from 'pg';
import { AppError, ErrorCategory, type UUID } from '@vitaloop/shared';
import {
  createPatientDiagnosisRecordedEvent,
  createPatientDiagnosisUpdatedEvent,
  validateDiagnosisCreateInput,
  validateDiagnosisStatusUpdate,
  type CidItem,
  type DiagnosisStatus,
  type DiagnosisType,
  type EncounterDiagnosis,
} from '@vitaloop/domain';
import { success } from '../http/envelope.js';
import { requirePermission } from '../security/require-auth.js';
import { withSecurityContext } from '../db/security-context.js';
import { sha256Hex } from '../security/hash.js';

const requireDiagnosisWriteAndRead = (db: pg.Pool | null) => [
  requirePermission(db, 'diagnosis.write'),
  requirePermission(db, 'diagnosis.read'),
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

interface DbDiagnosisRow {
  id: string;
  consultation_id: string;
  encounter_id: string;
  patient_id: string;
  doctor_id: string;
  cid_code: string;
  cid_description?: string | null | undefined;
  diagnosis_type: DiagnosisType;
  status: DiagnosisStatus;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

const mapRowToDiagnosis = (row: DbDiagnosisRow): EncounterDiagnosis => ({
  id: row.id,
  consultationId: row.consultation_id,
  encounterId: row.encounter_id,
  patientId: row.patient_id,
  doctorId: row.doctor_id,
  cidCode: row.cid_code,
  cidDescription: row.cid_description,
  diagnosisType: row.diagnosis_type,
  status: row.status,
  notes: row.notes,
  createdAt: new Date(row.created_at).toISOString(),
  updatedAt: new Date(row.updated_at).toISOString(),
});

const createDiagnosisBodySchema = z.object({
  cidCode: z.string().min(1, 'O código CID-10 é obrigatório.'),
  diagnosisType: z.enum(['principal', 'secondary'] as const),
  notes: z.string().optional().nullable(),
});

const updateStatusBodySchema = z.object({
  status: z.enum(['active', 'resolved', 'refuted'] as const),
  notes: z.string().optional().nullable(),
});

export const registerDiagnosisRoutes = (app: FastifyInstance, pool: pg.Pool | null): void => {
  // ---------- GET /api/v1/cid/search (Pesquisa no Catálogo CID-10) ----------
  app.get(
    '/api/v1/cid/search',
    { preHandler: requirePermission(pool, 'diagnosis.read') },
    async (req, reply) => {
      const querySchema = z.object({ q: z.string().default('') });
      const { q } = querySchema.parse(req.query);
      const identity = req.identity!;

      if (!identity.appUserId) {
        throw new AppError({
          category: ErrorCategory.AUTH,
          code: 'AUTH_REQUIRED',
          message: 'Usuário não possui ID de aplicação associado.',
        });
      }

      const term = q.trim();

      const items = await withSecurityContext(
        pool!,
        { userId: identity.appUserId, roles: identity.roles },
        async (client) => {
          if (!term) {
            const res = await client.query(
              'select code, description, chapter, is_active from app.cid_catalog where is_active = true order by code asc limit 20',
            );
            return res.rows.map((r) => ({
              code: r.code,
              description: r.description,
              chapter: r.chapter,
              isActive: r.is_active,
            })) as CidItem[];
          }

          const res = await client.query(
            `select code, description, chapter, is_active
             from app.cid_catalog
             where is_active = true and (code ilike $1 or description ilike $1)
             order by case when code ilike $2 then 0 else 1 end, code asc
             limit 20`,
            [`%${term}%`, `${term}%`],
          );

          return res.rows.map((r) => ({
            code: r.code,
            description: r.description,
            chapter: r.chapter,
            isActive: r.is_active,
          })) as CidItem[];
        },
      );

      return reply.send(success(items, req.id));
    },
  );

  // ---------- POST /api/v1/encounters/:encounterId/diagnoses (Adicionar Diagnóstico) ----------
  app.post(
    '/api/v1/encounters/:encounterId/diagnoses',
    { preHandler: requireDiagnosisWriteAndRead(pool) },
    async (req, reply) => {
      const paramsSchema = z.object({ encounterId: z.string().uuid('ID de atendimento inválido.') });
      const { encounterId } = paramsSchema.parse(req.params);
      const parsedBody = createDiagnosisBodySchema.parse(req.body);
      const identity = req.identity!;

      if (!identity.appUserId) {
        throw new AppError({
          category: ErrorCategory.AUTH,
          code: 'AUTH_REQUIRED',
          message: 'Usuário não possui ID de aplicação associado.',
        });
      }

      const doctorId = identity.appUserId;

      const newDiagnosis = await withSecurityContext(
        pool!,
        { userId: doctorId, roles: identity.roles },
        async (client) => {
          // 1. Verifica se existe consulta médica ativa para este atendimento
          const consRes = await client.query(
            'select id, patient_id from app.medical_consultations where encounter_id = $1',
            [encounterId],
          );

          if (consRes.rowCount === 0 || !consRes.rows[0]) {
            throw new AppError({
              category: ErrorCategory.NOT_FOUND,
              code: 'CONSULTATION_NOT_FOUND',
              message: 'Não é possível registrar diagnóstico sem consulta médica aberta no atendimento.',
            });
          }

          const cons = consRes.rows[0];

          // 2. Valida regras de domínio para criação do diagnóstico (MED-005)
          const validated = validateDiagnosisCreateInput({
            consultationId: cons.id,
            encounterId,
            patientId: cons.patient_id,
            ...parsedBody,
          });

          // 3. Verifica se o CID-10 existe no catálogo
          const cidRes = await client.query('select code, description from app.cid_catalog where code = $1', [
            validated.cidCode,
          ]);

          if (cidRes.rowCount === 0 || !cidRes.rows[0]) {
            throw new AppError({
              category: ErrorCategory.NOT_FOUND,
              code: 'CID_CODE_NOT_FOUND',
              message: `Código CID-10 '${validated.cidCode}' não encontrado no catálogo.`,
            });
          }

          const cidDesc = cidRes.rows[0].description;

          // 4. Inserção no banco com tratamento de unique constraints
          let insertRes;
          try {
            insertRes = await client.query<DbDiagnosisRow>(
              `insert into app.encounter_diagnoses (
                 consultation_id, encounter_id, patient_id, doctor_id, cid_code, diagnosis_type, status, notes
               ) values ($1, $2, $3, $4, $5, $6, 'active', $7)
               returning *`,
              [
                cons.id,
                encounterId,
                cons.patient_id,
                doctorId,
                validated.cidCode,
                validated.diagnosisType,
                validated.notes ?? null,
              ],
            );
          } catch (err: unknown) {
            const pgErr = err as { code?: string; constraint?: string };
            if (pgErr.code === '23505') {
              if (pgErr.constraint === 'encounter_diagnoses_single_principal_uk') {
                throw new AppError({
                  category: ErrorCategory.CONFLICT,
                  code: 'PRINCIPAL_DIAGNOSIS_ALREADY_EXISTS',
                  message: 'Já existe um diagnóstico principal ativo registrado para este atendimento.',
                });
              }
              if (pgErr.constraint === 'encounter_diagnoses_unique_cid_uk') {
                throw new AppError({
                  category: ErrorCategory.CONFLICT,
                  code: 'CID_ALREADY_ADDED',
                  message: `O código CID-10 '${validated.cidCode}' já está registrado como diagnóstico ativo para este atendimento.`,
                });
              }
            }
            throw err;
          }

          const created = mapRowToDiagnosis({
            ...insertRes.rows[0]!,
            cid_description: cidDesc,
          });

          // 5. Grava evento de domínio e auditoria
          const recordedEvent = createPatientDiagnosisRecordedEvent(created, doctorId as UUID);
          await persistDomainEvent(client, {
            id: recordedEvent.eventId,
            eventType: recordedEvent.type,
            aggregateType: recordedEvent.aggregateType,
            aggregateId: recordedEvent.aggregateId,
            actorUserId: (recordedEvent.actorId as UUID) || (doctorId as UUID),
            patientId: created.patientId as UUID,
            payload: recordedEvent.payload,
            schemaVersion: recordedEvent.schemaVersion,
          });

          await auditAction(client, doctorId, 'create', 'encounter_diagnosis', created.id, req, {
            encounterId,
            cidCode: created.cidCode,
            diagnosisType: created.diagnosisType,
          });

          return created;
        },
      );

      return reply.status(201).send(success(newDiagnosis, req.id));
    },
  );

  // ---------- GET /api/v1/encounters/:encounterId/diagnoses (Listar Diagnósticos do Atendimento) ----------
  app.get(
    '/api/v1/encounters/:encounterId/diagnoses',
    { preHandler: requirePermission(pool, 'diagnosis.read') },
    async (req, reply) => {
      const paramsSchema = z.object({ encounterId: z.string().uuid('ID de atendimento inválido.') });
      const { encounterId } = paramsSchema.parse(req.params);
      const identity = req.identity!;

      if (!identity.appUserId) {
        throw new AppError({
          category: ErrorCategory.AUTH,
          code: 'AUTH_REQUIRED',
          message: 'Usuário não possui ID de aplicação associado.',
        });
      }

      const list = await withSecurityContext(
        pool!,
        { userId: identity.appUserId, roles: identity.roles },
        async (client) => {
          const res = await client.query<DbDiagnosisRow>(
            `select d.*, c.description as cid_description
             from app.encounter_diagnoses d
             join app.cid_catalog c on c.code = d.cid_code
             where d.encounter_id = $1
             order by case when d.diagnosis_type = 'principal' then 0 else 1 end, d.created_at asc`,
            [encounterId],
          );

          return res.rows.map(mapRowToDiagnosis);
        },
      );

      return reply.send(success(list, req.id));
    },
  );

  // ---------- PATCH /api/v1/encounters/:encounterId/diagnoses/:diagnosisId/status (Alterar Situação do Diagnóstico) ----------
  app.patch(
    '/api/v1/encounters/:encounterId/diagnoses/:diagnosisId/status',
    { preHandler: requireDiagnosisWriteAndRead(pool) },
    async (req, reply) => {
      const paramsSchema = z.object({
        encounterId: z.string().uuid('ID de atendimento inválido.'),
        diagnosisId: z.string().uuid('ID do diagnóstico inválido.'),
      });
      const { encounterId, diagnosisId } = paramsSchema.parse(req.params);
      const parsedBody = updateStatusBodySchema.parse(req.body);
      const identity = req.identity!;

      if (!identity.appUserId) {
        throw new AppError({
          category: ErrorCategory.AUTH,
          code: 'AUTH_REQUIRED',
          message: 'Usuário não possui ID de aplicação associado.',
        });
      }

      const doctorId = identity.appUserId;

      const updated = await withSecurityContext(
        pool!,
        { userId: doctorId, roles: identity.roles },
        async (client) => {
          const validated = validateDiagnosisStatusUpdate({
            diagnosisId,
            ...parsedBody,
          });

          const diagRes = await client.query<DbDiagnosisRow>(
            `select d.*, c.description as cid_description
             from app.encounter_diagnoses d
             join app.cid_catalog c on c.code = d.cid_code
             where d.id = $1 and d.encounter_id = $2`,
            [diagnosisId, encounterId],
          );

          if (diagRes.rowCount === 0 || !diagRes.rows[0]) {
            throw new AppError({
              category: ErrorCategory.NOT_FOUND,
              code: 'DIAGNOSIS_NOT_FOUND',
              message: 'Diagnóstico não encontrado para este atendimento.',
            });
          }

          const updateRes = await client.query<DbDiagnosisRow>(
            `update app.encounter_diagnoses
             set status = $1, notes = coalesce($2, notes), updated_at = now()
             where id = $3
             returning *`,
            [validated.status, validated.notes ?? null, diagnosisId],
          );

          const updatedDiagnosis = mapRowToDiagnosis({
            ...updateRes.rows[0]!,
            cid_description: diagRes.rows[0].cid_description,
          });

          const recordedEvent = createPatientDiagnosisUpdatedEvent(updatedDiagnosis, doctorId as UUID);
          await persistDomainEvent(client, {
            id: recordedEvent.eventId,
            eventType: recordedEvent.type,
            aggregateType: recordedEvent.aggregateType,
            aggregateId: recordedEvent.aggregateId,
            actorUserId: (recordedEvent.actorId as UUID) || (doctorId as UUID),
            patientId: updatedDiagnosis.patientId as UUID,
            payload: recordedEvent.payload,
            schemaVersion: recordedEvent.schemaVersion,
          });

          await auditAction(client, doctorId, 'update', 'encounter_diagnosis', updatedDiagnosis.id, req, {
            encounterId,
            newStatus: updatedDiagnosis.status,
            notes: updatedDiagnosis.notes,
          });

          return updatedDiagnosis;
        },
      );

      return reply.send(success(updated, req.id));
    },
  );
};
