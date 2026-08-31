import { AppError, ErrorCategory } from '@vitaloop/shared';

export interface MigrationFileStatus {
  fileNumber: number;
  fileName: string;
  isAdditive: boolean;
}

export function validateMigrationsPipeline(files: string[]): { total: number; isSequential: boolean } {
  if (!files || files.length === 0) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'MIGRATIONS_NOT_FOUND',
      message: 'Nenhuma migration encontrada para validação da pipeline.',
    });
  }

  const migrationNumbers = files
    .map((f) => {
      const match = f.match(/^(\d{4})_/);
      return match ? parseInt(match[1]!, 10) : null;
    })
    .filter((n): n is number => n !== null)
    .sort((a, b) => a - b);

  let isSequential = true;
  for (let i = 0; i < migrationNumbers.length; i++) {
    if (migrationNumbers[i] !== i + 1) {
      isSequential = false;
      break;
    }
  }

  return {
    total: migrationNumbers.length,
    isSequential,
  };
}

export function validateRollbackSafety(targetMigrationNumber: number, currentMigrationNumber: number): { canRollback: boolean; requiresBackup: boolean } {
  if (targetMigrationNumber > currentMigrationNumber) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'INVALID_ROLLBACK_TARGET',
      message: 'Alvo de rollback não pode ser superior à migration atual.',
    });
  }

  return {
    canRollback: true,
    requiresBackup: true,
  };
}
