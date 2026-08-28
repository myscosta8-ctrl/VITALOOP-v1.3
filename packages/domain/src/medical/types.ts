export interface SegmentalExam {
  cardiovascular?: string | null | undefined;
  respiratory?: string | null | undefined;
  abdomen?: string | null | undefined;
  neurological?: string | null | undefined;
  extremities?: string | null | undefined;
  other?: string | null | undefined;
}

export interface MedicalConsultation {
  id: string;
  encounterId: string;
  patientId: string;
  doctorId: string;
  chiefComplaint: string;
  historyPresentIllness: string;
  pastMedicalHistory?: string | null | undefined;
  systemReview?: string | null | undefined;
  generalExam: string;
  segmentalExam: SegmentalExam;
  diagnosticHypothesis: string;
  initialConduct?: string | null | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface MedicalEvolution {
  id: string;
  consultationId: string;
  encounterId: string;
  patientId: string;
  doctorId: string;
  evolutionText: string;
  clinicalStatus?: string | null | undefined;
  createdAt: string;
}

export interface ConsultationCreateInput {
  encounterId: string;
  patientId: string;
  chiefComplaint: string;
  historyPresentIllness: string;
  pastMedicalHistory?: string | null | undefined;
  systemReview?: string | null | undefined;
  generalExam: string;
  segmentalExam?: SegmentalExam | null | undefined;
  diagnosticHypothesis: string;
  initialConduct?: string | null | undefined;
}

export interface EvolutionCreateInput {
  consultationId: string;
  encounterId: string;
  patientId: string;
  evolutionText: string;
  clinicalStatus?: string | null | undefined;
}
