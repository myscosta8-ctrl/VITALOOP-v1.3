/**
 * Tipos e contratos de domínio para Atendimentos (ENC-001..013).
 */

export type EncounterType = 'urgency' | 'emergency' | 'elective' | 'return';
export type EncounterOrigin = 'spontaneous' | 'samu' | 'transfer' | 'rescue_other';

export type EncounterStatus =
  | 'created'
  | 'triage_pending'
  | 'triaged'
  | 'consultation_pending'
  | 'in_consultation'
  | 'post_consultation'
  | 'completed'
  | 'canceled';

// Sub-status do Pronto Atendimento pós-avaliação médica (status
// 'post_consultation'): o paciente já foi avaliado pelo médico, mas segue
// em cuidado ativo na unidade antes de alta/internação. Só tem sentido
// quando status === 'post_consultation' — nos demais status é null.
export type PostConsultationDetail =
  | 'medicando'
  | 'aguardando_exames_laboratoriais'
  | 'aguardando_reavaliacao_medica';

export interface Encounter {
  id: string;
  patientId: string;
  institutionId: string;
  unitId?: string | null;
  sectorId?: string | null;
  encounterType: EncounterType;
  origin: EncounterOrigin;
  chiefComplaint: string;
  status: EncounterStatus;
  cancelReason?: string | null;
  postConsultationDetail?: PostConsultationDetail | null;
  assignedUserId?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EncounterCreateInput {
  patientId: string;
  institutionId: string;
  unitId?: string | null;
  sectorId?: string | null;
  encounterType: EncounterType;
  origin: EncounterOrigin;
  chiefComplaint: string;
  assignedUserId?: string | null;
}

export interface EncounterUpdateStatusInput {
  status: EncounterStatus;
  cancelReason?: string | null;
  postConsultationDetail?: PostConsultationDetail | null;
  expectedUpdatedAt: string;
}
