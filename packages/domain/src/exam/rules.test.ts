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
  assertExamStatusAllowsCollection,
  assertExamStatusAllowsResult,
  assertProcedureStatusAllowsExecution,
  assertProcedureStatusAllowsStart,
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

  describe('Bloco 7 — separação solicitação x execução / rejeição de execução duplicada', () => {
    it('exame: coleta só é permitida em status "requested" (item 4/5 do Bloco 7)', () => {
      expect(() => assertExamStatusAllowsCollection('requested')).not.toThrow();
      expect(() => assertExamStatusAllowsCollection('collected')).toThrow(/já está em status 'collected'|não 'requested'/);
      expect(() => assertExamStatusAllowsCollection('completed')).toThrow();
      expect(() => assertExamStatusAllowsCollection('canceled')).toThrow();
    });

    it('exame: resultado pode ser lançado em requested/collected/in_analysis, nunca depois de completed/canceled (item 5/6)', () => {
      expect(() => assertExamStatusAllowsResult('requested')).not.toThrow();
      expect(() => assertExamStatusAllowsResult('collected')).not.toThrow();
      expect(() => assertExamStatusAllowsResult('in_analysis')).not.toThrow();
      expect(() => assertExamStatusAllowsResult('completed')).toThrow(/EXAM_INVALID_STATUS_FOR_RESULT|já está em status/);
      expect(() => assertExamStatusAllowsResult('canceled')).toThrow();
    });

    it('procedimento: início de execução só é permitido em "requested" (item 4/5)', () => {
      expect(() => assertProcedureStatusAllowsStart('requested')).not.toThrow();
      expect(() => assertProcedureStatusAllowsStart('in_progress')).toThrow();
      expect(() => assertProcedureStatusAllowsStart('completed')).toThrow();
    });

    it('procedimento: execução duplicada (já completed) é rejeitada — item 6 do Bloco 7 ("execução duplicada é rejeitada")', () => {
      expect(() => assertProcedureStatusAllowsExecution('requested')).not.toThrow();
      expect(() => assertProcedureStatusAllowsExecution('in_progress')).not.toThrow();
      expect(() => assertProcedureStatusAllowsExecution('completed')).toThrow(/PROCEDURE_INVALID_STATUS_FOR_EXECUTION|já está em status/);
      expect(() => assertProcedureStatusAllowsExecution('canceled')).toThrow();
    });
  });

  describe('Bloco 7.2 — solicitação de exame/procedimento diretamente do encaminhamento da Triagem (sem consulta médica)', () => {
    it('validateExamRequestInput aceita consultationId nulo (exceção: triagem → exame direto)', () => {
      const result = validateExamRequestInput({
        consultationId: null,
        encounterId: 'enc-1',
        patientId: 'pat-1',
        examName: 'Hemograma Completo',
        examType: 'laboratory',
        clinicalIndication: 'Encaminhado da Triagem para exame laboratorial',
      });

      expect(result.consultationId).toBeNull();
      expect(result.examName).toBe('Hemograma Completo');
    });

    it('validateExamRequestInput continua exigindo encounterId/patientId mesmo sem consulta', () => {
      expect(() =>
        validateExamRequestInput({
          consultationId: null,
          encounterId: '',
          patientId: 'pat-1',
          examName: 'Hemograma',
          clinicalIndication: 'Indicação válida com mais de 5 chars',
        }),
      ).toThrowError(/Atendimento e Paciente são obrigatórios/);
    });

    it('validateProcedureRequestInput aceita consultationId nulo (exceção: triagem → procedimento direto)', () => {
      const result = validateProcedureRequestInput({
        consultationId: null,
        encounterId: 'enc-1',
        patientId: 'pat-1',
        procedureName: 'Troca de curativo',
        instructions: 'Curativo em MSE conforme triagem',
      });

      expect(result.consultationId).toBeNull();
      expect(result.procedureName).toBe('Troca de curativo');
    });

    it('exame/procedimento nascido direto da triagem nunca é criado já "realizado" — status inicial é sempre "requested" (a validação de entrada não define status; quem insere sempre usa \'requested\')', () => {
      const exam = validateExamRequestInput({
        consultationId: null,
        encounterId: 'enc-1',
        patientId: 'pat-1',
        examName: 'Raio-X de Tórax',
        examType: 'imaging',
        clinicalIndication: 'Encaminhado da Triagem para exame de imagem',
      });
      // ExamRequestInput não tem campo `status` — reforça estruturalmente
      // que a validação de entrada não pode, por si só, marcar como
      // realizado; isso só acontece via assertExamStatusAllowsCollection/Result.
      expect('status' in exam).toBe(false);
    });
  });
});
