import { AppError, ErrorCategory } from '@vitaloop/shared';
import type { EncounterCreateInput } from './types.js';

export const validateEncounterCreateInput = (input: EncounterCreateInput): EncounterCreateInput => {
  if (!input.patientId || input.patientId.trim().length === 0) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'PATIENT_ID_REQUIRED',
      message: 'O ID do paciente é obrigatório para abrir um atendimento.',
    });
  }

  if (!input.institutionId || input.institutionId.trim().length === 0) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'INSTITUTION_ID_REQUIRED',
      message: 'O ID da instituição é obrigatório para abrir um atendimento.',
    });
  }

  if (!input.chiefComplaint || input.chiefComplaint.trim().length === 0) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'CHIEF_COMPLAINT_REQUIRED',
      message: 'A queixa principal/motivo do atendimento é obrigatória.',
    });
  }

  return {
    ...input,
    patientId: input.patientId.trim(),
    institutionId: input.institutionId.trim(),
    unitId: input.unitId?.trim() || null,
    sectorId: input.sectorId?.trim() || null,
    chiefComplaint: input.chiefComplaint.trim(),
    assignedUserId: input.assignedUserId?.trim() || null,
  };
};
