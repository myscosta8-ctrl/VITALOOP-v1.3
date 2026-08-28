import { AppError, ErrorCategory } from '@vitaloop/shared';
import type { CreateAdverseEventInput, CreatePatientIsolationInput } from './types.js';

export function validateAdverseEventInput(input: CreateAdverseEventInput): void {
  if (!input.eventCategory || input.eventCategory.trim().length < 3) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'EVENT_CATEGORY_REQUIRED',
      message: 'A categoria do evento adverso deve possuir no mínimo 3 caracteres.',
    });
  }

  if (!input.description || input.description.trim().length < 15) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'DESCRIPTION_TOO_SHORT',
      message: 'A descrição detalhada do evento adverso deve possuir no mínimo 15 caracteres.',
    });
  }

  const validSeverities = ['near_miss', 'no_harm', 'mild', 'moderate', 'severe', 'death'];
  if (!validSeverities.includes(input.severity)) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'INVALID_SEVERITY',
      message: 'Grau de severidade do evento adverso inválido.',
    });
  }
}

export function validatePatientIsolationInput(input: CreatePatientIsolationInput): void {
  if (!input.reason || input.reason.trim().length < 10) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'ISOLATION_REASON_REQUIRED',
      message: 'A justificativa clínica de isolamento assistencial deve possuir no mínimo 10 caracteres.',
    });
  }

  const validIsolations = ['standard', 'contact', 'droplet', 'airborne', 'protective'];
  if (!validIsolations.includes(input.isolationType)) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'INVALID_ISOLATION_TYPE',
      message: 'Tipo de isolamento assistencial inválido.',
    });
  }
}
