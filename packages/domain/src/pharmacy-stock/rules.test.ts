import { describe, expect, it } from 'vitest';
import { AppError } from '@vitaloop/shared';
import {
  applyStockMovement,
  validatePharmacyStockBatchCreateInput,
  validatePharmacyStockMovementCreateInput,
} from './rules.js';

describe('validatePharmacyStockBatchCreateInput', () => {
  const base = { medicationId: 'med-1', batchNumber: 'L123', expiryDate: '2099-01-01', quantityOnHand: 10, unit: 'comprimido' };

  it('aceita lote válido', () => {
    const result = validatePharmacyStockBatchCreateInput(base);
    expect(result.batchNumber).toBe('L123');
  });

  it('rejeita lote já vencido', () => {
    expect(() => validatePharmacyStockBatchCreateInput({ ...base, expiryDate: '2000-01-01' })).toThrowError(AppError);
  });

  it('rejeita quantidade negativa', () => {
    expect(() => validatePharmacyStockBatchCreateInput({ ...base, quantityOnHand: -1 })).toThrowError(AppError);
  });
});

describe('validatePharmacyStockMovementCreateInput', () => {
  it('rejeita quantidade zero', () => {
    expect(() =>
      validatePharmacyStockMovementCreateInput({ batchId: 'b-1', movementType: 'saida', quantity: 0 }),
    ).toThrowError(AppError);
  });
});

describe('applyStockMovement', () => {
  it('soma em entrada', () => {
    expect(applyStockMovement(10, 'entrada', 5)).toBe(15);
  });

  it('subtrai em saída', () => {
    expect(applyStockMovement(10, 'saida', 5)).toBe(5);
  });

  it('rejeita saída maior que o estoque atual', () => {
    expect(() => applyStockMovement(3, 'saida', 5)).toThrowError(AppError);
  });
});
