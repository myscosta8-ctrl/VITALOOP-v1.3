import type { ApiClient } from './api-client.js';
import { createClinicalRequestApi, type ClinicalRequestRecord } from './clinical-request-api-factory.js';

export type TherapeuticPlan = ClinicalRequestRecord;

export interface CreateTherapeuticPlanInput {
  patientId: string;
  encounterId: string;
  formFields: Record<string, string>;
}

export const createTherapeuticPlanApi = (api: ApiClient) => {
  const client = createClinicalRequestApi<TherapeuticPlan, CreateTherapeuticPlanInput>(api, {
    schemaPath: '/api/v1/therapeutic-plan/therapeutic-plan-schema',
    listPath: '/api/v1/therapeutic-plan/therapeutic-plans',
    createPath: '/api/v1/therapeutic-plan/therapeutic-plans',
  });

  return {
    getTherapeuticPlanSchema: client.getSchema,
    listTherapeuticPlans: client.list,
    createTherapeuticPlan: client.create,
  };
};
