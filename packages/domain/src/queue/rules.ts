import { AppError, ErrorCategory } from '@vitaloop/shared';
import type { ManchesterRiskColor } from '../triage/types.js';
import { MANCHESTER_CONFIG } from '../triage/rules.js';
import type { TicketCallInput, TicketEnqueueInput, TicketStatus } from './types.js';

export const MANCHESTER_BASE_SCORES: Record<ManchesterRiskColor, number> = {
  red: 10_000,
  orange: 8_000,
  yellow: 6_000,
  green: 4_000,
  blue: 2_000,
};

/**
 * Calcula a pontuação de prioridade para ordenação estrita da fila assistencial (QUE-005).
 * Combina o peso da cor de risco Manchester com o tempo decorrido de espera.
 */
export const calculatePriorityScore = (
  riskColor?: ManchesterRiskColor | null,
  createdAtIso?: string,
  now: Date = new Date(),
): number => {
  const baseScore = riskColor && MANCHESTER_BASE_SCORES[riskColor] ? MANCHESTER_BASE_SCORES[riskColor] : 1_000;
  if (!createdAtIso) return baseScore;

  const elapsedMs = Math.max(0, now.getTime() - new Date(createdAtIso).getTime());
  const elapsedMinutes = Math.floor(elapsedMs / 60_000);

  return baseScore + elapsedMinutes;
};

/**
 * Verifica se o tempo de espera do paciente na fila excedeu o tempo-alvo do Manchester (QUE-009..010).
 */
export const isWaitTimeExceeded = (
  riskColor?: ManchesterRiskColor | null,
  createdAtIso?: string,
  now: Date = new Date(),
): boolean => {
  if (!riskColor || !createdAtIso) return false;
  const config = MANCHESTER_CONFIG[riskColor];
  if (!config) return false;

  const elapsedMs = Math.max(0, now.getTime() - new Date(createdAtIso).getTime());
  const elapsedMinutes = Math.floor(elapsedMs / 60_000);

  return elapsedMinutes > config.targetTimeMinutes;
};

/**
 * Valida a transição de estado da senha/ticket de fila (QUE-006..008).
 */
export const assertValidTicketStatusTransition = (
  currentStatus: TicketStatus,
  newStatus: TicketStatus,
): void => {
  if (currentStatus === newStatus && currentStatus === 'called') {
    // Permite rechamada no estado 'called' (QUE-007)
    return;
  }

  const validTransitions: Record<TicketStatus, readonly TicketStatus[]> = {
    waiting: ['called', 'canceled'],
    called: ['called', 'in_service', 'absent', 'waiting', 'canceled'],
    in_service: ['finished', 'canceled'],
    absent: ['waiting', 'canceled'],
    finished: [],
    canceled: [],
  };

  const allowed = validTransitions[currentStatus] || [];
  if (!allowed.includes(newStatus)) {
    throw new AppError({
      category: ErrorCategory.CONFLICT,
      code: 'QUEUE_INVALID_TICKET_TRANSITION',
      message: `Transição inválida de estado do ticket de fila: de '${currentStatus}' para '${newStatus}'.`,
    });
  }
};

/**
 * Valida a entrada para enfileiramento de um atendimento (QUE-001..005).
 */
export const validateTicketEnqueueInput = (
  input: TicketEnqueueInput,
): TicketEnqueueInput & { priorityScore: number; formattedTicketNumber: string } => {
  if (!input.queueId || !input.encounterId || !input.patientId) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'QUEUE_MISSING_REQUIRED_IDS',
      message: 'Fila, Atendimento e Paciente são obrigatórios para enfileiramento.',
    });
  }

  const priorityScore = calculatePriorityScore(input.riskColor);
  const formattedTicketNumber = (input.ticketNumber || `SENHA-${Math.floor(1000 + Math.random() * 9000)}`).trim();

  return {
    ...input,
    priorityScore,
    formattedTicketNumber,
  };
};

/**
 * Valida a chamada de um paciente para um consultório/sala (QUE-006).
 */
export const validateTicketCallInput = (input: TicketCallInput): TicketCallInput & { callRoomNormalized: string } => {
  const room = (input.callRoom || '').trim();
  if (!room) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'QUEUE_CALL_ROOM_REQUIRED',
      message: 'O local/consultório de atendimento é obrigatório para chamar o paciente.',
    });
  }

  return {
    ...input,
    callRoomNormalized: room,
  };
};
