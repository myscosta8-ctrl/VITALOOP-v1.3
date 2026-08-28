import type { ApiClient } from './api-client.js';

export type ManchesterRiskColor = 'red' | 'orange' | 'yellow' | 'green' | 'blue';
export type ManchesterPriority = 'emergency' | 'very_urgent' | 'urgent' | 'standard' | 'non_urgent';

export interface VitalSigns {
  systolicBp?: number | null;
  diastolicBp?: number | null;
  heartRate?: number | null;
  respiratoryRate?: number | null;
  temperature?: number | null;
  oxygenSaturation?: number | null;
}

export interface Triage {
  readonly id: string;
  readonly encounterId: string;
  readonly patientId: string;
  readonly institutionId: string;
  readonly unitId?: string | null;
  readonly sectorId?: string | null;

  readonly chiefComplaint: string;
  readonly symptomsDuration?: string | null;
  readonly history?: string | null;

  readonly vitals: VitalSigns;
  readonly painScore?: number | null;
  readonly glasgowScore?: number | null;
  readonly capillaryGlucose?: number | null;

  readonly flowchart?: string | null;
  readonly discriminator?: string | null;
  readonly riskColor: ManchesterRiskColor;
  readonly priority: ManchesterPriority;
  readonly targetTimeMinutes: number;
  readonly protocolVersion: string;

  readonly reclassificationReason?: string | null;
  readonly reclassifiedFrom?: string | null;
  readonly notes?: string | null;
  readonly performedBy: string;
  readonly performedAt: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface TriageCreatePayload {
  chiefComplaint: string;
  symptomsDuration?: string | null;
  history?: string | null;
  vitals?: VitalSigns | null;
  painScore?: number | null;
  glasgowScore?: number | null;
  capillaryGlucose?: number | null;
  flowchart?: string | null;
  discriminator?: string | null;
  riskColor: ManchesterRiskColor;
  notes?: string | null;
}

export interface TriageReclassifyPayload {
  newRiskColor: ManchesterRiskColor;
  reclassificationReason: string;
  notes?: string | null;
}

export const createTriagesApi = (api: ApiClient) => ({
  createTriage: (encounterId: string, payload: TriageCreatePayload) =>
    api.post<Triage>(`/api/v1/encounters/${encounterId}/triage`, payload),

  getTriage: (encounterId: string) =>
    api.get<Triage>(`/api/v1/encounters/${encounterId}/triage`),

  reclassifyTriage: (encounterId: string, payload: TriageReclassifyPayload) =>
    api.patch<Triage>(`/api/v1/encounters/${encounterId}/triage/reclassify`, payload),
});

export type TriagesApi = ReturnType<typeof createTriagesApi>;
