import { AppError, ErrorCategory } from '@vitaloop/shared';
import type { EncounterStatus, PostConsultationDetail } from './types.js';

// 'admitted' (internado) é um estado ATIVO de cuidado contínuo, não um
// desfecho — pode durar dias, com evolução/reavaliação (daí a auto-transição
// admitted -> admitted permitida por isValidEncounterStatusTransition abaixo
// via `from === to`). Só sai de 'admitted' para 'completed' (alta
// hospitalar via app.encounter_outcomes/summaries, migration 0031); nunca
// para 'canceled' — internação não se "cancela", se encerra por alta/óbito/
// transferência. O banco reforça isso em profundidade (migration 0082,
// trigger app.guard_encounter_admission_transition): rejeita internar sem
// leito ativo alocado, e rejeita concluir com leito ou internação ainda
// ativos — mesmo que este código permita a transição.
const ALLOWED_TRANSITIONS: Record<EncounterStatus, readonly EncounterStatus[]> = {
  created: ['triage_pending', 'canceled'],
  triage_pending: ['triaged', 'canceled'],
  triaged: ['consultation_pending', 'canceled'],
  consultation_pending: ['in_consultation', 'canceled'],
  in_consultation: ['post_consultation', 'admitted', 'completed', 'canceled'],
  post_consultation: ['admitted', 'completed', 'canceled'],
  admitted: ['completed'],
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
  postConsultationDetail?: PostConsultationDetail | null,
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

  if (to === 'post_consultation' && !postConsultationDetail) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'POST_CONSULTATION_DETAIL_REQUIRED',
      message: 'É obrigatório informar o que está acontecendo (medicando, aguardando exames ou aguardando reavaliação) ao mover o atendimento para pós-avaliação médica.',
    });
  }
};
