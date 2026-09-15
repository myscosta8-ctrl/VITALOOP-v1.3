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
  assertClassificationHistoryConsistent,
  assertDestinationHistoryConsistent,
  createPatientRiskClassifiedEvent,
  createRiskReclassifiedEvent,
  createTriageRecordedEvent,
  validateTriageCreateInput,
  validateTriageDestination,
  validateTriageReclassifyInput,
  type ManchesterPriority,
  type ManchesterRiskColor,
  type Triage,
  type TriageClassificationEvent,
  type TriageClassificationType,
  type TriageComplaintDetail,
  type TriageDestination,
  type TriageDestinationEvent,
  type TriageDestinationType,
  type TriageExamCategory,
  type TriageInitialAssessment,
  type TriagePainDetail,
  type TriagePregnancyAssessment,
  type TriageProcedureKind,
  type VitalSigns,
} from '@vitaloop/domain';
import { success } from '../http/envelope.js';
import { requirePermission } from '../security/require-auth.js';
import { withSecurityContext } from '../db/security-context.js';
import { sha256Hex } from '../security/hash.js';
import { transitionEncounterStatus } from '../services/encounter-status.js';
import { routeQueueTicketForDestination } from '../services/triage-destination-routing.js';

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

  general_condition: string | null;
  consciousness: string | null;
  airway: string | null;
  breathing: string | null;
  circulation: string | null;
  skin_findings: string[] | null;
  skin_findings_other: string | null;

  pregnancy_status: string | null;
  pregnancy_weeks: number | null;
  obstetric_notes: string | null;

  complaint_onset_at: Date | null;
  complaint_evolution: string | null;
  complaint_notes: string | null;

  pain_location: string | null;
  pain_irradiation: string | null;
  pain_character: string | null;
  pain_onset_at: Date | null;
  pain_evolution: string | null;

  destination_type: string | null;
  destination_room_id: string | null;
  destination_exam_category: string | null;
  destination_procedure_kind: string | null;
  destination_procedure_other: string | null;
  destination_notes: string | null;
  destination_set_by: string | null;
  destination_set_at: Date | null;
}

const mapRowToTriage = (
  row: DbTriageRow,
  classificationHistory: readonly TriageClassificationEvent[] = [],
  destinationHistory: readonly TriageDestinationEvent[] = [],
): Triage => ({
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

  initialAssessment: {
    generalCondition: (row.general_condition as TriageInitialAssessment['generalCondition']) ?? null,
    consciousness: (row.consciousness as TriageInitialAssessment['consciousness']) ?? null,
    airway: (row.airway as TriageInitialAssessment['airway']) ?? null,
    breathing: (row.breathing as TriageInitialAssessment['breathing']) ?? null,
    circulation: (row.circulation as TriageInitialAssessment['circulation']) ?? null,
    skinFindings: (row.skin_findings ?? []) as unknown as NonNullable<TriageInitialAssessment['skinFindings']>,
    skinFindingsOther: row.skin_findings_other,
  },
  pregnancy: {
    status: (row.pregnancy_status as TriagePregnancyAssessment['status']) ?? null,
    weeks: row.pregnancy_weeks,
    obstetricNotes: row.obstetric_notes,
  },
  complaintDetail: {
    onsetAt: row.complaint_onset_at ? new Date(row.complaint_onset_at).toISOString() : null,
    evolution: (row.complaint_evolution as TriageComplaintDetail['evolution']) ?? null,
    notes: row.complaint_notes,
  },
  painDetail: {
    location: row.pain_location,
    irradiation: row.pain_irradiation,
    character: row.pain_character,
    onsetAt: row.pain_onset_at ? new Date(row.pain_onset_at).toISOString() : null,
    evolution: (row.pain_evolution as TriagePainDetail['evolution']) ?? null,
  },
  classificationHistory,

  destination: {
    type: (row.destination_type as TriageDestination['type']) ?? null,
    roomId: row.destination_room_id,
    examCategory: (row.destination_exam_category as TriageDestination['examCategory']) ?? null,
    procedureKind: (row.destination_procedure_kind as TriageDestination['procedureKind']) ?? null,
    procedureOther: row.destination_procedure_other,
    notes: row.destination_notes,
    setBy: row.destination_set_by,
    setAt: row.destination_set_at ? new Date(row.destination_set_at).toISOString() : null,
  },
  destinationHistory,
});

