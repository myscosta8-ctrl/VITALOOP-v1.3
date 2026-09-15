import type { ApiClient } from './api-client.js';

export type ManchesterRiskColor = 'red' | 'orange' | 'yellow' | 'green' | 'blue';
export type ManchesterPriority = 'emergency' | 'very_urgent' | 'urgent' | 'standard' | 'non_urgent';

export interface VitalSigns {
  systolicBp?: number | null;
  diastolicBp?: number | null;
  heartRate?: number | null;
  respiratoryRate?: number | null;
  temperature?: number | null;
  oxygenSaturation?: number | null;
}

// Avaliação inicial estruturada (Bloco 1, 14/09/2026) — dados do
// atendimento/triagem, nunca do paciente. Espelha
// packages/domain/src/triage/types.ts (apps/web não depende de
// @vitaloop/domain, mesma convenção já usada para os demais tipos aqui).
export type TriageGeneralCondition = 'good' | 'regular' | 'severe';
export type TriageConsciousness = 'oriented' | 'confused' | 'drowsy' | 'obtunded' | 'unconscious';
export type TriageAirway = 'patent' | 'altered' | 'obstructed';
export type TriageBreathing = 'normal' | 'altered' | 'respiratory_distress';
export type TriageCirculation = 'preserved' | 'altered';
export type TriageSkinFinding = 'normal_color' | 'pale' | 'cyanotic' | 'diaphoretic' | 'jaundiced' | 'other';
export type TriageEvolution = 'sudden' | 'gradual' | 'progressive' | 'recurrent' | 'stable' | 'worsening' | 'improving';
export type TriagePregnancyStatus = 'yes' | 'no' | 'unknown';

export interface TriageInitialAssessment {
  generalCondition?: TriageGeneralCondition | null;
  consciousness?: TriageConsciousness | null;
  airway?: TriageAirway | null;
  breathing?: TriageBreathing | null;
  circulation?: TriageCirculation | null;
  skinFindings?: readonly TriageSkinFinding[];
  skinFindingsOther?: string | null;
}

export interface TriagePregnancyAssessment {
  status?: TriagePregnancyStatus | null;
  weeks?: number | null;
  obstetricNotes?: string | null;
}

export interface TriageComplaintDetail {
  onsetAt?: string | null;
  evolution?: TriageEvolution | null;
  notes?: string | null;
}

export interface TriagePainDetail {
  location?: string | null;
  irradiation?: string | null;
  character?: string | null;
  onsetAt?: string | null;
  evolution?: TriageEvolution | null;
}

// Encaminhamento após triagem (Bloco 3, 14/09/2026) — regra operacional da
// UPA: todo paciente de fluxo médico vai para um consultório disponível;
// "leito comum"/"internação" propositalmente NÃO existem aqui — decisão
// médica posterior. Sala Vermelha é exceção operacional, nunca derivada
// automaticamente da cor Manchester.
export type TriageDestinationType = 'medical_consultation' | 'red_room' | 'exam' | 'procedure';
export type TriageExamCategory = 'laboratory' | 'imaging';
export type TriageProcedureKind = 'dressing_change' | 'urinary_catheter_change' | 'other';

export interface TriageDestination {
  type?: TriageDestinationType | null;
  roomId?: string | null;
  examCategory?: TriageExamCategory | null;
  procedureKind?: TriageProcedureKind | null;
  procedureOther?: string | null;
  notes?: string | null;
  setBy?: string | null;
  setAt?: string | null;
}

export type TriageDestinationEventType = 'initial' | 'change';

export interface TriageDestinationEvent {
  readonly id: string;
  readonly triageId: string;
  readonly destinationType: TriageDestinationType;
  readonly roomId?: string | null;
  readonly examCategory?: TriageExamCategory | null;
  readonly procedureKind?: TriageProcedureKind | null;
  readonly procedureOther?: string | null;
  readonly notes?: string | null;
  readonly reason?: string | null;
  readonly professionalId: string;
  readonly professionalName?: string | null;
  readonly setAt: string;
  readonly createdAt: string;
}

export interface Triage {
  readonly id: string;
  readonly encounterId: string;
  readonly patientId: string;
  readonly institutionId: string;
  readonly unitId?: string | null;
  readonly sectorId?: string | null;

  readonly chiefComplaint: string;
  readonly symptomsDuration?: string | null;
  readonly history?: string | null;

  readonly vitals: VitalSigns;
  readonly painScore?: number | null;
  readonly glasgowScore?: number | null;
  readonly capillaryGlucose?: number | null;

