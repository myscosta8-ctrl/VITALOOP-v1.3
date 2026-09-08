import type { ApiClient } from './api-client.js';

export type FluidBalanceStatus = 'open' | 'partially_closed' | 'closed';
export type FluidBalanceDirection = 'gain' | 'loss';

export interface FluidBalanceEntry {
  id: string;
  periodId: string;
  direction: FluidBalanceDirection;
  itemName: string;
  volumeMl: number;
  entryDate: string;
  entryHour: number;
  entryMinute: number;
  region?: string | null;
  laterality?: 'left' | 'right' | 'bilateral' | null;
  recordedBy: string;
  createdAt: string;
}

export interface FluidBalanceTotals {
  totalGainMl: number;
  totalLossMl: number;
  netBalanceMl: number;
}

export interface FluidBalancePeriod {
  id: string;
  encounterId: string;
  patientId: string;
  balanceNumber: number;
  status: FluidBalanceStatus;
  referenceDate: string;
  periodStart: string;
  periodEnd?: string | null;
  createdBy: string;
  closedBy?: string | null;
  closedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FluidBalancePeriodWithTotals extends FluidBalancePeriod {
  totals: FluidBalanceTotals;
}

export interface FluidBalancePeriodDetail extends FluidBalancePeriod {
  entries: FluidBalanceEntry[];
  totals: FluidBalanceTotals;
}

export interface CreateFluidBalanceEntryInput {
  direction: FluidBalanceDirection;
  itemName: string;
  volumeMl: number;
  entryDate: string;
  entryHour: number;
  entryMinute?: number;
  region?: string | null;
  laterality?: 'left' | 'right' | 'bilateral' | null;
}

export const createFluidBalanceApi = (api: ApiClient) => ({
  getOrCreateCurrentPeriod: (encounterId: string, referenceDate?: string): Promise<FluidBalancePeriod> =>
    api.post<FluidBalancePeriod>(`/api/v1/encounters/${encounterId}/fluid-balance/periods`, referenceDate ? { referenceDate } : undefined),

  listPeriods: (encounterId: string): Promise<FluidBalancePeriodWithTotals[]> =>
    api.get<FluidBalancePeriodWithTotals[]>(`/api/v1/encounters/${encounterId}/fluid-balance/periods`),

  getPeriod: (periodId: string): Promise<FluidBalancePeriodDetail> => api.get<FluidBalancePeriodDetail>(`/api/v1/fluid-balance/periods/${periodId}`),

  addEntry: (periodId: string, input: CreateFluidBalanceEntryInput): Promise<FluidBalanceEntry> =>
    api.post<FluidBalanceEntry>(`/api/v1/fluid-balance/periods/${periodId}/entries`, input),

  closePeriod: (periodId: string, targetStatus: Extract<FluidBalanceStatus, 'partially_closed' | 'closed'>): Promise<FluidBalancePeriod> =>
    api.post<FluidBalancePeriod>(`/api/v1/fluid-balance/periods/${periodId}/close`, { targetStatus }),
});
