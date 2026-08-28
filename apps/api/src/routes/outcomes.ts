/**
 * Rotas de Desfecho Assistencial, Sumário de Alta e Fechamento (Fase 3, Etapa 6/6) — OUT-001..014.
 *
 * Consome integralmente as regras de `@vitaloop/domain` (packages/domain/src/outcome).
 * Conexão com Supabase via `vitaloop_app` (RLS ativa). Transações executadas com `withSecurityContext`.
 */

import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type pg from 'pg';
import { AppError, ErrorCategory, type UUID } from '@vitaloop/shared';
import {
  createOutcomeEncounterClosedEvent,
  createOutcomeRecordedEvent,
  createSummaryGeneratedEvent,
  determineTargetEncounterStatus,
  validateOutcomeCreateInput,
  type EncounterOutcome,
  type EncounterSummary,
  type OutcomeType,
} from '@vitaloop/domain';
import { success } from '../http/envelope.js';
import { requirePermission } from '../security/require-auth.js';
import { withSecurityContext } from '../db/security-context.js';
import { sha256Hex } from '../security/hash.js';

const requireOutcomeWriteAndRead = (db: pg.Pool | null) => [
  requirePermission(db, 'outcome.write'),
  requirePermission(db, 'outcome.read'),
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

interface DbOutcomeRow {
  id: string;
  encounter_id: string;
  patient_id: string;
  consultation_id: string | null;
  doctor_id: string;
  outcome_type: OutcomeType;
  notes: string | null;
  destination_unit: string | null;
  regulation_code: string | null;
  death_timestamp: Date | null;
  death_certificate_info: string | null;
  created_at: Date;
  updated_at: Date;
}

interface DbSummaryRow {
  id: string;
  outcome_id: string;
  encounter_id: string;
  patient_id: string;
  doctor_id: string;
  chief_complaint: string | null;
  primary_diagnosis_code: string | null;
  primary_diagnosis_description: string | null;
  summary_notes: string | null;
  discharge_instructions: string | null;
  discharge_prescription: unknown;
  issued_at: Date;
  created_at: Date;
  updated_at: Date;
}

const mapRowToEncounterOutcome = (row: DbOutcomeRow): EncounterOutcome => ({
  id: row.id,
  encounterId: row.encounter_id,
  patientId: row.patient_id,
  consultationId: row.consultation_id,
  doctorId: row.doctor_id,
  outcomeType: row.outcome_type,
  notes: row.notes,
  destinationUnit: row.destination_unit,
  regulationCode: row.regulation_code,
  deathTimestamp: row.death_timestamp ? new Date(row.death_timestamp).toISOString() : null,
  deathCertificateInfo: row.death_certificate_info,
  createdAt: new Date(row.created_at).toISOString(),
  updatedAt: new Date(row.updated_at).toISOString(),
});

const mapRowToEncounterSummary = (row: DbSummaryRow): EncounterSummary => ({
  id: row.id,
  outcomeId: row.outcome_id,
  encounterId: row.encounter_id,
  patientId: row.patient_id,
  doctorId: row.doctor_id,
  chiefComplaint: row.chief_complaint,
  primaryDiagnosisCode: row.primary_diagnosis_code,
  primaryDiagnosisDescription: row.primary_diagnosis_description,
  summaryNotes: row.summary_notes,
  dischargeInstructions: row.discharge_instructions,
  dischargePrescription: row.discharge_prescription,
  issuedAt: new Date(row.issued_at).toISOString(),
  createdAt: new Date(row.created_at).toISOString(),
  updatedAt: new Date(row.updated_at).toISOString(),
});

const createOutcomeBodySchema = z.object({
  outcomeType: z.enum([
    'medical_discharge',
    'administrative_discharge',
    'discharge_against_medical_advice',
    'evasion',
    'transfer',
    'admission_bed',
    'death',
  ] as const),
  notes: z.string().optional().nullable(),
  destinationUnit: z.string().optional().nullable(),
  regulationCode: z.string().optional().nullable(),
  deathTimestamp: z.string().optional().nullable(),
  deathCertificateInfo: z.string().optional().nullable(),
  dischargeInstructions: z.string().optional().nullable(),
  dischargePrescription: z.any().optional().nullable(),
});

export const registerOutcomeRoutes = (app: FastifyInstance, pool: pg.Pool | null): void => {
  // ---------- POST /api/v1/encounters/:encounterId/outcome (Registrar Desfecho e Encerrar Atendimento) ----------
  app.post(
    '/api/v1/encounters/:encounterId/outcome',
    { preHandler: requireOutcomeWriteAndRead(pool) },
    async (req, reply) => {
      const paramsSchema = z.object({ encounterId: z.string().uuid('ID de atendimento inválido.') });
      const { encounterId } = paramsSchema.parse(req.params);
      const parsedBody = createOutcomeBodySchema.parse(req.body);
      const identity = req.identity!;

      if (!identity.appUserId) {
        throw new AppError({
          category: ErrorCategory.AUTH,
          code: 'AUTH_REQUIRED',
          message: 'Usuário não possui ID de aplicação associado.',
        });
      }

      const doctorId = identity.appUserId;

      const { outcome, summary } = await withSecurityContext(
        pool!,
        { userId: doctorId, roles: identity.roles },
        async (client) => {
          // 1. Verifica estado atual do atendimento
          const encRes = await client.query('select id, patient_id, status from app.encounters where id = $1', [encounterId]);
          if (encRes.rowCount === 0 || !encRes.rows[0]) {
            throw new AppError({
              category: ErrorCategory.NOT_FOUND,
              code: 'ENCOUNTER_NOT_FOUND',
              message: 'Atendimento não encontrado.',
            });
          }

          const enc = encRes.rows[0];

          if (enc.status === 'completed' || enc.status === 'canceled') {
            throw new AppError({
              category: ErrorCategory.CONFLICT,
              code: 'ENCOUNTER_ALREADY_CLOSED',
              message: 'Este atendimento já foi encerrado e não pode receber novo desfecho.',
            });
          }

          // 2. Verifica se já existe desfecho registrado em app.encounter_outcomes
          const existRes = await client.query('select id from app.encounter_outcomes where encounter_id = $1', [encounterId]);
          if (existRes.rowCount! > 0) {
            throw new AppError({
              category: ErrorCategory.CONFLICT,
              code: 'OUTCOME_ALREADY_EXISTS',
              message: 'Já existe um desfecho assistencial registrado para este atendimento.',
            });
          }

          // 3. Busca consulta médica associada
          const consRes = await client.query('select id, chief_complaint from app.medical_consultations where encounter_id = $1', [encounterId]);
          const cons = consRes.rowCount! > 0 ? consRes.rows[0] : null;

          // 4. Busca diagnósticos ativos registrados em app.encounter_diagnoses
          let hasPrimaryDiagnosis = false;
          let primaryCidCode: string | null = null;
          let primaryCidDesc: string | null = null;

          const diagRes = await client.query(
            `select ed.cid_code, ed.diagnosis_type, c.description
             from app.encounter_diagnoses ed
             left join app.cid_catalog c on ed.cid_code = c.code
             where ed.encounter_id = $1 and ed.status = 'active'`,
            [encounterId],
          );

          if (diagRes.rowCount! > 0) {
            const primary = diagRes.rows.find((d) => d.diagnosis_type === 'principal');
            if (primary) {
              hasPrimaryDiagnosis = true;
              primaryCidCode = primary.cid_code;
              primaryCidDesc = primary.description || null;
            }
          }

          // 5. Validação no domínio
          const validated = validateOutcomeCreateInput({
            encounterId,
            patientId: enc.patient_id,
            consultationId: cons ? cons.id : null,
            outcomeType: parsedBody.outcomeType,
            notes: parsedBody.notes,
            destinationUnit: parsedBody.destinationUnit,
            regulationCode: parsedBody.regulationCode,
            deathTimestamp: parsedBody.deathTimestamp,
            deathCertificateInfo: parsedBody.deathCertificateInfo,
            dischargeInstructions: parsedBody.dischargeInstructions,
            dischargePrescription: parsedBody.dischargePrescription,
            hasPrimaryDiagnosis,
          });

          // 6. Inserção do desfecho assistencial em app.encounter_outcomes
          const outcomeRes = await client.query<DbOutcomeRow>(
            `insert into app.encounter_outcomes (
               encounter_id, patient_id, consultation_id, doctor_id, outcome_type, notes, destination_unit, regulation_code, death_timestamp, death_certificate_info
             ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             returning *`,
            [
              encounterId,
              enc.patient_id,
              cons ? cons.id : null,
              doctorId,
              validated.outcomeType,
              validated.notes ?? null,
              validated.destinationUnit ?? null,
              validated.regulationCode ?? null,
              validated.deathTimestamp ?? null,
              validated.deathCertificateInfo ?? null,
            ],
          );

          const outcomeRow = outcomeRes.rows[0]!;
          const createdOutcome = mapRowToEncounterOutcome(outcomeRow);

          // 7. Atualização do estado do atendimento em app.encounters
          const targetStatus = determineTargetEncounterStatus(validated.outcomeType);
          await client.query(
            `update app.encounters set status = $1, updated_at = now() where id = $2`,
            [targetStatus, encounterId],
          );

          // 8. Atualização/finalização de bilhetes de fila ativos em app.queue_tickets
          await client.query(
            `update app.queue_tickets set status = 'finished', updated_at = now() where encounter_id = $1 and status in ('waiting', 'called', 'in_service')`,
            [encounterId],
          );

          // 9. Geração do Sumário de Alta Estruturado em app.encounter_summaries
          const summaryRes = await client.query<DbSummaryRow>(
            `insert into app.encounter_summaries (
               outcome_id, encounter_id, patient_id, doctor_id, chief_complaint, primary_diagnosis_code, primary_diagnosis_description, summary_notes, discharge_instructions, discharge_prescription
             ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             returning *`,
            [
              createdOutcome.id,
              encounterId,
              enc.patient_id,
              doctorId,
              cons ? cons.chief_complaint : null,
              primaryCidCode,
              primaryCidDesc,
              validated.notes ?? null,
              validated.dischargeInstructions ?? null,
              validated.dischargePrescription ? JSON.stringify(validated.dischargePrescription) : null,
            ],
          );

          const summaryRow = summaryRes.rows[0]!;
          const createdSummary = mapRowToEncounterSummary(summaryRow);

          // 10. Emissão dos Eventos de Domínio e Auditoria
          const ev1 = createOutcomeRecordedEvent(createdOutcome, doctorId as UUID);
          await persistDomainEvent(client, {
            id: ev1.eventId,
            eventType: ev1.type,
            aggregateType: ev1.aggregateType,
            aggregateId: ev1.aggregateId,
            actorUserId: doctorId as UUID,
            patientId: enc.patient_id as UUID,
            payload: ev1.payload,
            schemaVersion: ev1.schemaVersion,
          });

          const ev2 = createOutcomeEncounterClosedEvent(encounterId as UUID, enc.patient_id as UUID, validated.outcomeType, doctorId as UUID);
          await persistDomainEvent(client, {
            id: ev2.eventId,
            eventType: ev2.type,
            aggregateType: ev2.aggregateType,
            aggregateId: ev2.aggregateId,
            actorUserId: doctorId as UUID,
            patientId: enc.patient_id as UUID,
            payload: ev2.payload,
            schemaVersion: ev2.schemaVersion,
          });

          const ev3 = createSummaryGeneratedEvent(createdSummary, doctorId as UUID);
          await persistDomainEvent(client, {
            id: ev3.eventId,
            eventType: ev3.type,
            aggregateType: ev3.aggregateType,
            aggregateId: ev3.aggregateId,
            actorUserId: doctorId as UUID,
            patientId: enc.patient_id as UUID,
            payload: ev3.payload,
            schemaVersion: ev3.schemaVersion,
          });

          await auditAction(client, doctorId, 'create', 'encounter_outcome', createdOutcome.id, req, {
            encounterId,
            outcomeType: validated.outcomeType,
            targetEncounterStatus: targetStatus,
          });

          return { outcome: createdOutcome, summary: createdSummary };
        },
      );

      return reply.status(201).send(success({ outcome, summary }, req.id));
    },
  );

  // ---------- GET /api/v1/encounters/:encounterId/outcome (Obter Desfecho) ----------
  app.get('/api/v1/encounters/:encounterId/outcome', { preHandler: requirePermission(pool, 'outcome.read') }, async (req, reply) => {
    const { encounterId } = z.object({ encounterId: z.string().uuid() }).parse(req.params);
    const identity = req.identity!;

    const result = await withSecurityContext(pool!, { userId: identity.appUserId!, roles: identity.roles }, async (client) => {
      const res = await client.query<DbOutcomeRow>('select * from app.encounter_outcomes where encounter_id = $1', [encounterId]);
      if (res.rowCount === 0) {
        throw new AppError({ category: ErrorCategory.NOT_FOUND, code: 'OUTCOME_NOT_FOUND', message: 'Desfecho não encontrado.' });
      }
      return mapRowToEncounterOutcome(res.rows[0]!);
    });

    return reply.send(success(result, req.id));
  });

  // ---------- GET /api/v1/encounters/:encounterId/summary (Obter Sumário de Alta) ----------
  app.get('/api/v1/encounters/:encounterId/summary', { preHandler: requirePermission(pool, 'outcome.read') }, async (req, reply) => {
    const { encounterId } = z.object({ encounterId: z.string().uuid() }).parse(req.params);
    const identity = req.identity!;

    const result = await withSecurityContext(pool!, { userId: identity.appUserId!, roles: identity.roles }, async (client) => {
      const res = await client.query<DbSummaryRow>('select * from app.encounter_summaries where encounter_id = $1', [encounterId]);
      if (res.rowCount === 0) {
        throw new AppError({ category: ErrorCategory.NOT_FOUND, code: 'SUMMARY_NOT_FOUND', message: 'Sumário de alta não encontrado.' });
      }
      return mapRowToEncounterSummary(res.rows[0]!);
    });

    return reply.send(success(result, req.id));
  });
};
