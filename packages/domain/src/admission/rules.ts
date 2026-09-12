import { AppError, ErrorCategory } from '@vitaloop/shared';
import type { AdmissionCreateInput, AdmissionUpdateInput, AdmissionDischargeInput } from './types.js';

export function validateAdmissionCreateInput(input: AdmissionCreateInput): void {
  if (!input.encounterId || !input.patientId || !input.admittingDoctorId) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'ADMISSION_REQUIRED_FIELDS',
      message: 'Atendimento, paciente e médico responsável são obrigatórios para internar.',
    });
  }

  if (!input.admissionDiagnosisDescription || input.admissionDiagnosisDescription.trim().length < 3) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'ADMISSION_DIAGNOSIS_REQUIRED',
      message: 'O diagnóstico de admissão é obrigatório para internar o paciente.',
    });
  }

  if (!input.admissionJustification || input.admissionJustification.trim().length < 10) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'ADMISSION_JUSTIFICATION_REQUIRED',
      message: 'A justificativa clínica de internação exige no mínimo 10 caracteres.',
    });
  }
}

export function validateAdmissionUpdateInput(input: AdmissionUpdateInput): void {
  if (!input.admissionId || !input.updatedBy) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'ADMISSION_UPDATE_REQUIRED_FIELDS',
      message: 'Internação e profissional responsável pela evolução são obrigatórios.',
    });
  }

  const hasAnyField =
    input.admittingDoctorId !== undefined ||
    input.admissionDiagnosisCode !== undefined ||
    input.admissionDiagnosisDescription !== undefined ||
    input.admissionJustification !== undefined;

  if (!hasAnyField) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'ADMISSION_UPDATE_EMPTY',
      message: 'Informe ao menos um campo para evoluir a internação.',
    });
  }

  if (input.admissionDiagnosisDescription !== undefined && input.admissionDiagnosisDescription.trim().length < 3) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'ADMISSION_DIAGNOSIS_REQUIRED',
      message: 'O diagnóstico de admissão não pode ficar vazio.',
    });
  }

  if (input.admissionJustification !== undefined && input.admissionJustification.trim().length < 10) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'ADMISSION_JUSTIFICATION_REQUIRED',
      message: 'A justificativa clínica de internação exige no mínimo 10 caracteres.',
    });
  }
}

export function validateAdmissionDischargeInput(input: AdmissionDischargeInput): void {
  if (!input.admissionId || !input.encounterId || !input.patientId || !input.dischargedBy) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'ADMISSION_DISCHARGE_REQUIRED_FIELDS',
      message: 'Internação, atendimento e profissional responsável são obrigatórios para encerrar a internação.',
    });
  }

  if (input.status === 'deceased' && (!input.endReason || input.endReason.trim().length < 3)) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'ADMISSION_DEATH_REASON_REQUIRED',
      message: 'O registro de óbito exige uma causa/circunstância informada.',
    });
  }
}
