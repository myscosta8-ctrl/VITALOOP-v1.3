import type { ApiClient } from './api-client.js';
import { createClinicalRequestApi, type ClinicalRequestRecord } from './clinical-request-api-factory.js';

export interface AntimicrobialRequest extends ClinicalRequestRecord {
  medication: string;
}

export interface CreateAntimicrobialRequestInput {
  patientId: string;
  encounterId: string;
  formFields: Record<string, string>;
}

export const createPharmacyAtmApi = (api: ApiClient) => {
  const client = createClinicalRequestApi<AntimicrobialRequest, CreateAntimicrobialRequestInput>(api, {
    schemaPath: '/api/v1/pharmacy-atm/antimicrobial-request-schema',
    listPath: '/api/v1/pharmacy-atm/antimicrobial-requests',
    createPath: '/api/v1/pharmacy-atm/antimicrobial-requests',
  });

  return {
    getAntimicrobialRequestSchema: client.getSchema,
    listAntimicrobialRequests: client.list,
    createAntimicrobialRequest: client.create,
  };
};
