import { describe, expect, it } from 'vitest';
import type { UUID } from '@vitaloop/shared';
import {
  createPatientRiskClassifiedEvent,
  createRiskReclassifiedEvent,
  createTriageRecordedEvent,
} from './events.js';
import {
  deriveManchesterTargetAndPriority,
  validateCapillaryGlucose,
  validateGlasgowScore,
  validatePainScore,
  validateTriageCreateInput,
  validateTriageReclassifyInput,
  validateVitalSigns,
} from './rules.js';
import type { Triage } from './types.js';

describe('Triage Domain Rules & Events', () => {
  describe('deriveManchesterTargetAndPriority', () => {
    it('retorna tempo-alvo e prioridade corretos para Vermelho (0 min, emergency)', () => {
      const res = deriveManchesterTargetAndPriority('red');
      expect(res.targetTimeMinutes).toBe(0);
      expect(res.priority).toBe('emergency');
    });

    it('retorna tempo-alvo e prioridade corretos para Laranja (10 min, very_urgent)', () => {
      const res = deriveManchesterTargetAndPriority('orange');
      expect(res.targetTimeMinutes).toBe(10);
      expect(res.priority).toBe('very_urgent');
    });

    it('retorna tempo-alvo e prioridade corretos para Amarelo (60 min, urgent)', () => {
      const res = deriveManchesterTargetAndPriority('yellow');
      expect(res.targetTimeMinutes).toBe(60);
      expect(res.priority).toBe('urgent');
    });

    it('retorna tempo-alvo e prioridade corretos para Verde (120 min, standard)', () => {
      const res = deriveManchesterTargetAndPriority('green');
      expect(res.targetTimeMinutes).toBe(120);
      expect(res.priority).toBe('standard');
    });

    it('retorna tempo-alvo e prioridade corretos para Azul (240 min, non_urgent)', () => {
      const res = deriveManchesterTargetAndPriority('blue');
      expect(res.targetTimeMinutes).toBe(240);
      expect(res.priority).toBe('non_urgent');
    });
  });

  describe('validateVitalSigns', () => {
    it('aceita sinais vitais dentro dos limites clínicos', () => {
      const input = {
        systolicBp: 120,
        diastolicBp: 80,
        heartRate: 75,
        respiratoryRate: 16,
        temperature: 36.5,
        oxygenSaturation: 98,
      };
      const res = validateVitalSigns(input);
      expect(res.systolicBp).toBe(120);
      expect(res.temperature).toBe(36.5);
    });

    it('rejeita temperatura fora dos limites clínicos (<25.0 ou >45.0)', () => {
      expect(() => validateVitalSigns({ temperature: 50.0 })).toThrowError(/Temperatura corporal/);
    });

    it('rejeita saturação de oxigênio inválida (>100)', () => {
      expect(() => validateVitalSigns({ oxygenSaturation: 105 })).toThrowError(/Saturação de oxigênio/);
    });
  });

  describe('validatePainScore & Glasgow', () => {
    it('valida dor de 0 a 10', () => {
      expect(validatePainScore(5)).toBe(5);
      expect(() => validatePainScore(12)).toThrowError(/escala de dor/);
    });

    it('valida Glasgow de 3 a 15', () => {
      expect(validateGlasgowScore(15)).toBe(15);
      expect(() => validateGlasgowScore(2)).toThrowError(/Glasgow/);
    });

    it('valida glicemia >= 0', () => {
      expect(validateCapillaryGlucose(95)).toBe(95);
      expect(() => validateCapillaryGlucose(-10)).toThrowError(/glicemia capilar/);
    });
  });

  describe('validateTriageCreateInput & validateTriageReclassifyInput', () => {
    it('exige queixa principal não-vazia', () => {
      expect(() =>
        validateTriageCreateInput({
          encounterId: 'enc-1',
          patientId: 'pat-1',
          institutionId: 'inst-1',
          chiefComplaint: '   ',
          riskColor: 'yellow',
        }),
      ).toThrowError(/queixa principal/);
    });

    it('exige motivo obrigatório na reclassificação', () => {
      expect(() =>
        validateTriageReclassifyInput({
          triageId: 'tri-1',
          newRiskColor: 'red',
          reclassificationReason: '   ',
        }),
      ).toThrowError(/motivo da reclassificação/);
    });
  });

  describe('Domain Events', () => {
    const mockActorId = '83ad7af3-c506-48be-b2a0-6fbd0bb6bf1b' as UUID;
    const mockTriage: Triage = {
      id: 'tri-123',
      encounterId: 'enc-123',
      patientId: 'pat-123',
      institutionId: 'inst-123',
      chiefComplaint: 'Dor torácica intensa',
      riskColor: 'red',
      priority: 'emergency',
      targetTimeMinutes: 0,
      protocolVersion: 'Manchester v1',
      vitals: { heartRate: 110 },
      performedBy: 'usr-123',
      performedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    it('cria evento TriageRecorded', () => {
      const ev = createTriageRecordedEvent(mockTriage, mockActorId);
      expect(ev.type).toBe('TriageRecorded');
      expect(ev.aggregateId).toBe('tri-123');
      expect((ev.payload as { riskColor: string }).riskColor).toBe('red');
    });

    it('cria evento PatientRiskClassified', () => {
      const ev = createPatientRiskClassifiedEvent(mockTriage, mockActorId);
      expect(ev.type).toBe('PatientRiskClassified');
      expect(ev.aggregateId).toBe('pat-123');
    });

    it('cria evento RiskReclassified', () => {
      const ev = createRiskReclassifiedEvent(
        { ...mockTriage, reclassificationReason: 'Piora nos sinais vitais' },
        'yellow',
        mockActorId,
      );
      expect(ev.type).toBe('RiskReclassified');
      expect((ev.payload as { previousColor: string }).previousColor).toBe('yellow');
      expect((ev.payload as { newColor: string }).newColor).toBe('red');
    });
  });
});