  readonly flowchart?: string | null;
  readonly discriminator?: string | null;
  readonly riskColor: ManchesterRiskColor;
  readonly priority: ManchesterPriority;
  readonly targetTimeMinutes: number;
  readonly protocolVersion: string;

  readonly reclassificationReason?: string | null;
  readonly reclassifiedFrom?: string | null;
  readonly notes?: string | null;
  readonly performedBy: string;
  readonly performedAt: string;
  readonly createdAt: string;
  readonly updatedAt: string;

  readonly initialAssessment: TriageInitialAssessment;
  readonly pregnancy: TriagePregnancyAssessment;
  readonly complaintDetail: TriageComplaintDetail;
  readonly painDetail: TriagePainDetail;

  /** Mais recente primeiro. */
  readonly classificationHistory: readonly TriageClassificationEvent[];

  /** Encaminhamento atual (Bloco 3) — `type: null` para triagens antigas ("Destino não definido"). */
  readonly destination: TriageDestination;
  /** Mais recente primeiro. */
  readonly destinationHistory: readonly TriageDestinationEvent[];
}

export interface TriageDestinationPayload {
  type: TriageDestinationType;
  roomId?: string | null;
  examCategory?: TriageExamCategory | null;
  procedureKind?: TriageProcedureKind | null;
  procedureOther?: string | null;
  notes?: string | null;
}

export interface TriageCreatePayload {
  chiefComplaint: string;
  symptomsDuration?: string | null;
  history?: string | null;
  vitals?: VitalSigns | null;
  painScore?: number | null;
  glasgowScore?: number | null;
  capillaryGlucose?: number | null;
  flowchart?: string | null;
  discriminator?: string | null;
  riskColor: ManchesterRiskColor;
  notes?: string | null;
  initialAssessment?: TriageInitialAssessment | null;
  pregnancy?: TriagePregnancyAssessment | null;
  complaintDetail?: TriageComplaintDetail | null;
  painDetail?: TriagePainDetail | null;
  /** Obrigatório — regra operacional: todo paciente deve ser encaminhado ao finalizar a triagem (Bloco 3). */
  destination: TriageDestinationPayload;
}

export interface TriageChangeDestinationPayload extends TriageDestinationPayload {
  reason: string;
  /** Lock otimista — mesmo mecanismo de `TriageReclassifyPayload.expectedUpdatedAt`. */
  expectedUpdatedAt: string;
}

export interface TriageReclassifyPayload {
  newRiskColor: ManchesterRiskColor;
  reclassificationReason: string;
  notes?: string | null;
  /** Lock otimista — `updatedAt` da triagem carregada em tela (Bloco 2.1). */
  expectedUpdatedAt: string;
}

// Histórico completo de classificação (Bloco 2, 14/09/2026) — cada item é
// UM evento já ocorrido (classificação inicial ou reclassificação),
// imutável. Incluído em `Triage.classificationHistory` pelo próprio
// `getTriage`/`createTriage`/`reclassifyTriage` — nenhum endpoint separado.
export type TriageClassificationType = 'initial' | 'reclassification';

export interface TriageClassificationEvent {
  readonly id: string;
  readonly triageId: string;
  readonly riskColor: ManchesterRiskColor;
  readonly priority: ManchesterPriority;
  readonly targetTimeMinutes: number;
  readonly classificationType: TriageClassificationType;
  readonly reason?: string | null;
  readonly professionalId: string;
  /** Nome do profissional quando resolvível com segurança (RLS) — `null`/ausente usa fallback de UUID na apresentação. */
  readonly professionalName?: string | null;
  readonly classifiedAt: string;
  readonly createdAt: string;
}

export const createTriagesApi = (api: ApiClient) => ({
  createTriage: (encounterId: string, payload: TriageCreatePayload) =>
    api.post<Triage>(`/api/v1/encounters/${encounterId}/triage`, payload),

  getTriage: (encounterId: string) =>
    api.get<Triage>(`/api/v1/encounters/${encounterId}/triage`),

  reclassifyTriage: (encounterId: string, payload: TriageReclassifyPayload) =>
    api.patch<Triage>(`/api/v1/encounters/${encounterId}/triage/reclassify`, payload),

  changeDestination: (encounterId: string, payload: TriageChangeDestinationPayload) =>
    api.patch<Triage>(`/api/v1/encounters/${encounterId}/triage/destination`, payload),
});

export type TriagesApi = ReturnType<typeof createTriagesApi>;
