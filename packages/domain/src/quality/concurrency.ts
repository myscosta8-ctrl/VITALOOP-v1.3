import { AppError, ErrorCategory } from '@vitaloop/shared';

export interface ConcurrencyCheckInput {
  currentVersion: number;
  expectedVersion: number;
}

export function assertNoConcurrentUpdateConflict(input: ConcurrencyCheckInput): void {
  if (input.currentVersion !== input.expectedVersion) {
    throw new AppError({
      category: ErrorCategory.CONFLICT,
      code: 'CONCURRENT_UPDATE_CONFLICT',
      message: 'Conflito de concorrência: o registro foi modificado por outra operação simultânea.',
    });
  }
}
