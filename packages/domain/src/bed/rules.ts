import { AppError, ErrorCategory } from '@vitaloop/shared';
import type { AllocateBedInput, TransferBedInput, DischargeBedInput, BedStatus } from './types.js';

export function validateAllocateBedInput(input: AllocateBedInput, currentBedStatus: BedStatus): void {
  if (!input.bedId || !input.encounterId || !input.patientId || !input.allocatedBy) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'BED_ALLOCATE_REQUIRED_FIELDS',
      message: 'Leito, atendimento, paciente e profissional responsável são obrigatórios para a alocação.',
    });
  }

  if (currentBedStatus !== 'available' && currentBedStatus !== 'reserved') {
    throw new AppError({
      category: ErrorCategory.CONFLICT,
      code: 'BED_NOT_AVAILABLE',
      message: `O leito não está disponível para alocação (Status atual: ${currentBedStatus}).`,
    });
  }
}

export function validateTransferBedInput(input: TransferBedInput, targetBedStatus: BedStatus): void {
  if (!input.allocationId || !input.sourceBedId || !input.targetBedId || !input.encounterId || !input.transferredBy) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'BED_TRANSFER_REQUIRED_FIELDS',
      message: 'Alocação de origem, leito destino e profissional responsável são obrigatórios.',
    });
  }

  if (input.sourceBedId === input.targetBedId) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'BED_TRANSFER_SAME_BED',
      message: 'O leito de destino deve ser diferente do leito de origem.',
    });
  }

  if (!input.transferReason || input.transferReason.trim().length < 10) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'BED_TRANSFER_REASON_REQUIRED',
      message: 'A transferência de leito exige justificativa técnica/clínica de no mínimo 10 caracteres.',
    });
  }

  if (targetBedStatus !== 'available') {
    throw new AppError({
      category: ErrorCategory.CONFLICT,
      code: 'BED_TARGET_NOT_AVAILABLE',
      message: `O leito de destino não está disponível para transferência (Status atual: ${targetBedStatus}).`,
    });
  }
}

export function validateDischargeBedInput(input: DischargeBedInput): void {
  if (!input.allocationId || !input.bedId || !input.encounterId || !input.dischargedBy) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'BED_DISCHARGE_REQUIRED_FIELDS',
      message: 'Alocação, leito e profissional responsável são obrigatórios para a alta do leito.',
    });
  }
}

export function calculateBedStayHours(allocatedAt: Date | string): { hours: number; is24hLimitExceeded: boolean } {
  const start = new Date(allocatedAt).getTime();
  const now = Date.now();
  const diffMs = Math.max(0, now - start);
  const hours = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;
  return {
    hours,
    is24hLimitExceeded: hours >= 24,
  };
}
