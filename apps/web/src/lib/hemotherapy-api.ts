import type { ApiClient } from './api-client.js';
import { createClinicalRequestApi, type ClinicalRequestRecord } from './clinical-request-api-factory.js';

export interface BloodProductRequest extends ClinicalRequestRecord {
  clinicalIndication: string;
}

export interface CreateBloodProductRequestInput {
  patientId: string;
  encounterId: string;
  clinicalIndication: string;
  formFields: Record<string, string>;
}

export const createHemotherapyApi = (api: ApiClient) => {
  const client = createClinicalRequestApi<BloodProductRequest, CreateBloodProductRequestInput>(api, {
    schemaPath: '/api/v1/hemotherapy/blood-product-request-schema',
    listPath: '/api/v1/hemotherapy/blood-product-requests',
    createPath: '/api/v1/hemotherapy/blood-product-requests',
  });

  return {
    getBloodProductRequestSchema: client.getSchema,
    listBloodProductRequests: client.list,
    createBloodProductRequest: client.create,
  };
};
