import type { ClinicalFormValues } from '../clinical-forms/types.js';

export interface AntimicrobialRequest {
  id: string;
  encounterId: string;
  patientId: string;
  requestedBy: string;
  medication: string;
  formFields: ClinicalFormValues;
  createdAt: string;
  updatedAt: string;
}

export interface AntimicrobialRequestCreateInput {
  encounterId: string;
  patientId: string;
  medication: string;
  formFields: ClinicalFormValues;
}
