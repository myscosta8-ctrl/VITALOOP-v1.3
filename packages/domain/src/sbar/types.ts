import type { ClinicalFormValues } from '../clinical-forms/types.js';

export interface SbarTransfer {
  id: string;
  encounterId: string;
  patientId: string;
  requestedBy: string;
  formFields: ClinicalFormValues;
  createdAt: string;
}

export interface SbarTransferCreateInput {
  encounterId: string;
  patientId: string;
  formFields: ClinicalFormValues;
}
