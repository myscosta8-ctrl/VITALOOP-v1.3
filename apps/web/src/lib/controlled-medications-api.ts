import type { ApiClient } from './api-client.js';

export type ControlledMedicationClass = 'A1' | 'A2' | 'A3' | 'B1' | 'B2' | 'C1' | 'C2' | 'C3' | 'C4' | 'C5';

export interface EligiblePrescriptionItem {
  id: string;
  medication_name: string;
  dose: number;
  dose_unit: string;
  controlled_class: ControlledMedicationClass;
}

export interface ControlledMedicationDispensation {
  id: string;
  prescriptionItemId: string;
  encounterId: string;
  patientId: string;
  controlledClass: ControlledMedicationClass;
  quantityDispensed: number;
  unit: string;
  prescriptionNotificationNumber?: string | null;
  dispensedBy: string;
  witnessName?: string | null;
  notes?: string | null;
  dispensedAt: string;
}

export interface CreateDispensationInput {
  prescriptionItemId: string;
  quantityDispensed: number;
  unit: string;
  prescriptionNotificationNumber?: string | null;
  witnessName?: string | null;
  notes?: string | null;
}

export const createControlledMedicationsApi = (api: ApiClient) => ({
  listEligibleItems: (encounterId: string) =>
    api.get<readonly EligiblePrescriptionItem[]>(`/api/v1/encounters/${encounterId}/controlled-medications/eligible-items`),

  listDispensations: (encounterId: string) =>
    api.get<readonly ControlledMedicationDispensation[]>(`/api/v1/encounters/${encounterId}/controlled-medications`),

  createDispensation: (encounterId: string, payload: CreateDispensationInput) =>
    api.post<ControlledMedicationDispensation>(`/api/v1/encounters/${encounterId}/controlled-medications`, payload),
});

export type ControlledMedicationsApi = ReturnType<typeof createControlledMedicationsApi>;
