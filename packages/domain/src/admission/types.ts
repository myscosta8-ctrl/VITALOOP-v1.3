import type { UUID, IsoTimestamp } from '@vitaloop/shared';

export type AdmissionStatus = 'active' | 'discharged' | 'transferred_out' | 'deceased';

export interface AdmissionData {
  id: UUID;
  encounterId: UUID;
  patientId: UUID;
  admittingDoctorId: UUID;
  admissionDiagnosisCode?: string | null | undefined;
  admissionDiagnosisDescription: string;
  admissionJustification: string;
  status: AdmissionStatus;
  admittedAt: IsoTimestamp;
  endedAt?: IsoTimestamp | null | undefined;
  endReason?: string | null | undefined;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}

export interface AdmissionCreateInput {
  encounterId: UUID;
  patientId: UUID;
  admittingDoctorId: UUID;
  admissionDiagnosisCode?: string | null | undefined;
  admissionDiagnosisDescription: string;
  admissionJustification: string;
}

export interface AdmissionUpdateInput {
  admissionId: UUID;
  updatedBy: UUID;
  admittingDoctorId?: UUID | undefined;
  admissionDiagnosisCode?: string | null | undefined;
  admissionDiagnosisDescription?: string | undefined;
  admissionJustification?: string | undefined;
}

export interface AdmissionDischargeInput {
  admissionId: UUID;
  encounterId: UUID;
  patientId: UUID;
  dischargedBy: UUID;
  status: Extract<AdmissionStatus, 'discharged' | 'transferred_out' | 'deceased'>;
  endReason?: string | null | undefined;
}