interface DbClassificationHistoryRow {
  id: string;
  triage_id: string;
  risk_color: ManchesterRiskColor;
  priority: ManchesterPriority;
  target_time_minutes: number;
  classification_type: TriageClassificationType;
  reason: string | null;
  professional_id: string;
  professional_name: string | null;
  classified_at: Date;
  created_at: Date;
}

const mapRowToClassificationEvent = (row: DbClassificationHistoryRow): TriageClassificationEvent => ({
  id: row.id,
  triageId: row.triage_id,
  riskColor: row.risk_color,
  priority: row.priority,
  targetTimeMinutes: Number(row.target_time_minutes),
  classificationType: row.classification_type,
  reason: row.reason,
  professionalId: row.professional_id,
  // Nome resolvido via app.resolve_professional_display_name() (Bloco 2.2)
  // — função SECURITY DEFINER criada na migration 0092, não um JOIN direto
  // em app.users. A RLS de app.users (`users_self_read`) continua intocada
  // (só a própria linha é visível por SELECT direto); a função expõe
  // SOMENTE o nome, e só quando quem está consultando tem `triage.read` —
  // mesma permissão que já governa todo o módulo. Sem essa permissão, a
  // função retorna NULL (nunca um erro), e `resolveProfessionalLabel` no
  // domínio cai pro fallback por UUID truncado.
  professionalName: row.professional_name,
  classifiedAt: new Date(row.classified_at).toISOString(),
  createdAt: new Date(row.created_at).toISOString(),
});

/** Mais recente primeiro — mesmo contrato de `Triage.classificationHistory` (regra 8/30 do Bloco 2). */
const fetchClassificationHistory = async (client: pg.PoolClient, triageId: string): Promise<TriageClassificationEvent[]> => {
  const res = await client.query<DbClassificationHistoryRow>(
    `select h.*, app.resolve_professional_display_name(h.professional_id) as professional_name
       from app.triage_classification_history h
      where h.triage_id = $1
      order by h.classified_at desc`,
    [triageId],
  );
  return res.rows.map(mapRowToClassificationEvent);
};

/**
 * Insere UM evento imutável no histórico (regra 5/27/29: cada
 * classificação/reclassificação gera exatamente um novo registro, nunca
 * atualiza/apaga um existente). Reaproveitado tanto pela classificação
 * inicial (POST .../triage) quanto pela reclassificação (PATCH
 * .../triage/reclassify) — mesmo mecanismo, não duas implementações.
 */
const insertClassificationEvent = async (
  client: pg.PoolClient,
  params: {
    triageId: string;
    riskColor: ManchesterRiskColor;
    priority: ManchesterPriority;
    targetTimeMinutes: number;
    classificationType: TriageClassificationType;
    reason: string | null;
    professionalId: string;
  },
): Promise<TriageClassificationEvent> => {
  const res = await client.query<DbClassificationHistoryRow>(
    `insert into app.triage_classification_history (
       triage_id, risk_color, priority, target_time_minutes, classification_type, reason, professional_id
     ) values ($1, $2, $3, $4, $5, $6, $7)
     returning *`,
    [
      params.triageId,
      params.riskColor,
      params.priority,
      params.targetTimeMinutes,
      params.classificationType,
      params.reason,
      params.professionalId,
    ],
  );
  return mapRowToClassificationEvent(res.rows[0]!);
};

interface DbDestinationHistoryRow {
  id: string;
  triage_id: string;
  destination_type: TriageDestinationType;
  room_id: string | null;
  exam_category: TriageExamCategory | null;
  procedure_kind: TriageProcedureKind | null;
  procedure_other: string | null;
  notes: string | null;
  reason: string | null;
  professional_id: string;
  professional_name: string | null;
  set_at: Date;
  created_at: Date;
}

const mapRowToDestinationEvent = (row: DbDestinationHistoryRow): TriageDestinationEvent => ({
  id: row.id,
  triageId: row.triage_id,
  destinationType: row.destination_type,
  roomId: row.room_id,
  examCategory: row.exam_category,
  procedureKind: row.procedure_kind,
  procedureOther: row.procedure_other,
  notes: row.notes,
  reason: row.reason,
  professionalId: row.professional_id,
  // Mesma função segura do Bloco 2.2 (app.resolve_professional_display_name) — um único mecanismo de resolução de nome para todo o módulo de Triagem.
  professionalName: row.professional_name,
  setAt: new Date(row.set_at).toISOString(),
  createdAt: new Date(row.created_at).toISOString(),
});

