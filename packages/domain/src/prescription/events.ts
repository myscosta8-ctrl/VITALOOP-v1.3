import type { UUID } from '@vitaloop/shared';
import { createDomainEvent, type DomainEvent } from '../domain-event.js';
import type { Prescription } from './types.js';

export const createPrescriptionRecordedEvent = (
  prescription: Prescription,
  actorId: UUID,
): DomainEvent =>
  createDomainEvent({
    type: 'PrescriptionRecorded',
    aggregateType: 'prescription',
    aggregateId: prescription.id as UUID,
    actorId,
    payload: {
      consultationId: prescription.consultationId,
      encounterId: prescription.encounterId,
      patientId: prescription.patientId,
      doctorId: prescription.doctorId,
      status: prescription.status,
      itemCount: prescription.items ? prescription.items.length : 0,
    },
  });

export const createPrescriptionCanceledEvent = (
  prescriptionId: UUID,
  encounterId: UUID,
  patientId: UUID,
  cancelReason: string,
  actorId: UUID,
): DomainEvent =>
  createDomainEvent({
    type: 'PrescriptionCanceled',
    aggregateType: 'prescription',
    aggregateId: prescriptionId,
    actorId,
    payload: {
      encounterId,
      patientId,
      cancelReason,
    },
  });

export const createAllergyAlertOverriddenEvent = (
  prescriptionId: UUID,
  encounterId: UUID,
  patientId: UUID,
  allergen: string,
  overrideReason: string,
  actorId: UUID,
): DomainEvent =>
  createDomainEvent({
    type: 'AllergyAlertOverridden',
    aggregateType: 'allergy_alert',
    aggregateId: prescriptionId,
    actorId,
    payload: {
      encounterId,
      patientId,
      allergen,
      overrideReason,
    },
  });
