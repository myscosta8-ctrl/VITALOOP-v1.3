import { AppError, ErrorCategory } from '@vitaloop/shared';
import type {
  PharmacyStockBatchCreateInput,
  PharmacyStockMovementCreateInput,
  StockMovementType,
} from './types.js';

export const validatePharmacyStockBatchCreateInput = (
  input: PharmacyStockBatchCreateInput,
): PharmacyStockBatchCreateInput => {
  const batchNumber = (input.batchNumber || '').trim();
  if (!batchNumber) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'PHARMACY_STOCK_BATCH_NUMBER_REQUIRED',
      message: 'O número do lote é obrigatório.',
    });
  }

  if (input.quantityOnHand < 0) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'PHARMACY_STOCK_QUANTITY_INVALID',
      message: 'A quantidade recebida não pode ser negativa.',
    });
  }

  const today = new Date().toISOString().slice(0, 10);
  if (input.expiryDate < today) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'PHARMACY_STOCK_BATCH_EXPIRED',
      message: 'Não é possível dar entrada em um lote com validade já vencida.',
    });
  }

  const unit = (input.unit || '').trim();
  if (!unit) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'PHARMACY_STOCK_UNIT_REQUIRED',
      message: 'A unidade de medida do lote é obrigatória.',
    });
  }

  return { ...input, batchNumber, unit, notes: input.notes ? input.notes.trim() : null };
};

export const validatePharmacyStockMovementCreateInput = (
  input: PharmacyStockMovementCreateInput,
): PharmacyStockMovementCreateInput => {
  if (input.quantity <= 0) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'PHARMACY_STOCK_MOVEMENT_QUANTITY_INVALID',
      message: 'A quantidade da movimentação deve ser maior que zero.',
    });
  }

  return { ...input, reason: input.reason ? input.reason.trim() : null };
};

/**
 * Aplica uma movimentação à quantidade atual do lote — função pura, sem
 * acesso a banco, pra a rota poder validar antes de gravar o UPDATE. Lança
 * se uma saída/ajuste negativo deixaria o estoque abaixo de zero.
 */
export const applyStockMovement = (
  currentQuantity: number,
  movementType: StockMovementType,
  quantity: number,
): number => {
  const nextQuantity = movementType === 'entrada' ? currentQuantity + quantity : currentQuantity - quantity;

  if (nextQuantity < 0) {
    throw new AppError({
      category: ErrorCategory.CONFLICT,
      code: 'PHARMACY_STOCK_INSUFFICIENT_QUANTITY',
      message: `Estoque insuficiente: quantidade atual (${currentQuantity}) é menor que a saída solicitada (${quantity}).`,
    });
  }

  return nextQuantity;
};
