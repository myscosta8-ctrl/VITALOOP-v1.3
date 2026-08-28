import type { UUID } from '@vitaloop/shared';
import { createDomainEvent, type DomainEvent } from '../domain-event.js';
import type { MedicalConsultation, MedicalEvolution } from './types.js';

export const createMedicalConsultationRecordedEvent = (
  consultation: MedicalConsultation,
  actorId: UUID,
): DomainEvent =>
  createDomainEvent({
    type: 'MedicalConsultationRecorded',
    aggregateType: 'medical_consultation',
    aggregateId: consultation.id as UUID,
    actorId,
    payload: {
      encounterId: consultation.encounterId,
      patientId: consultation.patientId,
      doctorId: consultation.doctorId,
      chiefComplaint: consultation.chiefComplaint,
      diagnosticHypothesis: consultation.diagnosticHypothesis,
    },
  });

export const createMedicalEvolutionRecordedEvent = (
  evolution: MedicalEvolution,
  actorId: UUID,
): DomainEvent =>
  createDomainEvent({
    type: 'MedicalEvolutionRecorded',
    aggregateType: 'medical_evolution',
    aggregateId: evolution.id as UUID,
    actorId,
    payload: {
      consultationId: evolution.consultationId,
      encounterId: evolution.encounterId,
      patientId: evolution.patientId,
      doctorId: evolution.doctorId,
      clinicalStatus: evolution.clinicalStatus,
    },
  });
