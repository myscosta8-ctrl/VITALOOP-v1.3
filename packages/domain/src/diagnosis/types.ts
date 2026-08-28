export type DiagnosisType = 'principal' | 'secondary';
export type DiagnosisStatus = 'active' | 'resolved' | 'refuted';

export interface CidItem {
  code: string;
  description: string;
  chapter?: string | null | undefined;
  isActive: boolean;
}

export interface EncounterDiagnosis {
  id: string;
  consultationId: string;
  encounterId: string;
  patientId: string;
  doctorId: string;
  cidCode: string;
  cidDescription?: string | null | undefined;
  diagnosisType: DiagnosisType;
  status: DiagnosisStatus;
  notes?: string | null | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface DiagnosisCreateInput {
  consultationId: string;
  encounterId: string;
  patientId: string;
  cidCode: string;
  diagnosisType: DiagnosisType;
  notes?: string | null | undefined;
}

export interface DiagnosisUpdateStatusInput {
  diagnosisId: string;
  status: DiagnosisStatus;
  notes?: string | null | undefined;
}
