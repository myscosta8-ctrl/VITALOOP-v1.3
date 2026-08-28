import type { ApiClient } from './api-client.js';

export type EncounterType = 'urgency' | 'emergency' | 'elective' | 'return';
export type EncounterOrigin = 'spontaneous' | 'samu' | 'transfer' | 'rescue_other';

export type EncounterStatus =
  | 'created'
  | 'triage_pending'
  | 'triaged'
  | 'consultation_pending'
  | 'in_consultation'
  | 'completed'
  | 'canceled';

export interface Encounter {
  readonly id: string;
  readonly patientId: string;
  readonly institutionId: string;
  readonly unitId?: string | null;
  readonly sectorId?: string | null;
  readonly encounterType: EncounterType;
  readonly origin: EncounterOrigin;
  readonly chiefComplaint: string;
  readonly status: EncounterStatus;
  readonly cancelReason?: string | null;
  readonly assignedUserId?: string | null;
  readonly createdBy?: string | null;
  readonly updatedBy?: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface EncounterCreatePayload {
  patientId: string;
  institutionId?: string;
  unitId?: string | null;
  sectorId?: string | null;
  encounterType: EncounterType;
  origin: EncounterOrigin;
  chiefComplaint: string;
  assignedUserId?: string | null;
}

export interface EncounterUpdateStatusPayload {
  status: EncounterStatus;
  cancelReason?: string | null;
  expectedUpdatedAt: string;
}

export const createEncountersApi = (api: ApiClient) => ({
  createEncounter: (payload: EncounterCreatePayload) =>
    api.post<Encounter>('/api/v1/encounters', payload),

  listEncounters: (params?: {
    patientId?: string;
    status?: EncounterStatus;
    sectorId?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.patientId) query.set('patientId', params.patientId);
    if (params?.status) query.set('status', params.status);
    if (params?.sectorId) query.set('sectorId', params.sectorId);

    const q = query.toString();
    const url = `/api/v1/encounters${q ? `?${q}` : ''}`;
    return api.get<readonly Encounter[]>(url);
  },

  getEncounter: (id: string) => api.get<Encounter>(`/api/v1/encounters/${id}`),

  updateStatus: (id: string, payload: EncounterUpdateStatusPayload) =>
    api.patch<Encounter>(`/api/v1/encounters/${id}/status`, payload),
});

export type EncountersApi = ReturnType<typeof createEncountersApi>;
