import { describe, expect, it } from 'vitest';
import { validateFormValues } from '../clinical-forms/rules.js';
import { NURSING_THERAPEUTIC_PLAN_SCHEMA } from './schema.js';

describe('NURSING_THERAPEUTIC_PLAN_SCHEMA', () => {
  it('exige resumo, diagnósticos, resultado esperado, intervenções, tempo estimado e dados do enfermeiro', () => {
    const errors = validateFormValues(NURSING_THERAPEUTIC_PLAN_SCHEMA, {});
    const missingFields = errors.map((e) => e.fieldCode);
    expect(missingFields).toEqual(
      expect.arrayContaining([
        'resumo_projeto',
        'diagnosticos_enfermagem',
        'resultado_esperado',
        'possiveis_intervencoes',
        'tempo_estimado_internacao_dias',
        'enfermeiro_responsavel_nome',
        'enfermeiro_responsavel_coren',
        'data_projeto',
      ]),
    );
  });

  it('aceita um projeto totalmente preenchido sem erros', () => {
    const errors = validateFormValues(NURSING_THERAPEUTIC_PLAN_SCHEMA, {
      resumo_projeto: 'Avaliação, monitoramento e prevenção dos riscos de origem hospitalar.',
      diagnosticos_enfermagem: '1. Risco de infecção relacionado a procedimentos invasivos.',
      resultado_esperado: '1. Não apresentar infecção de corrente sanguínea.',
      possiveis_intervencoes: '1. Realizar higienização das mãos conforme protocolo.',
      tempo_estimado_internacao_dias: '3',
      enfermeiro_responsavel_nome: 'Fulano',
      enfermeiro_responsavel_coren: '123456',
      data_projeto: '2026-09-07',
    });
    expect(errors).toHaveLength(0);
  });
});
