import type { ApiClient } from './api-client.js';

export type StockMovementType = 'entrada' | 'saida' | 'ajuste';

export interface PharmacyStockBatch {
  id: string;
  medicationId: string;
  medicationName?: string;
  batchNumber: string;
  expiryDate: string;
  quantityOnHand: number;
  unit: string;
  receivedAt: string;
  receivedBy: string;
  notes?: string | null;
}

export interface CreateStockBatchInput {
  medicationId: string;
  batchNumber: string;
  expiryDate: string;
  quantityOnHand: number;
  unit: string;
  notes?: string | null;
}

export interface CreateStockMovementInput {
  movementType: StockMovementType;
  quantity: number;
  reason?: string | null;
}

export const createPharmacyStockApi = (api: ApiClient) => ({
  listBatches: () => api.get<readonly PharmacyStockBatch[]>('/api/v1/pharmacy/stock-batches'),

  createBatch: (payload: CreateStockBatchInput) =>
    api.post<PharmacyStockBatch>('/api/v1/pharmacy/stock-batches', payload),

  createMovement: (batchId: string, payload: CreateStockMovementInput) =>
    api.post(`/api/v1/pharmacy/stock-batches/${batchId}/movements`, payload),
});

export type PharmacyStockApi = ReturnType<typeof createPharmacyStockApi>;
