import { AppError, ErrorCategory } from '@vitaloop/shared';

export function validateMedicalRecordRetention(closedAt: string | Date): { isSubjectToRetention: boolean; expiryYear: number } {
  if (!closedAt) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'INVALID_RECORD_DATE',
      message: 'Data de fechamento do atendimento/prontuário é necessária para cálculo da retenção legal.',
    });
  }

  const recordDate = new Date(closedAt);
  const expiryYear = recordDate.getFullYear() + 20; // 20 anos conforme Lei 13.787/2018

  return {
    isSubjectToRetention: true,
    expiryYear,
  };
}
