import type { ApiClient } from './api-client.js';
import { createClinicalRequestApi, type ClinicalRequestRecord } from './clinical-request-api-factory.js';

export type SerUpdate = ClinicalRequestRecord;

export interface CreateSerUpdateInput {
  patientId: string;
  encounterId: string;
  formFields: Record<string, string>;
}

export const createSerApi = (api: ApiClient) => {
  const client = createClinicalRequestApi<SerUpdate, CreateSerUpdateInput>(api, {
    schemaPath: '/api/v1/ser/ser-update-schema',
    listPath: '/api/v1/ser/ser-updates',
    createPath: '/api/v1/ser/ser-updates',
  });

  return {
    getSerUpdateSchema: client.getSchema,
    listSerUpdates: client.list,
    createSerUpdate: client.create,
  };
};
