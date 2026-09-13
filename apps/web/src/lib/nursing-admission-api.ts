import type { ApiClient } from './api-client.js';
import { createClinicalRequestApi, type ClinicalRequestRecord } from './clinical-request-api-factory.js';

export type NursingAdmissionForm = ClinicalRequestRecord;

export interface CreateNursingAdmissionFormInput {
  patientId: string;
  encounterId: string;
  formFields: Record<string, string>;
}

export const createNursingAdmissionApi = (api: ApiClient) => {
  const client = createClinicalRequestApi<NursingAdmissionForm, CreateNursingAdmissionFormInput>(api, {
    schemaPath: '/api/v1/nursing/nursing-admission-form-schema',
    listPath: '/api/v1/nursing/nursing-admission-forms',
    createPath: '/api/v1/nursing/nursing-admission-forms',
  });

  return {
    getNursingAdmissionFormSchema: client.getSchema,
    listNursingAdmissionForms: client.list,
    createNursingAdmissionForm: client.create,
  };
};
