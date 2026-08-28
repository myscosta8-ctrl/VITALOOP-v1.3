import type { UUID } from '@vitaloop/shared';
import { createDomainEvent, type DomainEvent } from '../domain-event.js';
import type { QueueTicket } from './types.js';

export const createPatientCalledToRoomEvent = (ticket: QueueTicket, actorId: UUID): DomainEvent =>
  createDomainEvent({
    type: 'PatientCalledToRoom',
    aggregateType: 'queue_ticket',
    aggregateId: ticket.id as UUID,
    actorId,
    payload: {
      encounterId: ticket.encounterId,
      patientId: ticket.patientId,
      queueId: ticket.queueId,
      ticketNumber: ticket.ticketNumber,
      callRoom: ticket.callRoom,
      riskColor: ticket.riskColor,
      callCount: ticket.callCount,
    },
  });

export const createPatientCallRepeatedEvent = (ticket: QueueTicket, actorId: UUID): DomainEvent =>
  createDomainEvent({
    type: 'PatientCallRepeated',
    aggregateType: 'queue_ticket',
    aggregateId: ticket.id as UUID,
    actorId,
    payload: {
      encounterId: ticket.encounterId,
      patientId: ticket.patientId,
      queueId: ticket.queueId,
      ticketNumber: ticket.ticketNumber,
      callRoom: ticket.callRoom,
      callCount: ticket.callCount,
    },
  });

export const createPatientMarkedAbsentEvent = (ticket: QueueTicket, actorId: UUID): DomainEvent =>
  createDomainEvent({
    type: 'PatientMarkedAbsent',
    aggregateType: 'queue_ticket',
    aggregateId: ticket.id as UUID,
    actorId,
    payload: {
      encounterId: ticket.encounterId,
      patientId: ticket.patientId,
      queueId: ticket.queueId,
      ticketNumber: ticket.ticketNumber,
      notes: ticket.notes,
    },
  });

export const createPatientEnteredConsultationEvent = (ticket: QueueTicket, actorId: UUID): DomainEvent =>
  createDomainEvent({
    type: 'PatientEnteredConsultation',
    aggregateType: 'queue_ticket',
    aggregateId: ticket.id as UUID,
    actorId,
    payload: {
      encounterId: ticket.encounterId,
      patientId: ticket.patientId,
      queueId: ticket.queueId,
      ticketNumber: ticket.ticketNumber,
      callRoom: ticket.callRoom,
    },
  });
