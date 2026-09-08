import type { ClinicalFormValues } from '../clinical-forms/types.js';

export interface PhysiotherapyAssessment {
  id: string;
  encounterId: string;
  patientId: string;
  requestedBy: string;
  formFields: ClinicalFormValues;
  createdAt: string;
}

export interface PhysiotherapyAssessmentCreateInput {
  encounterId: string;
  patientId: string;
  formFields: ClinicalFormValues;
}
