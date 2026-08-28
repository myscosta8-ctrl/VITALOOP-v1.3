import { createDomainEvent, type CreateEventInput, type DomainEvent } from '../domain-event.js';
import type { UUID } from '@vitaloop/shared';
import type { Encounter, EncounterStatus } from './types.js';

const AGGREGATE_TYPE = 'encounter';

type EncounterEventInput<TType extends string, TPayload> = Omit<
  CreateEventInput<TType, TPayload>,
  'aggregateType'
>;

const createEncounterEvent = <TType extends string, TPayload>(
  input: EncounterEventInput<TType, TPayload>,
): DomainEvent<TType, TPayload> => createDomainEvent({ ...input, aggregateType: AGGREGATE_TYPE });

export interface EncounterOpenedPayload {
  readonly encounterId: string;
  readonly patientId: string;
  readonly institutionId: string;
  readonly encounterType: string;
  readonly origin: string;
  readonly chiefComplaint: string;
}

export interface EncounterStatusChangedPayload {
  readonly encounterId: string;
  readonly patientId: string;
  readonly oldStatus: EncounterStatus;
  readonly newStatus: EncounterStatus;
  readonly cancelReason: string | null;
}

export interface EncounterClosedPayload {
  readonly encounterId: string;
  readonly patientId: string;
  readonly finalStatus: 'completed' | 'canceled';
  readonly cancelReason: string | null;
}

export const createEncounterOpenedEvent = (
  encounter: Encounter,
  actorId: UUID | null,
): DomainEvent<'EncounterOpened', EncounterOpenedPayload> => {
  return createEncounterEvent({
    type: 'EncounterOpened',
    aggregateId: encounter.id as UUID,
    actorId,
    payload: {
      encounterId: encounter.id,
      patientId: encounter.patientId,
      institutionId: encounter.institutionId,
      encounterType: encounter.encounterType,
      origin: encounter.origin,
      chiefComplaint: encounter.chiefComplaint,
    },
  });
};

export const createEncounterStatusChangedEvent = (
  encounter: Encounter,
  oldStatus: EncounterStatus,
  actorId: UUID | null,
): DomainEvent<'EncounterStatusChanged', EncounterStatusChangedPayload> => {
  return createEncounterEvent({
    type: 'EncounterStatusChanged',
    aggregateId: encounter.id as UUID,
    actorId,
    payload: {
      encounterId: encounter.id,
      patientId: encounter.patientId,
      oldStatus,
      newStatus: encounter.status,
      cancelReason: encounter.cancelReason ?? null,
    },
  });
};

export const createEncounterClosedEvent = (
  encounter: Encounter,
  actorId: UUID | null,
): DomainEvent<'EncounterClosed', EncounterClosedPayload> => {
  if (encounter.status !== 'completed' && encounter.status !== 'canceled') {
    throw new Error('Não é possível criar um evento EncounterClosed para um atendimento não encerrado.');
  }

  return createEncounterEvent({
    type: 'EncounterClosed',
    aggregateId: encounter.id as UUID,
    actorId,
    payload: {
      encounterId: encounter.id,
      patientId: encounter.patientId,
      finalStatus: encounter.status,
      cancelReason: encounter.cancelReason ?? null,
    },
  });
};
