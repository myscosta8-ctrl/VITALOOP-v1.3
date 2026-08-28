import type { UUID } from '@vitaloop/shared';
import { createDomainEvent, type DomainEvent } from '../domain-event.js';
import type { IncidentSeverity, IsolationType } from './types.js';

export function createAdverseEventReportedEvent(
  eventId: UUID,
  encounterId: UUID | null,
  patientId: UUID | null,
  reporterId: UUID | null,
  severity: IncidentSeverity,
  eventCategory: string,
): DomainEvent {
  return createDomainEvent({
    type: 'AdverseEventReported',
    aggregateType: 'adverse_event',
    aggregateId: eventId,
    actorId: reporterId,
    payload: {
      eventId,
      encounterId,
      patientId,
      reporterId,
      severity,
      eventCategory,
    },
  });
}

export function createPatientIsolationPrescribedEvent(
  isolationId: UUID,
  encounterId: UUID,
  patientId: UUID,
  prescribedBy: UUID,
  isolationType: IsolationType,
  reason: string,
): DomainEvent {
  return createDomainEvent({
    type: 'PatientIsolationPrescribed',
    aggregateType: 'patient_isolation',
    aggregateId: isolationId,
    actorId: prescribedBy,
    payload: {
      isolationId,
      encounterId,
      patientId,
      prescribedBy,
      isolationType,
      reason,
    },
  });
}

export function createPatientIsolationEndedEvent(
  isolationId: UUID,
  encounterId: UUID,
  patientId: UUID,
  endedBy: UUID,
): DomainEvent {
  return createDomainEvent({
    type: 'PatientIsolationEnded',
    aggregateType: 'patient_isolation',
    aggregateId: isolationId,
    actorId: endedBy,
    payload: {
      isolationId,
      encounterId,
      patientId,
      endedBy,
    },
  });
}
