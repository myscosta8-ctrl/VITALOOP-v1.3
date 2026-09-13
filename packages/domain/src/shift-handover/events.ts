import type { UUID } from '@vitaloop/shared';
import type { DomainEvent } from '../domain-event.js';
import { createDomainEvent } from '../domain-event.js';
import type { ShiftHandover } from './types.js';

export interface ShiftHandoverRecordedPayload {
  handoverId: UUID;
  sectorId: UUID | null;
  shiftPeriod: string;
  outgoingProfessionalId: UUID;
}

export function createShiftHandoverRecordedEvent(
  handover: ShiftHandover,
  correlationId?: UUID,
): DomainEvent<string, ShiftHandoverRecordedPayload> {
  return createDomainEvent({
    type: 'ShiftHandoverRecorded',
    aggregateType: 'shift_handover',
    aggregateId: handover.id as UUID,
    actorId: handover.outgoingProfessionalId as UUID,
    payload: {
      handoverId: handover.id as UUID,
      sectorId: (handover.sectorId as UUID) ?? null,
      shiftPeriod: handover.shiftPeriod,
      outgoingProfessionalId: handover.outgoingProfessionalId as UUID,
    },
    ...(correlationId !== undefined ? { correlationId } : {}),
  });
}
