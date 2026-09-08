import type { ClinicalFormValues } from '../clinical-forms/types.js';

export interface BloodProductRequest {
  id: string;
  encounterId: string;
  patientId: string;
  requestedBy: string;
  clinicalIndication: string;
  formFields: ClinicalFormValues;
  createdAt: string;
  updatedAt: string;
}

export interface BloodProductRequestCreateInput {
  encounterId: string;
  patientId: string;
  clinicalIndication: string;
  formFields: ClinicalFormValues;
}
