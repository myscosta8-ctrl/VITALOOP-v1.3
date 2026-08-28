import type { ApiClient } from './api-client.js';

export type OutcomeType =
  | 'medical_discharge'
  | 'administrative_discharge'
  | 'discharge_against_medical_advice'
  | 'evasion'
  | 'transfer'
  | 'admission_bed'
  | 'death';

export interface EncounterOutcome {
  readonly id: string;
  readonly encounterId: string;
  readonly patientId: string;
  readonly consultationId?: string | null | undefined;
  readonly doctorId: string;
  readonly outcomeType: OutcomeType;
  readonly notes?: string | null | undefined;
  readonly destinationUnit?: string | null | undefined;
  readonly regulationCode?: string | null | undefined;
  readonly deathTimestamp?: string | null | undefined;
  readonly deathCertificateInfo?: string | null | undefined;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface EncounterSummary {
  readonly id: string;
  readonly outcomeId: string;
  readonly encounterId: string;
  readonly patientId: string;
  readonly doctorId: string;
  readonly chiefComplaint?: string | null | undefined;
  readonly primaryDiagnosisCode?: string | null | undefined;
  readonly primaryDiagnosisDescription?: string | null | undefined;
  readonly summaryNotes?: string | null | undefined;
  readonly dischargeInstructions?: string | null | undefined;
  readonly dischargePrescription?: unknown;
  readonly issuedAt: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateOutcomePayload {
  outcomeType: OutcomeType;
  notes?: string | null | undefined;
  destinationUnit?: string | null | undefined;
  regulationCode?: string | null | undefined;
  deathTimestamp?: string | null | undefined;
  deathCertificateInfo?: string | null | undefined;
  dischargeInstructions?: string | null | undefined;
  dischargePrescription?: unknown;
}

export interface OutcomeResponse {
  readonly outcome: EncounterOutcome;
  readonly summary: EncounterSummary;
}

export const createOutcomesApi = (api: ApiClient) => ({
  createOutcome: (encounterId: string, payload: CreateOutcomePayload) =>
    api.post<OutcomeResponse>(`/api/v1/encounters/${encounterId}/outcome`, payload),

  getOutcome: (encounterId: string) =>
    api.get<EncounterOutcome>(`/api/v1/encounters/${encounterId}/outcome`),

  getSummary: (encounterId: string) =>
    api.get<EncounterSummary>(`/api/v1/encounters/${encounterId}/summary`),
});

export type OutcomesApi = ReturnType<typeof createOutcomesApi>;
