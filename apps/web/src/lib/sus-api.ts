import type { ApiClient } from './api-client.js';
import type { ClinicalFormSchema } from './clinical-form-types.js';

export interface CreateAihPayload {
  encounterId: string;
  patientId: string;
  mainProcedureCode: string;
  secondaryProcedureCode?: string | undefined;
  mainCid10: string;
  secondaryCid10?: string | undefined;
  clinicalJustification: string;
  formFields?: Record<string, string> | undefined;
}

export interface CreateApacPayload {
  encounterId: string;
  patientId: string;
  mainProcedureCode: string;
  secondaryProcedureCode?: string | undefined;
  mainCid10: string;
  secondaryCid10?: string | undefined;
  clinicalJustification: string;
  formFields?: Record<string, string> | undefined;
}

export interface SigtapProcedure {
  code: string;
  name: string;
  ambulatoryValue: number;
  hospitalValue: number;
}

export interface CompatibilityValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface AihRequestRecord {
  id: string;
  encounterId: string;
  mainProcedureCode: string;
  mainCid10: string;
  status: string;
  formFields?: Record<string, string>;
  createdAt: string;
}

export interface ApacRequestRecord {
  id: string;
  encounterId: string;
  mainProcedureCode: string;
  mainCid10: string;
  status: string;
  formFields?: Record<string, string>;
  createdAt: string;
}

export const createSusApi = (api: ApiClient) => ({
  getAihClinicalFieldsSchema: (): Promise<ClinicalFormSchema> =>
    api.get<ClinicalFormSchema>('/api/v1/sus/aih-clinical-fields-schema'),

  getApacClinicalFieldsSchema: (): Promise<ClinicalFormSchema> =>
    api.get<ClinicalFormSchema>('/api/v1/sus/apac-clinical-fields-schema'),

  searchSigtapProcedures: (query = ''): Promise<SigtapProcedure[]> =>
    api.get<SigtapProcedure[]>(`/api/v1/sus/sigtap/search?q=${encodeURIComponent(query)}`),

  validateSusCompatibility: (payload: {
    procedureCode: string;
    patientAgeMonths: number;
    patientSex: 'male' | 'female' | 'undetermined';
    cid10?: string | undefined;
  }): Promise<CompatibilityValidationResult> => api.post<CompatibilityValidationResult>('/api/v1/sus/validate-compatibility', payload),

  issueAihRequest: (payload: CreateAihPayload): Promise<AihRequestRecord> =>
    api.post<AihRequestRecord>('/api/v1/sus/aih-requests', payload),

  fetchAihRequestById: (id: string): Promise<AihRequestRecord> =>
    api.get<AihRequestRecord>(`/api/v1/sus/aih-requests/${id}`),

  listAihRequests: (encounterId: string): Promise<AihRequestRecord[]> =>
    api.get<AihRequestRecord[]>(`/api/v1/sus/aih-requests?encounterId=${encodeURIComponent(encounterId)}`),

  getAihAuthorizationFieldsSchema: (): Promise<ClinicalFormSchema> =>
    api.get<ClinicalFormSchema>('/api/v1/sus/aih-authorization-fields-schema'),

  authorizeAihRequest: (id: string, formFields: Record<string, string>): Promise<AihRequestRecord> =>
    api.post<AihRequestRecord>(`/api/v1/sus/aih-requests/${id}/authorize`, { formFields }),

  issueApacRequest: (payload: CreateApacPayload): Promise<ApacRequestRecord> =>
    api.post<ApacRequestRecord>('/api/v1/sus/apac-requests', payload),

  fetchApacRequestById: (id: string): Promise<ApacRequestRecord> =>
    api.get<ApacRequestRecord>(`/api/v1/sus/apac-requests/${id}`),

  listApacRequests: (encounterId: string): Promise<ApacRequestRecord[]> =>
    api.get<ApacRequestRecord[]>(`/api/v1/sus/apac-requests?encounterId=${encodeURIComponent(encounterId)}`),

  getApacAuthorizationFieldsSchema: (): Promise<ClinicalFormSchema> =>
    api.get<ClinicalFormSchema>('/api/v1/sus/apac-authorization-fields-schema'),

  authorizeApacRequest: (id: string, formFields: Record<string, string>): Promise<ApacRequestRecord> =>
    api.post<ApacRequestRecord>(`/api/v1/sus/apac-requests/${id}/authorize`, { formFields }),
});
