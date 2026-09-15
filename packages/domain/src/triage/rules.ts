import { AppError, ErrorCategory } from '@vitaloop/shared';
import type {
  ManchesterPriority,
  ManchesterRiskColor,
  Triage,
  TriageComplaintDetail,
  TriageCreateInput,
  TriageDestinationInput,
  TriageDestinationType,
  TriageInitialAssessment,
  TriagePainDetail,
  TriagePregnancyAssessment,
  TriageReclassifyInput,
  TriageSkinFinding,
  VitalSigns,
} from './types.js';

const VALID_SKIN_FINDINGS: readonly TriageSkinFinding[] = ['normal_color', 'pale', 'cyanotic', 'diaphoretic', 'jaundiced', 'other'];

/**
 * Tabela oficial de tempos-alvo e prioridades do Protocolo de Manchester (TRI-010..015).
 */
export const MANCHESTER_CONFIG: Record<
  ManchesterRiskColor,
  { priority: ManchesterPriority; targetTimeMinutes: number }
> = {
  red: { priority: 'emergency', targetTimeMinutes: 0 },
  orange: { priority: 'very_urgent', targetTimeMinutes: 10 },
  yellow: { priority: 'urgent', targetTimeMinutes: 60 },
  green: { priority: 'standard', targetTimeMinutes: 120 },
  blue: { priority: 'non_urgent', targetTimeMinutes: 240 },
};

/**
 * Deriva a prioridade e o tempo-alvo em minutos a partir da cor do Protocolo de Manchester (TRI-015).
 * O tempo-alvo É DERIVADO pela regra de domínio e nunca aceito livremente do frontend.
 */
export const deriveManchesterTargetAndPriority = (
  color: ManchesterRiskColor,
): { priority: ManchesterPriority; targetTimeMinutes: number } => {
  const config = MANCHESTER_CONFIG[color];
  if (!config) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'TRIAGE_INVALID_COLOR',
      message: `Cor de classificação de risco inválida: ${color}.`,
    });
  }
  return config;
};

/**
 * Valida individualmente os campos estruturados de sinais vitais (TRI-002).
 */
export const validateVitalSigns = (vitals?: VitalSigns | null): VitalSigns => {
  if (!vitals) return {};

  if (vitals.systolicBp != null && (vitals.systolicBp < 30 || vitals.systolicBp > 300)) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'TRIAGE_INVALID_SYSTOLIC_BP',
      message: 'Pressão arterial sistólica deve estar entre 30 e 300 mmHg.',
    });
  }

  if (vitals.diastolicBp != null && (vitals.diastolicBp < 10 || vitals.diastolicBp > 200)) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'TRIAGE_INVALID_DIASTOLIC_BP',
      message: 'Pressão arterial diastólica deve estar entre 10 e 200 mmHg.',
    });
  }

  if (vitals.heartRate != null && (vitals.heartRate < 20 || vitals.heartRate > 300)) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'TRIAGE_INVALID_HEART_RATE',
      message: 'Frequência cardíaca deve estar entre 20 e 300 bpm.',
    });
  }

  if (vitals.respiratoryRate != null && (vitals.respiratoryRate < 4 || vitals.respiratoryRate > 100)) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'TRIAGE_INVALID_RESPIRATORY_RATE',
      message: 'Frequência respiratória deve estar entre 4 e 100 ipm.',
    });
  }

  if (vitals.temperature != null && (vitals.temperature < 25.0 || vitals.temperature > 45.0)) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'TRIAGE_INVALID_TEMPERATURE',
      message: 'Temperatura corporal deve estar entre 25.0ºC e 45.0ºC.',
    });
  }

  if (vitals.oxygenSaturation != null && (vitals.oxygenSaturation < 0 || vitals.oxygenSaturation > 100)) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'TRIAGE_INVALID_OXYGEN_SATURATION',
      message: 'Saturação de oxigênio deve estar entre 0% e 100%.',
    });
  }

  return {
    systolicBp: vitals.systolicBp ?? null,
    diastolicBp: vitals.diastolicBp ?? null,
    heartRate: vitals.heartRate ?? null,
    respiratoryRate: vitals.respiratoryRate ?? null,
    temperature: vitals.temperature ?? null,
    oxygenSaturation: vitals.oxygenSaturation ?? null,
  };
};

