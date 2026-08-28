/**
 * Rotas de Triagem, Acolhimento e Classificação de Risco (Fase 2, Etapa 6/6) — Doc 1 §16/§17; Doc 3 §12; TRI-001..017.
 *
 * Consome integralmente as regras de `@vitaloop/domain` (packages/domain/src/triage).
 * Conexão com Supabase via `vitaloop_app` (RLS ativa). Transações executadas com `withSecurityContext`.
 */

import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type pg from 'pg';
import { AppError, ErrorCategory, type UUID } from '@vitaloop/shared';
import {
  createPatientRiskClassifiedEvent,
  createRiskReclassifiedEvent,
  createTriageRecordedEvent,
  validateTriageCreateInput,
  validateTriageReclassifyInput,
  type ManchesterRiskColor,
  type Triage,
  type VitalSigns,
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

interface DbTriageRow {
  id: string;
  encounter_id: string;
  patient_id: string;
  institution_id: string;
  unit_id: string | null;
  sector_id: string | null;
  chief_complaint: string;
  symptoms_duration: string | null;
  history: string | null;
  vitals: VitalSigns;
  pain_score: number | null;
  glasgow_score: number | null;
  capillary_glucose: number | null;
  flowchart: string | null;
  discriminator: string | null;
  risk_color: ManchesterRiskColor;
  priority: 'emergency' | 'very_urgent' | 'urgent' | 'standard' | 'non_urgent';
  target_time_minutes: number;
  protocol_version: string;
  reclassification_reason: string | null;
  reclassified_from: string | null;
  notes: string | null;
  performed_by: string;
  performed_at: Date;
  created_at: Date;
  updated_at: Date;
}

const mapRowToTriage = (row: DbTriageRow): Triage => ({
  id: row.id,
  encounterId: row.encounter_id,
  patientId: row.patient_id,
  institutionId: row.institution_id,
  unitId: row.unit_id,
  sectorId: row.sector_id,
  chiefComplaint: row.chief_complaint,
  symptomsDuration: row.symptoms_duration,
  history: row.history,
  vitals: row.vitals || {},
  painScore: row.pain_score,
  glasgowScore: row.glasgow_score,
  capillaryGlucose: row.capillary_glucose,
  flowchart: row.flowchart,
  discriminator: row.discriminator,
  riskColor: row.risk_color,
  priority: row.priority,
  targetTimeMinutes: Number(row.target_time_minutes),
  protocolVersion: row.protocol_version,
  reclassificationReason: row.reclassification_reason,
  reclassifiedFrom: row.reclassified_from,
  notes: row.notes,
  performedBy: row.performed_by,
  performedAt: new Date(row.performed_at).toISOString(),
  createdAt: new Date(row.created_at).toISOString(),
  updatedAt: new Date(row.updated_at).toISOString(),
});

const vitalSignsSchema = z
  .object({
    systolicBp: z.number().int().nullable().optional(),
    diastolicBp: z.number().int().nullable().optional(),
    heartRate: z.number().int().nullable().optional(),
    respiratoryRate: z.number().int().nullable().optional(),
    temperature: z.number().nullable().optional(),
    oxygenSaturation: z.number().nullable().optional(),
  })
  .optional()
  .nullable();

const createTriageBodySchema = z.object({
  chiefComplaint: z.string().min(1, 'A queixa principal é obrigatória.'),
  symptomsDuration: z.string().optional().nullable(),
  history: z.string().optional().nullable(),
  vitals: vitalSignsSchema,
  painScore: z.number().int().min(0).max(10).optional().nullable(),
  glasgowScore: z.number().int().min(3).max(15).optional().nullable(),
  capillaryGlucose: z.number().min(0).optional().nullable(),
  flowchart: z.string().optional().nullable(),
  discriminator: z.string().optional().nullable(),
  riskColor: z.enum(['red', 'orange', 'yellow', 'green', 'blue'], {
    errorMap: () => ({ message: 'Cor de classificação de risco de Manchester inválida.' }),
  }),
  notes: z.string().optional().nullable(),
});

const reclassifyBodySchema = z.object({
  newRiskColor: z.enum(['red', 'orange', 'yellow', 'green', 'blue']),
  reclassificationReason: z.string().min(1, 'O motivo da reclassificação de risco é obrigatório.'),
  notes: z.string().optional().nullable(),
});

export const registerTriageRoutes = (app: FastifyInstance, pool: pg.Pool | null): void => {
  // ---------- POST /api/v1/encounters/:encounterId/triage (Registro de Triagem Inicial) ----------
  app.post(
    '/api/v1/encounters/:encounterId/triage',
    { preHandler: requireReadAndWrite(pool, 'triage.write', 'triage.read') },
    async (req, reply) => {
      const paramsSchema = z.object({ encounterId: z.string().uuid('ID de atendimento inválido.') });
      const { encounterId } = paramsSchema.parse(req.params);
      const parsed = createTriageBodySchema.parse(req.body);
      const identity = req.identity!;

      if (!identity.appUserId) {
        throw new AppError({
          category: ErrorCategory.AUTH,
          code: 'AUTH_REQUIRED',
          message: 'Usuário não possui ID de aplicação associado.',
        });
      }

      const appUserId = identity.appUserId;

      const triage = await withSecurityContext(
        pool!,
        { userId: appUserId, roles: identity.roles },
        async (client) => {
          // 1. Busca atendimento e valida se existe e seu estado permite triagem
          const encRes = await client.query(
            'select id, patient_id, institution_id, unit_id, sector_id, status from app.encounters where id = $1',
            [encounterId],
          );

          if (encRes.rowCount === 0 || !encRes.rows[0]) {
            throw new AppError({
              category: ErrorCategory.NOT_FOUND,
              code: 'ENCOUNTER_NOT_FOUND',
              message: 'Atendimento não encontrado para realização da triagem.',
            });
          }

          const enc = encRes.rows[0];

          if (enc.status !== 'created' && enc.status !== 'triage_pending') {
            throw new AppError({
              category: ErrorCategory.CONFLICT,
              code: 'TRIAGE_INVALID_ENCOUNTER_STATUS',
              message: `Triagem só pode ser realizada em atendimentos pendentes de triagem. Status atual: ${enc.status}.`,
            });
          }

          // 2. Valida regras de domínio da triagem
          const validated = validateTriageCreateInput({
            encounterId,
            patientId: enc.patient_id,
            institutionId: enc.institution_id,
            unitId: enc.unit_id,
            sectorId: enc.sector_id,
            chiefComplaint: parsed.chiefComplaint,
            symptomsDuration: parsed.symptomsDuration ?? null,
            history: parsed.history ?? null,
            vitals: parsed.vitals ? (parsed.vitals as VitalSigns) : null,
            painScore: parsed.painScore ?? null,
            glasgowScore: parsed.glasgowScore ?? null,
            capillaryGlucose: parsed.capillaryGlucose ?? null,
            flowchart: parsed.flowchart ?? null,
            discriminator: parsed.discriminator ?? null,
            riskColor: parsed.riskColor,
            notes: parsed.notes ?? null,
          });

          // 3. Inserção na tabela app.triages
          const insertRes = await client.query<DbTriageRow>(
            `insert into app.triages (
               encounter_id, patient_id, institution_id, unit_id, sector_id,
               chief_complaint, symptoms_duration, history, vitals, pain_score,
               glasgow_score, capillary_glucose, flowchart, discriminator,
               risk_color, priority, target_time_minutes, notes, performed_by
             ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
             returning *`,
            [
              encounterId,
              enc.patient_id,
              enc.institution_id,
              enc.unit_id,
              enc.sector_id,
              validated.chiefComplaint,
              validated.symptomsDuration,
              validated.history,
              JSON.stringify(validated.vitalsNormalized),
              validated.painScore,
              validated.glasgowScore,
              validated.capillaryGlucose,
              validated.flowchart,
              validated.discriminator,
              validated.riskColor,
              validated.priority,
              validated.targetTimeMinutes,
              validated.notes,
              appUserId,
            ],
          );

          const newTriage = mapRowToTriage(insertRes.rows[0]!);

          // 4. Transição automática de status do atendimento para 'triaged' (ENC-006)
          await client.query(
            `update app.encounters set status = 'triaged', updated_by = $1, updated_at = now() where id = $2`,
            [appUserId, encounterId],
          );

          // 5. Emissão de Eventos de Domínio (TRI-017)
          const triageEvent = createTriageRecordedEvent(newTriage, appUserId as UUID);
          await persistDomainEvent(client, {
            id: triageEvent.eventId,
            eventType: triageEvent.type,
            aggregateType: triageEvent.aggregateType,
            aggregateId: triageEvent.aggregateId,
            actorUserId: (triageEvent.actorId as UUID) || (appUserId as UUID),
            patientId: enc.patient_id as UUID,
            payload: triageEvent.payload,
            schemaVersion: triageEvent.schemaVersion,
          });

          const riskEvent = createPatientRiskClassifiedEvent(newTriage, appUserId as UUID);
          await persistDomainEvent(client, {
            id: riskEvent.eventId,
            eventType: riskEvent.type,
            aggregateType: riskEvent.aggregateType,
            aggregateId: riskEvent.aggregateId,
            actorUserId: (riskEvent.actorId as UUID) || (appUserId as UUID),
            patientId: enc.patient_id as UUID,
            payload: riskEvent.payload,
            schemaVersion: riskEvent.schemaVersion,
          });

          // 6. Auditoria de Ação
          await auditAction(client, appUserId, 'create', 'triage', newTriage.id, req, {
            encounterId,
            patientId: enc.patient_id,
            riskColor: newTriage.riskColor,
            priority: newTriage.priority,
            targetTimeMinutes: newTriage.targetTimeMinutes,
          });

          return newTriage;
        },
      );

      return reply.status(201).send(success(triage, req.id));
    },
  );

  // ---------- GET /api/v1/encounters/:encounterId/triage (Consulta de Triagem) ----------
  app.get(
    '/api/v1/encounters/:encounterId/triage',
    { preHandler: requirePermission(pool, 'triage.read') },
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

      const triage = await withSecurityContext(
        pool!,
        { userId: identity.appUserId, roles: identity.roles },
        async (client) => {
          const res = await client.query<DbTriageRow>(
            'select * from app.triages where encounter_id = $1 order by created_at desc limit 1',
            [encounterId],
          );

          if (res.rowCount === 0 || !res.rows[0]) {
            throw new AppError({
              category: ErrorCategory.NOT_FOUND,
              code: 'TRIAGE_NOT_FOUND',
              message: 'Nenhuma triagem encontrada para este atendimento.',
            });
          }

          return mapRowToTriage(res.rows[0]);
        },
      );

      return reply.send(success(triage, req.id));
    },
  );

  // ---------- PATCH /api/v1/encounters/:encounterId/triage/reclassify (Reclassificação de Risco) ----------
  app.patch(
    '/api/v1/encounters/:encounterId/triage/reclassify',
    { preHandler: requirePermission(pool, 'triage.write') },
    async (req, reply) => {
      const paramsSchema = z.object({ encounterId: z.string().uuid('ID de atendimento inválido.') });
      const { encounterId } = paramsSchema.parse(req.params);
      const parsed = reclassifyBodySchema.parse(req.body);
      const identity = req.identity!;

      if (!identity.appUserId) {
        throw new AppError({
          category: ErrorCategory.AUTH,
          code: 'AUTH_REQUIRED',
          message: 'Usuário não possui ID de aplicação associado.',
        });
      }

      const appUserId = identity.appUserId;

      const updatedTriage = await withSecurityContext(
        pool!,
        { userId: appUserId, roles: identity.roles },
        async (client) => {
          // 1. Busca triagem existente
          const currentRes = await client.query<DbTriageRow>(
            'select * from app.triages where encounter_id = $1 order by created_at desc limit 1',
            [encounterId],
          );

          if (currentRes.rowCount === 0 || !currentRes.rows[0]) {
            throw new AppError({
              category: ErrorCategory.NOT_FOUND,
              code: 'TRIAGE_NOT_FOUND',
              message: 'Triagem original não encontrada para reclassificação.',
            });
          }

          const currentTriage = mapRowToTriage(currentRes.rows[0]);
          const previousColor = currentTriage.riskColor;

          // 2. Valida regras de reclassificação (motivo obrigatório - TRI-016)
          const validated = validateTriageReclassifyInput({
            triageId: currentTriage.id,
            newRiskColor: parsed.newRiskColor,
            reclassificationReason: parsed.reclassificationReason,
            notes: parsed.notes ?? null,
          });

          // 3. Atualização da classificação de risco na tabela app.triages
          const updateRes = await client.query<DbTriageRow>(
            `update app.triages
             set risk_color = $1, priority = $2, target_time_minutes = $3,
                 reclassification_reason = $4, reclassified_from = $5,
                 notes = coalesce($6, notes), updated_at = now()
             where id = $7
             returning *`,
            [
              validated.newRiskColor,
              validated.priority,
              validated.targetTimeMinutes,
              validated.reclassificationReason,
              previousColor,
              validated.notes,
              currentTriage.id,
            ],
          );

          const reclassified = mapRowToTriage(updateRes.rows[0]!);

          // 4. Emissão de Evento de Domínio de Reclassificação
          const reclassifyEvent = createRiskReclassifiedEvent(reclassified, previousColor, appUserId as UUID);
          await persistDomainEvent(client, {
            id: reclassifyEvent.eventId,
            eventType: reclassifyEvent.type,
            aggregateType: reclassifyEvent.aggregateType,
            aggregateId: reclassifyEvent.aggregateId,
            actorUserId: (reclassifyEvent.actorId as UUID) || (appUserId as UUID),
            patientId: reclassified.patientId as UUID,
            payload: reclassifyEvent.payload,
            schemaVersion: reclassifyEvent.schemaVersion,
          });

          // 5. Auditoria de Reclassificação com Motivo e Autoria
          await auditAction(client, appUserId, 'update', 'triage_reclassification', reclassified.id, req, {
            encounterId,
            previousColor,
            newColor: reclassified.riskColor,
            reclassificationReason: reclassified.reclassificationReason,
            performedBy: appUserId,
          });

          return reclassified;
        },
      );

      return reply.send(success(updatedTriage, req.id));
    },
  );
};
