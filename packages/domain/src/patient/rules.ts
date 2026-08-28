/**
 * Regras de negócio do domínio Paciente (PAT-001..017) — criação, edição,
 * normalização, imutabilidade e satélites (contatos/alergias/antecedentes/
 * medicamentos/problemas/merge). Sem dependência de HTTP/banco/React (Doc 2
 * §3: "domain não poderá depender de React, HTTP ou banco").
 *
 * Cada regra aqui tem correspondência direta com um CHECK/trigger/comentário
 * já existente em `db/migrations/0017_patients.sql` (nenhuma regra nova é
 * inventada além do schema e dos Documentos 1-4) — as referências de linha
 * ficam nos comentários de cada função.
 */

import type { Result } from '@vitaloop/shared';
import { err, ok } from '@vitaloop/shared';
import type { AppError } from '@vitaloop/shared';
import {
  immutableFieldError,
  invalidBirthDateError,
  mergeSameSourceAndTargetError,
  patientRequiredFieldError,
} from './errors.js';
import { normalizeAndValidateCns, normalizeAndValidateCpf } from './identifiers.js';
import type {
  Patient,
  PatientActiveProblemCreateInput,
  PatientAllergy,
  PatientAllergyCreateInput,
  PatientAntecedentCreateInput,
  PatientContactCreateInput,
  PatientContinuousMedicationCreateInput,
  PatientCreateInput,
} from './types.js';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Data de nascimento: formato ISO (YYYY-MM-DD) e não pode ser futura —
 * espelha `patients_birth_date_not_future_ck` (0017:52). `today` injetável
 * para testes determinísticos.
 */
