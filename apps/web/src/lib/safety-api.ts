import type { ApiClient } from './api-client.js';

export interface CreateAdverseEventPayload {
  encounterId?: string | undefined;
  patientId?: string | undefined;
  isAnonymous?: boolean | undefined;
  eventCategory: string;
  severity: 'near_miss' | 'no_harm' | 'mild' | 'moderate' | 'severe' | 'death';
  description: string;
  immediateAction?: string | undefined;
  isEpidemiologicalNotification?: boolean | undefined;
  sinanCode?: string | undefined;
}

export interface AdverseEventRecord {
  id: string;
  status: string;
}

export interface CreateIsolationPayload {
  isolationType: 'standard' | 'contact' | 'droplet' | 'airborne' | 'protective';
  reason: string;
  pathogenSuspected?: string | undefined;
}

export interface IsolationRecord {
  id: string;
  isolationType: string;
}

export const createSafetyApi = (api: ApiClient) => ({
  reportAdverseEvent: (payload: CreateAdverseEventPayload): Promise<AdverseEventRecord> =>
    api.post<AdverseEventRecord>('/api/v1/safety/adverse-events', payload),

  fetchAdverseEvents: (): Promise<AdverseEventRecord[]> => api.get<AdverseEventRecord[]>('/api/v1/safety/adverse-events'),

  prescribeIsolation: (encounterId: string, payload: CreateIsolationPayload): Promise<IsolationRecord> =>
    api.post<IsolationRecord>(`/api/v1/encounters/${encounterId}/isolations`, payload),

  fetchEncounterIsolations: (encounterId: string): Promise<IsolationRecord[]> =>
    api.get<IsolationRecord[]>(`/api/v1/encounters/${encounterId}/isolations`),

  endIsolation: (isolationId: string): Promise<IsolationRecord> => api.patch<IsolationRecord>(`/api/v1/isolations/${isolationId}/end`),
});
