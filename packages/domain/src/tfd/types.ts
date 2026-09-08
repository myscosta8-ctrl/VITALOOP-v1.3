import type { ClinicalFormValues } from '../clinical-forms/types.js';

export interface TfdRequest {
  id: string;
  encounterId: string;
  patientId: string;
  requestedBy: string;
  formFields: ClinicalFormValues;
  createdAt: string;
  updatedAt: string;
}

export interface TfdRequestCreateInput {
  encounterId: string;
  patientId: string;
  formFields: ClinicalFormValues;
}
