import type { ApiClient } from './api-client.js';

export type ExamType = 'laboratory' | 'imaging' | 'other';
export type ExamStatus = 'requested' | 'collected' | 'in_analysis' | 'completed' | 'canceled';
export type ProcedureStatus = 'requested' | 'in_progress' | 'completed' | 'canceled';
export type InterconsultationStatus = 'requested' | 'in_review' | 'answered' | 'canceled';
export type InterconsultationPriority = 'routine' | 'urgent' | 'emergency';

export interface ExamCatalogItem {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly type: ExamType;
  readonly category?: string | null | undefined;
  readonly isActive: boolean;
}

export interface ProcedureCatalogItem {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly category?: string | null | undefined;
  readonly isActive: boolean;
}

export interface ExamRequest {
  readonly id: string;
  readonly consultationId: string;
  readonly encounterId: string;
  readonly patientId: string;
  readonly requestedBy: string;
  readonly examId?: string | null | undefined;
  readonly examName: string;
  readonly examType: ExamType;
  readonly clinicalIndication: string;
  readonly status: ExamStatus;
  readonly resultSummary?: string | null | undefined;
  readonly resultNotes?: string | null | undefined;
  readonly performedAt?: string | null | undefined;
  readonly performedBy?: string | null | undefined;
  readonly canceledAt?: string | null | undefined;
  readonly canceledBy?: string | null | undefined;
  readonly cancelReason?: string | null | undefined;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ProcedureRequest {
  readonly id: string;
  readonly consultationId: string;
  readonly encounterId: string;
  readonly patientId: string;
  readonly requestedBy: string;
  readonly procedureId?: string | null | undefined;
  readonly procedureName: string;
  readonly instructions?: string | null | undefined;
  readonly status: ProcedureStatus;
  readonly notes?: string | null | undefined;
  readonly performedAt?: string | null | undefined;
  readonly performedBy?: string | null | undefined;
  readonly canceledAt?: string | null | undefined;
  readonly canceledBy?: string | null | undefined;
  readonly cancelReason?: string | null | undefined;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface Interconsultation {
  readonly id: string;
  readonly consultationId: string;
  readonly encounterId: string;
  readonly patientId: string;
  readonly requestedBy: string;
  readonly specialty: string;
  readonly priority: InterconsultationPriority;
  readonly clinicalSummary: string;
  readonly question: string;
  readonly status: InterconsultationStatus;
  readonly responseNotes?: string | null | undefined;
  readonly respondedBy?: string | null | undefined;
  readonly respondedAt?: string | null | undefined;
  readonly canceledAt?: string | null | undefined;
  readonly canceledBy?: string | null | undefined;
  readonly cancelReason?: string | null | undefined;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateExamPayload {
  examId?: string | null | undefined;
  examName: string;
  examType?: ExamType | null | undefined;
  clinicalIndication: string;
}

export interface RecordExamResultPayload {
  resultSummary: string;
  resultNotes?: string | null | undefined;
}

export interface CreateProcedurePayload {
  procedureId?: string | null | undefined;
  procedureName: string;
  instructions?: string | null | undefined;
}

export interface ExecuteProcedurePayload {
  notes?: string | null | undefined;
}

export interface CreateInterconsultationPayload {
  specialty: string;
  priority?: InterconsultationPriority | null | undefined;
  clinicalSummary: string;
  question: string;
}

export interface ResponseInterconsultationPayload {
  responseNotes: string;
}

export const createExamsApi = (api: ApiClient) => ({
  searchExamsCatalog: (q: string) =>
    api.get<readonly ExamCatalogItem[]>(`/api/v1/exams/catalog?q=${encodeURIComponent(q)}`),

  searchProceduresCatalog: (q: string) =>
    api.get<readonly ProcedureCatalogItem[]>(`/api/v1/procedures/catalog?q=${encodeURIComponent(q)}`),

  getExamRequests: (encounterId: string) =>
    api.get<readonly ExamRequest[]>(`/api/v1/encounters/${encounterId}/exams`),

  createExamRequest: (encounterId: string, payload: CreateExamPayload) =>
    api.post<ExamRequest>(`/api/v1/encounters/${encounterId}/exams`, payload),

  recordExamResult: (encounterId: string, examRequestId: string, payload: RecordExamResultPayload) =>
    api.patch<ExamRequest>(`/api/v1/encounters/${encounterId}/exams/${examRequestId}/result`, payload),

  getProcedureRequests: (encounterId: string) =>
    api.get<readonly ProcedureRequest[]>(`/api/v1/encounters/${encounterId}/procedures`),

  createProcedureRequest: (encounterId: string, payload: CreateProcedurePayload) =>
    api.post<ProcedureRequest>(`/api/v1/encounters/${encounterId}/procedures`, payload),

  executeProcedure: (encounterId: string, procedureRequestId: string, payload: ExecuteProcedurePayload) =>
    api.patch<ProcedureRequest>(`/api/v1/encounters/${encounterId}/procedures/${procedureRequestId}/execute`, payload),

  getInterconsultations: (encounterId: string) =>
    api.get<readonly Interconsultation[]>(`/api/v1/encounters/${encounterId}/interconsultations`),

  createInterconsultation: (encounterId: string, payload: CreateInterconsultationPayload) =>
    api.post<Interconsultation>(`/api/v1/encounters/${encounterId}/interconsultations`, payload),

  respondInterconsultation: (encounterId: string, interconsultationId: string, payload: ResponseInterconsultationPayload) =>
    api.patch<Interconsultation>(`/api/v1/encounters/${encounterId}/interconsultations/${interconsultationId}/response`, payload),
});

export type ExamsApi = ReturnType<typeof createExamsApi>;
