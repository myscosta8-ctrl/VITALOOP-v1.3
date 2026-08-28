/**
 * Rotas de Exames, Procedimentos e Interconsultas (Fase 3, Etapa 5/6) — EXM-001..009.
 *
 * Consome integralmente as regras de `@vitaloop/domain` (packages/domain/src/exam).
 * Conexão com Supabase via `vitaloop_app` (RLS ativa). Transações executadas com `withSecurityContext`.
 */

import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type pg from 'pg';
import { AppError, ErrorCategory, type UUID } from '@vitaloop/shared';
import {
  createExamRequestedEvent,
  createExamResultRecordedEvent,
  createInterconsultationAnsweredEvent,
  createInterconsultationRequestedEvent,
  createProcedureCompletedEvent,
  createProcedureRequestedEvent,
  validateExamRequestInput,
  validateExamResultInput,
  validateInterconsultationInput,
  validateInterconsultationResponseInput,
  validateProcedureExecuteInput,
  validateProcedureRequestInput,
  type ExamCatalogItem,
  type ExamRequest,
  type ExamStatus,
  type ExamType,
  type Interconsultation,
  type InterconsultationPriority,
  type InterconsultationStatus,
  type ProcedureCatalogItem,
  type ProcedureRequest,
  type ProcedureStatus,
} from '@vitaloop/domain';
import { success } from '../http/envelope.js';
import { requirePermission } from '../security/require-auth.js';
import { withSecurityContext } from '../db/security-context.js';
import { sha256Hex } from '../security/hash.js';

