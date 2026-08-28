export type OutcomeType =
  | 'medical_discharge'
  | 'administrative_discharge'
  | 'discharge_against_medical_advice'
  | 'evasion'
  | 'transfer'
  | 'admission_bed'
  | 'death';

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
  dischargeInstructions?: string | null | undefined;
  dischargePrescription?: unknown;
  hasPrimaryDiagnosis?: boolean | undefined;
}
