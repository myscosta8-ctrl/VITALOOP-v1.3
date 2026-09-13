import type { ApiClient } from './api-client.js';

export interface NursingDiagnosisInput {
  code: string;
  title: string;
  domainName?: string;
  relatedFactors?: string;
  definingCharacteristics?: string;
}

export interface NursingCareInput {
  careDescription: string;
  frequencyHours?: number;
}

export interface CreateSaePayload {
  diagnoses: NursingDiagnosisInput[];
  prescriptions: NursingCareInput[];
}

export type ScaleType = 'braden' | 'morse' | 'glasgow' | 'mews' | 'ramsay' | 'fugulin';

export interface ApplyScalePayload {
  scaleType: ScaleType;
  scoreDetails: Record<string, unknown>;
}

export interface NursingScaleResult {
  total_score: number;
  risk_level: string;
}

export interface NursingScaleEvaluation {
  id: string;
  encounter_id: string;
  patient_id: string;
  evaluator_id: string;
  scale_type: ScaleType;
  total_score: number;
  risk_level: string;
  score_details: Record<string, unknown>;
  evaluated_at: string;
}

export interface InsertDevicePayload {
  deviceType: string;
  anatomicalSite: string;
  expectedReplacementDays?: number;
  notes?: string;
}

export const createNursingSaeApi = (api: ApiClient) => ({
  createNursingSae: (encounterId: string, payload: CreateSaePayload): Promise<unknown> =>
    api.post(`/api/v1/encounters/${encounterId}/nursing/sae`, payload),

  applyNursingScale: (encounterId: string, payload: ApplyScalePayload): Promise<NursingScaleResult> =>
    api.post<NursingScaleResult>(`/api/v1/encounters/${encounterId}/nursing/scales`, payload),

  listNursingScales: (encounterId: string): Promise<readonly NursingScaleEvaluation[]> =>
    api.get<readonly NursingScaleEvaluation[]>(`/api/v1/encounters/${encounterId}/nursing/scales`),

  insertInvasiveDevice: (encounterId: string, payload: InsertDevicePayload): Promise<unknown> =>
    api.post(`/api/v1/encounters/${encounterId}/nursing/devices`, payload),
});
