import { AppError, ErrorCategory } from '@vitaloop/shared';
import type { ShiftHandoverCreateInput } from './types.js';

export const validateShiftHandoverCreateInput = (
  input: ShiftHandoverCreateInput,
): ShiftHandoverCreateInput => {
  const summaryNotes = (input.summaryNotes || '').trim();
  if (!summaryNotes || summaryNotes.length < 10) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'SHIFT_HANDOVER_SUMMARY_REQUIRED',
      message: 'O resumo da passagem de plantão é obrigatório (mínimo 10 caracteres).',
    });
  }

  if (input.patientCensus != null && input.patientCensus < 0) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'SHIFT_HANDOVER_CENSUS_INVALID',
      message: 'O censo de pacientes não pode ser negativo.',
    });
  }

  return {
    ...input,
    summaryNotes,
    criticalAlerts: input.criticalAlerts ? input.criticalAlerts.trim() : null,
    pendingTasks: input.pendingTasks ? input.pendingTasks.trim() : null,
  };
};
