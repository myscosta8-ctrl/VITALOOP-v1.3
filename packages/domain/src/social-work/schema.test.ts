import { describe, expect, it } from 'vitest';
import { validateFormValues } from '../clinical-forms/rules.js';
import { SOCIAL_WORK_ASSESSMENT_SCHEMA } from './schema.js';

describe('SOCIAL_WORK_ASSESSMENT_SCHEMA', () => {
  it('exige a evolução e os dados do assistente social', () => {
    const errors = validateFormValues(SOCIAL_WORK_ASSESSMENT_SCHEMA, {});
    const missingFields = errors.map((e) => e.fieldCode);
    expect(missingFields).toEqual(
      expect.arrayContaining([
        'evolucao_social',
        'assistente_social_nome',
        'assistente_social_cress',
        'data_evolucao',
      ]),
    );
  });

  it('não exige nenhuma das informações complementares opcionais', () => {
    const errors = validateFormValues(SOCIAL_WORK_ASSESSMENT_SCHEMA, {
      evolucao_social: 'Realizado acolhimento e escuta qualificada.',
      assistente_social_nome: 'Fulana',
      assistente_social_cress: '12345',
      data_evolucao: '2026-09-07',
    });
    expect(errors).toHaveLength(0);
  });
});