/** Mais recente primeiro — mesmo contrato de `classificationHistory` (Bloco 2/3). */
const fetchDestinationHistory = async (client: pg.PoolClient, triageId: string): Promise<TriageDestinationEvent[]> => {
  const res = await client.query<DbDestinationHistoryRow>(
    `select h.*, app.resolve_professional_display_name(h.professional_id) as professional_name
       from app.triage_destination_history h
      where h.triage_id = $1
      order by h.set_at desc`,
    [triageId],
  );
  return res.rows.map(mapRowToDestinationEvent);
};

/**
 * Insere UM evento imutável no histórico de encaminhamento — mesmo
 * mecanismo de `insertClassificationEvent` (Bloco 2), reaproveitado para o
 * Bloco 3 em vez de duplicado.
 */
const insertDestinationEvent = async (
  client: pg.PoolClient,
  params: {
    triageId: string;
    destination: { type: TriageDestinationType; roomId: string | null; examCategory: TriageExamCategory | null; procedureKind: TriageProcedureKind | null; procedureOther: string | null; notes: string | null; reason: string | null };
    professionalId: string;
  },
): Promise<TriageDestinationEvent> => {
  const res = await client.query<DbDestinationHistoryRow>(
    `insert into app.triage_destination_history (
       triage_id, destination_type, room_id, exam_category, procedure_kind, procedure_other, notes, reason, professional_id
     ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     returning *`,
    [
      params.triageId,
      params.destination.type,
      params.destination.roomId,
      params.destination.examCategory,
      params.destination.procedureKind,
      params.destination.procedureOther,
      params.destination.notes,
      params.destination.reason,
      params.professionalId,
    ],
  );
  return mapRowToDestinationEvent(res.rows[0]!);
};

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

const evolutionSchema = z.enum(['sudden', 'gradual', 'progressive', 'recurrent', 'stable', 'worsening', 'improving']);

const initialAssessmentSchema = z
  .object({
    generalCondition: z.enum(['good', 'regular', 'severe']).optional().nullable(),
    consciousness: z.enum(['oriented', 'confused', 'drowsy', 'obtunded', 'unconscious']).optional().nullable(),
    airway: z.enum(['patent', 'altered', 'obstructed']).optional().nullable(),
    breathing: z.enum(['normal', 'altered', 'respiratory_distress']).optional().nullable(),
    circulation: z.enum(['preserved', 'altered']).optional().nullable(),
    skinFindings: z.array(z.enum(['normal_color', 'pale', 'cyanotic', 'diaphoretic', 'jaundiced', 'other'])).optional(),
    skinFindingsOther: z.string().optional().nullable(),
  })
  .optional()
  .nullable();

const pregnancySchema = z
  .object({
    status: z.enum(['yes', 'no', 'unknown']).optional().nullable(),
    weeks: z.number().int().min(0).max(45).optional().nullable(),
    obstetricNotes: z.string().optional().nullable(),
  })
  .optional()
  .nullable();

const complaintDetailSchema = z
  .object({
    onsetAt: z.string().datetime().optional().nullable(),
    evolution: evolutionSchema.optional().nullable(),
    notes: z.string().optional().nullable(),
  })
  .optional()
  .nullable();

const painDetailSchema = z
  .object({
    location: z.string().optional().nullable(),
    irradiation: z.string().optional().nullable(),
    character: z.string().optional().nullable(),
    onsetAt: z.string().datetime().optional().nullable(),
    evolution: evolutionSchema.optional().nullable(),
  })
  .optional()
  .nullable();

