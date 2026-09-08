import { describe, expect, it } from 'vitest';
import { validateFormValues } from '../clinical-forms/rules.js';
import { TFD_REQUEST_SCHEMA } from './schema.js';

describe('TFD_REQUEST_SCHEMA', () => {
  it('exige história da doença atual, exame físico, diagnóstico, tratamento indicado, tempo provável e dados do profissional responsável', () => {
    const errors = validateFormValues(TFD_REQUEST_SCHEMA, {});
    const missingFields = errors.map((e) => e.fieldCode);
    expect(missingFields).toEqual(
      expect.arrayContaining([
        'historia_doenca_atual',
        'exame_fisico',
        'diagnostico',
        'tratamento_indicado',
        'tempo_provavel_dias',
        'profissional_responsavel_nome',
        'profissional_responsavel_cargo',
        'data_emissao',
      ]),
    );
  });

  it('não exige dados de acompanhante nem exame complementar', () => {
    const errors = validateFormValues(TFD_REQUEST_SCHEMA, {
      historia_doenca_atual: 'x',
      exame_fisico: 'x',
      diagnostico: 'x',
      tratamento_indicado: 'x',
      tempo_provavel_dias: '30',
      profissional_responsavel_nome: 'Dr. Teste',
      profissional_responsavel_cargo: 'Médico plantonista',
      data_emissao: '2026-09-07',
    });
    expect(errors).toHaveLength(0);
  });

  it('valida que tempo_provavel_dias precisa ser um número', () => {
    const errors = validateFormValues(TFD_REQUEST_SCHEMA, {
      historia_doenca_atual: 'x',
      exame_fisico: 'x',
      diagnostico: 'x',
      tratamento_indicado: 'x',
      tempo_provavel_dias: 'trinta',
      profissional_responsavel_nome: 'Dr. Teste',
      profissional_responsavel_cargo: 'Médico plantonista',
      data_emissao: '2026-09-07',
    });
    expect(errors.map((e) => e.fieldCode)).toContain('tempo_provavel_dias');
  });
});
