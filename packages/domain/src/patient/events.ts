/**
 * Eventos de domínio do Paciente (Doc 2 §37/§38 — fonte única para
 * `app.patient_timeline`, já testada estruturalmente em T9/
 * `PHASE_2_STEP_1_REPORT.md`). Usa a fábrica genérica já existente
 * (`../domain-event.ts`) — nenhuma persistência acontece aqui; a API
 * (fase futura) é responsável por gravar em `app.domain_events`,
 * preenchendo a coluna `patient_id` a partir de `aggregateId` quando
 * `aggregateType === 'patient'` (mesmo padrão de todo o restante do schema).
 *
 * SEM integração com API nesta rodada — apenas fábricas puras.
 */

import { createDomainEvent } from '../domain-event.js';
import type { CreateEventInput, DomainEvent } from '../domain-event.js';
import type { UUID } from '@vitaloop/shared';
import type {
  AllergySeverity,
  AllergyStatus,
  DuplicateMatchStrength,
  MergeRequestStatus,
  PatientSex,
} from './types.js';

const AGGREGATE_TYPE = 'patient';

type PatientEventInput<TType extends string, TPayload> = Omit<
  CreateEventInput<TType, TPayload>,
  'aggregateType'
>;

const createPatientEvent = <TType extends string, TPayload>(
  input: PatientEventInput<TType, TPayload>,
  clock?: () => Date,
): DomainEvent<TType, TPayload> =>
  createDomainEvent({ ...input, aggregateType: AGGREGATE_TYPE }, clock);

// ---------- PatientRegistered (PAT-001) ----------
export interface PatientRegisteredPayload {
  readonly medicalRecordNumber: string;
  readonly fullName: string;
  readonly cpf: string | null;
  readonly cns: string | null;
  readonly birthDate: string | null;
  readonly sex: PatientSex | null;
  readonly institutionId: UUID | null;
}
export const createPatientRegisteredEvent = (
  patientId: UUID,
  actorId: UUID | null,
  payload: PatientRegisteredPayload,
  opts?: { correlationId?: UUID; idempotencyKey?: string; clock?: () => Date },
) =>
  createPatientEvent(
    {
      type: 'PatientRegistered' as const,
      aggregateId: patientId,
      actorId,
      payload,
      ...(opts?.correlationId !== undefined ? { correlationId: opts.correlationId } : {}),
      ...(opts?.idempotencyKey !== undefined ? { idempotencyKey: opts.idempotencyKey } : {}),
    },
    opts?.clock,
  );

// ---------- PatientUpdated ----------
export interface PatientUpdatedPayload {
  readonly changedFields: readonly string[];
}
export const createPatientUpdatedEvent = (
  patientId: UUID,
  actorId: UUID | null,
  payload: PatientUpdatedPayload,
  opts?: { correlationId?: UUID; clock?: () => Date },
) =>
  createPatientEvent(
    {
      type: 'PatientUpdated' as const,
      aggregateId: patientId,
      actorId,
      payload,
      ...(opts?.correlationId !== undefined ? { correlationId: opts.correlationId } : {}),
    },
    opts?.clock,
  );

// ---------- PatientInactivated ----------
export interface PatientInactivatedPayload {
  readonly reason: string;
}
export const createPatientInactivatedEvent = (
  patientId: UUID,
  actorId: UUID | null,
  payload: PatientInactivatedPayload,
  opts?: { clock?: () => Date },
) =>
  createPatientEvent(
    { type: 'PatientInactivated' as const, aggregateId: patientId, actorId, payload },
    opts?.clock,
  );

// ---------- PatientContactAdded (PAT-007/008) ----------
export interface PatientContactAddedPayload {
  readonly contactId: UUID;
  readonly name: string;
  readonly isEmergency: boolean;
}
export const createPatientContactAddedEvent = (
  patientId: UUID,
  actorId: UUID | null,
  payload: PatientContactAddedPayload,
  opts?: { clock?: () => Date },
) =>
  createPatientEvent(
    { type: 'PatientContactAdded' as const, aggregateId: patientId, actorId, payload },
    opts?.clock,
  );

// ---------- PatientAllergyRecorded / StatusChanged (PAT-009/010) ----------
export interface PatientAllergyRecordedPayload {
  readonly allergyId: UUID;
  readonly substance: string;
  readonly severity: AllergySeverity;
}
export const createPatientAllergyRecordedEvent = (
  patientId: UUID,
  actorId: UUID | null,
  payload: PatientAllergyRecordedPayload,
  opts?: { clock?: () => Date },
) =>
  createPatientEvent(
    { type: 'PatientAllergyRecorded' as const, aggregateId: patientId, actorId, payload },
    opts?.clock,
  );

