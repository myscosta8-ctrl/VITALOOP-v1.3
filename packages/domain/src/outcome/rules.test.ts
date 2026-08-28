import { describe, expect, it } from 'vitest';
import type { UUID } from '@vitaloop/shared';
import {
  createOutcomeEncounterClosedEvent,
  createOutcomeRecordedEvent,
  createSummaryGeneratedEvent,
} from './events.js';
import {
  determineTargetEncounterStatus,
  validateOutcomeCreateInput,
} from './rules.js';
import type { EncounterOutcome, EncounterSummary } from './types.js';

describe('Outcome Domain Rules & Events', () => {
  describe('determineTargetEncounterStatus', () => {
    it('retorna canceled apenas para evasao', () => {
      expect(determineTargetEncounterStatus('evasion')).toBe('canceled');
      expect(determineTargetEncounterStatus('medical_discharge')).toBe('completed');
      expect(determineTargetEncounterStatus('transfer')).toBe('completed');
      expect(determineTargetEncounterStatus('death')).toBe('completed');
    });
  });

  describe('validateOutcomeCreateInput', () => {
    it('valida alta médica quando possui consulta e diagnóstico principal ativo', () => {
      const result = validateOutcomeCreateInput({
        encounterId: 'enc-1',
        patientId: 'pat-1',
        consultationId: 'con-1',
        outcomeType: 'medical_discharge',
        hasPrimaryDiagnosis: true,
        dischargeInstructions: 'Retornar em 7 dias ou em caso de piora da febre.',
      });

      expect(result.outcomeType).toBe('medical_discharge');
      expect(result.dischargeInstructions).toContain('7 dias');
    });

    it('bloqueia alta médica se paciente NAO possuir Diagnostico Principal ativo', () => {
      expect(() =>
        validateOutcomeCreateInput({
          encounterId: 'enc-1',
          patientId: 'pat-1',
          consultationId: 'con-1',
          outcomeType: 'medical_discharge',
          hasPrimaryDiagnosis: false,
        }),
      ).toThrowError(/Regra Clínica: A concessão de alta médica exige pelo menos um Diagnóstico Principal/);
    });

    it('exige unidade de destino para transferencia externa', () => {
      expect(() =>
        validateOutcomeCreateInput({
          encounterId: 'enc-1',
          patientId: 'pat-1',
          outcomeType: 'transfer',
          destinationUnit: '   ',
        }),
      ).toThrowError(/A transferência externa exige a indicação da unidade hospitalar de destino/);
    });

    it('exige justificativa em notes para alta a pedido (min 10 caracteres)', () => {
      expect(() =>
        validateOutcomeCreateInput({
          encounterId: 'enc-1',
          patientId: 'pat-1',
          outcomeType: 'discharge_against_medical_advice',
          notes: 'Curto',
        }),
      ).toThrowError(/exige o registro detalhado da justificativa/);
    });

    it('exige data/hora e causa em notes para obito', () => {
      expect(() =>
        validateOutcomeCreateInput({
          encounterId: 'enc-1',
          patientId: 'pat-1',
          outcomeType: 'death',
          deathTimestamp: new Date().toISOString(),
          notes: '   ',
        }),
      ).toThrowError(/exige a descrição da causa mortis/);
    });
  });

  describe('Domain Events', () => {
    const mockActorId = '83ad7af3-c506-48be-b2a0-6fbd0bb6bf1b' as UUID;

    const mockOutcome: EncounterOutcome = {
      id: 'out-1',
      encounterId: 'enc-1',
      patientId: 'pat-1',
      consultationId: 'con-1',
      doctorId: mockActorId,
      outcomeType: 'medical_discharge',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const mockSummary: EncounterSummary = {
      id: 'sum-1',
      outcomeId: 'out-1',
      encounterId: 'enc-1',
      patientId: 'pat-1',
      doctorId: mockActorId,
      primaryDiagnosisCode: 'J18.9',
      primaryDiagnosisDescription: 'Pneumonia não especificada',
      issuedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    it('cria eventos OutcomeRecorded, EncounterClosed e SummaryGenerated', () => {
      const ev1 = createOutcomeRecordedEvent(mockOutcome, mockActorId);
      expect(ev1.type).toBe('OutcomeRecorded');

      const ev2 = createOutcomeEncounterClosedEvent('enc-1' as UUID, 'pat-1' as UUID, 'medical_discharge', mockActorId);
      expect(ev2.type).toBe('EncounterClosed');

      const ev3 = createSummaryGeneratedEvent(mockSummary, mockActorId);
      expect(ev3.type).toBe('SummaryGenerated');
    });
  });
});
