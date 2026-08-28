import type { UUID } from '@vitaloop/shared';
import { createDomainEvent, type DomainEvent } from '../domain-event.js';
import type { NursingRecordType, MedicationScheduleStatus } from './types.js';

export function createNursingRecordCreatedEvent(
  recordId: UUID,
  encounterId: UUID,
  patientId: UUID,
  professionalId: UUID,
  recordType: NursingRecordType,
  contentSnippet: string,
): DomainEvent {
  const eventType = `Nursing${recordType.charAt(0).toUpperCase() + recordType.slice(1)}Recorded`;
  return createDomainEvent({
    type: eventType,
    aggregateType: 'nursing_record',
    aggregateId: recordId,
    actorId: professionalId,
    payload: {
      recordId,
      encounterId,
      patientId,
      professionalId,
      recordType,
      contentSnippet: contentSnippet.slice(0, 100),
    },
  });
}

export function createPrescriptionScheduledEvent(
  prescriptionId: UUID,
  encounterId: UUID,
  patientId: UUID,
  scheduledBy: UUID,
  totalSchedules: number,
): DomainEvent {
  return createDomainEvent({
    type: 'PrescriptionScheduled',
    aggregateType: 'prescription_schedule',
    aggregateId: prescriptionId,
    actorId: scheduledBy,
    payload: {
      prescriptionId,
      encounterId,
      patientId,
      scheduledBy,
      totalSchedules,
    },
  });
}

export function createMedicationAdministeredEvent(
  adminId: UUID,
  scheduleId: UUID,
  encounterId: UUID,
  patientId: UUID,
  executorId: UUID,
  status: MedicationScheduleStatus,
  nonAdminReason?: string | null,
): DomainEvent {
  const type = status === 'administered' ? 'MedicationAdministered' : 'MedicationAdministrationRefused';
  return createDomainEvent({
    type,
    aggregateType: 'medication_administration',
    aggregateId: adminId,
    actorId: executorId,
    payload: {
      adminId,
      scheduleId,
      encounterId,
      patientId,
      executorId,
      status,
      nonAdminReason: nonAdminReason ?? null,
    },
  });
}

export function createScaleAppliedEvent(
  evaluationId: UUID,
  encounterId: UUID,
  patientId: UUID,
  evaluatorId: UUID,
  scaleType: string,
  totalScore: number,
  riskLevel: string,
): DomainEvent {
  return createDomainEvent({
    type: 'ScaleApplied',
    aggregateType: 'nursing_scale_evaluation',
    aggregateId: evaluationId,
    actorId: evaluatorId,
    payload: {
      evaluationId,
      encounterId,
      patientId,
      evaluatorId,
      scaleType,
      totalScore,
      riskLevel,
    },
  });
}

export function createNursingSaeRecordedEvent(
  saeId: UUID,
  encounterId: UUID,
  patientId: UUID,
  nurseId: UUID,
  diagnosesCount: number,
  prescriptionsCount: number,
): DomainEvent {
  return createDomainEvent({
    type: 'NursingSaeRecorded',
    aggregateType: 'nursing_sae',
    aggregateId: saeId,
    actorId: nurseId,
    payload: {
      saeId,
      encounterId,
      patientId,
      nurseId,
      diagnosesCount,
      prescriptionsCount,
    },
  });
}

export function createFluidBalanceRecordedEvent(
  recordId: UUID,
  encounterId: UUID,
  patientId: UUID,
  recorderId: UUID,
  direction: string,
  fluidType: string,
  volumeMl: number,
): DomainEvent {
  return createDomainEvent({
    type: 'FluidBalanceRecorded',
    aggregateType: 'fluid_balance_record',
    aggregateId: recordId,
    actorId: recorderId,
    payload: {
      recordId,
      encounterId,
      patientId,
      recorderId,
      direction,
      fluidType,
      volumeMl,
    },
  });
}

export function createInvasiveDeviceInsertedEvent(
  deviceId: UUID,
  encounterId: UUID,
  patientId: UUID,
  inserterId: UUID,
  deviceType: string,
  anatomicalSite: string,
): DomainEvent {
  return createDomainEvent({
    type: 'InvasiveDeviceInserted',
    aggregateType: 'invasive_device',
    aggregateId: deviceId,
    actorId: inserterId,
    payload: {
      deviceId,
      encounterId,
      patientId,
      inserterId,
      deviceType,
      anatomicalSite,
    },
  });
}

export function createInvasiveDeviceRemovedEvent(
  deviceId: UUID,
  encounterId: UUID,
  patientId: UUID,
  removerId: UUID,
  removalReason: string,
): DomainEvent {
  return createDomainEvent({
    type: 'InvasiveDeviceRemoved',
    aggregateType: 'invasive_device',
    aggregateId: deviceId,
    actorId: removerId,
    payload: {
      deviceId,
      encounterId,
      patientId,
      removerId,
      removalReason,
    },
  });
}
