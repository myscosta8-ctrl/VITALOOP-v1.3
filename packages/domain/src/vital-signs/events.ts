import type { UUID } from '@vitaloop/shared';
import type { DomainEvent } from '../domain-event.js';
import { createDomainEvent } from '../domain-event.js';
import type { VitalSignsReading } from './types.js';

export interface VitalSignsRecordedPayload {
  readingId: UUID;
  encounterId: UUID;
  patientId: UUID;
  source: VitalSignsReading['source'];
  recordedBy: UUID;
}

export function createVitalSignsRecordedEvent(
  reading: VitalSignsReading,
  correlationId?: UUID,
): DomainEvent<string, VitalSignsRecordedPayload> {
  return createDomainEvent({
    type: 'VitalSignsRecorded',
    aggregateType: 'vital_signs_reading',
    aggregateId: reading.id as UUID,
    actorId: reading.recordedBy as UUID,
    payload: {
      readingId: reading.id as UUID,
      encounterId: reading.encounterId as UUID,
      patientId: reading.patientId as UUID,
      source: reading.source,
      recordedBy: reading.recordedBy as UUID,
    },
    ...(correlationId !== undefined ? { correlationId } : {}),
  });
}
