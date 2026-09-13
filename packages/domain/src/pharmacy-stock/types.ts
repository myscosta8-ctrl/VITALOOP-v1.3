/**
 * Estoque de Farmácia (lote/validade) — Fase 5 do plano de reconstrução
 * assistencial, 12/09/2026. O Vitaloop só tinha catálogo de medicamentos
 * (`app.medication_catalog`), sem controle de estoque real — dispensava sem
 * nunca baixar quantidade nem rastrear lote/validade.
 */
export type StockMovementType = 'entrada' | 'saida' | 'ajuste';

export interface PharmacyStockBatch {
  readonly id: string;
  readonly medicationId: string;
  readonly batchNumber: string;
  readonly expiryDate: string;
  readonly quantityOnHand: number;
  readonly unit: string;
  readonly receivedAt: string;
  readonly receivedBy: string;
  readonly notes?: string | null;
}

export interface PharmacyStockBatchCreateInput {
  readonly medicationId: string;
  readonly batchNumber: string;
  readonly expiryDate: string;
  readonly quantityOnHand: number;
  readonly unit: string;
  readonly notes?: string | null;
}

export interface PharmacyStockMovement {
  readonly id: string;
  readonly batchId: string;
  readonly movementType: StockMovementType;
  readonly quantity: number;
  readonly reason?: string | null;
  readonly performedBy: string;
  readonly createdAt: string;
}

export interface PharmacyStockMovementCreateInput {
  readonly batchId: string;
  readonly movementType: StockMovementType;
  readonly quantity: number;
  readonly reason?: string | null;
}
