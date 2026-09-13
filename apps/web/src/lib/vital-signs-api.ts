import type { ApiClient } from './api-client.js';

export interface VitalSignsValues {
  systolicBp?: number | null;
  diastolicBp?: number | null;
  heartRate?: number | null;
  respiratoryRate?: number | null;
  temperature?: number | null;
  oxygenSaturation?: number | null;
}

export type VitalSignsSource = 'triagem' | 'consulta' | 'enfermagem';

export interface VitalSignsReading {
  id: string;
  encounterId: string;
  patientId: string;
  source: VitalSignsSource;
  vitals: VitalSignsValues;
  notes?: string | null;
  recordedBy: string;
  createdAt: string;
}

export interface RecordVitalSignsInput {
  source: Extract<VitalSignsSource, 'consulta' | 'enfermagem'>;
  vitals: VitalSignsValues;
  notes?: string | null;
}

export const createVitalSignsApi = (api: ApiClient) => ({
  listReadings: (encounterId: string) =>
    api.get<readonly VitalSignsReading[]>(`/api/v1/encounters/${encounterId}/vital-signs`),

  recordReading: (encounterId: string, payload: RecordVitalSignsInput) =>
    api.post<VitalSignsReading>(`/api/v1/encounters/${encounterId}/vital-signs`, payload),
});

export type VitalSignsApi = ReturnType<typeof createVitalSignsApi>;
