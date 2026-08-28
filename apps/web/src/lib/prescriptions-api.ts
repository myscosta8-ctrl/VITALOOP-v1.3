import type { ApiClient } from './api-client.js';

export type PrescriptionStatus = 'draft' | 'active' | 'suspended' | 'canceled' | 'completed';
export type RouteOfAdministration = 'VO' | 'EV' | 'IM' | 'SC' | 'SL' | 'Inalatoria' | 'Topica' | 'Outra';
export type AllergyAlertSeverity = 'warning' | 'critical';

export interface MedicationItem {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly activeSubstance: string;
  readonly pharmaceuticalForm?: string | null | undefined;
  readonly defaultRoute?: RouteOfAdministration | null | undefined;
  readonly isActive: boolean;
}

export interface PrescriptionItem {
  readonly id: string;
  readonly prescriptionId: string;
  readonly medicationId?: string | null | undefined;
  readonly medicationName: string;
  readonly dose: number;
  readonly doseUnit: string;
  readonly route: RouteOfAdministration;
  readonly frequency: string;
  readonly duration?: string | null | undefined;
  readonly instructions?: string | null | undefined;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AllergyAlert {
  readonly id: string;
  readonly prescriptionId: string;
  readonly prescriptionItemId?: string | null | undefined;
  readonly allergen: string;
  readonly severity: AllergyAlertSeverity;
  readonly overridden: boolean;
  readonly overrideReason: string;
  readonly overriddenBy: string;
  readonly overriddenAt: string;
  readonly createdAt: string;
}

export interface Prescription {
  readonly id: string;
  readonly consultationId: string;
  readonly encounterId: string;
  readonly patientId: string;
  readonly doctorId: string;
  readonly status: PrescriptionStatus;
  readonly notes?: string | null | undefined;
  readonly canceledAt?: string | null | undefined;
  readonly canceledBy?: string | null | undefined;
  readonly cancelReason?: string | null | undefined;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly items?: readonly PrescriptionItem[];
  readonly alerts?: readonly AllergyAlert[];
}

export interface PrescriptionItemPayload {
  medicationId?: string | null | undefined;
  medicationName: string;
  activeSubstance?: string | null | undefined;
  dose: number;
  doseUnit: string;
  route: RouteOfAdministration;
  frequency: string;
  duration?: string | null | undefined;
  instructions?: string | null | undefined;
}

export interface PrescriptionCreatePayload {
  items: readonly PrescriptionItemPayload[];
  notes?: string | null | undefined;
  overrideJustification?: string | null | undefined;
}

export interface PrescriptionCancelPayload {
  cancelReason: string;
}

export const createPrescriptionsApi = (api: ApiClient) => ({
  searchMedications: (q: string) =>
    api.get<readonly MedicationItem[]>(`/api/v1/medications/search?q=${encodeURIComponent(q)}`),

  getPrescriptions: (encounterId: string) =>
    api.get<readonly Prescription[]>(`/api/v1/encounters/${encounterId}/prescriptions`),

  createPrescription: (encounterId: string, payload: PrescriptionCreatePayload) =>
    api.post<Prescription>(`/api/v1/encounters/${encounterId}/prescriptions`, payload),

  cancelPrescription: (encounterId: string, prescriptionId: string, payload: PrescriptionCancelPayload) =>
    api.post<Prescription>(`/api/v1/encounters/${encounterId}/prescriptions/${prescriptionId}/cancel`, payload),
});

export type PrescriptionsApi = ReturnType<typeof createPrescriptionsApi>;
