import type { ApiClient } from './api-client.js';

export type AdmissionStatus = 'active' | 'discharged' | 'transferred_out' | 'deceased';

export interface Admission {
  readonly id: string;
  readonly encounterId: string;
  readonly patientId: string;
  readonly admittingDoctorId: string;
  readonly admissionDiagnosisCode?: string | null;
  readonly admissionDiagnosisDescription: string;
  readonly admissionJustification: string;
  readonly status: AdmissionStatus;
  readonly admittedAt: string;
  readonly endedAt?: string | null;
  readonly endReason?: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AdmissionCreateInput {
  admissionDiagnosisCode?: string | null;
  admissionDiagnosisDescription: string;
  admissionJustification: string;
}

export interface AdmissionUpdateInput {
  admittingDoctorId?: string;
  admissionDiagnosisCode?: string | null;
  admissionDiagnosisDescription?: string;
  admissionJustification?: string;
}

export interface AdmissionDischargeInput {
  status: Extract<AdmissionStatus, 'discharged' | 'transferred_out' | 'deceased'>;
  endReason?: string | null;
}

export const createAdmissionApi = (api: ApiClient) => ({
  getAdmission: async (encounterId: string): Promise<Admission | null> => {
    return api.get<Admission | null>(`/api/v1/encounters/${encounterId}/admission`);
  },

  createAdmission: async (encounterId: string, input: AdmissionCreateInput): Promise<Admission> => {
    return api.post<Admission>(`/api/v1/encounters/${encounterId}/admission`, input);
  },

  updateAdmission: async (encounterId: string, input: AdmissionUpdateInput): Promise<Admission> => {
    return api.patch<Admission>(`/api/v1/encounters/${encounterId}/admission`, input);
  },

  dischargeAdmission: async (encounterId: string, input: AdmissionDischargeInput): Promise<Admission> => {
    return api.post<Admission>(`/api/v1/encounters/${encounterId}/admission/discharge`, input);
  },
});
