import type { ApiClient } from './api-client.js';
import { createClinicalRequestApi, type ClinicalRequestRecord } from './clinical-request-api-factory.js';

export type PhysiotherapyAssessment = ClinicalRequestRecord;

export interface CreatePhysiotherapyAssessmentInput {
  patientId: string;
  encounterId: string;
  formFields: Record<string, string>;
}

export const createPhysiotherapyApi = (api: ApiClient) => {
  const client = createClinicalRequestApi<PhysiotherapyAssessment, CreatePhysiotherapyAssessmentInput>(api, {
    schemaPath: '/api/v1/physiotherapy/physiotherapy-assessment-schema',
    listPath: '/api/v1/physiotherapy/physiotherapy-assessments',
    createPath: '/api/v1/physiotherapy/physiotherapy-assessments',
  });

  return {
    getPhysiotherapyAssessmentSchema: client.getSchema,
    listPhysiotherapyAssessments: client.list,
    createPhysiotherapyAssessment: client.create,
  };
};
