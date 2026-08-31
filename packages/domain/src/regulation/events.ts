import type { UUID } from '@vitaloop/shared';
import type { DomainEvent } from '../domain-event.js';
import type { RegulationPriority, TransportType, RegulationStatus } from './types.js';

export interface ExternalRegulationRequestedPayload {
  regulationId: UUID;
  encounterId: UUID;
  patientId: UUID;
  requesterId: UUID;
  destinationFacility: string;
  specialty: string;
  priority: RegulationPriority;
  transportType: TransportType;
}

export type ExternalRegulationRequestedEvent = DomainEvent<'ExternalRegulationRequested', ExternalRegulationRequestedPayload>;

export interface ExternalRegulationStatusUpdatedPayload {
  regulationId: UUID;
  encounterId: UUID;
  patientId: UUID;
  previousStatus: RegulationStatus;
  newStatus: RegulationStatus;
  updatedBy: UUID;
}

export type ExternalRegulationStatusUpdatedEvent = DomainEvent<'ExternalRegulationStatusUpdated', ExternalRegulationStatusUpdatedPayload>;
