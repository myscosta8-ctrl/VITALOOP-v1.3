import { describe, it, expect } from 'vitest';
import { detectDuplicates, requiresHumanConfirmation } from './duplicate-detection.js';
import type { PatientDuplicateCandidateSource } from './types.js';
import type { UUID } from '@vitaloop/shared';

const existingId = '11111111-1111-4111-8111-111111111111' as UUID;

const baseExisting: PatientDuplicateCandidateSource = {
  id: existingId,
  fullName: 'José da Silva',
  cpf: '11144477735',
  cns: null,
  birthDate: '1980-01-01',
  status: 'active',
};

describe('detectDuplicates', () => {
  it('detecta duplicidade FORTE — mesmo CPF, mesmo nome (mesmo teste T4 do banco em espírito)', () => {
    const matches = detectDuplicates(
      { fullName: 'José da Silva', cpf: '11144477735', cns: null, birthDate: '1990-05-05' },
      [baseExisting],
    );
    expect(matches).toHaveLength(1);
    expect(matches[0].matchStrength).toBe('strong');
    expect(matches[0].matchReason).toBe('Mesmo CPF ou CNS.');
  });

  it('detecta CONFLITO — mesmo CPF, nome normalizado diferente (equivalente ao T4 real no banco)', () => {
    const matches = detectDuplicates(
      {
        fullName: 'Carla Eduarda Souza Lima',
        cpf: '11144477735',
        cns: null,
        birthDate: '1990-05-05',
      },
      [{ ...baseExisting, fullName: 'Carlos Eduardo Souza' }],
    );
    expect(matches).toHaveLength(1);
    expect(matches[0].matchStrength).toBe('conflict');
    expect(matches[0].matchReason).toContain('possível erro de cadastro');
  });

  it('detecta duplicidade FRACA — nome normalizado + nascimento iguais, sem CPF/CNS em comum (equivalente ao T3 real no banco)', () => {
    const matches = detectDuplicates(
      { fullName: 'jose   DA SÍLVA', cpf: null, cns: null, birthDate: '1980-01-01' },
      [{ ...baseExisting, cpf: null }],
    );
    expect(matches).toHaveLength(1);
    expect(matches[0].matchStrength).toBe('weak');
  });

  it('não detecta nada quando nome, nascimento e identificadores são todos diferentes', () => {
    const matches = detectDuplicates(
      { fullName: 'Outra Pessoa', cpf: null, cns: null, birthDate: '2000-01-01' },
      [baseExisting],
    );
    expect(matches).toHaveLength(0);
  });

  it('ignora pacientes existentes inativos (mesma regra da função SQL — status=active apenas)', () => {
    const matches = detectDuplicates(
      { fullName: 'José da Silva', cpf: '11144477735', cns: null, birthDate: '1980-01-01' },
      [{ ...baseExisting, status: 'inactive' }],
    );
    expect(matches).toHaveLength(0);
  });
});

describe('requiresHumanConfirmation', () => {
  it('true para forte/conflito, false para apenas fraca', () => {
    expect(
      requiresHumanConfirmation([
        { candidateId: existingId, matchStrength: 'strong', matchReason: 'x' },
      ]),
    ).toBe(true);
    expect(
      requiresHumanConfirmation([
        { candidateId: existingId, matchStrength: 'conflict', matchReason: 'x' },
      ]),
    ).toBe(true);
    expect(
      requiresHumanConfirmation([
        { candidateId: existingId, matchStrength: 'weak', matchReason: 'x' },
      ]),
    ).toBe(false);
    expect(requiresHumanConfirmation([])).toBe(false);
  });
});
