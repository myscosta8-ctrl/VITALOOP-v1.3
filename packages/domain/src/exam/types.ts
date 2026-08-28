export type ExamType = 'laboratory' | 'imaging' | 'other';
export type ExamStatus = 'requested' | 'collected' | 'in_analysis' | 'completed' | 'canceled';
export type ProcedureStatus = 'requested' | 'in_progress' | 'completed' | 'canceled';
export type InterconsultationStatus = 'requested' | 'in_review' | 'answered' | 'canceled';
export type InterconsultationPriority = 'routine' | 'urgent' | 'emergency';

export interface ExamCatalogItem {
  id: string;
  code: string;
  name: string;
  type: ExamType;
  category?: string | null | undefined;
  isActive: boolean;
}

export interface ProcedureCatalogItem {
  id: string;
  code: string;
  name: string;
  category?: string | null | undefined;
  isActive: boolean;
}

export interface ExamRequest {
  id: string;
  consultationId: string;
  encounterId: string;
  patientId: string;
  requestedBy: string;
  examId?: string | null | undefined;
  examName: string;
  examType: ExamType;
  clinicalIndication: string;
  status: ExamStatus;
  resultSummary?: string | null | undefined;
  resultNotes?: string | null | undefined;
  performedAt?: string | null | undefined;
  performedBy?: string | null | undefined;
  canceledAt?: string | null | undefined;
  canceledBy?: string | null | undefined;
  cancelReason?: string | null | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface ExamRequestInput {
  consultationId: string;
  encounterId: string;
  patientId: string;
  examId?: string | null | undefined;
  examName: string;
  examType?: ExamType | null | undefined;
  clinicalIndication: string;
}

export interface ExamResultInput {
  examRequestId: string;
  resultSummary: string;
  resultNotes?: string | null | undefined;
}

export interface ProcedureRequest {
  id: string;
  consultationId: string;
  encounterId: string;
  patientId: string;
  requestedBy: string;
  procedureId?: string | null | undefined;
  procedureName: string;
  instructions?: string | null | undefined;
  status: ProcedureStatus;
  notes?: string | null | undefined;
  performedAt?: string | null | undefined;
  performedBy?: string | null | undefined;
  canceledAt?: string | null | undefined;
  canceledBy?: string | null | undefined;
  cancelReason?: string | null | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface ProcedureRequestInput {
  consultationId: string;
  encounterId: string;
  patientId: string;
  procedureId?: string | null | undefined;
  procedureName: string;
  instructions?: string | null | undefined;
}

export interface ProcedureExecuteInput {
  procedureRequestId: string;
  notes?: string | null | undefined;
}

export interface Interconsultation {
  id: string;
  consultationId: string;
  encounterId: string;
  patientId: string;
  requestedBy: string;
  specialty: string;
  priority: InterconsultationPriority;
  clinicalSummary: string;
  question: string;
  status: InterconsultationStatus;
  responseNotes?: string | null | undefined;
  respondedBy?: string | null | undefined;
  respondedAt?: string | null | undefined;
  canceledAt?: string | null | undefined;
  canceledBy?: string | null | undefined;
  cancelReason?: string | null | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface InterconsultationInput {
  consultationId: string;
  encounterId: string;
  patientId: string;
  specialty: string;
  priority?: InterconsultationPriority | null | undefined;
  clinicalSummary: string;
  question: string;
}

export interface InterconsultationResponseInput {
  interconsultationId: string;
  responseNotes: string;
}
