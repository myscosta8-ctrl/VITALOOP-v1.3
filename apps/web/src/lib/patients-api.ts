/**
 * Wrapper tipado sobre os endpoints REAIS de paciente já implementados na
 * Etapa 2/6 (`apps/api/src/routes/patients.ts`). Nenhum endpoint novo é
 * criado aqui — apenas tipos de DTO (formato de fio, não regra de negócio) e
 * chamadas diretas ao `ApiClient` já existente (Doc 2 §31/§34: o frontend
 * nunca decide autorização, só reflete a resposta real do backend).
 */

import type { ApiClient } from './api-client.js';

export type PatientSex = 'female' | 'male' | 'undetermined';
export type AllergySeverity = 'mild' | 'moderate' | 'severe' | 'unknown';
export type AllergyStatus = 'active' | 'resolved' | 'entered_in_error';
export type DuplicateMatchStrength = 'strong' | 'weak' | 'conflict';
export type DuplicateReviewStatus = 'open' | 'confirmed_duplicate' | 'confirmed_distinct' | 'dismissed';
export type MergeRequestStatus = 'requested' | 'approved' | 'rejected' | 'executed';

export interface Patient {
  readonly id: string;
  readonly medicalRecordNumber: string;
  readonly fullName: string;
  readonly socialName: string | null;
  readonly motherName: string | null;
  readonly birthDate: string | null;
  readonly sex: PatientSex | null;
  readonly cpf: string | null;
  readonly cns: string | null;
  readonly rg: string | null;
  readonly phone: string | null;
  readonly address: string | null;
  readonly city: string | null;
  readonly state: string | null;
  readonly institutionId: string | null;
  readonly status: 'active' | 'inactive' | 'suspended';
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface PatientContact {
  readonly id: string;
  readonly patientId: string;
  readonly name: string;
  readonly relationship: string | null;
  readonly phone: string;
  readonly isEmergency: boolean;
}

export interface PatientAllergy {
  readonly id: string;
  readonly patientId: string;
  readonly substance: string;
  readonly reaction: string | null;
  readonly severity: AllergySeverity;
  readonly status: AllergyStatus;
}

export interface PatientAntecedent {
  readonly id: string;
  readonly patientId: string;
  readonly description: string;
  readonly category: string | null;
}

export interface PatientContinuousMedication {
  readonly id: string;
  readonly patientId: string;
  readonly medication: string;
  readonly dose: string | null;
  readonly frequency: string | null;
}

export interface PatientActiveProblem {
  readonly id: string;
  readonly patientId: string;
  readonly description: string;
  readonly cidCode: string | null;
  readonly status: 'active' | 'resolved' | 'inactive';
}

export interface DuplicateCandidate {
  readonly id: string;
  readonly patientAId: string;
  readonly patientBId: string;
  readonly matchStrength: DuplicateMatchStrength;
  readonly matchReason: string;
  readonly reviewStatus: DuplicateReviewStatus;
}

export interface PatientTimelineEvent {
  readonly eventId: string;
  readonly type: string;
  readonly aggregateType: string;
  readonly actorUserId: string | null;
  readonly occurredAt: string;
  readonly payload: unknown;
}

export interface PatientMergeRequest {
  readonly id: string;
  readonly sourcePatientId: string;
  readonly targetPatientId: string;
  readonly reason: string;
  readonly status: MergeRequestStatus;
  readonly reviewNotes: string | null;
}

export interface PatientCreateInput {
  readonly fullName: string;
  readonly socialName?: string | null;
  readonly motherName?: string | null;
  readonly birthDate?: string | null;
  readonly sex?: PatientSex | null;
  readonly cpf?: string | null;
  readonly cns?: string | null;
  readonly rg?: string | null;
  readonly phone?: string | null;
  readonly address?: string | null;
  readonly city?: string | null;
  readonly state?: string | null;
  readonly confirmDuplicate?: boolean;
}

export type PatientUpdateInput = Partial<Omit<PatientCreateInput, 'confirmDuplicate'>>;

export interface PatientSearchParams {
  readonly name?: string;
  readonly cpf?: string;
  readonly cns?: string;
  readonly mrn?: string;
}

const qs = (params: PatientSearchParams): string => {
  const entries = Object.entries(params).filter(
    (entry): entry is [string, string] => entry[1] !== undefined && entry[1] !== '',
  );
  if (entries.length === 0) return '';
  return '?' + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
};

export const createPatientsApi = (api: ApiClient) => ({
  create: (input: PatientCreateInput, idempotencyKey?: string) =>
    api.post<Patient>(
      '/api/v1/patients',
      input,
      idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
    ),

  search: (params: PatientSearchParams) =>
    api.get<readonly Patient[]>(`/api/v1/patients${qs(params)}`),

  get: (id: string) => api.get<Patient>(`/api/v1/patients/${id}`),

  update: (id: string, patch: PatientUpdateInput) =>
    api.patch<Patient>(`/api/v1/patients/${id}`, patch),

  inactivate: (id: string, reason: string) =>
    api.patch<Patient>(`/api/v1/patients/${id}/inactivate`, { reason }),

  getTimeline: (id: string) =>
    api.get<readonly PatientTimelineEvent[]>(`/api/v1/patients/${id}/timeline`),

  listContacts: (patientId: string) =>
    api.get<readonly PatientContact[]>(`/api/v1/patients/${patientId}/contacts`),
  createContact: (
    patientId: string,
    input: { name: string; relationship?: string | null; phone: string; isEmergency?: boolean },
  ) => api.post<PatientContact>(`/api/v1/patients/${patientId}/contacts`, input),

  listAllergies: (patientId: string) =>
    api.get<readonly PatientAllergy[]>(`/api/v1/patients/${patientId}/allergies`),
  createAllergy: (
    patientId: string,
    input: { substance: string; reaction?: string | null; severity?: AllergySeverity },
  ) => api.post<PatientAllergy>(`/api/v1/patients/${patientId}/allergies`, input),
  updateAllergyStatus: (patientId: string, allergyId: string, status: AllergyStatus) =>
    api.patch<PatientAllergy>(`/api/v1/patients/${patientId}/allergies/${allergyId}`, { status }),

  listAntecedents: (patientId: string) =>
    api.get<readonly PatientAntecedent[]>(`/api/v1/patients/${patientId}/antecedents`),
  createAntecedent: (patientId: string, input: { description: string; category?: string | null }) =>
    api.post<PatientAntecedent>(`/api/v1/patients/${patientId}/antecedents`, input),

  listContinuousMedications: (patientId: string) =>
    api.get<readonly PatientContinuousMedication[]>(
      `/api/v1/patients/${patientId}/continuous-medications`,
    ),
  createContinuousMedication: (
    patientId: string,
    input: { medication: string; dose?: string | null; frequency?: string | null },
  ) => api.post<PatientContinuousMedication>(`/api/v1/patients/${patientId}/continuous-medications`, input),

  listActiveProblems: (patientId: string) =>
    api.get<readonly PatientActiveProblem[]>(`/api/v1/patients/${patientId}/active-problems`),
  createActiveProblem: (patientId: string, input: { description: string; cidCode?: string | null }) =>
    api.post<PatientActiveProblem>(`/api/v1/patients/${patientId}/active-problems`, input),

  detectDuplicates: (patientId: string) =>
    api.post<{ candidatesDetected: number }>(`/api/v1/patients/${patientId}/duplicates/detect`),
  listDuplicates: (patientId: string) =>
    api.get<readonly DuplicateCandidate[]>(`/api/v1/patients/${patientId}/duplicates`),

  requestMerge: (sourcePatientId: string, targetPatientId: string, reason: string) =>
    api.post<PatientMergeRequest>(`/api/v1/patients/${sourcePatientId}/merge-requests`, {
      targetPatientId,
      reason,
    }),
});

export type PatientsApi = ReturnType<typeof createPatientsApi>;

/** Estrutura dos `details` de PATIENT_DUPLICATE_NOT_CONFIRMED (ver apps/api/src/routes/patients.ts). */
export interface DuplicateErrorMatch {
  readonly candidateId: string;
  readonly matchStrength: DuplicateMatchStrength;
}

export const parseDuplicateMatches = (
  details: ReadonlyArray<{ field?: string; issue: string }> | undefined,
): readonly DuplicateErrorMatch[] => {
  if (!details) return [];
  return details
    .filter((d) => d.field === 'duplicate')
    .map((d) => {
      const [candidateId, matchStrength] = d.issue.split(':');
      return { candidateId: candidateId ?? '', matchStrength: (matchStrength ?? 'weak') as DuplicateMatchStrength };
    });
};
