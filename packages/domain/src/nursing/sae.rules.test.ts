import { describe, it, expect } from 'vitest';
import {
  calculateScaleScore,
  validateNursingSaeInput,
  validateFluidBalanceInput,
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

  it('valida lançamentos de balanço hídrico (NUR-009)', () => {
    expect(() => {
      validateFluidBalanceInput({ volumeMl: 0, fluidType: 'oral', direction: 'intake' });
    }).toThrow('O volume do balanço hídrico deve ser maior que zero (mL).');

    expect(() => {
      validateFluidBalanceInput({ volumeMl: 250, fluidType: 'oral', direction: 'invalid' });
    }).toThrow('A direção do balanço hídrico deve ser "intake" (entrada) ou "output" (saída).');

    expect(() => {
      validateFluidBalanceInput({ volumeMl: 250, fluidType: 'oral', direction: 'intake' });
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
