export type PrescriptionStatus = 'draft' | 'active' | 'suspended' | 'canceled' | 'completed';
export type RouteOfAdministration = 'VO' | 'EV' | 'IM' | 'SC' | 'SL' | 'Inalatoria' | 'Topica' | 'Outra';
export type AllergyAlertSeverity = 'warning' | 'critical';

export interface MedicationItem {
  id: string;
  code: string;
  name: string;
  activeSubstance: string;
  pharmaceuticalForm?: string | null | undefined;
  defaultRoute?: RouteOfAdministration | null | undefined;
  isActive: boolean;
}

export interface PrescriptionItem {
  id: string;
  prescriptionId: string;
  medicationId?: string | null | undefined;
  medicationName: string;
  dose: number;
  doseUnit: string;
  route: RouteOfAdministration;
  frequency: string;
  duration?: string | null | undefined;
  instructions?: string | null | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface AllergyAlert {
  id: string;
  prescriptionId: string;
  prescriptionItemId?: string | null | undefined;
  allergen: string;
  severity: AllergyAlertSeverity;
  overridden: boolean;
  overrideReason: string;
  overriddenBy: string;
  overriddenAt: string;
  createdAt: string;
}

export interface Prescription {
  id: string;
  consultationId: string;
  encounterId: string;
  patientId: string;
  doctorId: string;
  status: PrescriptionStatus;
  notes?: string | null | undefined;
  canceledAt?: string | null | undefined;
  canceledBy?: string | null | undefined;
  cancelReason?: string | null | undefined;
  createdAt: string;
  updatedAt: string;
  items?: readonly PrescriptionItem[] | undefined;
  alerts?: readonly AllergyAlert[] | undefined;
}

export interface PrescriptionItemInput {
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

export interface PrescriptionCreateInput {
  consultationId: string;
  encounterId: string;
  patientId: string;
  items: readonly PrescriptionItemInput[];
  notes?: string | null | undefined;
  overrideJustification?: string | null | undefined;
  knownPatientAllergies?: readonly string[] | undefined;
}

export interface PrescriptionCancelInput {
  prescriptionId: string;
  cancelReason: string;
}