export const validateBirthDate = (
  raw: string | null | undefined,
  today: () => Date = () => new Date(),
): Result<string | null, AppError> => {
  if (raw === null || raw === undefined || raw === '') return ok(null);
  if (!ISO_DATE_RE.test(raw)) return err(invalidBirthDateError(raw));
  const parsed = new Date(`${raw}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return err(invalidBirthDateError(raw));
  const todayMidnightUtc = new Date(
    Date.UTC(today().getUTCFullYear(), today().getUTCMonth(), today().getUTCDate()),
  );
  if (parsed.getTime() > todayMidnightUtc.getTime()) return err(invalidBirthDateError(raw));
  return ok(raw);
};

/** Resultado normalizado de um `PatientCreateInput`, pronto para persistência. */
export type NormalizedPatientCreateInput = Omit<PatientCreateInput, 'cpf' | 'cns' | 'birthDate'> & {
  readonly cpf: string | null;
  readonly cns: string | null;
  readonly birthDate: string | null;
};

/**
 * Valida e normaliza os dados de criação de paciente: `fullName` obrigatório
 * (0017:34, `not null`), CPF/CNS com dígito verificador (`identifiers.ts`),
 * data de nascimento não-futura. NÃO decide duplicidade — isso é
 * responsabilidade de `duplicate-detection.ts`, chamada separadamente pelo
 * chamador (API futura), pois exige a lista de pacientes existentes.
 */
export const normalizePatientCreateInput = (
  input: PatientCreateInput,
  today?: () => Date,
): Result<NormalizedPatientCreateInput, AppError> => {
  if (!input.fullName || input.fullName.trim() === '') {
    return err(patientRequiredFieldError('fullName'));
  }

  const cpfResult = normalizeAndValidateCpf(input.cpf ?? null);
  if (!cpfResult.ok) return cpfResult;

  const cnsResult = normalizeAndValidateCns(input.cns ?? null);
  if (!cnsResult.ok) return cnsResult;

  const birthDateResult = validateBirthDate(input.birthDate ?? null, today);
  if (!birthDateResult.ok) return birthDateResult;

  return ok({
    ...input,
    fullName: input.fullName.trim(),
    cpf: cpfResult.value,
    cns: cnsResult.value,
    birthDate: birthDateResult.value,
  });
};

/**
 * Campos que NUNCA podem ser alterados após a criação do paciente — não por
 * regra de UPDATE explícita no schema (não há trigger dedicado em
 * `app.patients`, diferente de `patient_allergies`), mas porque são
 * identidade/proveniência do registro, não dados editáveis (Doc 4 §7:
 * identidade institucional é gerida pelo sistema, não editada livremente).
 * `medicalRecordNumber` é gerado uma única vez por
 * `app.generate_medical_record_number()` (0017:318) — "preservação do
 * número de prontuário" nesta etapa significa: a API NUNCA deve reenviá-lo
 * como parte de uma edição comum.
 */
export const PATIENT_IMMUTABLE_FIELDS = [
  'id',
  'medicalRecordNumber',
  'createdAt',
  'createdBy',
] as const;

/**
 * Defesa em profundidade: além do tipo `PatientUpdateInput` já excluir os
 * campos imutáveis em tempo de compilação, esta função valida em runtime um
 * objeto de atualização construído dinamicamente (ex.: vindo de JSON de uma
 * API futura), rejeitando qualquer tentativa de alterar `PATIENT_IMMUTABLE_FIELDS`.
 */
export const assertNoImmutablePatientFieldsChanged = (
  patch: Record<string, unknown>,
): Result<void, AppError> => {
  for (const field of PATIENT_IMMUTABLE_FIELDS) {
    if (field in patch) {
      return err(immutableFieldError(field, 'paciente'));
    }
  }
  return ok(undefined);
};

// ---------- Imutabilidade de alergia (espelha o trigger forbid_allergy_content_update, 0017:112-124) ----------

/**
 * Compara o conteúdo clínico de uma alergia antes/depois de uma tentativa de
 * atualização. Espelha EXATAMENTE os campos verificados pelo trigger SQL
 * (`substance`, `reaction`, `severity`, `patient_id`) — apenas `status` pode
 * mudar. Retorna erro se qualquer campo protegido mudou.
 */
export const assertAllergyContentUnchanged = (
  before: Pick<PatientAllergy, 'substance' | 'reaction' | 'severity' | 'patientId'>,
  after: Pick<PatientAllergy, 'substance' | 'reaction' | 'severity' | 'patientId'>,
): Result<void, AppError> => {
  if (
    before.substance !== after.substance ||
    before.reaction !== after.reaction ||
    before.severity !== after.severity ||
    before.patientId !== after.patientId
  ) {
    return err(immutableFieldError('substance/reaction/severity/patientId', 'patient_allergies'));
  }
  return ok(undefined);
};

// ---------- Satélites — validação de campos obrigatórios (espelha NOT NULL do schema) ----------

/** Espelha `patient_contacts.name/phone not null` (0017:80-82). */
export const validatePatientContactCreateInput = (
  input: PatientContactCreateInput,
): Result<PatientContactCreateInput, AppError> => {
  if (!input.name || input.name.trim() === '') return err(patientRequiredFieldError('name'));
  if (!input.phone || input.phone.trim() === '') return err(patientRequiredFieldError('phone'));
  return ok({ ...input, name: input.name.trim(), phone: input.phone.trim() });
};

/**
 * Espelha `patient_allergies.substance not null` (0017:99). Alergia NUNCA
 * deve assumir "nega" sem registro explícito (Doc 1 §11) — por isso não há
 * valor default aceito aqui; o chamador precisa fornecer `substance`
 * explicitamente para qualquer registro, inclusive "nenhuma conhecida".
 */
export const validatePatientAllergyCreateInput = (
  input: PatientAllergyCreateInput,
): Result<PatientAllergyCreateInput, AppError> => {
  if (!input.substance || input.substance.trim() === '') {
    return err(patientRequiredFieldError('substance'));
  }
  return ok({ ...input, substance: input.substance.trim() });
};

/** Espelha `patient_antecedents.description not null` (0017:133). */
export const validatePatientAntecedentCreateInput = (
  input: PatientAntecedentCreateInput,
): Result<PatientAntecedentCreateInput, AppError> => {
  if (!input.description || input.description.trim() === '') {
    return err(patientRequiredFieldError('description'));
  }
  return ok({ ...input, description: input.description.trim() });
};

/** Espelha `patient_continuous_medications.medication not null` (0017:146). */
export const validatePatientContinuousMedicationCreateInput = (
  input: PatientContinuousMedicationCreateInput,
): Result<PatientContinuousMedicationCreateInput, AppError> => {
  if (!input.medication || input.medication.trim() === '') {
    return err(patientRequiredFieldError('medication'));
  }
  return ok({ ...input, medication: input.medication.trim() });
};

/** Espelha `patient_active_problems.description not null` (0017:160). */
export const validatePatientActiveProblemCreateInput = (
  input: PatientActiveProblemCreateInput,
): Result<PatientActiveProblemCreateInput, AppError> => {
  if (!input.description || input.description.trim() === '') {
    return err(patientRequiredFieldError('description'));
  }
  return ok({ ...input, description: input.description.trim() });
};

// ---------- Merge (PAT-016) ----------

/** Espelha `patient_merge_distinct_ck` (0017:208): origem e destino não podem ser o mesmo paciente. */
export const validateMergeRequestPatients = (
  sourcePatientId: Patient['id'],
  targetPatientId: Patient['id'],
): Result<void, AppError> => {
  if (sourcePatientId === targetPatientId) return err(mergeSameSourceAndTargetError());
  return ok(undefined);
};
