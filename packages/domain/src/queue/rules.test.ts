import { describe, expect, it } from 'vitest';
import type { UUID } from '@vitaloop/shared';
import {
  createPatientCalledToRoomEvent,
  createPatientCallRepeatedEvent,
  createPatientMarkedAbsentEvent,
} from './events.js';
import {
  assertValidTicketStatusTransition,
  calculatePriorityScore,
  isWaitTimeExceeded,
  validateTicketCallInput,
  validateTicketEnqueueInput,
} from './rules.js';
import type { QueueTicket } from './types.js';

describe('Queue Domain Rules & Events', () => {
  describe('calculatePriorityScore', () => {
    it('calcula pontuação base por cor do Manchester (Red > Orange > Yellow > Green > Blue > Null)', () => {
      const redScore = calculatePriorityScore('red');
      const orangeScore = calculatePriorityScore('orange');
      const yellowScore = calculatePriorityScore('yellow');
      const greenScore = calculatePriorityScore('green');
      const blueScore = calculatePriorityScore('blue');
      const nullScore = calculatePriorityScore(null);

      expect(redScore).toBeGreaterThan(orangeScore);
      expect(orangeScore).toBeGreaterThan(yellowScore);
      expect(yellowScore).toBeGreaterThan(greenScore);
      expect(greenScore).toBeGreaterThan(blueScore);
      expect(blueScore).toBeGreaterThan(nullScore);
    });

    it('acrescenta pontos adicionais por minuto decorrido de espera', () => {
      const now = new Date('2026-08-21T12:30:00Z');
      const created20MinAgo = new Date('2026-08-21T12:10:00Z').toISOString();

      const scoreNow = calculatePriorityScore('yellow', now.toISOString(), now);
      const score20MinLater = calculatePriorityScore('yellow', created20MinAgo, now);

      expect(score20MinLater).toBe(scoreNow + 20);
    });
  });

  describe('isWaitTimeExceeded', () => {
    it('detecta tempo de espera excedido para Amarelo (target 60 min)', () => {
      const now = new Date('2026-08-21T13:00:00Z');
      const created70MinAgo = new Date('2026-08-21T11:50:00Z').toISOString();
      const created30MinAgo = new Date('2026-08-21T12:30:00Z').toISOString();

      expect(isWaitTimeExceeded('yellow', created70MinAgo, now)).toBe(true);
      expect(isWaitTimeExceeded('yellow', created30MinAgo, now)).toBe(false);
    });
  });

  describe('assertValidTicketStatusTransition', () => {
    it('permite transições válidas de estado do ticket', () => {
      expect(() => assertValidTicketStatusTransition('waiting', 'called')).not.toThrow();
      expect(() => assertValidTicketStatusTransition('called', 'called')).not.toThrow(); // rechamada
      expect(() => assertValidTicketStatusTransition('called', 'in_service')).not.toThrow();
      expect(() => assertValidTicketStatusTransition('called', 'absent')).not.toThrow();
      expect(() => assertValidTicketStatusTransition('in_service', 'finished')).not.toThrow();
    });

    it('rejeita transição de estado encerrado ou cancelado', () => {
      expect(() => assertValidTicketStatusTransition('finished', 'called')).toThrowError(/Transição inválida/);
      expect(() => assertValidTicketStatusTransition('canceled', 'waiting')).toThrowError(/Transição inválida/);
    });
  });

  describe('validateTicketEnqueueInput', () => {
    it('valida entrada de enfileiramento e calcula prioridade', () => {
      const validated = validateTicketEnqueueInput({
        queueId: 'q-1',
        encounterId: 'enc-1',
        patientId: 'pat-1',
        riskColor: 'yellow',
      });
      expect(validated.priorityScore).toBe(6000);
      expect(validated.formattedTicketNumber).toMatch(/SENHA-/);
    });

    it('rejeita enfileiramento sem IDs obrigatórios', () => {
      expect(() =>
        validateTicketEnqueueInput({
          queueId: '',
          encounterId: 'enc-1',
          patientId: 'pat-1',
        }),
      ).toThrowError(/obrigatórios para enfileiramento/);
    });
  });

  describe('validateTicketCallInput', () => {
    it('exige consultório/local não-vazio', () => {
      expect(() =>
        validateTicketCallInput({
          ticketId: 'tck-1',
          callRoom: '   ',
          calledByUserId: 'usr-1',
        }),
      ).toThrowError(/local\/consultório/);
    });
  });

  describe('Domain Events', () => {
    const mockActorId = '83ad7af3-c506-48be-b2a0-6fbd0bb6bf1b' as UUID;
    const mockTicket: QueueTicket = {
      id: 'tck-123',
      queueId: 'q-123',
      encounterId: 'enc-123',
      patientId: 'pat-123',
      ticketNumber: 'SENHA-A01',
      priorityScore: 6000,
      riskColor: 'yellow',
      callRoom: 'Consultório 03',
      status: 'called',
      callCount: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    it('cria evento PatientCalledToRoom', () => {
      const ev = createPatientCalledToRoomEvent(mockTicket, mockActorId);
      expect(ev.type).toBe('PatientCalledToRoom');
      expect(ev.aggregateId).toBe('tck-123');
      expect((ev.payload as { callRoom: string }).callRoom).toBe('Consultório 03');
    });

    it('cria evento PatientCallRepeated', () => {
      const ev = createPatientCallRepeatedEvent({ ...mockTicket, callCount: 2 }, mockActorId);
      expect(ev.type).toBe('PatientCallRepeated');
      expect((ev.payload as { callCount: number }).callCount).toBe(2);
    });

    it('cria evento PatientMarkedAbsent', () => {
      const ev = createPatientMarkedAbsentEvent({ ...mockTicket, notes: 'Não respondeu 3 chamadas' }, mockActorId);
      expect(ev.type).toBe('PatientMarkedAbsent');
      expect((ev.payload as { notes: string }).notes).toBe('Não respondeu 3 chamadas');
    });
  });
});
