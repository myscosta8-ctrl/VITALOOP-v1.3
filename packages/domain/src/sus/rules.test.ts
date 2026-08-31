import { describe, it, expect } from 'vitest';
import { validateSigtapCompatibility, validateAihRequestInput } from './rules.js';
import type { SigtapProcedure } from './types.js';

describe('Regras de Domínio SUS, SIGTAP e AIH (SUS-001..006)', () => {
  const sampleProcedure: SigtapProcedure = {
    code: '0303140054',
    name: 'TRATAMENTO DE COMPLICACOES DO PARTO E PUERPERIO',
    ambulatoryValue: 0,
    hospitalValue: 950,
    minAgeMonths: 120, // 10 anos
    maxAgeMonths: 660, // 55 anos
    allowedSex: 'F',
    requireCid: true,
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  it('valida compatibilidade de sexo, idade e CID para procedimento SIGTAP (SUS-005)', () => {
    // Cenário Válido
    const valid = validateSigtapCompatibility(sampleProcedure, 300, 'female', 'O72');
    expect(valid.isValid).toBe(true);
    expect(valid.errors.length).toBe(0);

    // Cenário Inválido: Sexo masculino em procedimento feminino
    const invalidSex = validateSigtapCompatibility(sampleProcedure, 300, 'male', 'O72');
    expect(invalidSex.isValid).toBe(false);
    expect(invalidSex.errors[0]).toContain('Procedimento restrito ao sexo Feminino');

    // Cenário Inválido: Ausência de CID obrigatório
    const invalidCid = validateSigtapCompatibility(sampleProcedure, 300, 'female', null);
    expect(invalidCid.isValid).toBe(false);
    expect(invalidCid.errors[0]).toContain('Diagnóstico CID-10 é obrigatório');
  });

  it('valida dados obrigatórios de solicitação do laudo AIH (SUS-001/003/004)', () => {
    expect(() => {
      validateAihRequestInput({
        encounterId: '11111111-1111-1111-1111-111111111111',
        patientId: '22222222-2222-2222-2222-222222222222',
        mainProcedureCode: '0303060280',
        mainCid10: 'J18.9',
        clinicalJustification: 'Curto',
      });
    }).toThrow('A justificativa clínica de solicitação de AIH deve possuir no mínimo 15 caracteres.');

    expect(() => {
      validateAihRequestInput({
        encounterId: '11111111-1111-1111-1111-111111111111',
        patientId: '22222222-2222-2222-2222-222222222222',
        mainProcedureCode: '0303060280',
        mainCid10: 'J18.9',
        clinicalJustification: 'Paciente apresentando dispneia intensa e crepitações pulmonares bilaterais necessitando internação.',
      });
    }).not.toThrow();
  });
});
