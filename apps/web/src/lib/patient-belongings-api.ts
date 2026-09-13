import type { ApiClient } from './api-client.js';
import { createClinicalRequestApi, type ClinicalRequestRecord } from './clinical-request-api-factory.js';

export type PatientBelongingsInventory = ClinicalRequestRecord;

export interface CreatePatientBelongingsInput {
  patientId: string;
  encounterId: string;
  formFields: Record<string, string>;
}

export const createPatientBelongingsApi = (api: ApiClient) => {
  const client = createClinicalRequestApi<PatientBelongingsInventory, CreatePatientBelongingsInput>(api, {
    schemaPath: '/api/v1/nursing/patient-belongings-schema',
    listPath: '/api/v1/nursing/patient-belongings',
    createPath: '/api/v1/nursing/patient-belongings',
  });

  return {
    getPatientBelongingsSchema: client.getSchema,
    listPatientBelongings: client.list,
    createPatientBelongings: client.create,
  };
};
