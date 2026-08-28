import type { UUID } from '@vitaloop/shared';
import { createDomainEvent, type DomainEvent } from '../domain-event.js';
import type { ExamRequest, Interconsultation, ProcedureRequest } from './types.js';

export const createExamRequestedEvent = (exam: ExamRequest, actorId: UUID): DomainEvent =>
  createDomainEvent({
    type: 'ExamRequested',
    aggregateType: 'exam_request',
    aggregateId: exam.id as UUID,
    actorId,
    payload: {
      consultationId: exam.consultationId,
      encounterId: exam.encounterId,
      patientId: exam.patientId,
      examName: exam.examName,
      examType: exam.examType,
      clinicalIndication: exam.clinicalIndication,
    },
  });

export const createExamResultRecordedEvent = (exam: ExamRequest, actorId: UUID): DomainEvent =>
  createDomainEvent({
    type: 'ExamResultRecorded',
    aggregateType: 'exam_request',
    aggregateId: exam.id as UUID,
    actorId,
    payload: {
      encounterId: exam.encounterId,
      patientId: exam.patientId,
      examName: exam.examName,
      resultSummary: exam.resultSummary,
    },
  });

export const createProcedureRequestedEvent = (procedure: ProcedureRequest, actorId: UUID): DomainEvent =>
  createDomainEvent({
    type: 'ProcedureRequested',
    aggregateType: 'procedure_request',
    aggregateId: procedure.id as UUID,
    actorId,
    payload: {
      consultationId: procedure.consultationId,
      encounterId: procedure.encounterId,
      patientId: procedure.patientId,
      procedureName: procedure.procedureName,
    },
  });

export const createProcedureCompletedEvent = (procedure: ProcedureRequest, actorId: UUID): DomainEvent =>
  createDomainEvent({
    type: 'ProcedureCompleted',
    aggregateType: 'procedure_request',
    aggregateId: procedure.id as UUID,
    actorId,
    payload: {
      encounterId: procedure.encounterId,
      patientId: procedure.patientId,
      procedureName: procedure.procedureName,
      performedBy: procedure.performedBy,
    },
  });

export const createInterconsultationRequestedEvent = (
  interconsultation: Interconsultation,
  actorId: UUID,
): DomainEvent =>
  createDomainEvent({
    type: 'InterconsultationRequested',
    aggregateType: 'interconsultation',
    aggregateId: interconsultation.id as UUID,
    actorId,
    payload: {
      consultationId: interconsultation.consultationId,
      encounterId: interconsultation.encounterId,
      patientId: interconsultation.patientId,
      specialty: interconsultation.specialty,
      priority: interconsultation.priority,
    },
  });

export const createInterconsultationAnsweredEvent = (
  interconsultation: Interconsultation,
  actorId: UUID,
): DomainEvent =>
  createDomainEvent({
    type: 'InterconsultationAnswered',
    aggregateType: 'interconsultation',
    aggregateId: interconsultation.id as UUID,
    actorId,
    payload: {
      encounterId: interconsultation.encounterId,
      patientId: interconsultation.patientId,
      specialty: interconsultation.specialty,
      respondedBy: interconsultation.respondedBy,
    },
  });
