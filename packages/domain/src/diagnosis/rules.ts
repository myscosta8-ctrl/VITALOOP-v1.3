import { AppError, ErrorCategory } from '@vitaloop/shared';
import type { DiagnosisCreateInput, DiagnosisUpdateStatusInput } from './types.js';

export const ALLOWED_DIAGNOSIS_TYPES: readonly string[] = ['principal', 'secondary'];
export const ALLOWED_DIAGNOSIS_STATUSES: readonly string[] = ['active', 'resolved', 'refuted'];

/**
 * Valida a criação de um diagnóstico clínico vinculado a um atendimento (MED-005).
 */
export const validateDiagnosisCreateInput = (input: DiagnosisCreateInput): DiagnosisCreateInput => {
  if (!input.consultationId || !input.encounterId || !input.patientId) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'DIAGNOSIS_MISSING_REQUIRED_IDS',
      message: 'Consulta médica, Atendimento e Paciente são obrigatórios para registrar diagnóstico.',
    });
  }

  const cidCode = (input.cidCode || '').trim().toUpperCase();
  if (!cidCode) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'DIAGNOSIS_CID_CODE_REQUIRED',
      message: 'O código CID-10 é obrigatório.',
    });
  }

  if (!ALLOWED_DIAGNOSIS_TYPES.includes(input.diagnosisType)) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'DIAGNOSIS_INVALID_TYPE',
      message: `Tipo de diagnóstico inválido '${input.diagnosisType}'. Tipos aceitos: 'principal' ou 'secondary'.`,
    });
  }

  return {
    ...input,
    cidCode,
    notes: input.notes ? input.notes.trim() : null,
  };
};

/**
 * Valida a alteração de situação do diagnóstico (MED-005).
 * Refutar um diagnóstico exige nota/justificativa clínica obrigatória.
 */
export const validateDiagnosisStatusUpdate = (
  input: DiagnosisUpdateStatusInput,
): DiagnosisUpdateStatusInput => {
  if (!input.diagnosisId) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'DIAGNOSIS_MISSING_ID',
      message: 'ID do diagnóstico é obrigatório.',
    });
  }

  if (!ALLOWED_DIAGNOSIS_STATUSES.includes(input.status)) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'DIAGNOSIS_INVALID_STATUS',
      message: `Situação de diagnóstico inválida '${input.status}'. Situações aceitas: 'active', 'resolved' ou 'refuted'.`,
    });
  }

  const notes = input.notes ? input.notes.trim() : null;

  if (input.status === 'refuted' && !notes) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'DIAGNOSIS_REFUTATION_REASON_REQUIRED',
      message: 'A justificativa médica/nota clínica é obrigatória ao refutar um diagnóstico.',
    });
  }

  return {
    ...input,
    notes,
  };
};
