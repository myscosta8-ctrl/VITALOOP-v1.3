import type { ClinicalFormValues } from '../clinical-forms/types.js';

export interface NursingTherapeuticPlan {
  id: string;
  encounterId: string;
  patientId: string;
  requestedBy: string;
  formFields: ClinicalFormValues;
  createdAt: string;
}

export interface NursingTherapeuticPlanCreateInput {
  encounterId: string;
  patientId: string;
  formFields: ClinicalFormValues;
}
