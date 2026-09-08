import type { ClinicalFormValues } from '../clinical-forms/types.js';

export interface TherapeuticPlan {
  id: string;
  encounterId: string;
  patientId: string;
  requestedBy: string;
  formFields: ClinicalFormValues;
  createdAt: string;
}

export interface TherapeuticPlanCreateInput {
  encounterId: string;
  patientId: string;
  formFields: ClinicalFormValues;
}
