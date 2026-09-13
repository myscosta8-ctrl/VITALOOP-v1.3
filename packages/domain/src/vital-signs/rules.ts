import { AppError, ErrorCategory } from '@vitaloop/shared';
import { validateVitalSigns } from '../triage/rules.js';
import type { VitalSignsRecordInput } from './types.js';

/**
 * Valida a reafericão de sinais vitais — reaproveita `validateVitalSigns`
 * (mesmos limites clínicos usados na Triagem, TRI-002) e só acrescenta a
 * regra específica desta reavaliação: pelo menos um valor precisa ter sido
 * informado (não faz sentido registrar uma reaferição totalmente vazia).
 */
export const validateVitalSignsRecordInput = (
  input: VitalSignsRecordInput,
): VitalSignsRecordInput => {
  const vitalsNormalized = validateVitalSigns(input.vitals);

  const hasAnyValue = Object.values(vitalsNormalized).some((v) => v != null);
  if (!hasAnyValue) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'VITAL_SIGNS_READING_EMPTY',
      message: 'Informe ao menos um sinal vital para registrar a reavaliação.',
    });
  }

  return {
    ...input,
    vitals: vitalsNormalized,
    notes: input.notes ? input.notes.trim() : null,
  };
};
