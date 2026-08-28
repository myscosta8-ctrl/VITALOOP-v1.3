import type { UUID } from '@vitaloop/shared';
import type { DomainEvent } from '../domain-event.js';
import { createDomainEvent } from '../domain-event.js';

export interface PatientBedAssignedPayload {
  allocationId: UUID;
  bedId: UUID;
  sectorId: UUID;
  bedNumber: string;
  encounterId: UUID;
  patientId: UUID;
  allocatedBy: UUID;
  isExtra: boolean;
  regulationCode?: string | null | undefined;
}

export interface PatientBedTransferredPayload {
  allocationId: UUID;
  sourceBedId: UUID;
  targetBedId: UUID;
  encounterId: UUID;
  patientId: UUID;
  transferredBy: UUID;
  transferReason: string;
}

export interface PatientBedDischargedPayload {
  allocationId: UUID;
  bedId: UUID;
  encounterId: UUID;
  patientId: UUID;
  dischargedBy: UUID;
  nextBedStatus: 'cleaning';
}

export function createPatientBedAssignedEvent(
  payload: PatientBedAssignedPayload,
  correlationId?: UUID,
): DomainEvent<string, PatientBedAssignedPayload> {
  return createDomainEvent({
    type: 'PatientBedAssigned',
    aggregateType: 'bed_allocation',
    aggregateId: payload.allocationId,
    actorId: payload.allocatedBy,
    payload,
    ...(correlationId !== undefined ? { correlationId } : {}),
  });
}

export function createPatientBedTransferredEvent(
  payload: PatientBedTransferredPayload,
  correlationId?: UUID,
): DomainEvent<string, PatientBedTransferredPayload> {
  return createDomainEvent({
    type: 'PatientBedTransferred',
    aggregateType: 'bed_allocation',
    aggregateId: payload.allocationId,
    actorId: payload.transferredBy,
    payload,
    ...(correlationId !== undefined ? { correlationId } : {}),
  });
}

export function createPatientBedDischargedEvent(
  payload: PatientBedDischargedPayload,
  correlationId?: UUID,
): DomainEvent<string, PatientBedDischargedPayload> {
  return createDomainEvent({
    type: 'PatientBedDischarged',
    aggregateType: 'bed_allocation',
    aggregateId: payload.allocationId,
    actorId: payload.dischargedBy,
    payload,
    ...(correlationId !== undefined ? { correlationId } : {}),
  });
}
