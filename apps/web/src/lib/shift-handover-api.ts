import type { ApiClient } from './api-client.js';

export type ShiftPeriod = 'manha' | 'tarde' | 'noite';

export interface ShiftHandover {
  id: string;
  sectorId?: string | null;
  shiftPeriod: ShiftPeriod;
  handoverDate: string;
  outgoingProfessionalId: string;
  incomingProfessionalId?: string | null;
  patientCensus?: number | null;
  criticalAlerts?: string | null;
  pendingTasks?: string | null;
  summaryNotes: string;
  createdAt: string;
}

export interface CreateShiftHandoverInput {
  sectorId?: string | null;
  shiftPeriod: ShiftPeriod;
  incomingProfessionalId?: string | null;
  patientCensus?: number | null;
  criticalAlerts?: string | null;
  pendingTasks?: string | null;
  summaryNotes: string;
}

export const createShiftHandoverApi = (api: ApiClient) => ({
  listHandovers: (sectorId?: string) =>
    api.get<readonly ShiftHandover[]>(`/api/v1/shift-handovers${sectorId ? `?sectorId=${encodeURIComponent(sectorId)}` : ''}`),

  createHandover: (payload: CreateShiftHandoverInput) =>
    api.post<ShiftHandover>('/api/v1/shift-handovers', payload),
});

export type ShiftHandoverApi = ReturnType<typeof createShiftHandoverApi>;
