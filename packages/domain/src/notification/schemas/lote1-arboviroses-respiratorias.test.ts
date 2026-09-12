import { describe, expect, it } from 'vitest';
import { visibleFields } from '../../clinical-forms/rules.js';
import { CHIKUNGUNYA_BODY_SCHEMA } from './chikungunya.js';
import { COVID19_BODY_SCHEMA } from './covid19.js';
import { DENGUE_BODY_SCHEMA } from './dengue.js';
import { SRAG_BODY_SCHEMA } from './srag.js';
import { ZIKA_BODY_SCHEMA } from './zika.js';

// Testes do motor genérico (isFieldVisible/validate/sanitize) vivem em
// clinical-forms/rules.test.ts — aqui só os schemas reais do Lote 1
// (arboviroses e síndromes respiratórias).
describe('Lote 1 — schemas de arboviroses e síndromes respiratórias', () => {
  const schemas = [DENGUE_BODY_SCHEMA, CHIKUNGUNYA_BODY_SCHEMA, ZIKA_BODY_SCHEMA, COVID19_BODY_SCHEMA, SRAG_BODY_SCHEMA];

  it('todo campo type=code de todo schema do lote tem pelo menos uma opção', () => {
    for (const schema of schemas) {
      const codeFields = schema.groups.flatMap((g) => g.fields).filter((f) => f.type === 'code');
      for (const field of codeFields) {
        expect(field.options?.length ?? 0, `${schema.schemaCode}.${field.code}`).toBeGreaterThan(0);
      }
    }
  });

  it('DENGUE: campos de hospitalização só aparecem quando ocorreu_hospitalizacao = Sim (reescrito em 2026-09-11 contra a ficha oficial compartilhada com Chikungunya)', () => {
    const visible = visibleFields(DENGUE_BODY_SCHEMA, { ocorreu_hospitalizacao: '1' }).map((f) => f.code);
    expect(visible).toContain('data_internacao');
    expect(visible).toContain('nome_hospital');

    const hidden = visibleFields(DENGUE_BODY_SCHEMA, { ocorreu_hospitalizacao: '2' }).map((f) => f.code);
    expect(hidden).not.toContain('data_internacao');
    expect(hidden).not.toContain('nome_hospital');
  });

  it('DENGUE: sem "poliartralgia_migratoria"/"edema_articular" — a ficha real não tem esses campos; bloco de Sinais de Alarme e Dengue Grave existe e é condicional', () => {
    const codes = DENGUE_BODY_SCHEMA.groups.flatMap((g) => g.fields).map((f) => f.code);
    expect(codes).toContain('dengue_sinais_alarme');
    expect(codes).toContain('dengue_grave');

    const semAlarme = visibleFields(DENGUE_BODY_SCHEMA, { dengue_sinais_alarme: '2' }).map((f) => f.code);
    expect(semAlarme).not.toContain('alarme_dor_abdominal_intensa_continua');
    const comAlarme = visibleFields(DENGUE_BODY_SCHEMA, { dengue_sinais_alarme: '1' }).map((f) => f.code);
    expect(comAlarme).toContain('alarme_dor_abdominal_intensa_continua');
    expect(comAlarme).toContain('data_inicio_sinais_alarme');

    const semGrave = visibleFields(DENGUE_BODY_SCHEMA, { dengue_grave: '2' }).map((f) => f.code);
    expect(semGrave).not.toContain('grave_hematemese');
    const comGrave = visibleFields(DENGUE_BODY_SCHEMA, { dengue_grave: '1' }).map((f) => f.code);
    expect(comGrave).toContain('grave_hematemese');
  });

  it('CHIKUNGUNYA: campos de hospitalização só aparecem quando ocorreu_hospitalizacao = Sim', () => {
    const visible = visibleFields(CHIKUNGUNYA_BODY_SCHEMA, { ocorreu_hospitalizacao: '1' }).map((f) => f.code);
    expect(visible).toContain('data_internacao');

    const hidden = visibleFields(CHIKUNGUNYA_BODY_SCHEMA, { ocorreu_hospitalizacao: '2' }).map((f) => f.code);
    expect(hidden).not.toContain('data_internacao');
  });

  it('CHIKUNGUNYA: sem "poliartralgia_migratoria"/"edema_articular"/"artralgia_persistente_apos_2_semanas" (campos inventados na v1) nem código de classificação "14" (não existe — reescrito em 2026-09-11)', () => {
    const codes = CHIKUNGUNYA_BODY_SCHEMA.groups.flatMap((g) => g.fields).map((f) => f.code);
    expect(codes).not.toContain('poliartralgia_migratoria');
    expect(codes).not.toContain('edema_articular');
    expect(codes).not.toContain('artralgia_persistente_apos_2_semanas');

    const classificacao = CHIKUNGUNYA_BODY_SCHEMA.groups.flatMap((g) => g.fields).find((f) => f.code === 'classificacao_final');
    expect(classificacao?.options?.map((o) => o.code)).toEqual(['5', '13']);

    expect(codes).toContain('apresentacao_clinica');
  });

  it('ZIKA: bloco de gestação só aparece quando gestante = Sim', () => {
    const visible = visibleFields(ZIKA_BODY_SCHEMA, { gestante: '1' }).map((f) => f.code);
    expect(visible).toContain('idade_gestacional_semanas');
    expect(visible).toContain('microcefalia_fetal');

    const hidden = visibleFields(ZIKA_BODY_SCHEMA, { gestante: '2' }).map((f) => f.code);
    expect(hidden).not.toContain('idade_gestacional_semanas');
    expect(hidden).not.toContain('microcefalia_fetal');
  });

  it('COVID19: campos de doses de vacina só aparecem quando recebeu_vacina_covid19 = Sim (reescrito em 2026-09-11 contra a ficha oficial e-SUS Notifica)', () => {
    const visible = visibleFields(COVID19_BODY_SCHEMA, { recebeu_vacina_covid19: '1' }).map((f) => f.code);
    expect(visible).toContain('dose1_data');
    expect(visible).toContain('dose1_laboratorio');

    const hidden = visibleFields(COVID19_BODY_SCHEMA, { recebeu_vacina_covid19: '2' }).map((f) => f.code);
    expect(hidden).not.toContain('dose1_data');
  });

  it('COVID19: grade de exames laboratoriais cobre os 8 tipos de teste reais da ficha (a v1 só tinha 2 genéricos)', () => {
    const codes = COVID19_BODY_SCHEMA.groups.flatMap((g) => g.fields).map((f) => f.code);
    expect(codes).toContain('exame_rtpcr_resultado');
    expect(codes).toContain('exame_rtlamp_resultado');
    expect(codes).toContain('exame_iga_resultado');
    expect(codes).toContain('exame_rapido_antigeno_fabricante');
    expect(codes).not.toContain('rt_pcr_sars_cov_2');
    expect(codes).not.toContain('evolucao_caso_generico');
  });

  it('SRAG: campos de internação só aparecem quando ocorreu_internacao = Sim (reescrito em 2026-09-11 contra a ficha oficial Sinan Influenza)', () => {
    const visible = visibleFields(SRAG_BODY_SCHEMA, { ocorreu_internacao: '1' }).map((f) => f.code);
    expect(visible).toContain('data_internacao');
    expect(visible).toContain('nome_unidade_saude_internacao');

    const hidden = visibleFields(SRAG_BODY_SCHEMA, { ocorreu_internacao: '2' }).map((f) => f.code);
    expect(hidden).not.toContain('data_internacao');
  });

  it('SRAG: tem os 10 fatores de risco reais da ficha (a v1 não tinha nenhum) e classificação final própria (SRAG por Influenza/outros vírus/etc, não Cura/Óbito genérico)', () => {
    const codes = SRAG_BODY_SCHEMA.groups.flatMap((g) => g.fields).map((f) => f.code);
    expect(codes).toContain('fator_risco_sindrome_down');
    expect(codes).toContain('fator_risco_puerperio');

    const classificacao = SRAG_BODY_SCHEMA.groups.flatMap((g) => g.fields).find((f) => f.code === 'classificacao_final_srag');
    expect(classificacao?.options?.map((o) => o.label)).toEqual([
      'SRAG por Influenza',
      'SRAG por outros vírus respiratórios',
      'SRAG por outros agentes etiológicos',
      'SRAG não especificada',
    ]);
  });

  it('SRAG: subtipo de Influenza A só aparece quando o diagnóstico de Influenza A é Positivo', () => {
    const semPositivo = visibleFields(SRAG_BODY_SCHEMA, { diagnostico_influenza_a: '2' }).map((f) => f.code);
    expect(semPositivo).not.toContain('influenza_a_subtipo');
    const comPositivo = visibleFields(SRAG_BODY_SCHEMA, { diagnostico_influenza_a: '1' }).map((f) => f.code);
    expect(comPositivo).toContain('influenza_a_subtipo');
  });

  it('schemaCode de cada schema bate com o código já cadastrado em app.notifiable_diseases (migration 0049)', () => {
    expect(DENGUE_BODY_SCHEMA.schemaCode).toBe('DENGUE');
    expect(CHIKUNGUNYA_BODY_SCHEMA.schemaCode).toBe('CHIKUNGUNYA');
    expect(ZIKA_BODY_SCHEMA.schemaCode).toBe('ZIKA');
    expect(COVID19_BODY_SCHEMA.schemaCode).toBe('COVID19');
    expect(SRAG_BODY_SCHEMA.schemaCode).toBe('SRAG');
  });
});
