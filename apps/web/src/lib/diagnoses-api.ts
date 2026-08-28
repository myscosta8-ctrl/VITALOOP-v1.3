import type { ApiClient } from './api-client.js';

export type DiagnosisType = 'principal' | 'secondary';
export type DiagnosisStatus = 'active' | 'resolved' | 'refuted';

export interface CidItem {
  readonly code: string;
  readonly description: string;
  readonly chapter?: string | null | undefined;
  readonly isActive: boolean;
}

export interface EncounterDiagnosis {
  readonly id: string;
  readonly consultationId: string;
  readonly encounterId: string;
  readonly patientId: string;
  readonly doctorId: string;
  readonly cidCode: string;
  readonly cidDescription?: string | null | undefined;
  readonly diagnosisType: DiagnosisType;
  readonly status: DiagnosisStatus;
  readonly notes?: string | null | undefined;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface DiagnosisCreatePayload {
  cidCode: string;
  diagnosisType: DiagnosisType;
  notes?: string | null | undefined;
}

export interface DiagnosisStatusUpdatePayload {
  status: DiagnosisStatus;
  notes?: string | null | undefined;
}

export const createDiagnosesApi = (api: ApiClient) => ({
  searchCid: (q: string) =>
    api.get<readonly CidItem[]>(`/api/v1/cid/search?q=${encodeURIComponent(q)}`),

  getDiagnoses: (encounterId: string) =>
    api.get<readonly EncounterDiagnosis[]>(`/api/v1/encounters/${encounterId}/diagnoses`),

  createDiagnosis: (encounterId: string, payload: DiagnosisCreatePayload) =>
    api.post<EncounterDiagnosis>(`/api/v1/encounters/${encounterId}/diagnoses`, payload),

  updateDiagnosisStatus: (
    encounterId: string,
    diagnosisId: string,
    payload: DiagnosisStatusUpdatePayload,
  ) =>
    api.patch<EncounterDiagnosis>(
      `/api/v1/encounters/${encounterId}/diagnoses/${diagnosisId}/status`,
      payload,
    ),
});

export type DiagnosesApi = ReturnType<typeof createDiagnosesApi>;
