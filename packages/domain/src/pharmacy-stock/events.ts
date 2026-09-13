import type { UUID } from '@vitaloop/shared';
import type { DomainEvent } from '../domain-event.js';
import { createDomainEvent } from '../domain-event.js';
import type { PharmacyStockBatch, PharmacyStockMovement } from './types.js';

export interface StockBatchReceivedPayload {
  batchId: UUID;
  medicationId: UUID;
  batchNumber: string;
  quantityOnHand: number;
  receivedBy: UUID;
}

export function createStockBatchReceivedEvent(
  batch: PharmacyStockBatch,
  correlationId?: UUID,
): DomainEvent<string, StockBatchReceivedPayload> {
  return createDomainEvent({
    type: 'PharmacyStockBatchReceived',
    aggregateType: 'pharmacy_stock_batch',
    aggregateId: batch.id as UUID,
    actorId: batch.receivedBy as UUID,
    payload: {
      batchId: batch.id as UUID,
      medicationId: batch.medicationId as UUID,
      batchNumber: batch.batchNumber,
      quantityOnHand: batch.quantityOnHand,
      receivedBy: batch.receivedBy as UUID,
    },
    ...(correlationId !== undefined ? { correlationId } : {}),
  });
}

export interface StockMovementRecordedPayload {
  movementId: UUID;
  batchId: UUID;
  movementType: string;
  quantity: number;
  performedBy: UUID;
}

export function createStockMovementRecordedEvent(
  movement: PharmacyStockMovement,
  correlationId?: UUID,
): DomainEvent<string, StockMovementRecordedPayload> {
  return createDomainEvent({
    type: 'PharmacyStockMovementRecorded',
    aggregateType: 'pharmacy_stock_movement',
    aggregateId: movement.id as UUID,
    actorId: movement.performedBy as UUID,
    payload: {
      movementId: movement.id as UUID,
      batchId: movement.batchId as UUID,
      movementType: movement.movementType,
      quantity: movement.quantity,
      performedBy: movement.performedBy as UUID,
    },
    ...(correlationId !== undefined ? { correlationId } : {}),
  });
}
