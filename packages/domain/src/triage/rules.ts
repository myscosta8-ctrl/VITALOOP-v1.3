import { AppError, ErrorCategory } from '@vitaloop/shared';
import type {
  ManchesterPriority,
  ManchesterRiskColor,
  TriageCreateInput,
  TriageReclassifyInput,
  VitalSigns,
} from './types.js';

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
 * Normaliza e valida a entrada de criação da triagem.
 */
export const validateTriageCreateInput = (
  input: TriageCreateInput,
): TriageCreateInput & { priority: ManchesterPriority; targetTimeMinutes: number; vitalsNormalized: VitalSigns } => {
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
    priority,
    targetTimeMinutes,
  };
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