/**
 * Valida a Escala de Dor (0 a 10) (TRI-003).
 */
export const validatePainScore = (score?: number | null): number | null => {
  if (score == null) return null;
  if (!Number.isInteger(score) || score < 0 || score > 10) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'TRIAGE_INVALID_PAIN_SCORE',
      message: 'A escala de dor deve ser um número inteiro de 0 a 10.',
    });
  }
  return score;
};

/**
 * Valida a Escala de Coma de Glasgow (3 a 15) (TRI-004).
 */
export const validateGlasgowScore = (score?: number | null): number | null => {
  if (score == null) return null;
  if (!Number.isInteger(score) || score < 3 || score > 15) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'TRIAGE_INVALID_GLASGOW_SCORE',
      message: 'A Escala de Coma de Glasgow deve ser um número inteiro entre 3 e 15.',
    });
  }
  return score;
};

/**
 * Valida a Glicemia Capilar (mg/dL >= 0) (TRI-005).
 */
export const validateCapillaryGlucose = (glucose?: number | null): number | null => {
  if (glucose == null) return null;
  if (glucose < 0) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'TRIAGE_INVALID_CAPILLARY_GLUCOSE',
      message: 'A glicemia capilar deve ser maior ou igual a 0 mg/dL.',
    });
  }
  return glucose;
};

/**
 * Valida/normaliza a avaliação inicial estruturada (Bloco 1). Todos os
 * subcampos são opcionais — uma triagem pode ser finalizada sem preencher
 * avaliação inicial completa (regra 16 do bloco: campos aceitam ausência).
 */
export const validateInitialAssessment = (
  input?: TriageInitialAssessment | null,
): TriageInitialAssessment => {
  if (!input) return { skinFindings: [] };

  const skinFindings = Array.from(new Set(input.skinFindings ?? []));
  for (const finding of skinFindings) {
    if (!VALID_SKIN_FINDINGS.includes(finding)) {
      throw new AppError({
        category: ErrorCategory.VALIDATION,
        code: 'TRIAGE_INVALID_SKIN_FINDING',
        message: `Achado de pele inválido: ${finding}.`,
      });
    }
  }

  return {
    generalCondition: input.generalCondition ?? null,
    consciousness: input.consciousness ?? null,
    airway: input.airway ?? null,
    breathing: input.breathing ?? null,
    circulation: input.circulation ?? null,
    skinFindings,
    skinFindingsOther: input.skinFindingsOther ? input.skinFindingsOther.trim() : null,
  };
};

/**
 * Valida/normaliza a gestação informada NESTE atendimento — nunca presume
 * gravidez, nunca bloqueia o registro de "não informado" (regra 6 do bloco).
 */
export const validatePregnancyAssessment = (
  input?: TriagePregnancyAssessment | null,
): TriagePregnancyAssessment => {
  if (!input || !input.status) return { status: null, weeks: null, obstetricNotes: null };

  if (input.weeks != null && (input.weeks < 0 || input.weeks > 45)) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'TRIAGE_INVALID_PREGNANCY_WEEKS',
      message: 'A idade gestacional deve estar entre 0 e 45 semanas.',
    });
  }

  return {
    status: input.status,
    weeks: input.status === 'yes' ? (input.weeks ?? null) : null,
    obstetricNotes: input.obstetricNotes ? input.obstetricNotes.trim() : null,
  };
};

/**
 * Valida/normaliza início e evolução estruturados da queixa (Bloco 1) —
 * dado do atendimento, distinto de `symptomsDuration` (texto livre já
 * existente) e nunca gravado como atributo permanente do paciente.
 */
export const validateComplaintDetail = (input?: TriageComplaintDetail | null): TriageComplaintDetail => {
  if (!input) return { onsetAt: null, evolution: null, notes: null };
  return {
    onsetAt: input.onsetAt ?? null,
    evolution: input.evolution ?? null,
    notes: input.notes ? input.notes.trim() : null,
  };
};

