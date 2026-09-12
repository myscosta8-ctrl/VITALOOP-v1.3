import { describe, expect, it } from 'vitest';
import { visibleFields } from '../../clinical-forms/rules.js';
import { FEBRE_AMARELA_BODY_SCHEMA } from './febre-amarela.js';
import { INTOXICACAO_EXOGENA_BODY_SCHEMA } from './intoxicacao-exogena.js';
import { RAIVA_HUMANA_BODY_SCHEMA } from './raiva-humana.js';
import { TETANO_ACIDENTAL_BODY_SCHEMA } from './tetano-acidental.js';
import { VIOLENCIA_INTERPESSOAL_BODY_SCHEMA } from './violencia-interpessoal.js';

// Testes do motor genérico vivem em clinical-forms/rules.test.ts — aqui só
// os schemas reais do Lote 4 (acidentes, exposição e violência), o último
// do backlog das 19 doenças cadastradas em app.notifiable_diseases.
describe('Lote 4 — schemas de acidentes, exposição e violência', () => {
  const schemas = [
    FEBRE_AMARELA_BODY_SCHEMA,
    TETANO_ACIDENTAL_BODY_SCHEMA,
    RAIVA_HUMANA_BODY_SCHEMA,
    INTOXICACAO_EXOGENA_BODY_SCHEMA,
    VIOLENCIA_INTERPESSOAL_BODY_SCHEMA,
  ];

  it('todo campo type=code de todo schema do lote tem pelo menos uma opção', () => {
    for (const schema of schemas) {
      const codeFields = schema.groups.flatMap((g) => g.fields).filter((f) => f.type === 'code');
      for (const field of codeFields) {
        expect(field.options?.length ?? 0, `${schema.schemaCode}.${field.code}`).toBeGreaterThan(0);
      }
    }
  });

  it('FEBRE_AMARELA: data de vacinação só aparece quando vacinado_febre_amarela = Sim', () => {
    const visible = visibleFields(FEBRE_AMARELA_BODY_SCHEMA, { vacinado_febre_amarela: '1' }).map((f) => f.code);
    expect(visible).toContain('data_vacinacao');
    expect(visible).toContain('uf_vacinacao');

    const hidden = visibleFields(FEBRE_AMARELA_BODY_SCHEMA, { vacinado_febre_amarela: '2' }).map((f) => f.code);
    expect(hidden).not.toContain('data_vacinacao');
  });

  it('FEBRE_AMARELA: classificação final usa as 3 opções reais da ficha (Silvestre/Urbana/Descartado — reescrito em 2026-09-11)', () => {
    const classificacao = FEBRE_AMARELA_BODY_SCHEMA.groups.flatMap((g) => g.fields).find((f) => f.code === 'classificacao_final');
    expect(classificacao?.options?.map((o) => o.label)).toEqual(['Febre Amarela Silvestre', 'Febre Amarela Urbana', 'Descartado']);

    const evolucao = FEBRE_AMARELA_BODY_SCHEMA.groups.flatMap((g) => g.fields).find((f) => f.code === 'evolucao_caso');
    expect(evolucao?.options?.map((o) => o.label)).toEqual(['Cura', 'Óbito por febre amarela', 'Óbito por outras causas', 'Ignorado']);
  });

  it('FEBRE_AMARELA: campos condicionais respeitam visibleWhen (hospitalização, caso descartado, autoctonia, óbito)', () => {
    const semHospitalizacao = visibleFields(FEBRE_AMARELA_BODY_SCHEMA, { ocorreu_hospitalizacao: '2' }).map((f) => f.code);
    expect(semHospitalizacao).not.toContain('unidade_saude_hospital');
    const comHospitalizacao = visibleFields(FEBRE_AMARELA_BODY_SCHEMA, { ocorreu_hospitalizacao: '1' }).map((f) => f.code);
    expect(comHospitalizacao).toContain('unidade_saude_hospital');

    const descartado = visibleFields(FEBRE_AMARELA_BODY_SCHEMA, { classificacao_final: '3' }).map((f) => f.code);
    expect(descartado).toContain('classificacao_final_descartado_especifique');

    const naoAutoctone = visibleFields(FEBRE_AMARELA_BODY_SCHEMA, { caso_autoctone: '2' }).map((f) => f.code);
    expect(naoAutoctone).toContain('localidade_provavel_infeccao');

    const obito = visibleFields(FEBRE_AMARELA_BODY_SCHEMA, { evolucao_caso: '2' }).map((f) => f.code);
    expect(obito).toContain('data_obito');
  });

  it('INTOXICACAO_EXOGENA: campo "antídoto utilizado" só aparece quando antídoto foi administrado', () => {
    const visible = visibleFields(INTOXICACAO_EXOGENA_BODY_SCHEMA, { antidoto_tratamento_especifico: '1' }).map((f) => f.code);
    expect(visible).toContain('antidoto_utilizado');

    const hidden = visibleFields(INTOXICACAO_EXOGENA_BODY_SCHEMA, { antidoto_tratamento_especifico: '2' }).map((f) => f.code);
    expect(hidden).not.toContain('antidoto_utilizado');
  });

  it('VIOLENCIA_INTERPESSOAL: bloco de violência sexual e procedimentos só aparece quando tipo_violencia_sexual = Sim (reescrito em 2026-09-11 contra a ficha oficial)', () => {
    const visible = visibleFields(VIOLENCIA_INTERPESSOAL_BODY_SCHEMA, { tipo_violencia_sexual: '1' }).map((f) => f.code);
    expect(visible).toContain('violencia_sexual_estupro');
    expect(visible).toContain('procedimento_profilaxia_dst');
    expect(visible).toContain('procedimento_profilaxia_hiv');

    const hidden = visibleFields(VIOLENCIA_INTERPESSOAL_BODY_SCHEMA, { tipo_violencia_sexual: '2' }).map((f) => f.code);
    expect(hidden).not.toContain('violencia_sexual_estupro');
    expect(hidden).not.toContain('procedimento_profilaxia_dst');
  });

  it('VIOLENCIA_INTERPESSOAL: campo "outros, especifique" só aparece quando tipo_violencia_outros = Sim', () => {
    const visible = visibleFields(VIOLENCIA_INTERPESSOAL_BODY_SCHEMA, { tipo_violencia_outros: '1' }).map((f) => f.code);
    expect(visible).toContain('tipo_violencia_outros_especifique');

    const hidden = visibleFields(VIOLENCIA_INTERPESSOAL_BODY_SCHEMA, { tipo_violencia_outros: '2' }).map((f) => f.code);
    expect(hidden).not.toContain('tipo_violencia_outros_especifique');
  });

  it('VIOLENCIA_INTERPESSOAL: sem "tipo_violencia_autoprovocada" nem "violencia_sexual_atentado_pudor" (campos inventados na v1 — "lesão autoprovocada" é campo próprio, "atentado ao pudor" não existe mais na legislação/ficha)', () => {
    const codes = VIOLENCIA_INTERPESSOAL_BODY_SCHEMA.groups.flatMap((g) => g.fields).map((f) => f.code);
    expect(codes).not.toContain('tipo_violencia_autoprovocada');
    expect(codes).not.toContain('violencia_sexual_atentado_pudor');
    expect(codes).not.toContain('evolucao_caso');
    expect(codes).toContain('lesao_autoprovocada');
    expect(codes).toContain('data_encerramento');
  });

  it('VIOLENCIA_INTERPESSOAL: vínculo com o provável autor é um checklist de itens independentes, não uma seleção única', () => {
    const visible = visibleFields(VIOLENCIA_INTERPESSOAL_BODY_SCHEMA, {}).map((f) => f.code);
    expect(visible).toContain('vinculo_pai');
    expect(visible).toContain('vinculo_conjuge');
    expect(visible).toContain('vinculo_desconhecido');
    expect(visible).toContain('vinculo_policial_agente_lei');
  });

  it('VIOLENCIA_INTERPESSOAL: encaminhamento tem os 14 itens reais da ficha (v1 tinha só 9)', () => {
    const codes = VIOLENCIA_INTERPESSOAL_BODY_SCHEMA.groups.find((g) => g.title === 'Encaminhamento')?.fields.map((f) => f.code) ?? [];
    expect(codes).toHaveLength(14);
    expect(codes).toContain('encaminhamento_delegacia_atendimento_mulher');
    expect(codes).toContain('encaminhamento_delegacia_atendimento_idoso');
    expect(codes).toContain('encaminhamento_defensoria_publica');
    expect(codes).toContain('encaminhamento_justica_infancia_juventude');
  });

  it('VIOLENCIA_INTERPESSOAL: campo CAT só aparece quando violência relacionada ao trabalho = Sim', () => {
    const semTrabalho = visibleFields(VIOLENCIA_INTERPESSOAL_BODY_SCHEMA, { violencia_relacionada_trabalho: '2' }).map((f) => f.code);
    expect(semTrabalho).not.toContain('emitida_cat');
    const comTrabalho = visibleFields(VIOLENCIA_INTERPESSOAL_BODY_SCHEMA, { violencia_relacionada_trabalho: '1' }).map((f) => f.code);
    expect(comTrabalho).toContain('emitida_cat');
  });

  it('TETANO_ACIDENTAL: todos os campos aparecem sem valores preenchidos (nenhum condicional)', () => {
    const tetanoVisible = visibleFields(TETANO_ACIDENTAL_BODY_SCHEMA, {}).map((f) => f.code);
    expect(tetanoVisible).toContain('tipo_ferimento');
    expect(tetanoVisible).toContain('doses_vta');
  });

  it('RAIVA_HUMANA: sem "tipo_exposicao"/"esquema_profilaxia"/"evolucao_caso" (campos inventados na v1 — esta ficha é um atendimento, não tem desfecho de evolução; reescrito em 2026-09-11)', () => {
    const codes = RAIVA_HUMANA_BODY_SCHEMA.groups.flatMap((g) => g.fields).map((f) => f.code);
    expect(codes).not.toContain('tipo_exposicao');
    expect(codes).not.toContain('esquema_profilaxia');
    expect(codes).not.toContain('evolucao_caso');
    expect(codes).toContain('especie_animal');
    expect(codes).toContain('condicao_final_animal');
  });

  it('RAIVA_HUMANA: campos condicionais respeitam visibleWhen (antecedente de tratamento, espécie outra, soro, interrupção)', () => {
    const semAntecedente = visibleFields(RAIVA_HUMANA_BODY_SCHEMA, { antecedente_tratamento_antirrabico: '2' }).map((f) => f.code);
    expect(semAntecedente).not.toContain('antecedente_tratamento_quando_concluido');
    const comAntecedente = visibleFields(RAIVA_HUMANA_BODY_SCHEMA, { antecedente_tratamento_antirrabico: '1' }).map((f) => f.code);
    expect(comAntecedente).toContain('antecedente_tratamento_quando_concluido');

    const especieOutra = visibleFields(RAIVA_HUMANA_BODY_SCHEMA, { especie_animal: '7' }).map((f) => f.code);
    expect(especieOutra).toContain('especie_animal_especifique');

    const semSoro = visibleFields(RAIVA_HUMANA_BODY_SCHEMA, { indicacao_soro_antirrabico: '2' }).map((f) => f.code);
    expect(semSoro).not.toContain('tipo_soro');
    const comSoro = visibleFields(RAIVA_HUMANA_BODY_SCHEMA, { indicacao_soro_antirrabico: '1' }).map((f) => f.code);
    expect(comSoro).toContain('tipo_soro');

    const semInterrupcao = visibleFields(RAIVA_HUMANA_BODY_SCHEMA, { houve_interrupcao_tratamento: '2' }).map((f) => f.code);
    expect(semInterrupcao).not.toContain('motivo_interrupcao');
    const comAbandono = visibleFields(RAIVA_HUMANA_BODY_SCHEMA, { houve_interrupcao_tratamento: '1', motivo_interrupcao: '2' }).map((f) => f.code);
    expect(comAbandono).toContain('abandono_unidade_procurou_paciente');
  });

  it('schemaCode de cada schema bate com o código já cadastrado em app.notifiable_diseases (migration 0049)', () => {
    expect(FEBRE_AMARELA_BODY_SCHEMA.schemaCode).toBe('FEBRE_AMARELA');
    expect(TETANO_ACIDENTAL_BODY_SCHEMA.schemaCode).toBe('TETANO_ACIDENTAL');
    expect(RAIVA_HUMANA_BODY_SCHEMA.schemaCode).toBe('RAIVA_HUMANA');
    expect(INTOXICACAO_EXOGENA_BODY_SCHEMA.schemaCode).toBe('INTOXICACAO_EXOGENA');
    expect(VIOLENCIA_INTERPESSOAL_BODY_SCHEMA.schemaCode).toBe('VIOLENCIA_INTERPESSOAL');
  });
});
