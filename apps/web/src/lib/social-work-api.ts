import type { ApiClient } from './api-client.js';
import { createClinicalRequestApi, type ClinicalRequestRecord } from './clinical-request-api-factory.js';

export type SocialWorkAssessment = ClinicalRequestRecord;

export interface CreateSocialWorkAssessmentInput {
  patientId: string;
  encounterId: string;
  formFields: Record<string, string>;
}

export const createSocialWorkApi = (api: ApiClient) => {
  const client = createClinicalRequestApi<SocialWorkAssessment, CreateSocialWorkAssessmentInput>(api, {
    schemaPath: '/api/v1/social-work/social-work-assessment-schema',
    listPath: '/api/v1/social-work/social-work-assessments',
    createPath: '/api/v1/social-work/social-work-assessments',
  });

  return {
    getSocialWorkAssessmentSchema: client.getSchema,
    listSocialWorkAssessments: client.list,
    createSocialWorkAssessment: client.create,
  };
};