/**
 * Valida/normaliza os detalhes complementares de dor (localização,
 * irradiação, característica, início, evolução). `painScore` (0-10)
 * continua sendo o único campo de intensidade — não duplicado aqui.
 */
export const validatePainDetail = (input?: TriagePainDetail | null): TriagePainDetail => {
  if (!input) return { location: null, irradiation: null, character: null, onsetAt: null, evolution: null };
  return {
    location: input.location ? input.location.trim() : null,
    irradiation: input.irradiation ? input.irradiation.trim() : null,
    character: input.character ? input.character.trim() : null,
    onsetAt: input.onsetAt ?? null,
    evolution: input.evolution ?? null,
  };
};

/**
 * Valida o encaminhamento após triagem (Bloco 3, regra operacional da UPA).
 *
 * Regra fundamental: a Triagem NUNCA decide destino de leito comum/
 * internação/observação — só os 4 tipos abaixo existem. "Atendimento
 * médico" sempre exige consultório (regra 8); Sala Vermelha nunca é
 * derivada automaticamente da cor Manchester (regra 4/12) — quem chama esta
 * função decide o tipo, não uma regra `if riskColor === 'red'`.
 *
 * `requireReason`: `false` na definição inicial (ao finalizar a triagem,
 * não há "encaminhamento anterior" pra justificar trocar), `true` numa
 * alteração posterior (regra 14).
 */
export const validateTriageDestination = (
  input: TriageDestinationInput | null | undefined,
  opts: { requireReason: boolean },
): TriageDestinationInput => {
  if (!input || !input.type) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'TRIAGE_DESTINATION_REQUIRED',
      message: 'É obrigatório definir o encaminhamento após a triagem.',
    });
  }

  switch (input.type) {
    case 'medical_consultation':
      if (!input.roomId) {
        throw new AppError({
          category: ErrorCategory.VALIDATION,
          code: 'TRIAGE_DESTINATION_ROOM_REQUIRED',
          message: 'Selecione o consultório para encaminhar o paciente.',
        });
      }
      break;
    case 'red_room':
      break;
    case 'exam':
      if (!input.examCategory) {
        throw new AppError({
          category: ErrorCategory.VALIDATION,
          code: 'TRIAGE_DESTINATION_EXAM_CATEGORY_REQUIRED',
          message: 'Selecione o tipo de exame (laboratorial ou imagem).',
        });
      }
      break;
    case 'procedure':
      if (!input.procedureKind) {
        throw new AppError({
          category: ErrorCategory.VALIDATION,
          code: 'TRIAGE_DESTINATION_PROCEDURE_KIND_REQUIRED',
          message: 'Selecione o procedimento.',
        });
      }
      if (input.procedureKind === 'other' && !input.procedureOther?.trim()) {
        throw new AppError({
          category: ErrorCategory.VALIDATION,
          code: 'TRIAGE_DESTINATION_PROCEDURE_OTHER_REQUIRED',
          message: 'Descreva o procedimento institucional.',
        });
      }
      break;
  }

  if (opts.requireReason && !input.reason?.trim()) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'TRIAGE_DESTINATION_REASON_REQUIRED',
      message: 'O motivo da alteração do encaminhamento é obrigatório.',
    });
  }

  return {
    type: input.type,
    roomId: (input.type === 'medical_consultation' ? input.roomId : null) ?? null,
    examCategory: (input.type === 'exam' ? input.examCategory : null) ?? null,
    procedureKind: (input.type === 'procedure' ? input.procedureKind : null) ?? null,
    procedureOther: input.type === 'procedure' && input.procedureKind === 'other' ? input.procedureOther!.trim() : null,
    notes: input.notes ? input.notes.trim() : null,
    reason: input.reason ? input.reason.trim() : null,
  };
};

/**
 * Verifica que o encaminhamento atual da triagem corresponde ao evento mais
 * recente do histórico — mesmo princípio de `assertClassificationHistoryConsistent`
 * (Bloco 2), aplicado ao encaminhamento (Bloco 3). Triagens sem histórico de
 * destino (antigas, ou ainda sem encaminhamento definido) não são
 * verificadas.
 */
