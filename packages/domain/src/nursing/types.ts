import type { UUID } from '@vitaloop/shared';

export type NursingRecordType = 'admission' | 'evolution' | 'annotation';
export type MedicationScheduleStatus = 'pending' | 'administered' | 'not_administered' | 'refused' | 'suspended' | 'canceled';

export interface NursingRecord {
  id: UUID;
  encounterId: UUID;
  patientId: UUID;
  professionalId: UUID;
  recordType: NursingRecordType;
  content: string;
  vitalSigns?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface MedicationSchedule {
  id: UUID;
  prescriptionId: UUID;
  prescriptionItemId: UUID;
  encounterId: UUID;
  patientId: UUID;
  scheduledTime: string;
  status: MedicationScheduleStatus;
  scheduledBy: UUID;
  createdAt: string;
  updatedAt: string;
}

export interface MedicationAdministration {
  id: UUID;
  scheduleId: UUID;
  encounterId: UUID;
  patientId: UUID;
  executorId: UUID;
  status: MedicationScheduleStatus;
  administeredAt: string;
  notes?: string | null;
  nonAdminReason?: string | null;
  bedSideChecked: boolean;
  batchNumber?: string | null;
  createdAt: string;
}

export interface CreateNursingRecordInput {
  recordType: NursingRecordType;
  content: string;
  vitalSigns?: Record<string, unknown> | null | undefined;
}

export interface CreateMedicationScheduleInput {
  prescriptionItemId: UUID;
  scheduledTimes: string[]; // ISO string array
}

export interface AdministerMedicationInput {
  status: 'administered' | 'not_administered' | 'refused' | 'suspended';
  notes?: string | null | undefined;
  nonAdminReason?: string | null | undefined;
  bedSideChecked?: boolean | undefined;
  batchNumber?: string | null | undefined;
}

export type InvasiveDeviceType =
  | 'peripheral_venous_access'
  | 'central_venous_access'
  | 'urinary_catheter'
  | 'nasogastric_tube'
  | 'nasoenteric_tube'
  | 'chest_drain'
  | 'endotracheal_tube'
  | 'tracheostomy';

export type DeviceStatus = 'active' | 'removed' | 'replaced' | 'accidental_withdrawal';
export type FluidType = 'oral' | 'intravenous' | 'enteral' | 'blood_products' | 'urine' | 'emesis' | 'drainage' | 'feces';
export type FluidDirection = 'intake' | 'output';
export type ScaleType = 'braden' | 'morse' | 'glasgow' | 'mews' | 'ramsay';
export type RiskLevel = 'low' | 'moderate' | 'high' | 'severe';

export interface NursingDiagnosis {
  id: UUID;
  encounterId: UUID;
  patientId: UUID;
  nurseId: UUID;
  code: string;
  title: string;
  domainName?: string | null;
  relatedFactors?: string | null;
  definingCharacteristics?: string | null;
  status: 'active' | 'resolved';
  createdAt: string;
  updatedAt: string;
}

export interface NursingPrescription {
  id: UUID;
  encounterId: UUID;
  patientId: UUID;
  nurseId: UUID;
  careDescription: string;
  frequencyHours?: number | null;
  status: 'active' | 'discontinued' | 'completed';
  createdAt: string;
}

export interface NursingProcedure {
  id: UUID;
  encounterId: UUID;
  patientId: UUID;
  professionalId: UUID;
  procedureName: string;
  category: string;
  notes?: string | null;
  performedAt: string;
  createdAt: string;
}

export interface NursingScaleEvaluation {
  id: UUID;
  encounterId: UUID;
  patientId: UUID;
  evaluatorId: UUID;
  scaleType: ScaleType;
  totalScore: number;
  riskLevel: RiskLevel;
  scoreDetails: Record<string, unknown>;
  evaluatedAt: string;
  createdAt: string;
}

export interface FluidBalanceRecord {
  id: UUID;
  encounterId: UUID;
  patientId: UUID;
  recorderId: UUID;
  direction: FluidDirection;
  fluidType: FluidType;
  volumeMl: number;
  description?: string | null;
  recordedAt: string;
  createdAt: string;
}

export interface InvasiveDevice {
  id: UUID;
  encounterId: UUID;
  patientId: UUID;
  inserterId: UUID;
  deviceType: InvasiveDeviceType;
  anatomicalSite: string;
  status: DeviceStatus;
  insertedAt: string;
  expectedReplacementAt?: string | null;
  removedAt?: string | null;
  removerId?: UUID | null;
  removalReason?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PatientRiskAssessment {
  id: UUID;
  encounterId: UUID;
  patientId: UUID;
  evaluatorId: UUID;
  riskType: string;
  isActive: boolean;
  riskLevel: RiskLevel;
  identifiedAt: string;
  resolvedAt?: string | null;
  createdAt: string;
}

export interface CreateNursingDiagnosisInput {
  code: string;
  title: string;
  domainName?: string | null | undefined;
  relatedFactors?: string | null | undefined;
  definingCharacteristics?: string | null | undefined;
}

export interface CreateNursingCareInput {
  careDescription: string;
  frequencyHours?: number | null | undefined;
}

export interface CreateNursingSaeInput {
  diagnoses: CreateNursingDiagnosisInput[];
  prescriptions: CreateNursingCareInput[];
}

export interface ApplyScaleInput {
  scaleType: ScaleType;
  scoreDetails: Record<string, unknown>;
}

export interface CreateFluidBalanceInput {
  direction: FluidDirection;
  fluidType: FluidType;
  volumeMl: number;
  description?: string | null | undefined;
}

export interface InsertInvasiveDeviceInput {
  deviceType: InvasiveDeviceType;
  anatomicalSite: string;
  expectedReplacementDays?: number | null | undefined;
  notes?: string | null | undefined;
}

export interface RemoveInvasiveDeviceInput {
  removalReason: string;
  status?: DeviceStatus | undefined;
}