// Encaminhamento após triagem (Bloco 3) — validação estrutural (tipos/
// formato) fica no Zod; a regra "atendimento médico exige consultório",
// "outro procedimento exige descrição" etc. fica em
// `validateTriageDestination` (domínio), não duplicada aqui.
// Exportado (Bloco 4, item 18/19) para permitir testes de API que provem,
// sem depender de banco, que o schema rejeita qualquer `type` fora dos 4
// valores permitidos — em particular, que nenhuma variação de "leito" é aceita.
export const destinationSchema = z.object({
  type: z.enum(['medical_consultation', 'red_room', 'exam', 'procedure'], {
    errorMap: () => ({ message: 'É obrigatório definir o encaminhamento após a triagem.' }),
  }),
  roomId: z.string().uuid().optional().nullable(),
  examCategory: z.enum(['laboratory', 'imaging']).optional().nullable(),
  procedureKind: z.enum(['dressing_change', 'urinary_catheter_change', 'other']).optional().nullable(),
  procedureOther: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

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
  initialAssessment: initialAssessmentSchema,
  pregnancy: pregnancySchema,
  complaintDetail: complaintDetailSchema,
  painDetail: painDetailSchema,
  destination: destinationSchema,
});

const reclassifyBodySchema = z.object({
  newRiskColor: z.enum(['red', 'orange', 'yellow', 'green', 'blue']),
  reclassificationReason: z.string().min(1, 'O motivo da reclassificação de risco é obrigatório.'),
  notes: z.string().optional().nullable(),
  // Lock otimista (Bloco 2.1) — mesmo campo/formato de
  // EncounterUpdateStatusPayload.expectedUpdatedAt (encounters.ts).
  expectedUpdatedAt: z.string().datetime('A data expectedUpdatedAt deve estar no formato ISO8601 (UTC).'),
});

