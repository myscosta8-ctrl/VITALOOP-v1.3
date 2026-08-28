import type { UUID } from '@vitaloop/shared';
import { createDomainEvent, type DomainEvent } from '../domain-event.js';
import type { EncounterDiagnosis } from './types.js';

export const createPatientDiagnosisRecordedEvent = (
  diagnosis: EncounterDiagnosis,
  actorId: UUID,
): DomainEvent =>
  createDomainEvent({
    type: 'PatientDiagnosisRecorded',
    aggregateType: 'encounter_diagnosis',
    aggregateId: diagnosis.id as UUID,
    actorId,
    payload: {
      consultationId: diagnosis.consultationId,
      encounterId: diagnosis.encounterId,
      patientId: diagnosis.patientId,
      doctorId: diagnosis.doctorId,
      cidCode: diagnosis.cidCode,
      diagnosisType: diagnosis.diagnosisType,
      status: diagnosis.status,
    },
  });

export const createPatientDiagnosisUpdatedEvent = (
  diagnosis: EncounterDiagnosis,
  actorId: UUID,
): DomainEvent =>
  createDomainEvent({
    type: 'PatientDiagnosisUpdated',
    aggregateType: 'encounter_diagnosis',
    aggregateId: diagnosis.id as UUID,
    actorId,
    payload: {
      consultationId: diagnosis.consultationId,
      encounterId: diagnosis.encounterId,
      patientId: diagnosis.patientId,
      doctorId: diagnosis.doctorId,
      cidCode: diagnosis.cidCode,
      diagnosisType: diagnosis.diagnosisType,
      status: diagnosis.status,
      notes: diagnosis.notes,
    },
  });
