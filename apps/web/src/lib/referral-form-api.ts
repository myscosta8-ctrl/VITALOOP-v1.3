import type { ApiClient } from './api-client.js';
import { createClinicalRequestApi, type ClinicalRequestRecord } from './clinical-request-api-factory.js';

export type ReferralForm = ClinicalRequestRecord;

export interface CreateReferralFormInput {
  patientId: string;
  encounterId: string;
  formFields: Record<string, string>;
}

export const createReferralFormApi = (api: ApiClient) => {
  const client = createClinicalRequestApi<ReferralForm, CreateReferralFormInput>(api, {
    schemaPath: '/api/v1/regulation/referral-form-schema',
    listPath: '/api/v1/regulation/referral-forms',
    createPath: '/api/v1/regulation/referral-forms',
  });

  return {
    getReferralFormSchema: client.getSchema,
    listReferralForms: client.list,
    createReferralForm: client.create,
  };
};
