import type { ApiClient } from './api-client.js';
import { createClinicalRequestApi, type ClinicalRequestRecord } from './clinical-request-api-factory.js';

export type NutritionAssessment = ClinicalRequestRecord;

export interface CreateNutritionAssessmentInput {
  patientId: string;
  encounterId: string;
  formFields: Record<string, string>;
}

export const createNutritionApi = (api: ApiClient) => {
  const client = createClinicalRequestApi<NutritionAssessment, CreateNutritionAssessmentInput>(api, {
    schemaPath: '/api/v1/nutrition/nutrition-assessment-schema',
    listPath: '/api/v1/nutrition/nutrition-assessments',
    createPath: '/api/v1/nutrition/nutrition-assessments',
  });

  return {
    getNutritionAssessmentSchema: client.getSchema,
    listNutritionAssessments: client.list,
    createNutritionAssessment: client.create,
  };
};
