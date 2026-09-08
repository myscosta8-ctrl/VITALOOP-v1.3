import type { ApiClient } from './api-client.js';

export interface CreateDocumentPayload {
  documentType: 'medical_certificate' | 'attendance_declaration' | 'companion_certificate' | 'medical_report' | 'procedure_request';
  title: string;
  content: string;
  daysOff?: number | undefined;
  includeCid?: boolean | undefined;
  cidCode?: string | undefined;
  companionName?: string | undefined;
}

export interface DocumentTemplate {
  id: string;
  documentType: string;
  title: string;
}

export interface ClinicalDocumentRecord {
  id: string;
  integrityHash: string;
  status: string;
}

export const createDocumentApi = (api: ApiClient) => ({
  fetchDocumentTemplates: (): Promise<DocumentTemplate[]> => api.get<DocumentTemplate[]>('/api/v1/document-templates'),

  issueClinicalDocument: (encounterId: string, payload: CreateDocumentPayload): Promise<ClinicalDocumentRecord> =>
    api.post<ClinicalDocumentRecord>(`/api/v1/encounters/${encounterId}/documents`, payload),

  fetchEncounterDocuments: (encounterId: string): Promise<ClinicalDocumentRecord[]> =>
    api.get<ClinicalDocumentRecord[]>(`/api/v1/encounters/${encounterId}/documents`),

  revokeClinicalDocument: (documentId: string, revocationReason: string): Promise<ClinicalDocumentRecord> =>
    api.post<ClinicalDocumentRecord>(`/api/v1/documents/${documentId}/revoke`, { revocationReason }),
});
