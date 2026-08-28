import { AppError, ErrorCategory } from '@vitaloop/shared';
import type { ConsultationCreateInput, EvolutionCreateInput, SegmentalExam } from './types.js';

export const ALLOWED_ENCOUNTER_STATUSES_FOR_CONSULTATION: readonly string[] = [
  'triaged',
  'consultation_pending',
  'in_consultation',
];

/**
 * Valida se o estado do atendimento permite o registro da consulta médica (MED-001).
 */
export const assertEncounterStatusPermitsConsultation = (currentStatus: string): void => {
  if (!ALLOWED_ENCOUNTER_STATUSES_FOR_CONSULTATION.includes(currentStatus)) {
    throw new AppError({
      category: ErrorCategory.CONFLICT,
      code: 'ENCOUNTER_INVALID_STATUS_FOR_CONSULTATION',
      message: `Não é possível registrar consulta médica no estado '${currentStatus}'. O atendimento precisa estar triado ou em atendimento.`,
    });
  }
};

/**
 * Valida a entrada para criação da consulta médica (MED-001..004).
 */
export const validateConsultationCreateInput = (
  input: ConsultationCreateInput,
): ConsultationCreateInput & { normalizedSegmentalExam: SegmentalExam } => {
  if (!input.encounterId || !input.patientId) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'MEDICAL_MISSING_ENCOUNTER_OR_PATIENT',
      message: 'Atendimento e Paciente são obrigatórios para a consulta médica.',
    });
  }

  const chiefComplaint = (input.chiefComplaint || '').trim();
  if (!chiefComplaint) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'MEDICAL_CHIEF_COMPLAINT_REQUIRED',
      message: 'A queixa principal é obrigatória na consulta médica.',
    });
  }

  const historyPresentIllness = (input.historyPresentIllness || '').trim();
  if (!historyPresentIllness) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'MEDICAL_HMA_REQUIRED',
      message: 'A História da Moléstia Atual (HMA) é obrigatória na anamnese médica.',
    });
  }

  const generalExam = (input.generalExam || '').trim();
  if (!generalExam) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'MEDICAL_GENERAL_EXAM_REQUIRED',
      message: 'O Exame Físico Geral é obrigatório na consulta médica.',
    });
  }

  const diagnosticHypothesis = (input.diagnosticHypothesis || '').trim();
  if (!diagnosticHypothesis) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'MEDICAL_DIAGNOSTIC_HYPOTHESIS_REQUIRED',
      message: 'A Hipótese Diagnóstica clínica é obrigatória.',
    });
  }

  const seg = input.segmentalExam || {};
  const normalizedSegmentalExam: SegmentalExam = {
    cardiovascular: seg.cardiovascular ? seg.cardiovascular.trim() : null,
    respiratory: seg.respiratory ? seg.respiratory.trim() : null,
    abdomen: seg.abdomen ? seg.abdomen.trim() : null,
    neurological: seg.neurological ? seg.neurological.trim() : null,
    extremities: seg.extremities ? seg.extremities.trim() : null,
    other: seg.other ? seg.other.trim() : null,
  };

  return {
    ...input,
    chiefComplaint,
    historyPresentIllness,
    pastMedicalHistory: input.pastMedicalHistory ? input.pastMedicalHistory.trim() : null,
    systemReview: input.systemReview ? input.systemReview.trim() : null,
    generalExam,
    diagnosticHypothesis,
    initialConduct: input.initialConduct ? input.initialConduct.trim() : null,
    normalizedSegmentalExam,
  };
};

/**
 * Valida a entrada para registro de evolução médica (MED-013, MED-014).
 */
export const validateEvolutionCreateInput = (input: EvolutionCreateInput): EvolutionCreateInput => {
  if (!input.consultationId || !input.encounterId || !input.patientId) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'MEDICAL_MISSING_EVOLUTION_IDS',
      message: 'Consulta, Atendimento e Paciente são obrigatórios para a evolução médica.',
    });
  }

  const evolutionText = (input.evolutionText || '').trim();
  if (!evolutionText) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'MEDICAL_EVOLUTION_TEXT_REQUIRED',
      message: 'O texto descritivo da evolução médica é obrigatório.',
    });
  }

  return {
    ...input,
    evolutionText,
    clinicalStatus: input.clinicalStatus ? input.clinicalStatus.trim() : null,
  };
};
