/**
 * Rotas de Atendimento Médico: Consulta, Anamnese, Exame Físico e Evoluções (Fase 3, Etapa 2/6) — MED-001..004.
 *
 * Consome integralmente as regras de `@vitaloop/domain` (packages/domain/src/medical).
 * Conexão com Supabase via `vitaloop_app` (RLS ativa). Transações executadas com `withSecurityContext`.
 */

import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type pg from 'pg';
import { AppError, ErrorCategory, type UUID } from '@vitaloop/shared';
import {
  assertEncounterStatusPermitsConsultation,
  createMedicalConsultationRecordedEvent,
  createMedicalEvolutionRecordedEvent,
  validateConsultationCreateInput,
  validateEvolutionCreateInput,
  type MedicalConsultation,
  type MedicalEvolution,
  type SegmentalExam,
} from '@vitaloop/domain';
import { success } from '../http/envelope.js';
import { requirePermission } from '../security/require-auth.js';
import { withSecurityContext } from '../db/security-context.js';
import { sha256Hex } from '../security/hash.js';

const requireMedicalWriteAndRead = (db: pg.Pool | null) => [
  requirePermission(db, 'medical.write'),
  requirePermission(db, 'medical.read'),
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

interface DbConsultationRow {
  id: string;
  encounter_id: string;
  patient_id: string;
  doctor_id: string;
  chief_complaint: string;
  history_present_illness: string;
  past_medical_history: string | null;
  system_review: string | null;
  general_exam: string;
  segmental_exam: SegmentalExam;
  diagnostic_hypothesis: string;
  initial_conduct: string | null;
  created_at: Date;
  updated_at: Date;
}

interface DbEvolutionRow {
  id: string;
  consultation_id: string;
  encounter_id: string;
  patient_id: string;
  doctor_id: string;
  evolution_text: string;
  clinical_status: string | null;
  created_at: Date;
}

const mapRowToConsultation = (row: DbConsultationRow): MedicalConsultation => ({
  id: row.id,
  encounterId: row.encounter_id,
  patientId: row.patient_id,
  doctorId: row.doctor_id,
  chiefComplaint: row.chief_complaint,
  historyPresentIllness: row.history_present_illness,
  pastMedicalHistory: row.past_medical_history,
  systemReview: row.system_review,
  generalExam: row.general_exam,
  segmentalExam: row.segmental_exam || {},
  diagnosticHypothesis: row.diagnostic_hypothesis,
  initialConduct: row.initial_conduct,
  createdAt: new Date(row.created_at).toISOString(),
  updatedAt: new Date(row.updated_at).toISOString(),
});

const mapRowToEvolution = (row: DbEvolutionRow): MedicalEvolution => ({
  id: row.id,
  consultationId: row.consultation_id,
  encounterId: row.encounter_id,
  patientId: row.patient_id,
  doctorId: row.doctor_id,
  evolutionText: row.evolution_text,
  clinicalStatus: row.clinical_status,
  createdAt: new Date(row.created_at).toISOString(),
});

const createConsultationBodySchema = z.object({
  chiefComplaint: z.string().min(1, 'A queixa principal é obrigatória.'),
  historyPresentIllness: z.string().min(1, 'A História da Moléstia Atual (HMA) é obrigatória.'),
  pastMedicalHistory: z.string().optional().nullable(),
  systemReview: z.string().optional().nullable(),
  generalExam: z.string().min(1, 'O Exame Físico Geral é obrigatório.'),
  segmentalExam: z
    .object({
      cardiovascular: z.string().optional().nullable(),
      respiratory: z.string().optional().nullable(),
      abdomen: z.string().optional().nullable(),
      neurological: z.string().optional().nullable(),
      extremities: z.string().optional().nullable(),
      other: z.string().optional().nullable(),
    })
    .optional()
    .nullable(),
  diagnosticHypothesis: z.string().min(1, 'A Hipótese Diagnóstica é obrigatória.'),
  initialConduct: z.string().optional().nullable(),
});

const createEvolutionBodySchema = z.object({
  evolutionText: z.string().min(1, 'O texto descritivo da evolução é obrigatório.'),
  clinicalStatus: z.string().optional().nullable(),
});

export const registerMedicalRoutes = (app: FastifyInstance, pool: pg.Pool | null): void => {
  // ---------- POST /api/v1/encounters/:encounterId/consultation (Registrar Consulta Médica) ----------
  app.post(
    '/api/v1/encounters/:encounterId/consultation',
    { preHandler: requireMedicalWriteAndRead(pool) },
    async (req, reply) => {
      const paramsSchema = z.object({ encounterId: z.string().uuid('ID de atendimento inválido.') });
      const { encounterId } = paramsSchema.parse(req.params);
      const parsedBody = createConsultationBodySchema.parse(req.body);
      const identity = req.identity!;

      if (!identity.appUserId) {
        throw new AppError({
          category: ErrorCategory.AUTH,
          code: 'AUTH_REQUIRED',
          message: 'Usuário não possui ID de aplicação associado.',
        });
      }

      const doctorId = identity.appUserId;

      const consultation = await withSecurityContext(
        pool!,
        { userId: doctorId, roles: identity.roles },
        async (client) => {
          // 1. Busca atendimento para validação de estado e ID do paciente
          const encRes = await client.query(
            'select id, patient_id, status from app.encounters where id = $1 for update',
            [encounterId],
          );

          if (encRes.rowCount === 0 || !encRes.rows[0]) {
            throw new AppError({
              category: ErrorCategory.NOT_FOUND,
              code: 'ENCOUNTER_NOT_FOUND',
              message: 'Atendimento não encontrado.',
            });
          }

          const enc = encRes.rows[0];

          // 2. Valida se o estado permite consulta médica (MED-001)
          assertEncounterStatusPermitsConsultation(enc.status);

          // 3. Valida campos de entrada do domínio (MED-002..004)
          const validated = validateConsultationCreateInput({
            encounterId,
            patientId: enc.patient_id,
            ...parsedBody,
          });

          // 4. Inserção no banco app.medical_consultations
          let insertRes;
          try {
            insertRes = await client.query<DbConsultationRow>(
              `insert into app.medical_consultations (
                 encounter_id, patient_id, doctor_id, chief_complaint, history_present_illness,
                 past_medical_history, system_review, general_exam, segmental_exam,
                 diagnostic_hypothesis, initial_conduct
               ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
               returning *`,
              [
                encounterId,
                enc.patient_id,
                doctorId,
                validated.chiefComplaint,
                validated.historyPresentIllness,
                validated.pastMedicalHistory ?? null,
                validated.systemReview ?? null,
                validated.generalExam,
                JSON.stringify(validated.normalizedSegmentalExam),
                validated.diagnosticHypothesis,
                validated.initialConduct ?? null,
              ],
            );
          } catch (err: unknown) {
            const pgErr = err as { code?: string };
            if (pgErr.code === '23505') {
              throw new AppError({
                category: ErrorCategory.CONFLICT,
                code: 'CONSULTATION_ALREADY_EXISTS',
                message: 'Já existe uma consulta médica registrada para este atendimento.',
              });
            }
            throw err;
          }

          const newConsultation = mapRowToConsultation(insertRes.rows[0]!);

          // 5. Atualiza o atendimento para 'in_consultation' se ainda não estiver
          if (enc.status !== 'in_consultation') {
            await client.query(
              `update app.encounters set status = 'in_consultation', updated_by = $1, updated_at = now() where id = $2`,
              [doctorId, encounterId],
            );
          }

          // 6. Evento de Domínio e Auditoria
          const recordedEvent = createMedicalConsultationRecordedEvent(newConsultation, doctorId as UUID);
          await persistDomainEvent(client, {
            id: recordedEvent.eventId,
            eventType: recordedEvent.type,
            aggregateType: recordedEvent.aggregateType,
            aggregateId: recordedEvent.aggregateId,
            actorUserId: (recordedEvent.actorId as UUID) || (doctorId as UUID),
            patientId: newConsultation.patientId as UUID,
            payload: recordedEvent.payload,
            schemaVersion: recordedEvent.schemaVersion,
          });

          await auditAction(client, doctorId, 'create', 'medical_consultation', newConsultation.id, req, {
            encounterId,
            chiefComplaint: newConsultation.chiefComplaint,
            diagnosticHypothesis: newConsultation.diagnosticHypothesis,
          });

          return newConsultation;
        },
      );

      return reply.status(201).send(success(consultation, req.id));
    },
  );

  // ---------- GET /api/v1/encounters/:encounterId/consultation (Obter Consulta e Evoluções) ----------
  app.get(
    '/api/v1/encounters/:encounterId/consultation',
    { preHandler: requirePermission(pool, 'medical.read') },
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

      const result = await withSecurityContext(
        pool!,
        { userId: identity.appUserId, roles: identity.roles },
        async (client) => {
          const consRes = await client.query<DbConsultationRow>(
            'select * from app.medical_consultations where encounter_id = $1',
            [encounterId],
          );

          if (consRes.rowCount === 0 || !consRes.rows[0]) {
            throw new AppError({
              category: ErrorCategory.NOT_FOUND,
              code: 'CONSULTATION_NOT_FOUND',
              message: 'Consulta médica não encontrada para este atendimento.',
            });
          }

          const consultation = mapRowToConsultation(consRes.rows[0]);

          const evoRes = await client.query<DbEvolutionRow>(
            'select * from app.medical_evolutions where consultation_id = $1 order by created_at asc',
            [consultation.id],
          );

          const evolutions = evoRes.rows.map(mapRowToEvolution);

          return {
            ...consultation,
            evolutions,
          };
        },
      );

      return reply.send(success(result, req.id));
    },
  );

  // ---------- POST /api/v1/encounters/:encounterId/consultation/evolutions (Registrar Evolução Médica) ----------
  app.post(
    '/api/v1/encounters/:encounterId/consultation/evolutions',
    { preHandler: requireMedicalWriteAndRead(pool) },
    async (req, reply) => {
      const paramsSchema = z.object({ encounterId: z.string().uuid('ID de atendimento inválido.') });
      const { encounterId } = paramsSchema.parse(req.params);
      const parsedBody = createEvolutionBodySchema.parse(req.body);
      const identity = req.identity!;

      if (!identity.appUserId) {
        throw new AppError({
          category: ErrorCategory.AUTH,
          code: 'AUTH_REQUIRED',
          message: 'Usuário não possui ID de aplicação associado.',
        });
      }

      const doctorId = identity.appUserId;

      const evolution = await withSecurityContext(
        pool!,
        { userId: doctorId, roles: identity.roles },
        async (client) => {
          const consRes = await client.query<DbConsultationRow>(
            'select id, encounter_id, patient_id from app.medical_consultations where encounter_id = $1',
            [encounterId],
          );

          if (consRes.rowCount === 0 || !consRes.rows[0]) {
            throw new AppError({
              category: ErrorCategory.NOT_FOUND,
              code: 'CONSULTATION_NOT_FOUND',
              message: 'Não é possível evoluir um atendimento sem consulta médica prévia.',
            });
          }

          const cons = consRes.rows[0];

          const validated = validateEvolutionCreateInput({
            consultationId: cons.id,
            encounterId,
            patientId: cons.patient_id,
            ...parsedBody,
          });

          const insertRes = await client.query<DbEvolutionRow>(
            `insert into app.medical_evolutions (
               consultation_id, encounter_id, patient_id, doctor_id, evolution_text, clinical_status
             ) values ($1, $2, $3, $4, $5, $6)
             returning *`,
            [
              cons.id,
              encounterId,
              cons.patient_id,
              doctorId,
              validated.evolutionText,
              validated.clinicalStatus ?? null,
            ],
          );

          const newEvolution = mapRowToEvolution(insertRes.rows[0]!);

          const recordedEvent = createMedicalEvolutionRecordedEvent(newEvolution, doctorId as UUID);
          await persistDomainEvent(client, {
            id: recordedEvent.eventId,
            eventType: recordedEvent.type,
            aggregateType: recordedEvent.aggregateType,
            aggregateId: recordedEvent.aggregateId,
            actorUserId: (recordedEvent.actorId as UUID) || (doctorId as UUID),
            patientId: newEvolution.patientId as UUID,
            payload: recordedEvent.payload,
            schemaVersion: recordedEvent.schemaVersion,
          });

          await auditAction(client, doctorId, 'create', 'medical_evolution', newEvolution.id, req, {
            consultationId: cons.id,
            encounterId,
            clinicalStatus: newEvolution.clinicalStatus,
          });

          return newEvolution;
        },
      );

      return reply.status(201).send(success(evolution, req.id));
    },
  );
};
