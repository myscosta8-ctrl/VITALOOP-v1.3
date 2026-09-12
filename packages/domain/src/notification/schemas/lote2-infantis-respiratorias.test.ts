import { describe, expect, it } from 'vitest';
import { visibleFields } from '../../clinical-forms/rules.js';
import { COQUELUCHE_BODY_SCHEMA } from './coqueluche.js';
import { MENINGITE_BODY_SCHEMA } from './meningite.js';
import { SARAMPO_BODY_SCHEMA } from './sarampo.js';

// Testes do motor genérico vivem em clinical-forms/rules.test.ts — aqui só
// os schemas reais do Lote 2 (doenças infantis/transmissão respiratória).
describe('Lote 2 — schemas de doenças infantis e de transmissão respiratória direta', () => {
  const schemas = [SARAMPO_BODY_SCHEMA, COQUELUCHE_BODY_SCHEMA, MENINGITE_BODY_SCHEMA];

  it('todo campo type=code de todo schema do lote tem pelo menos uma opção', () => {
    for (const schema of schemas) {
      const codeFields = schema.groups.flatMap((g) => g.fields).filter((f) => f.type === 'code');
      for (const field of codeFields) {
        expect(field.options?.length ?? 0, `${schema.schemaCode}.${field.code}`).toBeGreaterThan(0);
      }
    }
  });

  it('SARAMPO: sem "febre"/"exantema_maculopapular"/"linfadenopatia" como checklist (v1 inventou — campos 38/39 reais são datas, não sim/não)', () => {
    const codes = SARAMPO_BODY_SCHEMA.groups.flatMap((g) => g.fields).map((f) => f.code);
    expect(codes).not.toContain('febre');
    expect(codes).not.toContain('exantema_maculopapular');
    expect(codes).not.toContain('linfadenopatia');
    expect(codes).not.toContain('sorologia_igm_sarampo');
    expect(codes).toContain('data_inicio_febre');
    expect(codes).toContain('data_inicio_exantema');
  });

  it('SARAMPO: classificação final tem as 3 opções reais (Sarampo/Rubéola/Descartado — v1 não tinha Rubéola)', () => {
    const classificacao = SARAMPO_BODY_SCHEMA.groups.flatMap((g) => g.fields).find((f) => f.code === 'classificacao_final');
    expect(classificacao?.options?.map((o) => o.label)).toEqual(['Sarampo', 'Rubéola', 'Descartado']);
  });

  it('SARAMPO: campos condicionais respeitam visibleWhen (bloqueio vacinal, caso descartado, autoctonia, óbito)', () => {
    const semBloqueio = visibleFields(SARAMPO_BODY_SCHEMA, { realizou_bloqueio_vacinal: '2' }).map((f) => f.code);
    expect(semBloqueio).not.toContain('bloqueio_vacinados_menor_5_anos');
    const comBloqueio = visibleFields(SARAMPO_BODY_SCHEMA, { realizou_bloqueio_vacinal: '1' }).map((f) => f.code);
    expect(comBloqueio).toContain('bloqueio_vacinados_menor_5_anos');

    const naoDescartado = visibleFields(SARAMPO_BODY_SCHEMA, { classificacao_final: '1' }).map((f) => f.code);
    expect(naoDescartado).not.toContain('classificacao_final_caso_descartado');
    const descartado = visibleFields(SARAMPO_BODY_SCHEMA, { classificacao_final: '3' }).map((f) => f.code);
    expect(descartado).toContain('classificacao_final_caso_descartado');

    const autoctone = visibleFields(SARAMPO_BODY_SCHEMA, { caso_autoctone: '1' }).map((f) => f.code);
    expect(autoctone).not.toContain('municipio_provavel_fonte');
    const naoAutoctone = visibleFields(SARAMPO_BODY_SCHEMA, { caso_autoctone: '2' }).map((f) => f.code);
    expect(naoAutoctone).toContain('municipio_provavel_fonte');

    const obito = visibleFields(SARAMPO_BODY_SCHEMA, { evolucao_caso: '2' }).map((f) => f.code);
    expect(obito).toContain('data_obito');
  });

  it('COQUELUCHE: campos condicionais respeitam visibleWhen (reescrito em 2026-09-11 contra a ficha oficial)', () => {
    const semContato = visibleFields(COQUELUCHE_BODY_SCHEMA, { contato_caso_suspeito_confirmado: '8' }).map((f) => f.code);
    expect(semContato).not.toContain('contato_outro_especifique');

    const outroContato = visibleFields(COQUELUCHE_BODY_SCHEMA, { contato_caso_suspeito_confirmado: '7' }).map((f) => f.code);
    expect(outroContato).toContain('contato_outro_especifique');

    const semHospitalizacao = visibleFields(COQUELUCHE_BODY_SCHEMA, { ocorreu_hospitalizacao: '2' }).map((f) => f.code);
    expect(semHospitalizacao).not.toContain('data_internacao');
    expect(semHospitalizacao).not.toContain('nome_hospital');

    const comHospitalizacao = visibleFields(COQUELUCHE_BODY_SCHEMA, { ocorreu_hospitalizacao: '1' }).map((f) => f.code);
    expect(comHospitalizacao).toContain('data_internacao');
    expect(comHospitalizacao).toContain('nome_hospital');

    const obito = visibleFields(COQUELUCHE_BODY_SCHEMA, { evolucao: '2' }).map((f) => f.code);
    expect(obito).toContain('data_obito');
    const cura = visibleFields(COQUELUCHE_BODY_SCHEMA, { evolucao: '1' }).map((f) => f.code);
    expect(cura).not.toContain('data_obito');
  });

  it('COQUELUCHE: campo 37 (doses DTP) usa as opções reais da ficha oficial, não as inventadas na v1', () => {
    const doses = COQUELUCHE_BODY_SCHEMA.groups.flatMap((g) => g.fields).find((f) => f.code === 'doses_dtp');
    expect(doses?.options?.map((o) => o.label)).toEqual([
      'Uma',
      'Duas',
      'Três',
      'Três + Um Reforço',
      'Três + Dois Reforços',
      'Nunca Vacinado',
      'Ignorado',
    ]);
  });

  it('MENINGITE: evolução do caso usa as opções reais da ficha oficial (reescrito em 2026-09-11)', () => {
    const evolucao = MENINGITE_BODY_SCHEMA.groups.flatMap((g) => g.fields).find((f) => f.code === 'evolucao_caso');
    expect(evolucao?.options?.map((o) => o.label)).toEqual([
      'Alta',
      'Óbito por meningite',
      'Óbito por outra causa',
      'Ignorado',
    ]);
  });

  it('MENINGITE: aspecto do líquor usa as opções e códigos reais (campo 48 — Purulento não estava na v1)', () => {
    const aspecto = MENINGITE_BODY_SCHEMA.groups.flatMap((g) => g.fields).find((f) => f.code === 'aspecto_liquor');
    expect(aspecto?.options?.map((o) => `${o.code}:${o.label}`)).toEqual([
      '1:Límpido',
      '2:Purulento',
      '3:Hemorrágico',
      '4:Turvo',
      '5:Xantocrômico',
      '6:Outro',
      '9:Ignorado',
    ]);
  });

  it('MENINGITE: sem "fotofobia" nem "agente_etiologico" (campos inventados na v1, não existem na ficha real)', () => {
    const codes = MENINGITE_BODY_SCHEMA.groups.flatMap((g) => g.fields).map((f) => f.code);
    expect(codes).not.toContain('fotofobia');
    expect(codes).not.toContain('agente_etiologico');
  });

  it('MENINGITE: campos condicionais respeitam visibleWhen (vacinação, hospitalização, classificação, quimioprofilaxia)', () => {
    const semVacina = visibleFields(MENINGITE_BODY_SCHEMA, { vacina_bcg: '2' }).map((f) => f.code);
    expect(semVacina).not.toContain('vacina_bcg_doses');
    const comVacina = visibleFields(MENINGITE_BODY_SCHEMA, { vacina_bcg: '1' }).map((f) => f.code);
    expect(comVacina).toContain('vacina_bcg_doses');
    expect(comVacina).toContain('vacina_bcg_data');

    const semHospitalizacao = visibleFields(MENINGITE_BODY_SCHEMA, { ocorreu_hospitalizacao: '2' }).map((f) => f.code);
    expect(semHospitalizacao).not.toContain('nome_hospital');
    const comHospitalizacao = visibleFields(MENINGITE_BODY_SCHEMA, { ocorreu_hospitalizacao: '1' }).map((f) => f.code);
    expect(comHospitalizacao).toContain('nome_hospital');

    const descartado = visibleFields(MENINGITE_BODY_SCHEMA, { classificacao_caso: '2' }).map((f) => f.code);
    expect(descartado).not.toContain('especifique_confirmado');
    const confirmado = visibleFields(MENINGITE_BODY_SCHEMA, { classificacao_caso: '1' }).map((f) => f.code);
    expect(confirmado).toContain('especifique_confirmado');
  });

  it('MENINGITE: todos os grupos (sintomas, líquor, laboratório, classificação) aparecem sem condicionais desnecessárias', () => {
    const visible = visibleFields(MENINGITE_BODY_SCHEMA, {}).map((f) => f.code);
    expect(visible).toContain('sintoma_rigidez_nuca');
    expect(visible).toContain('aspecto_liquor');
    expect(visible).toContain('lab_cultura_liquor');
    expect(visible).toContain('classificacao_caso');
    expect(visible).toContain('sorogrupo_n_meningitidis');
  });

  it('schemaCode de cada schema bate com o código já cadastrado em app.notifiable_diseases (migration 0049)', () => {
    expect(SARAMPO_BODY_SCHEMA.schemaCode).toBe('SARAMPO');
    expect(COQUELUCHE_BODY_SCHEMA.schemaCode).toBe('COQUELUCHE');
    expect(MENINGITE_BODY_SCHEMA.schemaCode).toBe('MENINGITE');
  });
});
