import { AppError, ErrorCategory } from '@vitaloop/shared';

export interface DispensationItemInput {
  medicationName: string;
  quantity: number;
  dosage: string;
}

export function validatePharmacyDispensationInput(items: DispensationItemInput[]): void {
  if (!items || items.length === 0) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'DISPENSATION_ITEMS_REQUIRED',
      message: 'Ao menos um item medicamento deve ser fornecido para dispensação na farmácia.',
    });
  }

  for (const item of items) {
    if (!item.medicationName || item.medicationName.trim().length < 2) {
      throw new AppError({
        category: ErrorCategory.VALIDATION,
        code: 'INVALID_MEDICATION_NAME',
        message: 'Nome de medicamento inválido para dispensação.',
      });
    }
    if (!item.quantity || item.quantity <= 0) {
      throw new AppError({
        category: ErrorCategory.VALIDATION,
        code: 'INVALID_DISPENSATION_QUANTITY',
        message: 'A quantidade dispensada deve ser superior a zero.',
      });
    }
  }
}
