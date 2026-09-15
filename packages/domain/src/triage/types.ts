/**
 * Tipos e contratos de domínio para Triagem e Classificação de Risco (TRI-001..017).
 */

export type ManchesterRiskColor = 'red' | 'orange' | 'yellow' | 'green' | 'blue';
export type ManchesterPriority = 'emergency' | 'very_urgent' | 'urgent' | 'standard' | 'non_urgent';

// Avaliação inicial estruturada (Bloco 1, 14/09/2026) — dados do
// ATENDIMENTO/TRIAGEM, nunca do Patient (um atendimento novo não herda nem
// sobrescreve a avaliação de um atendimento anterior).
export type TriageGeneralCondition = 'good' | 'regular' | 'severe';
export type TriageConsciousness = 'oriented' | 'confused' | 'drowsy' | 'obtunded' | 'unconscious';
export type TriageAirway = 'patent' | 'altered' | 'obstructed';
export type TriageBreathing = 'normal' | 'altered' | 'respiratory_distress';
export type TriageCirculation = 'preserved' | 'altered';
export type TriageSkinFinding = 'normal_color' | 'pale' | 'cyanotic' | 'diaphoretic' | 'jaundiced' | 'other';

// Reaproveitado pela evolução da queixa E pela evolução da dor (mesma
// semântica — não duplicar o conceito em dois enums diferentes).
export type TriageEvolution = 'sudden' | 'gradual' | 'progressive' | 'recurrent' | 'stable' | 'worsening' | 'improving';

// 'unknown' é uma resposta EXPLÍCITA de "não informado", distinta de
// `undefined`/ausência (que significa "triagem anterior a este campo
// existir" ou "não perguntado ainda") — nunca presume gravidez.
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

export interface VitalSigns {
  systolicBp?: number | null;     // mmHg (ex.: 120)
  diastolicBp?: number | null;    // mmHg (ex.: 80)
  heartRate?: number | null;      // bpm (ex.: 75)
  respiratoryRate?: number | null;// ipm (ex.: 16)
  temperature?: number | null;    // ºC (ex.: 36.5)
  oxygenSaturation?: number | null;// % (ex.: 98)
}

// Encaminhamento após triagem (Bloco 3, 14/09/2026) — regra operacional da
// UPA: todo paciente de fluxo médico vai para um consultório disponível;
// "leito comum"/"internação" propositalmente NÃO existem aqui — são decisão
// médica posterior, fora do escopo da Triagem. Sala Vermelha é exceção
// operacional (não uma consequência automática da cor Manchester).
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

/** Entrada para definir (na finalização) ou alterar o encaminhamento. `reason` só é exigido na alteração (ver `validateTriageDestination`). */
export interface TriageDestinationInput {
  type: TriageDestinationType;
  roomId?: string | null;
  examCategory?: TriageExamCategory | null;
  procedureKind?: TriageProcedureKind | null;
  procedureOther?: string | null;
  notes?: string | null;
  reason?: string | null;
}

export interface TriageDestinationChangeInput extends TriageDestinationInput {
  triageId: string;
  reason: string;
  /** Lock otimista — mesmo mecanismo de `TriageReclassifyInput.expectedUpdatedAt`. */
  expectedUpdatedAt: string;
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
  id: string;
  encounterId: string;
  patientId: string;
  institutionId: string;
  unitId?: string | null;
  sectorId?: string | null;

  chiefComplaint: string;
  symptomsDuration?: string | null;
  history?: string | null;

  vitals: VitalSigns;
  painScore?: number | null;
  glasgowScore?: number | null;
  capillaryGlucose?: number | null;

  flowchart?: string | null;
  discriminator?: string | null;
  riskColor: ManchesterRiskColor;
  priority: ManchesterPriority;
  targetTimeMinutes: number;
  protocolVersion: string;

  reclassificationReason?: string | null;
  reclassifiedFrom?: string | null;
  notes?: string | null;
  performedBy: string;
  performedAt: string;
  createdAt: string;
  updatedAt: string;

  initialAssessment: TriageInitialAssessment;
  pregnancy: TriagePregnancyAssessment;
  complaintDetail: TriageComplaintDetail;
  painDetail: TriagePainDetail;

  /** Mais recente primeiro (regra 8: "cronologia... mais recente primeiro pra consulta operacional"). */
  classificationHistory: readonly TriageClassificationEvent[];

  /** Encaminhamento atual (Bloco 3) — `type: null` para triagens antigas ("Destino não definido"), nunca inventado. */
  destination: TriageDestination;
  /** Mais recente primeiro — mesmo contrato de `classificationHistory`. */
  destinationHistory: readonly TriageDestinationEvent[];
}

export interface TriageCreateInput {
  encounterId: string;
  patientId: string;
  institutionId: string;
  unitId?: string | null;
  sectorId?: string | null;

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

  /** Obrigatório (Bloco 3: "todo paciente deve ser encaminhado" ao finalizar a triagem). */
  destination: TriageDestinationInput;
}

export interface TriageReclassifyInput {
  triageId: string;
  newRiskColor: ManchesterRiskColor;
  reclassificationReason: string;
  notes?: string | null;
  /**
   * Lock otimista (Bloco 2.1) — `updated_at` da triagem que o profissional
   * tinha em tela ao decidir reclassificar. Mesmo mecanismo já usado em
   * `EncounterUpdateStatusPayload.expectedUpdatedAt`
   * (apps/api/src/routes/encounters.ts) — reaproveitado, não reinventado.
   * Se o valor não bater mais no banco no momento do UPDATE, a
   * reclassificação é rejeitada como conflito de concorrência em vez de
   * sobrescrever silenciosamente uma mudança feita por outro profissional.
   */
  expectedUpdatedAt: string;
}

// Histórico completo de classificação (Bloco 2, 14/09/2026) — cada
// registro é UM evento de classificação/reclassificação já ocorrido,
// imutável (nunca atualizado/removido após criado). "initial" é a
// classificação feita ao finalizar a triagem; "reclassification" é toda
// mudança posterior via PATCH .../triage/reclassify.
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
  /** Nome do profissional quando resolvível com segurança (RLS) — `null` usa fallback de UUID na apresentação. Nunca duplicado no histórico: resolvido por relacionamento, não armazenado na tabela. */
  readonly professionalName?: string | null;
  readonly classifiedAt: string;
  readonly createdAt: string;
}
