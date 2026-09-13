export type OutcomeType =
  | 'medical_discharge'
  | 'administrative_discharge'
  | 'discharge_against_medical_advice'
  | 'evasion'
  | 'transfer'
  | 'admission_bed'
  | 'death';

// Declaração de Óbito estruturada (Fase 4 do plano de reconstrução
// assistencial, 12/09/2026) — antes disso, `deathCertificateInfo` era um
// único campo de texto livre. Campos abaixo espelham os blocos V (causas da
// morte, linha A-D) e VI (circunstância de óbito) da Declaração de Óbito do
// SVO/CGIAE/MS: a Causa Mortis A (causa terminal) é sempre obrigatória; B/C/D
// e os dados de declarante/cartório são opcionais porque nem todo óbito em
// UPA já sai com investigação completa (pode ser complementado depois, ex.
// por IML/SVO).
export type DeathManner = 'natural' | 'violent' | 'undetermined';

export interface DeathCertificateData {
  causeMortisA: string;
  causeMortisB?: string | null | undefined;
  causeMortisC?: string | null | undefined;
  causeMortisD?: string | null | undefined;
  deathManner: DeathManner;
  declarantName?: string | null | undefined;
  declarantDocument?: string | null | undefined;
  registryOfficeInfo?: string | null | undefined;
}

export interface EncounterOutcome {
  id: string;
  encounterId: string;
  patientId: string;
  consultationId?: string | null | undefined;
  doctorId: string;
  outcomeType: OutcomeType;
  notes?: string | null | undefined;
  destinationUnit?: string | null | undefined;
  regulationCode?: string | null | undefined;
  deathTimestamp?: string | null | undefined;
  deathCertificateInfo?: string | null | undefined;
  deathCertificateData?: DeathCertificateData | null | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface EncounterSummary {
  id: string;
  outcomeId: string;
  encounterId: string;
  patientId: string;
  doctorId: string;
  chiefComplaint?: string | null | undefined;
  primaryDiagnosisCode?: string | null | undefined;
  primaryDiagnosisDescription?: string | null | undefined;
  summaryNotes?: string | null | undefined;
  dischargeInstructions?: string | null | undefined;
  dischargePrescription?: unknown;
  issuedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface OutcomeCreateInput {
  encounterId: string;
  patientId: string;
  consultationId?: string | null | undefined;
  outcomeType: OutcomeType;
  notes?: string | null | undefined;
  destinationUnit?: string | null | undefined;
  regulationCode?: string | null | undefined;
  deathTimestamp?: string | null | undefined;
  deathCertificateInfo?: string | null | undefined;
  deathCertificateData?: DeathCertificateData | null | undefined;
  dischargeInstructions?: string | null | undefined;
  dischargePrescription?: unknown;
  hasPrimaryDiagnosis?: boolean | undefined;
}