export const assertDestinationHistoryConsistent = (triage: Triage): void => {
  if (triage.destinationHistory.length === 0) return;
  const mostRecent = triage.destinationHistory[0]!;
  if (mostRecent.destinationType !== triage.destination.type) {
    throw new AppError({
      category: ErrorCategory.CONFLICT,
      code: 'TRIAGE_DESTINATION_HISTORY_INCONSISTENT',
      message: 'O encaminhamento atual da triagem não corresponde ao evento mais recente do histórico.',
    });
  }
};

// =====================================================================
// Bloco 4 — Execução funcional do encaminhamento: regra de compatibilidade
// entre tipo de destino e o fluxo assistencial posterior. Nenhuma dessas
// funções toca banco/leito — são regras puras, reaproveitadas tanto pela UI
// (item 16: "deixar claro o destino escolhido e o próximo fluxo") quanto
// por validações futuras. A garantia estrutural de que a Triagem NUNCA
// encaminha para leito comum já vem do próprio enum `TriageDestinationType`
// (só 4 valores possíveis, nenhum é "leito"/"internação") — as funções
// abaixo apenas tornam essa regra explícita e testável, sem duplicar
// nenhuma lógica de app.beds/app.bed_allocations (módulo de Internação,
// intocado por este bloco).
// =====================================================================

/**
 * Estágio do fluxo assistencial que o encaminhamento representa — usado
 * apenas para apresentação (regra 16), nunca para persistir um novo estado
 * no atendimento (regra 13: não inventar estado novo na máquina de estados
 * compartilhada de `packages/domain/src/encounter`).
 */
export type TriageDestinationFlowStage = 'medical_consultation_queue' | 'red_room_direct' | 'exam_flow' | 'procedure_flow';

const DESTINATION_FLOW_STAGE: Record<TriageDestinationType, TriageDestinationFlowStage> = {
  medical_consultation: 'medical_consultation_queue',
  red_room: 'red_room_direct',
  exam: 'exam_flow',
  procedure: 'procedure_flow',
};

export const resolveDestinationFlowStage = (type: TriageDestinationType): TriageDestinationFlowStage => DESTINATION_FLOW_STAGE[type];

/** Regra 1/3: só "atendimento médico" exige consultório e entra na fila médica. */
export const requiresConsultationRoom = (type: TriageDestinationType): boolean => type === 'medical_consultation';

/** Regra 5: só Sala Vermelha pode receber o paciente diretamente (exceção operacional, nunca derivada da cor Manchester). */
export const allowsDirectRedRoom = (type: TriageDestinationType): boolean => type === 'red_room';

/** Regra 6: exame/procedimento exclusivos NÃO obrigam passagem por consultório médico. */
export const isExemptFromMedicalConsultation = (type: TriageDestinationType): boolean =>
  type === 'exam' || type === 'procedure' || type === 'red_room';

/**
 * Regra 2/13: nenhum tipo de destino admitido pela Triagem implica
 * alocação de leito comum. Estruturalmente impossível informar um "leito"
 * aqui — este union type é a única fonte de valores válidos em toda a
 * cadeia (Zod na API espelha exatamente estes 4 valores, nada além disso é
 * aceito). Função exportada só para tornar a garantia testável
 * explicitamente (item 17/19), não para decidir nada em runtime que já não
 * esteja decidido pelo próprio sistema de tipos.
 */
export const ALLOWED_TRIAGE_DESTINATION_TYPES: readonly TriageDestinationType[] = [
  'medical_consultation',
  'red_room',
  'exam',
  'procedure',
];

/**
 * Normaliza e valida a entrada de criação da triagem.
 */
