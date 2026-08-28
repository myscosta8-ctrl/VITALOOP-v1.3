import type { UUID } from '@vitaloop/shared';
import { createDomainEvent, type DomainEvent } from '../domain-event.js';
import type { EncounterOutcome, EncounterSummary, OutcomeType } from './types.js';

export const createOutcomeRecordedEvent = (outcome: EncounterOutcome, actorId: UUID): DomainEvent =>
  createDomainEvent({
    type: 'OutcomeRecorded',
    aggregateType: 'encounter_outcome',
    aggregateId: outcome.id as UUID,
    actorId,
    payload: {
      encounterId: outcome.encounterId,
      patientId: outcome.patientId,
      doctorId: outcome.doctorId,
      outcomeType: outcome.outcomeType,
      destinationUnit: outcome.destinationUnit,
    },
  });

export const createOutcomeEncounterClosedEvent = (
  encounterId: UUID,
  patientId: UUID,
  outcomeType: OutcomeType,
  actorId: UUID,
): DomainEvent =>
  createDomainEvent({
    type: 'EncounterClosed',
    aggregateType: 'encounter',
    aggregateId: encounterId,
    actorId,
    payload: {
      patientId,
      outcomeType,
    },
  });

export const createSummaryGeneratedEvent = (summary: EncounterSummary, actorId: UUID): DomainEvent =>
  createDomainEvent({
    type: 'SummaryGenerated',
    aggregateType: 'encounter_summary',
    aggregateId: summary.id as UUID,
    actorId,
    payload: {
      outcomeId: summary.outcomeId,
      encounterId: summary.encounterId,
      patientId: summary.patientId,
      primaryDiagnosisCode: summary.primaryDiagnosisCode,
    },
  });
