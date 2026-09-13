import { describe, it, expect } from 'vitest';
import {
  calculateScaleScore,
  validateNursingSaeInput,
  validateInvasiveDeviceInput,
} from './rules.js';

describe('Regras de Domínio de Enfermagem SAE, Escalas, Balanço e Dispositivos (NUR-004..012)', () => {
  it('calcula pontuação e nível de risco da Escala de Braden corretamente (NUR-010)', () => {
    // Braden <= 12 -> High risk
    const highRisk = calculateScaleScore('braden', { sensory: 2, moisture: 2, activity: 2, mobility: 2, nutrition: 2, friction: 1 });
    expect(highRisk.totalScore).toBe(11);
    expect(highRisk.riskLevel).toBe('high');

    // Braden > 14 -> Low risk
    const lowRisk = calculateScaleScore('braden', { sensory: 3, moisture: 4, activity: 3, mobility: 3, nutrition: 3, friction: 2 });
    expect(lowRisk.totalScore).toBe(18);
    expect(lowRisk.riskLevel).toBe('low');
  });

  it('calcula pontuação e nível de risco da Escala de Morse corretamente (NUR-010)', () => {
    // Morse >= 45 -> High risk of fall
    const highRisk = calculateScaleScore('morse', { history: 25, secondary: 15, aid: 15, iv: 0, gait: 10, mental: 0 });
    expect(highRisk.totalScore).toBe(65);
    expect(highRisk.riskLevel).toBe('high');

    const lowRisk = calculateScaleScore('morse', { history: 0, secondary: 0, aid: 0, iv: 0, gait: 0, mental: 0 });
    expect(lowRisk.totalScore).toBe(0);
    expect(lowRisk.riskLevel).toBe('low');
  });

  it('calcula pontuação e nível de gravidade da Escala de Glasgow (NUR-010)', () => {
    // Glasgow <= 8 -> Severe
    const severe = calculateScaleScore('glasgow', { eye: 2, verbal: 2, motor: 3 });
    expect(severe.totalScore).toBe(7);
    expect(severe.riskLevel).toBe('severe');

    // Glasgow 15 -> Low risk
    const normal = calculateScaleScore('glasgow', { eye: 4, verbal: 5, motor: 6 });
    expect(normal.totalScore).toBe(15);
    expect(normal.riskLevel).toBe('low');
  });

  it('calcula Escore MEWS de Deterioração Clínica (NUR-010)', () => {
    // MEWS >= 5 -> Severe
    const mewsHigh = calculateScaleScore('mews', { sbp: 2, hr: 2, rr: 1, temp: 0, avpu: 1 });
    expect(mewsHigh.totalScore).toBe(6);
    expect(mewsHigh.riskLevel).toBe('severe');
  });

  it('calcula pontuação e categoria de cuidado da Escala de Fugulin (NUR-010)', () => {
    // 12 indicadores, 1 ponto cada = 12 -> Cuidados Mínimos
    const minimal = calculateScaleScore('fugulin', {
      mentalState: 1, oxygenation: 1, vitalSigns: 1, motility: 1, ambulation: 1,
      feeding: 1, bodyCare: 1, elimination: 1, therapeutics: 1, skinIntegrity: 1,
      dressingProcedure: 1, dressingTime: 1,
    });
    expect(minimal.totalScore).toBe(12);
    expect(minimal.riskLevel).toBe('minimal_care');

    // 12 indicadores, 4 pontos cada = 48 -> Cuidados Intensivos
    const intensive = calculateScaleScore('fugulin', {
      mentalState: 4, oxygenation: 4, vitalSigns: 4, motility: 4, ambulation: 4,
      feeding: 4, bodyCare: 4, elimination: 4, therapeutics: 4, skinIntegrity: 4,
      dressingProcedure: 4, dressingTime: 4,
    });
    expect(intensive.totalScore).toBe(48);
    expect(intensive.riskLevel).toBe('intensive_care');
  });

  it('valida estrutura de diagnósticos e intervenções SAE (NUR-004/005/006)', () => {
    expect(() => {
      validateNursingSaeInput({
        diagnoses: [],
        prescriptions: [{ careDescription: 'Mudança de decúbito 2/2h' }],
      });
    }).toThrow('Ao menos um diagnóstico de enfermagem deve ser informado na SAE.');

    expect(() => {
      validateNursingSaeInput({
        diagnoses: [{ code: '00047', title: 'Risco de Lesão por Pressão' }],
        prescriptions: [],
      });
    }).toThrow('Ao menos um cuidado/intervenção de enfermagem deve ser prescrito.');

    expect(() => {
      validateNursingSaeInput({
        diagnoses: [{ code: '00047', title: 'Risco de Lesão por Pressão' }],
        prescriptions: [{ careDescription: 'SAE' }],
      });
    }).toThrow('A descrição do cuidado prescrito de enfermagem deve ter no mínimo 5 caracteres.');

    expect(() => {
      validateNursingSaeInput({
        diagnoses: [{ code: '00047', title: 'Risco de Lesão por Pressão' }],
        prescriptions: [{ careDescription: 'Mudança de decúbito 2/2h' }],
      });
    }).not.toThrow();
  });

  it('valida cadastro de dispositivos invasivos (NUR-011)', () => {
    expect(() => {
      validateInvasiveDeviceInput({ deviceType: '', anatomicalSite: 'Antebraço' });
    }).toThrow('O tipo do dispositivo invasivo é obrigatório.');

    expect(() => {
      validateInvasiveDeviceInput({ deviceType: 'peripheral_venous_access', anatomicalSite: 'A' });
    }).toThrow('O sítio anatômico de inserção do dispositivo deve ter no mínimo 3 caracteres.');

    expect(() => {
      validateInvasiveDeviceInput({ deviceType: 'peripheral_venous_access', anatomicalSite: 'Antebraço D' });
    }).not.toThrow();
  });
});
