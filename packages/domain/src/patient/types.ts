/**
 * Tipos do domínio Paciente (Doc 1 §11/§12; Doc 2 §64; PAT-001..017).
 *
 * Espelham fielmente `db/migrations/0017_patients.sql` (enums, colunas,
 * nulabilidade) — nenhum campo é inventado além do que o schema já define.
 */

import type { IsoTimestamp, UUID } from '@vitaloop/shared';

/** Igual a `app.entity_status` (migration 0002). */
export type EntityStatus = 'active' | 'inactive' | 'suspended';

/** Igual a `app.patient_sex` (migration 0017). */
export type PatientSex = 'female' | 'male' | 'undetermined';

/** Igual a `app.allergy_severity` (migration 0017). */
export type AllergySeverity = 'mild' | 'moderate' | 'severe' | 'unknown';

/** Igual a `app.allergy_status` (migration 0017). */
export type AllergyStatus = 'active' | 'resolved' | 'entered_in_error';

/** Igual a `app.problem_status` (migration 0017). */
export type ProblemStatus = 'active' | 'resolved' | 'inactive';

/** Igual a `app.duplicate_match_strength` (migration 0017). */
export type DuplicateMatchStrength = 'strong' | 'weak' | 'conflict';

/** Igual a `app.duplicate_review_status` (migration 0017). */
export type DuplicateReviewStatus =
  | 'open'
  | 'confirmed_duplicate'
  | 'confirmed_distinct'
  | 'dismissed';

/** Igual a `app.merge_request_status` (migration 0017). */
export type MergeRequestStatus = 'requested' | 'approved' | 'rejected' | 'executed';

/**
 * Paciente (`app.patients`). CPF/CNS armazenados normalizados (somente
 * dígitos) — ver `patient/identifiers.ts`. Ausência de CPF/CNS é permitida
 * (Doc 1 §11: nenhuma informação inventada por default).
 */
export interface Patient {
  readonly id: UUID;
  readonly medicalRecordNumber: string;
  readonly fullName: string;
  readonly socialName: string | null;
  readonly motherName: string | null;
  readonly birthDate: string | null; // ISO date (YYYY-MM-DD), não timestamp
  readonly sex: PatientSex | null;
  readonly cpf: string | null; // 11 dígitos, normalizado
  readonly cns: string | null; // 15 dígitos, normalizado
  readonly rg: string | null;
  readonly phone: string | null;
  readonly address: string | null;
  readonly city: string | null;
  readonly state: string | null;
  readonly institutionId: UUID | null;
  readonly status: EntityStatus;
  readonly createdBy: UUID | null;
  readonly updatedBy: UUID | null;
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
}

/** Campos aceitos para criação — o restante é derivado/gerado (id, timestamps, status). */
export interface PatientCreateInput {
  readonly fullName: string;
  readonly socialName?: string | null;
  readonly motherName?: string | null;
  readonly birthDate?: string | null;
  readonly sex?: PatientSex | null;
  readonly cpf?: string | null; // aceita formatado ou não; normalizado internamente
  readonly cns?: string | null;
  readonly rg?: string | null;
  readonly phone?: string | null;
  readonly address?: string | null;
  readonly city?: string | null;
  readonly state?: string | null;
  readonly institutionId?: UUID | null;
}

/**
 * Campos aceitos para atualização. `medicalRecordNumber`, `id`, `status`
 * (inativação é um fluxo próprio, não uma edição comum) e timestamps NÃO
 * fazem parte deste tipo — imutáveis por regra de domínio (ver `rules.ts`).
 */
export type PatientUpdateInput = Partial<PatientCreateInput>;

/** Contato do paciente (`app.patient_contacts`) — PAT-007/008. */
export interface PatientContact {
  readonly id: UUID;
  readonly patientId: UUID;
  readonly name: string;
  readonly relationship: string | null;
  readonly phone: string;
  readonly isEmergency: boolean;
  readonly createdBy: UUID | null;
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
}

export interface PatientContactCreateInput {
  readonly name: string;
  readonly relationship?: string | null;
  readonly phone: string;
  readonly isEmergency?: boolean;
}

/**
 * Alergia (`app.patient_allergies`) — PAT-009/010. Conteúdo clínico
 * (`substance`/`reaction`/`severity`) é IMUTÁVEL após criado (trigger
 * `forbid_allergy_content_update`); apenas `status` transiciona.
 */
export interface PatientAllergy {
  readonly id: UUID;
  readonly patientId: UUID;
  readonly substance: string;
  readonly reaction: string | null;
  readonly severity: AllergySeverity;
  readonly status: AllergyStatus;
  readonly recordedBy: UUID | null;
  readonly recordedAt: IsoTimestamp;
}

export interface PatientAllergyCreateInput {
  readonly substance: string;
  readonly reaction?: string | null;
  readonly severity?: AllergySeverity;
}

/** Antecedente (`app.patient_antecedents`) — PAT-011. */
export interface PatientAntecedent {
  readonly id: UUID;
  readonly patientId: UUID;
  readonly description: string;
  readonly category: string | null;
  readonly status: EntityStatus;
  readonly recordedBy: UUID | null;
  readonly recordedAt: IsoTimestamp;
}

export interface PatientAntecedentCreateInput {
  readonly description: string;
  readonly category?: string | null;
}

/** Medicamento de uso contínuo (`app.patient_continuous_medications`) — PAT-012. */
export interface PatientContinuousMedication {
  readonly id: UUID;
  readonly patientId: UUID;
  readonly medication: string;
  readonly dose: string | null;
  readonly frequency: string | null;
  readonly status: EntityStatus;
  readonly recordedBy: UUID | null;
  readonly recordedAt: IsoTimestamp;
}

export interface PatientContinuousMedicationCreateInput {
  readonly medication: string;
  readonly dose?: string | null;
  readonly frequency?: string | null;
}

/** Problema/condição ativa (`app.patient_active_problems`) — PAT-013. */
export interface PatientActiveProblem {
  readonly id: UUID;
  readonly patientId: UUID;
  readonly description: string;
  readonly cidCode: string | null;
  readonly status: ProblemStatus;
  readonly recordedBy: UUID | null;
  readonly recordedAt: IsoTimestamp;
  readonly resolvedAt: IsoTimestamp | null;
}

export interface PatientActiveProblemCreateInput {
  readonly description: string;
  readonly cidCode?: string | null;
}

/** Candidato a duplicidade (`app.patient_duplicate_candidates`) — PAT-015. */
export interface PatientDuplicateCandidate {
  readonly patientAId: UUID;
  readonly patientBId: UUID;
  readonly matchStrength: DuplicateMatchStrength;
  readonly matchReason: string;
  readonly reviewStatus: DuplicateReviewStatus;
}

/** Solicitação de merge (`app.patient_merge_requests`) — PAT-016. */
export interface PatientMergeRequest {
  readonly id: UUID;
  readonly sourcePatientId: UUID;
  readonly targetPatientId: UUID;
  readonly reason: string;
  readonly status: MergeRequestStatus;
  readonly requestedBy: UUID | null;
  readonly requestedAt: IsoTimestamp;
  readonly reviewedBy: UUID | null;
  readonly reviewedAt: IsoTimestamp | null;
  readonly reviewNotes: string | null;
}

/** Paciente mínimo necessário para comparação de duplicidade (ver `duplicate-detection.ts`). */
export interface PatientDuplicateCandidateSource {
  readonly id: UUID;
  readonly fullName: string;
  readonly cpf: string | null;
  readonly cns: string | null;
  readonly birthDate: string | null;
  readonly status: EntityStatus;
}
