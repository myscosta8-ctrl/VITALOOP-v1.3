import type { ApiClient } from './api-client.js';

export interface SegmentalExam {
  cardiovascular?: string | null;
  respiratory?: string | null;
  abdomen?: string | null;
  neurological?: string | null;
  extremities?: string | null;
  other?: string | null;
}

export interface MedicalConsultation {
  readonly id: string;
  readonly encounterId: string;
  readonly patientId: string;
  readonly doctorId: string;
  readonly chiefComplaint: string;
  readonly historyPresentIllness: string;
  readonly pastMedicalHistory?: string | null;
  readonly systemReview?: string | null;
  readonly generalExam: string;
  readonly segmentalExam: SegmentalExam;
  readonly diagnosticHypothesis: string;
  readonly initialConduct?: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly evolutions?: readonly MedicalEvolution[];
}

export interface MedicalEvolution {
  readonly id: string;
  readonly consultationId: string;
  readonly encounterId: string;
  readonly patientId: string;
  readonly doctorId: string;
  readonly evolutionText: string;
  readonly clinicalStatus?: string | null;
  readonly createdAt: string;
}

export interface ConsultationCreatePayload {
  chiefComplaint: string;
  historyPresentIllness: string;
  pastMedicalHistory?: string | null;
  systemReview?: string | null;
  generalExam: string;
  segmentalExam?: SegmentalExam | null;
  diagnosticHypothesis: string;
  initialConduct?: string | null;
}

export interface EvolutionCreatePayload {
  evolutionText: string;
  clinicalStatus?: string | null;
}

export const createMedicalApi = (api: ApiClient) => ({
  getConsultation: (encounterId: string) =>
    api.get<MedicalConsultation>(`/api/v1/encounters/${encounterId}/consultation`),

  createConsultation: (encounterId: string, payload: ConsultationCreatePayload) =>
    api.post<MedicalConsultation>(`/api/v1/encounters/${encounterId}/consultation`, payload),

  createEvolution: (encounterId: string, payload: EvolutionCreatePayload) =>
    api.post<MedicalEvolution>(`/api/v1/encounters/${encounterId}/consultation/evolutions`, payload),
});

export type MedicalApi = ReturnType<typeof createMedicalApi>;
