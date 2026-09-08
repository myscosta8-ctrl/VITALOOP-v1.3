import type { ApiClient } from './api-client.js';
import { createClinicalRequestApi, type ClinicalRequestRecord } from './clinical-request-api-factory.js';

export type PharmacyFollowUp = ClinicalRequestRecord;

export interface CreatePharmacyFollowUpInput {
  patientId: string;
  encounterId: string;
  formFields: Record<string, string>;
}

export const createPharmacyFollowUpApi = (api: ApiClient) => {
  const client = createClinicalRequestApi<PharmacyFollowUp, CreatePharmacyFollowUpInput>(api, {
    schemaPath: '/api/v1/pharmacy-followup/pharmacy-followup-schema',
    listPath: '/api/v1/pharmacy-followup/pharmacy-followups',
    createPath: '/api/v1/pharmacy-followup/pharmacy-followups',
  });

  return {
    getPharmacyFollowUpSchema: client.getSchema,
    listPharmacyFollowUps: client.list,
    createPharmacyFollowUp: client.create,
  };
};
