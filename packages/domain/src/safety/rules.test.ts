import { describe, it, expect } from 'vitest';
import { validateAdverseEventInput, validatePatientIsolationInput } from './rules.js';

describe('Regras de Domínio de Segurança do Paciente (SAF-001..011)', () => {
  it('valida dados obrigatórios de notificação de evento adverso (SAF-001/006/010)', () => {
    expect(() => {
      validateAdverseEventInput({
        eventCategory: 'medicação',
        severity: 'mild',
        description: 'Curto',
      });
    }).toThrow('A descrição detalhada do evento adverso deve possuir no mínimo 15 caracteres.');

    expect(() => {
      validateAdverseEventInput({
        eventCategory: 'medicação',
        severity: 'mild',
        description: 'Paciente apresentou erupção cutânea leve após administração de penicilina.',
      });
    }).not.toThrow();
  });

  it('valida dados de isolamento assistencial do paciente (SAF-007/008)', () => {
    expect(() => {
      validatePatientIsolationInput({
        encounterId: '11111111-1111-1111-1111-111111111111',
        patientId: '22222222-2222-2222-2222-222222222222',
        isolationType: 'contact',
        reason: 'Curto',
      });
    }).toThrow('A justificativa clínica de isolamento assistencial deve possuir no mínimo 10 caracteres.');

    expect(() => {
      validatePatientIsolationInput({
        encounterId: '11111111-1111-1111-1111-111111111111',
        patientId: '22222222-2222-2222-2222-222222222222',
        isolationType: 'contact',
        reason: 'Suspeita de KPC / Enterobactéria resistente em amostra de cultura.',
      });
    }).not.toThrow();
  });
});
