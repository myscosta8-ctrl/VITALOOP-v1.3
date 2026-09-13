import type { UUID } from '@vitaloop/shared';
import type { DomainEvent } from '../domain-event.js';
import { createDomainEvent } from '../domain-event.js';
import type { ControlledMedicationDispensation } from './types.js';

export interface ControlledMedicationDispensedPayload {
  dispensationId: UUID;
  encounterId: UUID;
  patientId: UUID;
  controlledClass: string;
  dispensedBy: UUID;
}

export function createControlledMedicationDispensedEvent(
  dispensation: ControlledMedicationDispensation,
  correlationId?: UUID,
): DomainEvent<string, ControlledMedicationDispensedPayload> {
  return createDomainEvent({
    type: 'ControlledMedicationDispensed',
    aggregateType: 'controlled_medication_dispensation',
    aggregateId: dispensation.id as UUID,
    actorId: dispensation.dispensedBy as UUID,
    payload: {
      dispensationId: dispensation.id as UUID,
      encounterId: dispensation.encounterId as UUID,
      patientId: dispensation.patientId as UUID,
      controlledClass: dispensation.controlledClass,
      dispensedBy: dispensation.dispensedBy as UUID,
    },
    ...(correlationId !== undefined ? { correlationId } : {}),
  });
}
