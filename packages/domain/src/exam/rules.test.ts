import { describe, expect, it } from 'vitest';
import type { UUID } from '@vitaloop/shared';
import {
  createExamRequestedEvent,
  createExamResultRecordedEvent,
  createInterconsultationAnsweredEvent,
  createInterconsultationRequestedEvent,
  createProcedureCompletedEvent,
  createProcedureRequestedEvent,
} from './events.js';
import {
  validateExamRequestInput,
  validateExamResultInput,
  validateInterconsultationInput,
  validateInterconsultationResponseInput,
  validateProcedureExecuteInput,
  validateProcedureRequestInput,
} from './rules.js';
import type { ExamRequest, Interconsultation, ProcedureRequest } from './types.js';

describe('Exams, Procedures & Interconsultations Domain Rules & Events', () => {
  describe('validateExamRequestInput', () => {
    it('valida solicitacao de exame com indicacao clinica valida', () => {
      const result = validateExamRequestInput({
        consultationId: 'con-1',
        encounterId: 'enc-1',
        patientId: 'pat-1',
        examName: 'Hemograma Completo',
        examType: 'laboratory',
        clinicalIndication: 'Suspeita de infecção / síndrome febril',
      });

      expect(result.examName).toBe('Hemograma Completo');
      expect(result.clinicalIndication).toContain('infecção');
    });

    it('rejeita indicacao clinica vazia ou menor que 5 caracteres', () => {
      expect(() =>
        validateExamRequestInput({
          consultationId: 'con-1',
          encounterId: 'enc-1',
          patientId: 'pat-1',
          examName: 'Hemograma Completo',
          clinicalIndication: 'Dor',
        }),
      ).toThrowError(/Informe uma indicação clínica detalhada/);
    });
  });

  describe('validateExamResultInput', () => {
    it('valida resultado do exame com resumo', () => {
      const result = validateExamResultInput({
        examRequestId: 'req-1',
        resultSummary: 'Leucocitose com desvio à esquerda',
      });

      expect(result.resultSummary).toBe('Leucocitose com desvio à esquerda');
    });
  });

  describe('validateProcedureRequestInput & Execute', () => {
    it('valida solicitação de procedimento ambulatorial', () => {
      const result = validateProcedureRequestInput({
        consultationId: 'con-1',
        encounterId: 'enc-1',
        patientId: 'pat-1',
        procedureName: 'Sutura de Ferimento Superficial',
        instructions: 'Sutura com fio nylon 4-0',
      });

      expect(result.procedureName).toBe('Sutura de Ferimento Superficial');
    });

    it('valida execucao de procedimento ambulatorial', () => {
      const result = validateProcedureExecuteInput({
        procedureRequestId: 'pro-1',
        notes: 'Executado sem intercorrências',
      });

      expect(result.procedureRequestId).toBe('pro-1');
    });
  });

  describe('validateInterconsultationInput & Response', () => {
    it('valida solicitação de interconsulta especializada', () => {
      const result = validateInterconsultationInput({
        consultationId: 'con-1',
        encounterId: 'enc-1',
        patientId: 'pat-1',
        specialty: 'Cardiologia',
        priority: 'urgent',
        clinicalSummary: 'Paciente com dor torácica atípica e alteração de repolarização no ECG',
        question: 'Avaliação de necessidade de cineangiocoronariografia urgente',
      });

      expect(result.specialty).toBe('Cardiologia');
      expect(result.priority).toBe('urgent');
    });

    it('rejeita resposta de parecer sem justificativa técnica mínima (10 caracteres)', () => {
      expect(() =>
        validateInterconsultationResponseInput({
          interconsultationId: 'int-1',
          responseNotes: 'Ok',
        }),
      ).toThrowError(/parecer técnico completo/);
    });
  });

  describe('Domain Events', () => {
    const mockActorId = '83ad7af3-c506-48be-b2a0-6fbd0bb6bf1b' as UUID;

    const mockExam: ExamRequest = {
      id: 'exa-1',
      consultationId: 'con-1',
      encounterId: 'enc-1',
      patientId: 'pat-1',
      requestedBy: mockActorId,
      examName: 'Raio-X de Tórax AP/Perfil',
      examType: 'imaging',
      clinicalIndication: 'Tosse persistente e febre',
      status: 'requested',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const mockProcedure: ProcedureRequest = {
      id: 'pro-1',
      consultationId: 'con-1',
      encounterId: 'enc-1',
      patientId: 'pat-1',
      requestedBy: mockActorId,
      procedureName: 'Nebulização Contínua',
      status: 'requested',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const mockInterconsultation: Interconsultation = {
      id: 'int-1',
      consultationId: 'con-1',
      encounterId: 'enc-1',
      patientId: 'pat-1',
      requestedBy: mockActorId,
      specialty: 'Ortopedia',
      priority: 'routine',
      clinicalSummary: 'Entorse de tornozelo direito',
      question: 'Avaliação radiológica',
      status: 'requested',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    it('cria eventos ExamRequested e ExamResultRecorded', () => {
      const ev1 = createExamRequestedEvent(mockExam, mockActorId);
      expect(ev1.type).toBe('ExamRequested');

      const ev2 = createExamResultRecordedEvent({ ...mockExam, resultSummary: 'Normal' }, mockActorId);
      expect(ev2.type).toBe('ExamResultRecorded');
    });

    it('cria eventos ProcedureRequested e ProcedureCompleted', () => {
      const ev1 = createProcedureRequestedEvent(mockProcedure, mockActorId);
      expect(ev1.type).toBe('ProcedureRequested');

      const ev2 = createProcedureCompletedEvent({ ...mockProcedure, status: 'completed' }, mockActorId);
      expect(ev2.type).toBe('ProcedureCompleted');
    });

    it('cria eventos InterconsultationRequested e InterconsultationAnswered', () => {
      const ev1 = createInterconsultationRequestedEvent(mockInterconsultation, mockActorId);
      expect(ev1.type).toBe('InterconsultationRequested');

      const ev2 = createInterconsultationAnsweredEvent({ ...mockInterconsultation, status: 'answered' }, mockActorId);
      expect(ev2.type).toBe('InterconsultationAnswered');
    });
  });
});
