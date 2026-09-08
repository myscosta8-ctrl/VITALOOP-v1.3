import type { ClinicalFormValues } from '../clinical-forms/types.js';

export interface SerUpdate {
  id: string;
  encounterId: string;
  patientId: string;
  requestedBy: string;
  formFields: ClinicalFormValues;
  createdAt: string;
}

export interface SerUpdateCreateInput {
  encounterId: string;
  patientId: string;
  formFields: ClinicalFormValues;
}
