import { AppError, ErrorCategory } from '@vitaloop/shared';
import type { CreateRegulationInput, RegulationStatus } from './types.js';

export function validateRegulationInput(input: CreateRegulationInput): void {
  if (!input.destinationFacility || input.destinationFacility.trim().length < 3) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'DESTINATION_FACILITY_REQUIRED',
      message: 'O estabelecimento de saúde de destino pretendido é obrigatório para regulação médica.',
    });
  }

  if (!input.specialty || input.specialty.trim().length < 3) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'SPECIALTY_REQUIRED',
      message: 'A especialidade médica solicitada é obrigatória para a regulação de vaga.',
    });
  }
}

export function validateRegulationStatusTransition(
  currentStatus: RegulationStatus,
  targetStatus: RegulationStatus,
  cancellationReason?: string | null,
): void {
  if (currentStatus === 'canceled' || currentStatus === 'transferred') {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'REGULATION_FINAL_STATE',
      message: `Não é possível alterar o status de uma regulação no estado final '${currentStatus}'.`,
    });
  }

  if (targetStatus === 'canceled' && (!cancellationReason || cancellationReason.trim().length < 10)) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'CANCELLATION_REASON_REQUIRED',
      message: 'O motivo de cancelamento da regulação é obrigatório e deve possuir no mínimo 10 caracteres.',
    });
  }

  const validNextStates: Record<RegulationStatus, RegulationStatus[]> = {
    requested: ['in_regulation', 'accepted', 'canceled'],
    in_regulation: ['accepted', 'canceled'],
    accepted: ['transferred', 'canceled'],
    transferred: [],
    canceled: [],
  };

  const allowed = validNextStates[currentStatus];
  if (!allowed.includes(targetStatus)) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'INVALID_STATUS_TRANSITION',
      message: `Transição de status de regulação inválida: de '${currentStatus}' para '${targetStatus}'.`,
    });
  }
}
