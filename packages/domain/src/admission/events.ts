import type { UUID } from '@vitaloop/shared';
import type { DomainEvent } from '../domain-event.js';
import { createDomainEvent } from '../domain-event.js';

export interface PatientAdmittedPayload {
  admissionId: UUID;
  encounterId: UUID;
  patientId: UUID;
  admittingDoctorId: UUID;
  admissionDiagnosisCode?: string | null | undefined;
  admissionDiagnosisDescription: string;
}

export interface AdmissionUpdatedPayload {
  admissionId: UUID;
  encounterId: UUID;
  patientId: UUID;
  updatedBy: UUID;
}

export interface PatientDischargedFromAdmissionPayload {
  admissionId: UUID;
  encounterId: UUID;
  patientId: UUID;
  dischargedBy: UUID;
  status: 'discharged' | 'transferred_out' | 'deceased';
}

export function createPatientAdmittedEvent(
  payload: PatientAdmittedPayload,
  correlationId?: UUID,
): DomainEvent<string, PatientAdmittedPayload> {
  return createDomainEvent({
    type: 'PatientAdmitted',
    aggregateType: 'admission',
    aggregateId: payload.admissionId,
    actorId: payload.admittingDoctorId,
    payload,
    ...(correlationId !== undefined ? { correlationId } : {}),
  });
}

export function createAdmissionUpdatedEvent(
  payload: AdmissionUpdatedPayload,
  correlationId?: UUID,
): DomainEvent<string, AdmissionUpdatedPayload> {
  return createDomainEvent({
    type: 'AdmissionUpdated',
    aggregateType: 'admission',
    aggregateId: payload.admissionId,
    actorId: payload.updatedBy,
    payload,
    ...(correlationId !== undefined ? { correlationId } : {}),
  });
}

export function createPatientDischargedFromAdmissionEvent(
  payload: PatientDischargedFromAdmissionPayload,
  correlationId?: UUID,
): DomainEvent<string, PatientDischargedFromAdmissionPayload> {
  return createDomainEvent({
    type: 'PatientDischargedFromAdmission',
    aggregateType: 'admission',
    aggregateId: payload.admissionId,
    actorId: payload.dischargedBy,
    payload,
    ...(correlationId !== undefined ? { correlationId } : {}),
  });
}
