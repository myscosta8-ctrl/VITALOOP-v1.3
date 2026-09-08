import type { ApiClient } from './api-client.js';

export interface IntegrationMessage {
  id: string;
  messageType: string;
  sender: string;
  status: string;
  createdAt: string;
}

export interface AihBatchExportResult {
  id: string;
  batchNumber: string;
}

export interface RndsSendResult {
  id: string;
  status: string;
}

export interface PharmacyDispenseResult {
  id: string;
  status: string;
}

export const createIntegrationApi = (api: ApiClient) => ({
  fetchIntegrationMessages: (): Promise<IntegrationMessage[]> => api.get<IntegrationMessage[]>('/api/v1/integration/messages'),

  fetchFhirPatientResource: (patientId: string): Promise<unknown> => api.get(`/api/v1/fhir/R4/Patient/${patientId}`),

  fetchFhirEncounterResource: (encounterId: string): Promise<unknown> => api.get(`/api/v1/fhir/R4/Encounter/${encounterId}`),

  sendHl7OruMessage: (rawPayload: string, encounterId?: string, patientId?: string): Promise<IntegrationMessage> =>
    api.post<IntegrationMessage>('/api/v1/integration/hl7/oru', { rawPayload, encounterId, patientId }),

  dispensePharmacyMedications: (
    encounterId: string,
    patientId: string,
    items: Array<{ medicationName: string; quantity: number; dosage: string }>,
  ): Promise<PharmacyDispenseResult> =>
    api.post<PharmacyDispenseResult>('/api/v1/integration/pharmacy/dispense', { encounterId, patientId, items }),

  exportAihBatch: (aihIds: string[]): Promise<AihBatchExportResult> =>
    api.post<AihBatchExportResult>('/api/v1/sus/aih-batches/export', { aihIds }),

  sendRndsBundle: (patientCns: string, encounterId: string, clinicalSummary: string): Promise<RndsSendResult> =>
    api.post<RndsSendResult>('/api/v1/integration/rnds/send-bundle', { patientCns, encounterId, clinicalSummary }),
});
