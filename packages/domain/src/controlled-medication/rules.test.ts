import { describe, expect, it } from 'vitest';
import { AppError } from '@vitaloop/shared';
import { validateControlledMedicationDispensationInput } from './rules.js';
import type { ControlledMedicationDispensationInput } from './types.js';

const base: ControlledMedicationDispensationInput = {
  prescriptionItemId: 'item-1',
  encounterId: 'enc-1',
  patientId: 'pat-1',
  controlledClass: 'C1',
  quantityDispensed: 1,
  unit: 'comprimido',
};

describe('validateControlledMedicationDispensationInput', () => {
  it('aceita dispensação de lista C sem número de notificação', () => {
    const result = validateControlledMedicationDispensationInput(base);
    expect(result.prescriptionNotificationNumber).toBeNull();
  });

  it('exige número de notificação para listas A e B', () => {
    expect(() =>
      validateControlledMedicationDispensationInput({ ...base, controlledClass: 'A1' }),
    ).toThrowError(AppError);
  });

  it('aceita lista A1 com número de notificação informado', () => {
    const result = validateControlledMedicationDispensationInput({
      ...base, controlledClass: 'A1', prescriptionNotificationNumber: 'NR-12345',
    });
    expect(result.prescriptionNotificationNumber).toBe('NR-12345');
  });

  it('rejeita quantidade zero ou negativa', () => {
    expect(() => validateControlledMedicationDispensationInput({ ...base, quantityDispensed: 0 })).toThrowError(AppError);
  });
});
