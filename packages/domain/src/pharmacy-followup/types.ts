import type { ClinicalFormValues } from '../clinical-forms/types.js';

export interface PharmacyFollowUp {
  id: string;
  encounterId: string;
  patientId: string;
  requestedBy: string;
  formFields: ClinicalFormValues;
  createdAt: string;
}

export interface PharmacyFollowUpCreateInput {
  encounterId: string;
  patientId: string;
  formFields: ClinicalFormValues;
}
