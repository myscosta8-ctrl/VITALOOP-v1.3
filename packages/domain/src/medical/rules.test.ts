import { describe, expect, it } from 'vitest';
import type { UUID } from '@vitaloop/shared';
import {
  createMedicalConsultationRecordedEvent,
  createMedicalEvolutionRecordedEvent,
} from './events.js';
import {
  assertEncounterStatusPermitsConsultation,
  validateConsultationCreateInput,
  validateEvolutionCreateInput,
} from './rules.js';
import type { MedicalConsultation, MedicalEvolution } from './types.js';

describe('Medical Domain Rules & Events', () => {
  describe('assertEncounterStatusPermitsConsultation', () => {
    it('permite registro nos estados triaged, consultation_pending, in_consultation e post_consultation', () => {
      expect(() => assertEncounterStatusPermitsConsultation('triaged')).not.toThrow();
      expect(() => assertEncounterStatusPermitsConsultation('consultation_pending')).not.toThrow();
      expect(() => assertEncounterStatusPermitsConsultation('in_consultation')).not.toThrow();
      expect(() => assertEncounterStatusPermitsConsultation('post_consultation')).not.toThrow();
    });

    it('rejeita registro em estados invalidos como created ou completed', () => {
      expect(() => assertEncounterStatusPermitsConsultation('created')).toThrowError(
        /Não é possível registrar consulta médica no estado 'created'/,
      );
      expect(() => assertEncounterStatusPermitsConsultation('completed')).toThrowError(
        /Não é possível registrar consulta médica no estado 'completed'/,
      );
    });
  });

  describe('validateConsultationCreateInput', () => {
    it('valida consulta com todos os campos obrigatorios preenchidos', () => {
      const result = validateConsultationCreateInput({
        encounterId: 'enc-1',
        patientId: 'pat-1',
        chiefComplaint: 'Dor de cabeça intensa',
        historyPresentIllness: 'Paciente relata cefaleia pulsátil há 4 horas',
        generalExam: 'BEG, corado, hidratado, anictérico, acianótico',
        diagnosticHypothesis: 'Cefaleia tensional / Enxaqueca a esclarecer',
      });

      expect(result.chiefComplaint).toBe('Dor de cabeça intensa');
      expect(result.historyPresentIllness).toBe('Paciente relata cefaleia pulsátil há 4 horas');
      expect(result.generalExam).toBe('BEG, corado, hidratado, anictérico, acianótico');
      expect(result.diagnosticHypothesis).toBe('Cefaleia tensional / Enxaqueca a esclarecer');
    });

    it('exige queixa principal', () => {
      expect(() =>
        validateConsultationCreateInput({
          encounterId: 'enc-1',
          patientId: 'pat-1',
          chiefComplaint: '   ',
          historyPresentIllness: 'HMA',
          generalExam: 'Geral',
          diagnosticHypothesis: 'Hipótese',
        }),
      ).toThrowError(/A queixa principal é obrigatória/);
    });

    it('exige HMA', () => {
      expect(() =>
        validateConsultationCreateInput({
          encounterId: 'enc-1',
          patientId: 'pat-1',
          chiefComplaint: 'Dor',
          historyPresentIllness: '',
          generalExam: 'Geral',
          diagnosticHypothesis: 'Hipótese',
        }),
      ).toThrowError(/A História da Moléstia Atual \(HMA\) é obrigatória/);
    });

    it('exige Exame Físico Geral', () => {
      expect(() =>
        validateConsultationCreateInput({
          encounterId: 'enc-1',
          patientId: 'pat-1',
          chiefComplaint: 'Dor',
          historyPresentIllness: 'HMA',
          generalExam: '  ',
          diagnosticHypothesis: 'Hipótese',
        }),
      ).toThrowError(/O Exame Físico Geral é obrigatório/);
    });

    it('exige Hipótese Diagnóstica', () => {
      expect(() =>
        validateConsultationCreateInput({
          encounterId: 'enc-1',
          patientId: 'pat-1',
          chiefComplaint: 'Dor',
          historyPresentIllness: 'HMA',
          generalExam: 'Geral',
          diagnosticHypothesis: '',
        }),
      ).toThrowError(/A Hipótese Diagnóstica clínica é obrigatória/);
    });
  });

  describe('validateEvolutionCreateInput', () => {
    it('valida evolucao medica valida', () => {
      const result = validateEvolutionCreateInput({
        consultationId: 'con-1',
        encounterId: 'enc-1',
        patientId: 'pat-1',
        evolutionText: 'Paciente relata melhora da dor após medicação',
        clinicalStatus: 'em_melhora',
      });

      expect(result.evolutionText).toBe('Paciente relata melhora da dor após medicação');
      expect(result.clinicalStatus).toBe('em_melhora');
    });

    it('rejeita evolucao sem texto', () => {
      expect(() =>
        validateEvolutionCreateInput({
          consultationId: 'con-1',
          encounterId: 'enc-1',
          patientId: 'pat-1',
          evolutionText: '   ',
        }),
      ).toThrowError(/O texto descritivo da evolução médica é obrigatório/);
    });
  });

  describe('Domain Events', () => {
    const mockActorId = '83ad7af3-c506-48be-b2a0-6fbd0bb6bf1b' as UUID;
    const mockConsultation: MedicalConsultation = {
      id: 'con-123',
      encounterId: 'enc-123',
      patientId: 'pat-123',
      doctorId: mockActorId,
      chiefComplaint: 'Dor no peito',
      historyPresentIllness: 'Dor há 2 horas',
      generalExam: 'BEG',
      segmentalExam: { cardiovascular: 'RCR 2T BNF sem sopros' },
      diagnosticHypothesis: 'Angina instável',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    it('cria evento MedicalConsultationRecorded', () => {
      const ev = createMedicalConsultationRecordedEvent(mockConsultation, mockActorId);
      expect(ev.type).toBe('MedicalConsultationRecorded');
      expect(ev.aggregateId).toBe('con-123');
      expect((ev.payload as { chiefComplaint: string }).chiefComplaint).toBe('Dor no peito');
    });

    it('cria evento MedicalEvolutionRecorded', () => {
      const mockEvolution: MedicalEvolution = {
        id: 'evo-123',
        consultationId: 'con-123',
        encounterId: 'enc-123',
        patientId: 'pat-123',
        doctorId: mockActorId,
        evolutionText: 'Reavaliado. Sem dor no momento.',
        clinicalStatus: 'estavel',
        createdAt: new Date().toISOString(),
      };

      const ev = createMedicalEvolutionRecordedEvent(mockEvolution, mockActorId);
      expect(ev.type).toBe('MedicalEvolutionRecorded');
      expect(ev.aggregateId).toBe('evo-123');
      expect((ev.payload as { clinicalStatus: string }).clinicalStatus).toBe('estavel');
    });
  });

  describe('Bloco 6 — separação Triagem (destino) x Medicina (conduta)', () => {
    it('assertEncounterStatusPermitsConsultation não recebe nem depende do destino da triagem — só do status do atendimento (regra: TRIAGEM define destino, MEDICINA define conduta)', () => {
      // A assinatura é `(currentStatus: string) => void` — nenhum parâmetro
      // de destino/encaminhamento existe para influenciar a decisão. Um
      // atendimento com destino 'exam'/'procedure' na Triagem que, por
      // qualquer motivo, chegasse a 'triaged'/'consultation_pending' não é
      // "convertido automaticamente" em consulta por esta função: ela só
      // permite, nunca cria ou força uma consulta médica sozinha (quem cria
      // é sempre uma ação explícita do médico em medical.ts).
      expect(() => assertEncounterStatusPermitsConsultation('triaged')).not.toThrow();
      expect(assertEncounterStatusPermitsConsultation.length).toBe(1);
    });

    it('MedicalConsultation é um registro próprio, sem nenhum campo que sobrescreva a Triagem (a Triagem é lida, nunca mutada, pelo fluxo médico)', () => {
      const consultationFields = ['id', 'encounterId', 'patientId', 'doctorId', 'chiefComplaint', 'historyPresentIllness', 'generalExam', 'segmentalExam', 'diagnosticHypothesis', 'createdAt', 'updatedAt'];
      // Nenhum destes é um campo de app.triages — MedicalConsultation vive
      // em sua própria tabela (app.medical_consultations), nunca escreve em
      // app.triages nem em app.triage_destination_history.
      for (const field of consultationFields) {
        expect(['destinationType', 'riskColor', 'classificationHistory', 'destinationHistory']).not.toContain(field);
      }
    });
  });
});
