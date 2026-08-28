import { describe, it, expect } from 'vitest';
import {
  createPatientAllergyStatusChangedEvent,
  createPatientMergeRequestedEvent,
  createPatientRegisteredEvent,
} from './events.js';
import type { UUID } from '@vitaloop/shared';

const patientId = '11111111-1111-4111-8111-111111111111' as UUID;
const actorId = '22222222-2222-4222-8222-222222222222' as UUID;
const clock = () => new Date('2026-08-20T12:00:00.000Z');

describe('eventos de domínio do paciente — apenas fábricas puras, sem persistência (PAT-014/017)', () => {
  it('PatientRegistered carrega aggregateType=patient e payload correto', () => {
    const event = createPatientRegisteredEvent(
      patientId,
      actorId,
      {
        medicalRecordNumber: '2026000010',
        fullName: 'Maria Souza',
        cpf: null,
        cns: null,
        birthDate: null,
        sex: null,
        institutionId: null,
      },
      { clock },
    );
    expect(event.type).toBe('PatientRegistered');
    expect(event.aggregateType).toBe('patient');
    expect(event.aggregateId).toBe(patientId);
    expect(event.actorId).toBe(actorId);
    expect(event.occurredAt).toBe('2026-08-20T12:00:00.000Z');
    expect(event.payload.medicalRecordNumber).toBe('2026000010');
    expect(event.schemaVersion).toBe(1);
  });

  it('PatientAllergyStatusChanged registra transição active->resolved (mesmo cenário do T5 real no banco)', () => {
    const event = createPatientAllergyStatusChangedEvent(
      patientId,
      actorId,
      { allergyId: patientId, fromStatus: 'active', toStatus: 'resolved' },
      { clock },
    );
    expect(event.payload.fromStatus).toBe('active');
    expect(event.payload.toStatus).toBe('resolved');
  });

  it('PatientMergeRequested usa o paciente de ORIGEM como aggregateId', () => {
    const targetId = '33333333-3333-4333-8333-333333333333' as UUID;
    const event = createPatientMergeRequestedEvent(
      patientId,
      actorId,
      { mergeRequestId: patientId, targetPatientId: targetId, reason: 'Duplicidade confirmada' },
      { clock },
    );
    expect(event.aggregateId).toBe(patientId);
    expect(event.payload.targetPatientId).toBe(targetId);
  });

  it('eventId é gerado (UUID) e distinto entre chamadas', () => {
    const e1 = createPatientRegisteredEvent(
      patientId,
      actorId,
      {
        medicalRecordNumber: 'a',
        fullName: 'a',
        cpf: null,
        cns: null,
        birthDate: null,
        sex: null,
        institutionId: null,
      },
      { clock },
    );
    const e2 = createPatientRegisteredEvent(
      patientId,
      actorId,
      {
        medicalRecordNumber: 'a',
        fullName: 'a',
        cpf: null,
        cns: null,
        birthDate: null,
        sex: null,
        institutionId: null,
      },
      { clock },
    );
    expect(e1.eventId).not.toBe(e2.eventId);
  });
});