const requireExamWriteAndRead = (db: pg.Pool | null) => [
  requirePermission(db, 'exam.write'),
  requirePermission(db, 'exam.read'),
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

interface DbExamRow {
  id: string;
  consultation_id: string;
  encounter_id: string;
  patient_id: string;
  requested_by: string;
  exam_id: string | null;
  exam_name: string;
  exam_type: ExamType;
  clinical_indication: string;
  status: ExamStatus;
  result_summary: string | null;
  result_notes: string | null;
  performed_at: Date | null;
  performed_by: string | null;
  canceled_at: Date | null;
  canceled_by: string | null;
  cancel_reason: string | null;
  created_at: Date;
  updated_at: Date;
}

interface DbProcedureRow {
  id: string;
  consultation_id: string;
  encounter_id: string;
  patient_id: string;
  requested_by: string;
  procedure_id: string | null;
  procedure_name: string;
  instructions: string | null;
  status: ProcedureStatus;
  notes: string | null;
  performed_at: Date | null;
  performed_by: string | null;
  canceled_at: Date | null;
  canceled_by: string | null;
  cancel_reason: string | null;
  created_at: Date;
  updated_at: Date;
}

interface DbInterconsultationRow {
  id: string;
  consultation_id: string;
  encounter_id: string;
  patient_id: string;
  requested_by: string;
  specialty: string;
  priority: InterconsultationPriority;
  clinical_summary: string;
  question: string;
  status: InterconsultationStatus;
  response_notes: string | null;
  responded_by: string | null;
  responded_at: Date | null;
  canceled_at: Date | null;
  canceled_by: string | null;
  cancel_reason: string | null;
  created_at: Date;
  updated_at: Date;
}

const mapRowToExamRequest = (row: DbExamRow): ExamRequest => ({
  id: row.id,
  consultationId: row.consultation_id,
  encounterId: row.encounter_id,
  patientId: row.patient_id,
  requestedBy: row.requested_by,
  examId: row.exam_id,
  examName: row.exam_name,
  examType: row.exam_type,
  clinicalIndication: row.clinical_indication,
  status: row.status,
  resultSummary: row.result_summary,
  resultNotes: row.result_notes,
  performedAt: row.performed_at ? new Date(row.performed_at).toISOString() : null,
  performedBy: row.performed_by,
  canceledAt: row.canceled_at ? new Date(row.canceled_at).toISOString() : null,
  canceledBy: row.canceled_by,
  cancelReason: row.cancel_reason,
  createdAt: new Date(row.created_at).toISOString(),
  updatedAt: new Date(row.updated_at).toISOString(),
});

const mapRowToProcedureRequest = (row: DbProcedureRow): ProcedureRequest => ({
  id: row.id,
  consultationId: row.consultation_id,
  encounterId: row.encounter_id,
  patientId: row.patient_id,
  requestedBy: row.requested_by,
  procedureId: row.procedure_id,
  procedureName: row.procedure_name,
  instructions: row.instructions,
  status: row.status,
  notes: row.notes,
  performedAt: row.performed_at ? new Date(row.performed_at).toISOString() : null,
  performedBy: row.performed_by,
  canceledAt: row.canceled_at ? new Date(row.canceled_at).toISOString() : null,
  canceledBy: row.canceled_by,
  cancelReason: row.cancel_reason,
  createdAt: new Date(row.created_at).toISOString(),
  updatedAt: new Date(row.updated_at).toISOString(),
});

const mapRowToInterconsultation = (row: DbInterconsultationRow): Interconsultation => ({
  id: row.id,
  consultationId: row.consultation_id,
  encounterId: row.encounter_id,
  patientId: row.patient_id,
  requestedBy: row.requested_by,
  specialty: row.specialty,
  priority: row.priority,
  clinicalSummary: row.clinical_summary,
  question: row.question,
  status: row.status,
  responseNotes: row.response_notes,
  respondedBy: row.responded_by,
  respondedAt: row.responded_at ? new Date(row.responded_at).toISOString() : null,
  canceledAt: row.canceled_at ? new Date(row.canceled_at).toISOString() : null,
  canceledBy: row.canceled_by,
  cancelReason: row.cancel_reason,
  createdAt: new Date(row.created_at).toISOString(),
  updatedAt: new Date(row.updated_at).toISOString(),
});

const createExamBodySchema = z.object({
  examId: z.string().optional().nullable(),
  examName: z.string().min(1, 'Nome do exame é obrigatório.'),
  examType: z.enum(['laboratory', 'imaging', 'other'] as const).optional(),
  clinicalIndication: z.string().min(5, 'Indicação clínica de no mínimo 5 caracteres é obrigatória.'),
});

const recordExamResultBodySchema = z.object({
  resultSummary: z.string().min(1, 'Resumo do resultado é obrigatório.'),
  resultNotes: z.string().optional().nullable(),
});

const createProcedureBodySchema = z.object({
  procedureId: z.string().optional().nullable(),
  procedureName: z.string().min(1, 'Nome do procedimento é obrigatório.'),
  instructions: z.string().optional().nullable(),
});

const executeProcedureBodySchema = z.object({
  notes: z.string().optional().nullable(),
});

const createInterconsultationBodySchema = z.object({
  specialty: z.string().min(1, 'Especialidade é obrigatória.'),
  priority: z.enum(['routine', 'urgent', 'emergency'] as const).optional(),
  clinicalSummary: z.string().min(1, 'Resumo clínico é obrigatório.'),
  question: z.string().min(1, 'Dúvida/Quesito é obrigatório.'),
});

const responseInterconsultationBodySchema = z.object({
  responseNotes: z.string().min(10, 'Parecer do especialista deve ter no mínimo 10 caracteres.'),
});

export const registerExamRoutes = (app: FastifyInstance, pool: pg.Pool | null): void => {
  // ---------- GET /api/v1/exams/catalog ----------
  app.get('/api/v1/exams/catalog', { preHandler: requirePermission(pool, 'exam.read') }, async (req, reply) => {
    const querySchema = z.object({ q: z.string().default('') });
    const { q } = querySchema.parse(req.query);
    const identity = req.identity!;

    if (!identity.appUserId) {
      throw new AppError({ category: ErrorCategory.AUTH, code: 'AUTH_REQUIRED', message: 'Usuário não autenticado.' });
    }

    const term = q.trim();
    const items = await withSecurityContext(pool!, { userId: identity.appUserId, roles: identity.roles }, async (client) => {
      const sql = term
        ? 'select id, code, name, type, category, is_active from app.exam_catalog where is_active = true and (name ilike $1 or code ilike $1) order by name asc limit 25'
        : 'select id, code, name, type, category, is_active from app.exam_catalog where is_active = true order by name asc limit 25';
      const params = term ? [`%${term}%`] : [];
      const res = await client.query(sql, params);
      return res.rows.map((r) => ({
        id: r.id,
        code: r.code,
        name: r.name,
        type: r.type,
        category: r.category,
        isActive: r.is_active,
      })) as ExamCatalogItem[];
    });

    return reply.send(success(items, req.id));
  });

  // ---------- GET /api/v1/procedures/catalog ----------
  app.get('/api/v1/procedures/catalog', { preHandler: requirePermission(pool, 'exam.read') }, async (req, reply) => {
    const querySchema = z.object({ q: z.string().default('') });
    const { q } = querySchema.parse(req.query);
    const identity = req.identity!;

    if (!identity.appUserId) {
      throw new AppError({ category: ErrorCategory.AUTH, code: 'AUTH_REQUIRED', message: 'Usuário não autenticado.' });
    }

    const term = q.trim();
    const items = await withSecurityContext(pool!, { userId: identity.appUserId, roles: identity.roles }, async (client) => {
      const sql = term
        ? 'select id, code, name, category, is_active from app.procedure_catalog where is_active = true and (name ilike $1 or code ilike $1) order by name asc limit 25'
        : 'select id, code, name, category, is_active from app.procedure_catalog where is_active = true order by name asc limit 25';
      const params = term ? [`%${term}%`] : [];
      const res = await client.query(sql, params);
      return res.rows.map((r) => ({
        id: r.id,
        code: r.code,
        name: r.name,
        category: r.category,
        isActive: r.is_active,
      })) as ProcedureCatalogItem[];
    });

    return reply.send(success(items, req.id));
  });

  // ---------- POST /api/v1/encounters/:encounterId/exams (Solicitar Exame) ----------
  app.post(
    '/api/v1/encounters/:encounterId/exams',
    { preHandler: requireExamWriteAndRead(pool) },
    async (req, reply) => {
      const { encounterId } = z.object({ encounterId: z.string().uuid() }).parse(req.params);
      const parsedBody = createExamBodySchema.parse(req.body);
      const identity = req.identity!;
      const doctorId = identity.appUserId!;

      const created = await withSecurityContext(pool!, { userId: doctorId, roles: identity.roles }, async (client) => {
        const consRes = await client.query('select id, patient_id from app.medical_consultations where encounter_id = $1', [encounterId]);
        if (consRes.rowCount === 0) {
          throw new AppError({ category: ErrorCategory.NOT_FOUND, code: 'CONSULTATION_NOT_FOUND', message: 'Consulta médica não encontrada.' });
        }
        const cons = consRes.rows[0];

        const validated = validateExamRequestInput({
          consultationId: cons.id,
          encounterId,
          patientId: cons.patient_id,
          examId: parsedBody.examId,
          examName: parsedBody.examName,
          examType: parsedBody.examType,
          clinicalIndication: parsedBody.clinicalIndication,
        });

        const insertRes = await client.query<DbExamRow>(
          `insert into app.exam_requests (consultation_id, encounter_id, patient_id, requested_by, exam_id, exam_name, exam_type, clinical_indication, status)
           values ($1, $2, $3, $4, $5, $6, $7, $8, 'requested')
           returning *`,
          [cons.id, encounterId, cons.patient_id, doctorId, validated.examId ?? null, validated.examName, validated.examType, validated.clinicalIndication],
        );

        const examReq = mapRowToExamRequest(insertRes.rows[0]!);
        const ev = createExamRequestedEvent(examReq, doctorId as UUID);
        await persistDomainEvent(client, {
          id: ev.eventId,
          eventType: ev.type,
          aggregateType: ev.aggregateType,
          aggregateId: ev.aggregateId,
          actorUserId: doctorId as UUID,
          patientId: cons.patient_id as UUID,
          payload: ev.payload,
          schemaVersion: ev.schemaVersion,
        });

        await auditAction(client, doctorId, 'create', 'exam_request', examReq.id, req, { encounterId, examName: examReq.examName });
        return examReq;
      });

      return reply.status(201).send(success(created, req.id));
    },
  );

  // ---------- GET /api/v1/encounters/:encounterId/exams (Listar Exames) ----------
  app.get('/api/v1/encounters/:encounterId/exams', { preHandler: requirePermission(pool, 'exam.read') }, async (req, reply) => {
    const { encounterId } = z.object({ encounterId: z.string().uuid() }).parse(req.params);
    const identity = req.identity!;

    const list = await withSecurityContext(pool!, { userId: identity.appUserId!, roles: identity.roles }, async (client) => {
      const res = await client.query<DbExamRow>('select * from app.exam_requests where encounter_id = $1 order by created_at desc', [encounterId]);
      return res.rows.map(mapRowToExamRequest);
    });

    return reply.send(success(list, req.id));
  });

  // ---------- PATCH /api/v1/encounters/:encounterId/exams/:examRequestId/result (Lançar Resultado) ----------
  app.patch(
    '/api/v1/encounters/:encounterId/exams/:examRequestId/result',
    { preHandler: requireExamWriteAndRead(pool) },
    async (req, reply) => {
      const { encounterId, examRequestId } = z.object({ encounterId: z.string().uuid(), examRequestId: z.string().uuid() }).parse(req.params);
      const parsedBody = recordExamResultBodySchema.parse(req.body);
      const identity = req.identity!;
      const userId = identity.appUserId!;

      const updated = await withSecurityContext(pool!, { userId, roles: identity.roles }, async (client) => {
        const validated = validateExamResultInput({ examRequestId, resultSummary: parsedBody.resultSummary, resultNotes: parsedBody.resultNotes });

        const updateRes = await client.query<DbExamRow>(
          `update app.exam_requests
           set status = 'completed', result_summary = $1, result_notes = $2, performed_at = now(), performed_by = $3, updated_at = now()
           where id = $4 and encounter_id = $5
           returning *`,
          [validated.resultSummary, validated.resultNotes ?? null, userId, examRequestId, encounterId],
        );

        if (updateRes.rowCount === 0) {
          throw new AppError({ category: ErrorCategory.NOT_FOUND, code: 'EXAM_NOT_FOUND', message: 'Solicitação de exame não encontrada.' });
        }

        const examReq = mapRowToExamRequest(updateRes.rows[0]!);
        const ev = createExamResultRecordedEvent(examReq, userId as UUID);
        await persistDomainEvent(client, {
          id: ev.eventId,
          eventType: ev.type,
          aggregateType: ev.aggregateType,
          aggregateId: ev.aggregateId,
          actorUserId: userId as UUID,
          patientId: examReq.patientId as UUID,
          payload: ev.payload,
          schemaVersion: ev.schemaVersion,
        });

        await auditAction(client, userId, 'update', 'exam_request', examRequestId, req, { status: 'completed' });
        return examReq;
      });

      return reply.send(success(updated, req.id));
    },
  );

  // ---------- POST /api/v1/encounters/:encounterId/procedures (Solicitar Procedimento) ----------
  app.post(
    '/api/v1/encounters/:encounterId/procedures',
    { preHandler: requireExamWriteAndRead(pool) },
    async (req, reply) => {
      const { encounterId } = z.object({ encounterId: z.string().uuid() }).parse(req.params);
      const parsedBody = createProcedureBodySchema.parse(req.body);
      const identity = req.identity!;
      const doctorId = identity.appUserId!;

      const created = await withSecurityContext(pool!, { userId: doctorId, roles: identity.roles }, async (client) => {
        const consRes = await client.query('select id, patient_id from app.medical_consultations where encounter_id = $1', [encounterId]);
        if (consRes.rowCount === 0) {
          throw new AppError({ category: ErrorCategory.NOT_FOUND, code: 'CONSULTATION_NOT_FOUND', message: 'Consulta médica não encontrada.' });
        }
        const cons = consRes.rows[0];

        const validated = validateProcedureRequestInput({
          consultationId: cons.id,
          encounterId,
          patientId: cons.patient_id,
          procedureId: parsedBody.procedureId,
          procedureName: parsedBody.procedureName,
          instructions: parsedBody.instructions,
        });

        const insertRes = await client.query<DbProcedureRow>(
          `insert into app.procedure_requests (consultation_id, encounter_id, patient_id, requested_by, procedure_id, procedure_name, instructions, status)
           values ($1, $2, $3, $4, $5, $6, $7, 'requested')
           returning *`,
          [cons.id, encounterId, cons.patient_id, doctorId, validated.procedureId ?? null, validated.procedureName, validated.instructions ?? null],
        );

        const procReq = mapRowToProcedureRequest(insertRes.rows[0]!);
        const ev = createProcedureRequestedEvent(procReq, doctorId as UUID);
        await persistDomainEvent(client, {
          id: ev.eventId,
          eventType: ev.type,
          aggregateType: ev.aggregateType,
          aggregateId: ev.aggregateId,
          actorUserId: doctorId as UUID,
          patientId: cons.patient_id as UUID,
          payload: ev.payload,
          schemaVersion: ev.schemaVersion,
        });

        await auditAction(client, doctorId, 'create', 'procedure_request', procReq.id, req, { encounterId, procedureName: procReq.procedureName });
        return procReq;
      });

      return reply.status(201).send(success(created, req.id));
    },
  );

  // ---------- GET /api/v1/encounters/:encounterId/procedures ----------
  app.get('/api/v1/encounters/:encounterId/procedures', { preHandler: requirePermission(pool, 'exam.read') }, async (req, reply) => {
    const { encounterId } = z.object({ encounterId: z.string().uuid() }).parse(req.params);
    const identity = req.identity!;

    const list = await withSecurityContext(pool!, { userId: identity.appUserId!, roles: identity.roles }, async (client) => {
      const res = await client.query<DbProcedureRow>('select * from app.procedure_requests where encounter_id = $1 order by created_at desc', [encounterId]);
      return res.rows.map(mapRowToProcedureRequest);
    });

    return reply.send(success(list, req.id));
  });

  // ---------- PATCH /api/v1/encounters/:encounterId/procedures/:procedureRequestId/execute ----------
  app.patch(
    '/api/v1/encounters/:encounterId/procedures/:procedureRequestId/execute',
    { preHandler: requireExamWriteAndRead(pool) },
    async (req, reply) => {
      const { encounterId, procedureRequestId } = z.object({ encounterId: z.string().uuid(), procedureRequestId: z.string().uuid() }).parse(req.params);
      const parsedBody = executeProcedureBodySchema.parse(req.body);
      const identity = req.identity!;
      const userId = identity.appUserId!;

      const updated = await withSecurityContext(pool!, { userId, roles: identity.roles }, async (client) => {
        const validated = validateProcedureExecuteInput({ procedureRequestId, notes: parsedBody.notes });

        const updateRes = await client.query<DbProcedureRow>(
          `update app.procedure_requests
           set status = 'completed', notes = $1, performed_at = now(), performed_by = $2, updated_at = now()
           where id = $3 and encounter_id = $4
           returning *`,
          [validated.notes ?? null, userId, procedureRequestId, encounterId],
        );

        if (updateRes.rowCount === 0) {
          throw new AppError({ category: ErrorCategory.NOT_FOUND, code: 'PROCEDURE_NOT_FOUND', message: 'Procedimento não encontrado.' });
        }

        const procReq = mapRowToProcedureRequest(updateRes.rows[0]!);
        const ev = createProcedureCompletedEvent(procReq, userId as UUID);
        await persistDomainEvent(client, {
          id: ev.eventId,
          eventType: ev.type,
          aggregateType: ev.aggregateType,
          aggregateId: ev.aggregateId,
          actorUserId: userId as UUID,
          patientId: procReq.patientId as UUID,
          payload: ev.payload,
          schemaVersion: ev.schemaVersion,
        });

        await auditAction(client, userId, 'update', 'procedure_request', procedureRequestId, req, { status: 'completed' });
        return procReq;
      });

      return reply.send(success(updated, req.id));
    },
  );

  // ---------- POST /api/v1/encounters/:encounterId/interconsultations (Solicitar Interconsulta) ----------
  app.post(
    '/api/v1/encounters/:encounterId/interconsultations',
    { preHandler: requireExamWriteAndRead(pool) },
    async (req, reply) => {
      const { encounterId } = z.object({ encounterId: z.string().uuid() }).parse(req.params);
      const parsedBody = createInterconsultationBodySchema.parse(req.body);
      const identity = req.identity!;
      const doctorId = identity.appUserId!;

      const created = await withSecurityContext(pool!, { userId: doctorId, roles: identity.roles }, async (client) => {
        const consRes = await client.query('select id, patient_id from app.medical_consultations where encounter_id = $1', [encounterId]);
        if (consRes.rowCount === 0) {
          throw new AppError({ category: ErrorCategory.NOT_FOUND, code: 'CONSULTATION_NOT_FOUND', message: 'Consulta médica não encontrada.' });
        }
        const cons = consRes.rows[0];

        const validated = validateInterconsultationInput({
          consultationId: cons.id,
          encounterId,
          patientId: cons.patient_id,
          specialty: parsedBody.specialty,
          priority: parsedBody.priority,
          clinicalSummary: parsedBody.clinicalSummary,
          question: parsedBody.question,
        });

        const insertRes = await client.query<DbInterconsultationRow>(
          `insert into app.interconsultations (consultation_id, encounter_id, patient_id, requested_by, specialty, priority, clinical_summary, question, status)
           values ($1, $2, $3, $4, $5, $6, $7, $8, 'requested')
           returning *`,
          [cons.id, encounterId, cons.patient_id, doctorId, validated.specialty, validated.priority, validated.clinicalSummary, validated.question],
        );

        const inter = mapRowToInterconsultation(insertRes.rows[0]!);
        const ev = createInterconsultationRequestedEvent(inter, doctorId as UUID);
        await persistDomainEvent(client, {
          id: ev.eventId,
          eventType: ev.type,
          aggregateType: ev.aggregateType,
          aggregateId: ev.aggregateId,
          actorUserId: doctorId as UUID,
          patientId: cons.patient_id as UUID,
          payload: ev.payload,
          schemaVersion: ev.schemaVersion,
        });

        await auditAction(client, doctorId, 'create', 'interconsultation', inter.id, req, { encounterId, specialty: inter.specialty });
        return inter;
      });

      return reply.status(201).send(success(created, req.id));
    },
  );

  // ---------- GET /api/v1/encounters/:encounterId/interconsultations ----------
  app.get('/api/v1/encounters/:encounterId/interconsultations', { preHandler: requirePermission(pool, 'exam.read') }, async (req, reply) => {
    const { encounterId } = z.object({ encounterId: z.string().uuid() }).parse(req.params);
    const identity = req.identity!;

    const list = await withSecurityContext(pool!, { userId: identity.appUserId!, roles: identity.roles }, async (client) => {
      const res = await client.query<DbInterconsultationRow>('select * from app.interconsultations where encounter_id = $1 order by created_at desc', [encounterId]);
      return res.rows.map(mapRowToInterconsultation);
    });

    return reply.send(success(list, req.id));
  });

  // ---------- PATCH /api/v1/encounters/:encounterId/interconsultations/:interconsultationId/response ----------
  app.patch(
    '/api/v1/encounters/:encounterId/interconsultations/:interconsultationId/response',
    { preHandler: requireExamWriteAndRead(pool) },
    async (req, reply) => {
      const { encounterId, interconsultationId } = z.object({ encounterId: z.string().uuid(), interconsultationId: z.string().uuid() }).parse(req.params);
      const parsedBody = responseInterconsultationBodySchema.parse(req.body);
      const identity = req.identity!;
      const userId = identity.appUserId!;

      const updated = await withSecurityContext(pool!, { userId, roles: identity.roles }, async (client) => {
        const validated = validateInterconsultationResponseInput({ interconsultationId, responseNotes: parsedBody.responseNotes });

        const updateRes = await client.query<DbInterconsultationRow>(
          `update app.interconsultations
           set status = 'answered', response_notes = $1, responded_by = $2, responded_at = now(), updated_at = now()
           where id = $3 and encounter_id = $4
           returning *`,
          [validated.responseNotes, userId, interconsultationId, encounterId],
        );

        if (updateRes.rowCount === 0) {
          throw new AppError({ category: ErrorCategory.NOT_FOUND, code: 'INTERCONSULTATION_NOT_FOUND', message: 'Interconsulta não encontrada.' });
        }

        const inter = mapRowToInterconsultation(updateRes.rows[0]!);
        const ev = createInterconsultationAnsweredEvent(inter, userId as UUID);
        await persistDomainEvent(client, {
          id: ev.eventId,
          eventType: ev.type,
          aggregateType: ev.aggregateType,
          aggregateId: ev.aggregateId,
          actorUserId: userId as UUID,
          patientId: inter.patientId as UUID,
          payload: ev.payload,
          schemaVersion: ev.schemaVersion,
        });

        await auditAction(client, userId, 'update', 'interconsultation', interconsultationId, req, { status: 'answered' });
        return inter;
      });

      return reply.send(success(updated, req.id));
    },
  );
};
