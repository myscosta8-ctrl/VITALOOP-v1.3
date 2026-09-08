import { describe, expect, it } from 'vitest';
import { validateFormValues, visibleFields } from '../clinical-forms/rules.js';
import { PHARMACY_FOLLOWUP_SCHEMA } from './schema.js';

describe('PHARMACY_FOLLOWUP_SCHEMA', () => {
  it('todo campo type=code tem pelo menos uma opção', () => {
    const codeFields = PHARMACY_FOLLOWUP_SCHEMA.groups.flatMap((g) => g.fields).filter((f) => f.type === 'code');
    for (const field of codeFields) {
      expect(field.options?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it('sempre exige o tipo de registro e os dados do farmacêutico', () => {
    const errors = validateFormValues(PHARMACY_FOLLOWUP_SCHEMA, {});
    const missingFields = errors.map((e) => e.fieldCode);
    expect(missingFields).toEqual(
      expect.arrayContaining(['tipo_registro', 'farmaceutico_nome', 'farmaceutico_crf', 'data_registro']),
    );
  });

  it('tipo_registro=admissao mostra os campos de anamnese e do score, não os de evolução', () => {
    const visible = visibleFields(PHARMACY_FOLLOWUP_SCHEMA, { tipo_registro: 'admissao' }).map((f) => f.code);
    expect(visible).toContain('habitos_de_vida');
    expect(visible).toContain('score_pontuacao_total');
    expect(visible).toContain('score_classificacao_risco');
    expect(visible).not.toContain('antimicrobianos_em_uso');
    expect(visible).not.toContain('projeto_terapeutico_seguimento');
  });

  it('tipo_registro=evolucao mostra só os campos de acompanhamento, não os de admissão', () => {
    const visible = visibleFields(PHARMACY_FOLLOWUP_SCHEMA, { tipo_registro: 'evolucao' }).map((f) => f.code);
    expect(visible).toContain('antimicrobianos_em_uso');
    expect(visible).toContain('projeto_terapeutico_seguimento');
    expect(visible).not.toContain('habitos_de_vida');
    expect(visible).not.toContain('score_pontuacao_total');
  });

  it('admissão completa não gera erros', () => {
    const errors = validateFormValues(PHARMACY_FOLLOWUP_SCHEMA, {
      tipo_registro: 'admissao',
      score_quantidade_medicamentos: '6_a_10',
      score_medicamentos_intravenosos: '4_ou_mais',
      score_medicamentos_perigosos: '1',
      score_uso_sonda: 'nao',
      score_faixa_etaria: '15_a_65',
      score_problemas_renais_hepaticos: 'nao',
      score_problemas_cardiacos_pulmonares: 'nao',
      score_imunossuprimido: 'nao',
      score_pontuacao_total: '5',
      score_classificacao_risco: 'moderado',
      score_conduta_definida: 'Análise diária de prescrição.',
      farmaceutico_nome: 'Fulano',
      farmaceutico_crf: '1234',
      data_registro: '2026-09-08',
    });
    expect(errors).toHaveLength(0);
  });

  it('evolução completa não gera erros', () => {
    const errors = validateFormValues(PHARMACY_FOLLOWUP_SCHEMA, {
      tipo_registro: 'evolucao',
      projeto_terapeutico_seguimento: 'Seguimento do uso dos antimicrobianos.',
      farmaceutico_nome: 'Fulano',
      farmaceutico_crf: '1234',
      data_registro: '2026-09-08',
    });
    expect(errors).toHaveLength(0);
  });
});
