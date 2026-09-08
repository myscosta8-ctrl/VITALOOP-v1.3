import { AppError, ErrorCategory } from '@vitaloop/shared';
import type { CreateFluidBalanceEntryInput, FluidBalanceEntry, FluidBalanceStatus, FluidBalanceTotals } from './types.js';

export function validateFluidBalanceEntryInput(input: CreateFluidBalanceEntryInput): void {
  if (!input.itemName || input.itemName.trim().length < 2) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'ITEM_NAME_REQUIRED',
      message: 'O nome do item lançado no balanço hídrico é obrigatório.',
    });
  }

  if (!Number.isFinite(input.volumeMl) || input.volumeMl <= 0) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'INVALID_VOLUME',
      message: 'O volume lançado deve ser um número maior que zero.',
    });
  }

  if (!Number.isInteger(input.entryHour) || input.entryHour < 0 || input.entryHour > 23) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'INVALID_HOUR',
      message: 'O horário do lançamento deve ser um número inteiro entre 0 e 23.',
    });
  }

  const entryMinute = input.entryMinute ?? 0;
  if (!Number.isInteger(entryMinute) || entryMinute < 0 || entryMinute > 59) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'INVALID_MINUTE',
      message: 'O minuto do lançamento deve ser um número inteiro entre 0 e 59.',
    });
  }
}

export function computeFluidBalanceTotals(entries: readonly FluidBalanceEntry[]): FluidBalanceTotals {
  const totalGainMl = entries.filter((e) => e.direction === 'gain').reduce((sum, e) => sum + e.volumeMl, 0);
  const totalLossMl = entries.filter((e) => e.direction === 'loss').reduce((sum, e) => sum + e.volumeMl, 0);

  return {
    totalGainMl,
    totalLossMl,
    netBalanceMl: totalGainMl - totalLossMl,
  };
}

export function validateFluidBalanceStatusTransition(
  currentStatus: FluidBalanceStatus,
  targetStatus: FluidBalanceStatus,
): void {
  if (currentStatus === 'closed') {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'FLUID_BALANCE_ALREADY_CLOSED',
      message: 'Este balanço hídrico já está fechado e não pode ser alterado.',
    });
  }

  if (targetStatus === 'open') {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'INVALID_FLUID_BALANCE_STATUS_TRANSITION',
      message: 'Não é possível reabrir um balanço hídrico já fechado (parcial ou totalmente).',
    });
  }
}
