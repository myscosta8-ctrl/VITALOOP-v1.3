import type { ApiClient } from './api-client.js';
import { createClinicalRequestApi, type ClinicalRequestRecord } from './clinical-request-api-factory.js';

export type TfdRequest = ClinicalRequestRecord;

export interface CreateTfdRequestInput {
  patientId: string;
  encounterId: string;
  formFields: Record<string, string>;
}

export const createTfdApi = (api: ApiClient) => {
  const client = createClinicalRequestApi<TfdRequest, CreateTfdRequestInput>(api, {
    schemaPath: '/api/v1/tfd/tfd-request-schema',
    listPath: '/api/v1/tfd/tfd-requests',
    createPath: '/api/v1/tfd/tfd-requests',
  });

  return {
    getTfdRequestSchema: client.getSchema,
    listTfdRequests: client.list,
    createTfdRequest: client.create,
  };
};
