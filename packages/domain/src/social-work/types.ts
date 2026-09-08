import type { ClinicalFormValues } from '../clinical-forms/types.js';

export interface SocialWorkAssessment {
  id: string;
  encounterId: string;
  patientId: string;
  requestedBy: string;
  formFields: ClinicalFormValues;
  createdAt: string;
}

export interface SocialWorkAssessmentCreateInput {
  encounterId: string;
  patientId: string;
  formFields: ClinicalFormValues;
}
