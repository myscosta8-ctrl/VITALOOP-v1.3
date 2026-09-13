import type { ApiClient } from './api-client.js';
import { createClinicalRequestApi, type ClinicalRequestRecord } from './clinical-request-api-factory.js';

export type DischargeChecklist = ClinicalRequestRecord;

export interface CreateDischargeChecklistInput {
  patientId: string;
  encounterId: string;
  formFields: Record<string, string>;
}

export const createDischargeChecklistApi = (api: ApiClient) => {
  const client = createClinicalRequestApi<DischargeChecklist, CreateDischargeChecklistInput>(api, {
    schemaPath: '/api/v1/outcome/discharge-checklist-schema',
    listPath: '/api/v1/outcome/discharge-checklists',
    createPath: '/api/v1/outcome/discharge-checklists',
  });

  return {
    getDischargeChecklistSchema: client.getSchema,
    listDischargeChecklists: client.list,
    createDischargeChecklist: client.create,
  };
};
