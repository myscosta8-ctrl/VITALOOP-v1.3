import { AppError, ErrorCategory } from '@vitaloop/shared';
import type { ControlledMedicationClass, ControlledMedicationDispensationInput } from './types.js';

/**
 * Listas A e B (entorpecentes/psicotrópicos) exigem número da notificação
 * de receita por força de lei (Portaria 344/98, art. 41-45) — as listas C
 * usam receita de controle comum, sem numeração especial obrigatória.
 */
const NOTIFICATION_REQUIRED_CLASSES: readonly ControlledMedicationClass[] = ['A1', 'A2', 'A3', 'B1', 'B2'];

export const validateControlledMedicationDispensationInput = (
  input: ControlledMedicationDispensationInput,
): ControlledMedicationDispensationInput => {
  if (input.quantityDispensed <= 0) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'CONTROLLED_MEDICATION_QUANTITY_INVALID',
      message: 'A quantidade dispensada deve ser maior que zero.',
    });
  }

  const unit = (input.unit || '').trim();
  if (!unit) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'CONTROLLED_MEDICATION_UNIT_REQUIRED',
      message: 'A unidade de medida da dispensação é obrigatória.',
    });
  }

  const notificationNumber = (input.prescriptionNotificationNumber || '').trim();
  if (NOTIFICATION_REQUIRED_CLASSES.includes(input.controlledClass) && !notificationNumber) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'CONTROLLED_MEDICATION_NOTIFICATION_REQUIRED',
      message: `Medicamentos da lista ${input.controlledClass} exigem o número da notificação de receita (Portaria SVS/MS 344/98).`,
    });
  }

  return {
    ...input,
    unit,
    prescriptionNotificationNumber: notificationNumber || null,
    witnessName: input.witnessName ? input.witnessName.trim() : null,
    notes: input.notes ? input.notes.trim() : null,
  };
};
