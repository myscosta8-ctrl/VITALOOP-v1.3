import { describe, expect, it } from 'vitest';
import { validateFormValues, visibleFields } from '../clinical-forms/rules.js';
import { NUTRITION_ASSESSMENT_SCHEMA } from './schema.js';

describe('NUTRITION_ASSESSMENT_SCHEMA', () => {
  it('todo campo type=code tem pelo menos uma opção', () => {
    const codeFields = NUTRITION_ASSESSMENT_SCHEMA.groups.flatMap((g) => g.fields).filter((f) => f.type === 'code');
    for (const field of codeFields) {
      expect(field.options?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it('sempre exige o tipo de registro e os dados da nutricionista', () => {
    const errors = validateFormValues(NUTRITION_ASSESSMENT_SCHEMA, {});
    const missingFields = errors.map((e) => e.fieldCode);
    expect(missingFields).toEqual(
      expect.arrayContaining(['tipo_registro', 'nutricionista_nome', 'nutricionista_crn', 'data_avaliacao']),
    );
  });

  it('tipo_registro=triagem_admissao mostra só os campos do NRS-2002, não os de evolução', () => {
    const visible = visibleFields(NUTRITION_ASSESSMENT_SCHEMA, { tipo_registro: 'triagem_admissao' }).map((f) => f.code);
    expect(visible).toContain('nrs_escore_total');
    expect(visible).toContain('nrs_classificacao_risco');
    expect(visible).not.toContain('dieta_prescrita');
    expect(visible).not.toContain('conduta_nutricional');
  });

  it('tipo_registro=evolucao mostra só os campos de evolução, não os do NRS-2002', () => {
    const visible = visibleFields(NUTRITION_ASSESSMENT_SCHEMA, { tipo_registro: 'evolucao' }).map((f) => f.code);
    expect(visible).toContain('dieta_prescrita');
    expect(visible).toContain('via_alimentacao');
    expect(visible).toContain('conduta_nutricional');
    expect(visible).not.toContain('nrs_escore_total');
  });

  it('triagem completa não gera erros', () => {
    const errors = validateFormValues(NUTRITION_ASSESSMENT_SCHEMA, {
      tipo_registro: 'triagem_admissao',
      nrs_imc_menor_20_5: 'nao',
      nrs_perdeu_peso_3_meses: 'nao',
      nrs_ingestao_reduzida_semana: 'nao',
      nrs_doenca_grave_uti: 'nao',
      nrs_prejuizo_estado_nutricional: '0',
      nrs_gravidade_doenca: '0',
      nrs_idoso_acima_70: 'nao',
      nrs_escore_total: '0',
      nrs_classificacao_risco: 'sem_risco',
      nutricionista_nome: 'Fulana',
      nutricionista_crn: '12345',
      data_avaliacao: '2026-09-07',
    });
    expect(errors).toHaveLength(0);
  });

  it('evolução completa não gera erros nem exige antropometria/necessidades (opcionais)', () => {
    const errors = validateFormValues(NUTRITION_ASSESSMENT_SCHEMA, {
      tipo_registro: 'evolucao',
      dieta_prescrita: 'Dieta normocalórica, normoproteica.',
      via_alimentacao: 'oral',
      conduta_nutricional: 'Segue em acompanhamento nutricional.',
      nutricionista_nome: 'Fulana',
      nutricionista_crn: '12345',
      data_avaliacao: '2026-09-07',
    });
    expect(errors).toHaveLength(0);
  });
});
