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
});
