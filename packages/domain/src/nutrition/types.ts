import type { ClinicalFormValues } from '../clinical-forms/types.js';

export interface NutritionAssessment {
  id: string;
  encounterId: string;
  patientId: string;
  requestedBy: string;
  formFields: ClinicalFormValues;
  createdAt: string;
}

export interface NutritionAssessmentCreateInput {
  encounterId: string;
  patientId: string;
  formFields: ClinicalFormValues;
}
