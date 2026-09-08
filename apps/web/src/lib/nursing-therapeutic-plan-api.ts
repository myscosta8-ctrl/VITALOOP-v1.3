import type { ApiClient } from './api-client.js';
import { createClinicalRequestApi, type ClinicalRequestRecord } from './clinical-request-api-factory.js';

export type NursingTherapeuticPlan = ClinicalRequestRecord;

export interface CreateNursingTherapeuticPlanInput {
  patientId: string;
  encounterId: string;
  formFields: Record<string, string>;
}

export const createNursingTherapeuticPlanApi = (api: ApiClient) => {
  const client = createClinicalRequestApi<NursingTherapeuticPlan, CreateNursingTherapeuticPlanInput>(api, {
    schemaPath: '/api/v1/nursing-therapeutic-plan/nursing-therapeutic-plan-schema',
    listPath: '/api/v1/nursing-therapeutic-plan/nursing-therapeutic-plans',
    createPath: '/api/v1/nursing-therapeutic-plan/nursing-therapeutic-plans',
  });

  return {
    getNursingTherapeuticPlanSchema: client.getSchema,
    listNursingTherapeuticPlans: client.list,
    createNursingTherapeuticPlan: client.create,
  };
};