export const changeDestinationBodySchema = destinationSchema.extend({
  reason: z.string().min(1, 'O motivo da alteração do encaminhamento é obrigatório.'),
  expectedUpdatedAt: z.string().datetime('A data expectedUpdatedAt deve estar no formato ISO8601 (UTC).'),
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
            initialAssessment: (parsed.initialAssessment as TriageInitialAssessment) ?? null,
            pregnancy: (parsed.pregnancy as TriagePregnancyAssessment) ?? null,
            complaintDetail: (parsed.complaintDetail as TriageComplaintDetail) ?? null,
            painDetail: (parsed.painDetail as TriagePainDetail) ?? null,
            destination: {
              type: parsed.destination.type,
              roomId: parsed.destination.roomId ?? null,
              examCategory: parsed.destination.examCategory ?? null,
              procedureKind: parsed.destination.procedureKind ?? null,
              procedureOther: parsed.destination.procedureOther ?? null,
              notes: parsed.destination.notes ?? null,
            },
          });

          const ia = validated.initialAssessmentNormalized;
          const preg = validated.pregnancyNormalized;
          const complaint = validated.complaintDetailNormalized;
          const pain = validated.painDetailNormalized;
          const dest = validated.destinationNormalized;

          // 2b. Se o destino for "atendimento médico", o consultório
          // precisa existir e estar ativo (regra 8/9 do Bloco 3 — nunca
          // aceitar um id qualquer sem checar disponibilidade real).
          if (dest.type === 'medical_consultation') {
            const roomRes = await client.query(
              'select id from app.consultation_rooms where id = $1 and institution_id = $2 and is_active = true',
              [dest.roomId, enc.institution_id],
            );
            if (roomRes.rowCount === 0) {
              throw new AppError({
                category: ErrorCategory.VALIDATION,
                code: 'TRIAGE_DESTINATION_ROOM_UNAVAILABLE',
                message: 'O consultório selecionado não está disponível.',
              });
            }
          }

          // 3. Inserção na tabela app.triages
          const insertRes = await client.query<DbTriageRow>(
            `insert into app.triages (
               encounter_id, patient_id, institution_id, unit_id, sector_id,
               chief_complaint, symptoms_duration, history, vitals, pain_score,
               glasgow_score, capillary_glucose, flowchart, discriminator,
               risk_color, priority, target_time_minutes, notes, performed_by,
               general_condition, consciousness, airway, breathing, circulation,
               skin_findings, skin_findings_other,
               pregnancy_status, pregnancy_weeks, obstetric_notes,
               complaint_onset_at, complaint_evolution, complaint_notes,
               pain_location, pain_irradiation, pain_character, pain_onset_at, pain_evolution,
               destination_type, destination_room_id, destination_exam_category,
               destination_procedure_kind, destination_procedure_other, destination_notes,
               destination_set_by, destination_set_at
             ) values (
               $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19,
               $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37,
               $38, $39, $40, $41, $42, $43, $44, now()
             )
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
              ia.generalCondition,
              ia.consciousness,
              ia.airway,
              ia.breathing,
              ia.circulation,
              ia.skinFindings,
              ia.skinFindingsOther,
              preg.status,
              preg.weeks,
              preg.obstetricNotes,
              complaint.onsetAt,
              complaint.evolution,
              complaint.notes,
              pain.location,
              pain.irradiation,
              pain.character,
              pain.onsetAt,
              pain.evolution,
              dest.type,
              dest.roomId,
              dest.examCategory,
              dest.procedureKind,
              dest.procedureOther,
              dest.notes,
              appUserId,
            ],
          );

          const insertedRow = insertRes.rows[0]!;

          // 3b. Registro da classificação inicial no histórico imutável
          // (Bloco 2, regra 6: "a primeira classificação também deve entrar
          // no histórico" — não só as reclassificações). Mesma transação do
          // INSERT acima (regra 15: criar evento + persistir triagem de
          // forma atômica).
          await insertClassificationEvent(client, {
            triageId: insertedRow.id,
            riskColor: insertedRow.risk_color,
            priority: insertedRow.priority,
            targetTimeMinutes: insertedRow.target_time_minutes,
            classificationType: 'initial',
            reason: null,
            professionalId: appUserId,
          });

          // 3c. Registro do encaminhamento inicial no histórico imutável
          // (Bloco 3, mesmo princípio do 3b — nasce junto com a triagem).
          await insertDestinationEvent(client, {
            triageId: insertedRow.id,
            destination: { type: dest.type!, roomId: dest.roomId ?? null, examCategory: dest.examCategory ?? null, procedureKind: dest.procedureKind ?? null, procedureOther: dest.procedureOther ?? null, notes: dest.notes ?? null, reason: null },
            professionalId: appUserId,
          });

          // Recarrega via função segura pra já vir com o nome do
          // profissional resolvido (mesmo mecanismo usado por GET/PATCH —
          // regra 4 do Bloco 2.1: um único ponto de resolução, não duplicado).
          const initialHistory = await fetchClassificationHistory(client, insertedRow.id);
          const initialDestinationHistory = await fetchDestinationHistory(client, insertedRow.id);

          const newTriage = mapRowToTriage(insertedRow, initialHistory, initialDestinationHistory);
          assertClassificationHistoryConsistent(newTriage);
          assertDestinationHistoryConsistent(newTriage);

          // 4. Transição automática de status do atendimento para 'triaged' (ENC-006)
          await transitionEncounterStatus(client, {
            encounterId,
            toStatus: 'triaged',
            actorUserId: appUserId as UUID,
          });

          // 4b. Bloco 5 — consultório/Sala Vermelha entram no fluxo
          // assistencial: o atendimento avança para 'consultation_pending'
          // (estado já existente na máquina de estados — "aguardando o
          // próximo atendimento clínico"; não é exclusivo de consultório,
          // Sala Vermelha também está aguardando assistência). Exame e
          // procedimento NÃO avançam — regra 6 do Bloco 4/C-D do Bloco 5:
          // não são obrigados a passar por atendimento médico.
          if (dest.type === 'medical_consultation' || dest.type === 'red_room') {
            await transitionEncounterStatus(client, {
              encounterId,
              toStatus: 'consultation_pending',
              actorUserId: appUserId as UUID,
            });
          }

          // 4c. Bloco 5 — roteia o ticket de fila (já criado na abertura do
          // atendimento pela Recepção) para a fila certa e, se for
          // consultório, vincula o consultório escolhido. Mesma transação
          // do INSERT de app.triages acima (regra 12: atomicidade).
          await routeQueueTicketForDestination(client, {
            encounterId,
            patientId: enc.patient_id,
            institutionId: enc.institution_id,
            destinationType: dest.type!,
            roomId: dest.roomId ?? null,
            riskColor: validated.riskColor,
          });

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

          const row = res.rows[0];
          const history = await fetchClassificationHistory(client, row.id);
          const destinationHistory = await fetchDestinationHistory(client, row.id);
          const fullTriage = mapRowToTriage(row, history, destinationHistory);
          assertClassificationHistoryConsistent(fullTriage);
          assertDestinationHistoryConsistent(fullTriage);
          return fullTriage;
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
            expectedUpdatedAt: parsed.expectedUpdatedAt,
          });

          // 3. Atualização da classificação de risco na tabela app.triages
          // — LOCK OTIMISTA REAL (Bloco 2.1), mesmo padrão já usado em
          // `PATCH /api/v1/encounters/:id/status` (encounters.ts): o UPDATE
          // só afeta a linha se `updated_at` ainda for o valor que o
          // profissional tinha em tela. Se outra reclassificação já rodou
          // entre a leitura e esta escrita, `rowCount` vem 0 — tratado como
          // CONCURRENCY_CONFLICT logo abaixo, nunca como "última escrita
          // vence" silenciosa.
          const updateRes = await client.query<DbTriageRow>(
            `update app.triages
             set risk_color = $1, priority = $2, target_time_minutes = $3,
                 reclassification_reason = $4, reclassified_from = $5,
                 notes = coalesce($6, notes), updated_at = now()
             where id = $7
               and (updated_at = $8::timestamptz or date_trunc('milliseconds', updated_at) = date_trunc('milliseconds', $8::timestamptz))
             returning *`,
            [
              validated.newRiskColor,
              validated.priority,
              validated.targetTimeMinutes,
              validated.reclassificationReason,
              previousColor,
              validated.notes,
              currentTriage.id,
              validated.expectedUpdatedAt,
            ],
          );

          if (updateRes.rowCount === 0 || !updateRes.rows[0]) {
            throw new AppError({
              category: ErrorCategory.CONFLICT,
              code: 'CONCURRENCY_CONFLICT',
              message:
                'Esta classificação foi alterada por outro profissional. Atualize o atendimento antes de reclassificar novamente.',
            });
          }

          const updatedRow = updateRes.rows[0];

          // 3b. Registro do evento de reclassificação no histórico imutável
          // (Bloco 2, regra 7: toda reclassificação cria NOVO registro, sem
          // apagar os anteriores). Mesma transação do UPDATE acima.
          await insertClassificationEvent(client, {
            triageId: updatedRow.id,
            riskColor: updatedRow.risk_color,
            priority: updatedRow.priority,
            targetTimeMinutes: updatedRow.target_time_minutes,
            classificationType: 'reclassification',
            reason: validated.reclassificationReason,
            professionalId: appUserId,
          });

          const history = await fetchClassificationHistory(client, updatedRow.id);
          const destinationHistory = await fetchDestinationHistory(client, updatedRow.id);
          const reclassified = mapRowToTriage(updatedRow, history, destinationHistory);
          assertClassificationHistoryConsistent(reclassified);
          assertDestinationHistoryConsistent(reclassified);

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

  // ---------- PATCH /api/v1/encounters/:encounterId/triage/destination (Alterar Encaminhamento) ----------
  // Bloco 3 — mesma estrutura da reclassificação (Bloco 2.1): lock
  // otimista via expectedUpdatedAt, motivo obrigatório, evento imutável no
  // histórico, tudo na mesma transação (atomicidade).
  app.patch(
    '/api/v1/encounters/:encounterId/triage/destination',
    { preHandler: requirePermission(pool, 'triage.write') },
    async (req, reply) => {
      const paramsSchema = z.object({ encounterId: z.string().uuid('ID de atendimento inválido.') });
      const { encounterId } = paramsSchema.parse(req.params);
      const parsed = changeDestinationBodySchema.parse(req.body);
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
              message: 'Triagem original não encontrada para alteração de encaminhamento.',
            });
          }

          const currentTriage = currentRes.rows[0];

          // 2. Valida regras do encaminhamento (motivo obrigatório — regra 14 do Bloco 3)
          const validated = validateTriageDestination(
            {
              type: parsed.type,
              roomId: parsed.roomId ?? null,
              examCategory: parsed.examCategory ?? null,
              procedureKind: parsed.procedureKind ?? null,
              procedureOther: parsed.procedureOther ?? null,
              notes: parsed.notes ?? null,
              reason: parsed.reason,
            },
            { requireReason: true },
          );

          if (validated.type === 'medical_consultation') {
            const roomRes = await client.query(
              'select id from app.consultation_rooms where id = $1 and institution_id = $2 and is_active = true',
              [validated.roomId, currentTriage.institution_id],
            );
            if (roomRes.rowCount === 0) {
              throw new AppError({
                category: ErrorCategory.VALIDATION,
                code: 'TRIAGE_DESTINATION_ROOM_UNAVAILABLE',
                message: 'O consultório selecionado não está disponível.',
              });
            }
          }

          // 3. Atualização do encaminhamento em app.triages — LOCK OTIMISTA
          // REAL (mesmo padrão do PATCH .../reclassify e de
          // PATCH /api/v1/encounters/:id/status em encounters.ts).
          const updateRes = await client.query<DbTriageRow>(
            `update app.triages
             set destination_type = $1, destination_room_id = $2, destination_exam_category = $3,
                 destination_procedure_kind = $4, destination_procedure_other = $5, destination_notes = $6,
                 destination_set_by = $7, destination_set_at = now(), updated_at = now()
             where id = $8
               and (updated_at = $9::timestamptz or date_trunc('milliseconds', updated_at) = date_trunc('milliseconds', $9::timestamptz))
             returning *`,
            [
              validated.type,
              validated.roomId,
              validated.examCategory,
              validated.procedureKind,
              validated.procedureOther,
              validated.notes,
              appUserId,
              currentTriage.id,
              parsed.expectedUpdatedAt,
            ],
          );

          if (updateRes.rowCount === 0 || !updateRes.rows[0]) {
            throw new AppError({
              category: ErrorCategory.CONFLICT,
              code: 'CONCURRENCY_CONFLICT',
              message:
                'Este atendimento foi atualizado por outro profissional. Atualize os dados antes de alterar o encaminhamento novamente.',
            });
          }

          const updatedRow = updateRes.rows[0];

          // 3b. Registro do evento de alteração no histórico imutável —
          // nunca substitui o evento anterior (regra 13).
          await insertDestinationEvent(client, {
            triageId: updatedRow.id,
            destination: {
              type: validated.type!,
              roomId: validated.roomId ?? null,
              examCategory: validated.examCategory ?? null,
              procedureKind: validated.procedureKind ?? null,
              procedureOther: validated.procedureOther ?? null,
              notes: validated.notes ?? null,
              reason: validated.reason ?? null,
            },
            professionalId: appUserId,
          });

          const classificationHistory = await fetchClassificationHistory(client, updatedRow.id);
          const destinationHistory = await fetchDestinationHistory(client, updatedRow.id);
          const changed = mapRowToTriage(updatedRow, classificationHistory, destinationHistory);
          assertClassificationHistoryConsistent(changed);
          assertDestinationHistoryConsistent(changed);

          // 3c. Bloco 5 — mesmo avanço de estado feito na criação da
          // Triagem, mas só quando o atendimento ainda está exatamente em
          // 'triaged' (ainda não avançou por nenhum outro caminho) — uma
          // alteração de encaminhamento não deve empurrar/retroceder o
          // status de um atendimento que já seguiu adiante no fluxo clínico
          // (ex.: já em consulta).
          const encStatusRes = await client.query<{ status: string }>(
            'select status from app.encounters where id = $1',
            [encounterId],
          );
          if (encStatusRes.rows[0]?.status === 'triaged' && (validated.type === 'medical_consultation' || validated.type === 'red_room')) {
            await transitionEncounterStatus(client, {
              encounterId,
              toStatus: 'consultation_pending',
              actorUserId: appUserId as UUID,
            });
          }

          // 3d. Bloco 5 — reroteia o ticket de fila para refletir o novo
          // encaminhamento (mesma transação do UPDATE de app.triages acima).
          await routeQueueTicketForDestination(client, {
            encounterId,
            patientId: updatedRow.patient_id,
            institutionId: updatedRow.institution_id,
            destinationType: validated.type!,
            roomId: validated.roomId ?? null,
            riskColor: updatedRow.risk_color,
          });

          // 4. Auditoria
          await auditAction(client, appUserId, 'update', 'triage_destination', changed.id, req, {
            encounterId,
            destinationType: changed.destination.type,
            reason: validated.reason,
            performedBy: appUserId,
          });

          return changed;
        },
      );

      return reply.send(success(updatedTriage, req.id));
    },
  );
};
