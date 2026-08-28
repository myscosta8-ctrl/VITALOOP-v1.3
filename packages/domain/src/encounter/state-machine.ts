import { AppError, ErrorCategory } from '@vitaloop/shared';
import type { EncounterStatus } from './types.js';

const ALLOWED_TRANSITIONS: Record<EncounterStatus, readonly EncounterStatus[]> = {
  created: ['triage_pending', 'canceled'],
  triage_pending: ['triaged', 'canceled'],
  triaged: ['consultation_pending', 'canceled'],
  consultation_pending: ['in_consultation', 'canceled'],
  in_consultation: ['completed', 'canceled'],
  completed: [],
  canceled: [],
};

export const isTerminalEncounterStatus = (status: EncounterStatus): boolean => {
  return status === 'completed' || status === 'canceled';
};

export const isValidEncounterStatusTransition = (
  from: EncounterStatus,
  to: EncounterStatus,
): boolean => {
  if (from === to) return true;
  const allowed = ALLOWED_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
};

export const assertValidEncounterStatusTransition = (
  from: EncounterStatus,
  to: EncounterStatus,
  cancelReason?: string | null,
): void => {
  if (isTerminalEncounterStatus(from)) {
    throw new AppError({
      category: ErrorCategory.CONFLICT,
      code: 'TERMINAL_STATE_REACHED',
      message: `O atendimento já está em estado terminal ('${from}') e não pode sofrer novas alterações de status.`,
    });
  }

  if (!isValidEncounterStatusTransition(from, to)) {
    throw new AppError({
      category: ErrorCategory.CONFLICT,
      code: 'INVALID_STATE_TRANSITION',
      message: `Transição de status inválida: de '${from}' para '${to}'.`,
    });
  }

  if (to === 'canceled' && (!cancelReason || cancelReason.trim().length === 0)) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'CANCEL_REASON_REQUIRED',
      message: 'O motivo do cancelamento é obrigatório ao cancelar um atendimento.',
    });
  }
};