export interface PatientAllergyStatusChangedPayload {
  readonly allergyId: UUID;
  readonly fromStatus: AllergyStatus;
  readonly toStatus: AllergyStatus;
}
export const createPatientAllergyStatusChangedEvent = (
  patientId: UUID,
  actorId: UUID | null,
  payload: PatientAllergyStatusChangedPayload,
  opts?: { clock?: () => Date },
) =>
  createPatientEvent(
    {
      type: 'PatientAllergyStatusChanged' as const,
      aggregateId: patientId,
      actorId,
      payload,
    },
    opts?.clock,
  );

// ---------- PatientAntecedentRecorded (PAT-011) ----------
export interface PatientAntecedentRecordedPayload {
  readonly antecedentId: UUID;
  readonly description: string;
}
export const createPatientAntecedentRecordedEvent = (
  patientId: UUID,
  actorId: UUID | null,
  payload: PatientAntecedentRecordedPayload,
  opts?: { clock?: () => Date },
) =>
  createPatientEvent(
    { type: 'PatientAntecedentRecorded' as const, aggregateId: patientId, actorId, payload },
    opts?.clock,
  );

// ---------- PatientContinuousMedicationRecorded (PAT-012) ----------
export interface PatientContinuousMedicationRecordedPayload {
  readonly medicationId: UUID;
  readonly medication: string;
}
export const createPatientContinuousMedicationRecordedEvent = (
  patientId: UUID,
  actorId: UUID | null,
  payload: PatientContinuousMedicationRecordedPayload,
  opts?: { clock?: () => Date },
) =>
  createPatientEvent(
    {
      type: 'PatientContinuousMedicationRecorded' as const,
      aggregateId: patientId,
      actorId,
      payload,
    },
    opts?.clock,
  );

// ---------- PatientActiveProblemRecorded / Resolved (PAT-013) ----------
export interface PatientActiveProblemRecordedPayload {
  readonly problemId: UUID;
  readonly description: string;
}
export const createPatientActiveProblemRecordedEvent = (
  patientId: UUID,
  actorId: UUID | null,
  payload: PatientActiveProblemRecordedPayload,
  opts?: { clock?: () => Date },
) =>
  createPatientEvent(
    {
      type: 'PatientActiveProblemRecorded' as const,
      aggregateId: patientId,
      actorId,
      payload,
    },
    opts?.clock,
  );

export interface PatientActiveProblemResolvedPayload {
  readonly problemId: UUID;
}
export const createPatientActiveProblemResolvedEvent = (
  patientId: UUID,
  actorId: UUID | null,
  payload: PatientActiveProblemResolvedPayload,
  opts?: { clock?: () => Date },
) =>
  createPatientEvent(
    {
      type: 'PatientActiveProblemResolved' as const,
      aggregateId: patientId,
      actorId,
      payload,
    },
    opts?.clock,
  );

// ---------- PatientDuplicateDetected (PAT-015) ----------
export interface PatientDuplicateDetectedPayload {
  readonly candidatePatientId: UUID;
  readonly matchStrength: DuplicateMatchStrength;
  readonly matchReason: string;
}
export const createPatientDuplicateDetectedEvent = (
  patientId: UUID,
  actorId: UUID | null,
  payload: PatientDuplicateDetectedPayload,
  opts?: { clock?: () => Date },
) =>
  createPatientEvent(
    { type: 'PatientDuplicateDetected' as const, aggregateId: patientId, actorId, payload },
    opts?.clock,
  );

// ---------- PatientMergeRequested / Reviewed (PAT-016) ----------
export interface PatientMergeRequestedPayload {
  readonly mergeRequestId: UUID;
  readonly targetPatientId: UUID;
  readonly reason: string;
}
export const createPatientMergeRequestedEvent = (
  sourcePatientId: UUID,
  actorId: UUID | null,
  payload: PatientMergeRequestedPayload,
  opts?: { clock?: () => Date },
) =>
  createPatientEvent(
    { type: 'PatientMergeRequested' as const, aggregateId: sourcePatientId, actorId, payload },
    opts?.clock,
  );

export interface PatientMergeReviewedPayload {
  readonly mergeRequestId: UUID;
  readonly status: Extract<MergeRequestStatus, 'approved' | 'rejected'>;
  readonly reviewNotes: string | null;
}
export const createPatientMergeReviewedEvent = (
  sourcePatientId: UUID,
  actorId: UUID | null,
  payload: PatientMergeReviewedPayload,
  opts?: { clock?: () => Date },
) =>
  createPatientEvent(
    { type: 'PatientMergeReviewed' as const, aggregateId: sourcePatientId, actorId, payload },
    opts?.clock,
  );