export const validateTriageCreateInput = (
  input: TriageCreateInput,
): TriageCreateInput & {
  priority: ManchesterPriority;
  targetTimeMinutes: number;
  vitalsNormalized: VitalSigns;
  initialAssessmentNormalized: TriageInitialAssessment;
  pregnancyNormalized: TriagePregnancyAssessment;
  complaintDetailNormalized: TriageComplaintDetail;
  painDetailNormalized: TriagePainDetail;
  destinationNormalized: TriageDestinationInput;
} => {
  const chiefComplaint = (input.chiefComplaint || '').trim();
  if (!chiefComplaint) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'TRIAGE_CHIEF_COMPLAINT_REQUIRED',
      message: 'A queixa principal do paciente é obrigatória para registrar a triagem.',
    });
  }

  const vitalsNormalized = validateVitalSigns(input.vitals);
  const painScore = validatePainScore(input.painScore);
  const glasgowScore = validateGlasgowScore(input.glasgowScore);
  const capillaryGlucose = validateCapillaryGlucose(input.capillaryGlucose);
  const initialAssessmentNormalized = validateInitialAssessment(input.initialAssessment);
  const pregnancyNormalized = validatePregnancyAssessment(input.pregnancy);
  const complaintDetailNormalized = validateComplaintDetail(input.complaintDetail);
  const painDetailNormalized = validatePainDetail(input.painDetail);
  const destinationNormalized = validateTriageDestination(input.destination, { requireReason: false });

  const { priority, targetTimeMinutes } = deriveManchesterTargetAndPriority(input.riskColor);

  return {
    ...input,
    chiefComplaint,
    symptomsDuration: input.symptomsDuration ? input.symptomsDuration.trim() : null,
    history: input.history ? input.history.trim() : null,
    vitalsNormalized,
    painScore,
    glasgowScore,
    capillaryGlucose,
    flowchart: input.flowchart ? input.flowchart.trim() : null,
    discriminator: input.discriminator ? input.discriminator.trim() : null,
    notes: input.notes ? input.notes.trim() : null,
    initialAssessmentNormalized,
    pregnancyNormalized,
    complaintDetailNormalized,
    painDetailNormalized,
    destinationNormalized,
    priority,
    targetTimeMinutes,
  };
};

/**
 * Verifica que a classificação atual da triagem corresponde ao evento mais
 * recente do histórico (Bloco 2, regra 14 — "criar validação para evitar
 * inconsistência"). `classificationHistory` já vem ordenado mais-recente-
 * primeiro (contrato de `Triage.classificationHistory`). Triagens sem
 * nenhum evento (ex.: antigas, anteriores a esta migration) não são
 * verificadas — não há histórico retroativo a comparar (regra 17: "não
 * inventar histórico retroativo").
 */
export const assertClassificationHistoryConsistent = (triage: Triage): void => {
  if (triage.classificationHistory.length === 0) return;
  const mostRecent = triage.classificationHistory[0]!;
  if (mostRecent.riskColor !== triage.riskColor) {
    throw new AppError({
      category: ErrorCategory.CONFLICT,
      code: 'TRIAGE_CLASSIFICATION_HISTORY_INCONSISTENT',
      message: 'A classificação atual da triagem não corresponde ao evento mais recente do histórico.',
    });
  }
};

/**
 * Rótulo de exibição do profissional responsável por um evento do
 * histórico (Bloco 2.1) — nome quando disponível (RLS permitiu resolver),
 * fallback seguro por UUID truncado quando não. Nunca lança erro: o
 * histórico não pode quebrar por causa de um nome indisponível.
 */
export const resolveProfessionalLabel = (professionalName: string | null | undefined, professionalId: string): string => {
  const trimmed = professionalName?.trim();
  if (trimmed) return trimmed;
  return `Profissional #${professionalId.slice(0, 8)}`;
};

/**
 * Valida o motivo obrigatório em solicitações de reclassificação de risco (TRI-016).
 */
export const validateTriageReclassifyInput = (
  input: TriageReclassifyInput,
): TriageReclassifyInput & { priority: ManchesterPriority; targetTimeMinutes: number } => {
  const reason = (input.reclassificationReason || '').trim();
  if (!reason) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'TRIAGE_RECLASSIFICATION_REASON_REQUIRED',
      message: 'O motivo da reclassificação de risco é obrigatório.',
    });
  }

  const { priority, targetTimeMinutes } = deriveManchesterTargetAndPriority(input.newRiskColor);

  return {
    ...input,
    reclassificationReason: reason,
    notes: input.notes ? input.notes.trim() : null,
    priority,
    targetTimeMinutes,
  };
};
