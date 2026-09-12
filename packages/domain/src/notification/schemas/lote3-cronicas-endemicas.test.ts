import { describe, expect, it } from 'vitest';
import { visibleFields } from '../../clinical-forms/rules.js';
import { HANSENIASE_BODY_SCHEMA } from './hanseniase.js';
import { HEPATITES_VIRAIS_BODY_SCHEMA } from './hepatites-virais.js';
import { LEPTOSPIROSE_BODY_SCHEMA } from './leptospirose.js';
import { SIFILIS_BODY_SCHEMA } from './sifilis.js';
import { TUBERCULOSE_BODY_SCHEMA } from './tuberculose.js';

// Testes do motor genérico vivem em clinical-forms/rules.test.ts — aqui só
// os schemas reais do Lote 3 (doenças crônicas/endêmicas).
describe('Lote 3 — schemas de doenças crônicas e endêmicas', () => {
  const schemas = [TUBERCULOSE_BODY_SCHEMA, HANSENIASE_BODY_SCHEMA, SIFILIS_BODY_SCHEMA, HEPATITES_VIRAIS_BODY_SCHEMA, LEPTOSPIROSE_BODY_SCHEMA];

  it('todo campo type=code de todo schema do lote tem pelo menos uma opção', () => {
    for (const schema of schemas) {
      const codeFields = schema.groups.flatMap((g) => g.fields).filter((f) => f.type === 'code');
      for (const field of codeFields) {
        expect(field.options?.length ?? 0, `${schema.schemaCode}.${field.code}`).toBeGreaterThan(0);
      }
    }
  });

  it('TUBERCULOSE: localização extrapulmonar só aparece quando forma clínica é Extrapulmonar ou mista', () => {
    const visibleExtra = visibleFields(TUBERCULOSE_BODY_SCHEMA, { forma_clinica: '2' }).map((f) => f.code);
    expect(visibleExtra).toContain('localizacao_extrapulmonar');

    const visibleMista = visibleFields(TUBERCULOSE_BODY_SCHEMA, { forma_clinica: '3' }).map((f) => f.code);
    expect(visibleMista).toContain('localizacao_extrapulmonar');

    const hidden = visibleFields(TUBERCULOSE_BODY_SCHEMA, { forma_clinica: '1' }).map((f) => f.code);
    expect(hidden).not.toContain('localizacao_extrapulmonar');
  });

  it('TUBERCULOSE: sem "evolucao_caso"/"tdo_tratamento_diretamente_observado" (a ficha de 2014 é só notificação/investigação, sem desfecho — reescrito em 2026-09-11)', () => {
    const codes = TUBERCULOSE_BODY_SCHEMA.groups.flatMap((g) => g.fields).map((f) => f.code);
    expect(codes).not.toContain('evolucao_caso');
    expect(codes).not.toContain('tdo_tratamento_diretamente_observado');
    expect(codes).toContain('teste_molecular_rapido_tb');
    expect(codes).toContain('teste_sensibilidade');
  });

  it('TUBERCULOSE: teste molecular rápido distingue sensibilidade/resistência à Rifampicina (a v1 não tinha essa distinção)', () => {
    const trm = TUBERCULOSE_BODY_SCHEMA.groups.flatMap((g) => g.fields).find((f) => f.code === 'teste_molecular_rapido_tb');
    expect(trm?.options?.map((o) => o.label)).toEqual([
      'Detectável sensível à Rifampicina',
      'Detectável Resistente à Rifampicina',
      'Não Detectável',
      'Inconclusivo',
      'Não Realizado',
    ]);
  });

  it('TUBERCULOSE: populações especiais é um checklist de 4 itens independentes, não uma seleção única', () => {
    const visible = visibleFields(TUBERCULOSE_BODY_SCHEMA, {}).map((f) => f.code);
    expect(visible).toContain('populacao_privada_liberdade');
    expect(visible).toContain('profissional_saude');
    expect(visible).toContain('populacao_situacao_rua');
    expect(visible).toContain('imigrante');
  });

  it('HEPATITES_VIRAIS: sem "tipo_hepatite" como eixo condicional — a ficha real mostra todos os marcadores sorológicos juntos, sem campo controlando qual aparece (reescrito em 2026-09-11)', () => {
    const codes = HEPATITES_VIRAIS_BODY_SCHEMA.groups.flatMap((g) => g.fields).map((f) => f.code);
    expect(codes).not.toContain('tipo_hepatite');
    expect(codes).not.toContain('carga_viral_hbv');
    expect(codes).not.toContain('carga_viral_hcv');

    const visible = visibleFields(HEPATITES_VIRAIS_BODY_SCHEMA, {}).map((f) => f.code);
    expect(visible).toContain('resultado_anti_hav_igm');
    expect(visible).toContain('resultado_hbsag');
    expect(visible).toContain('resultado_anti_hcv');
    expect(visible).toContain('resultado_anti_hdv_total');
    expect(visible).toContain('resultado_anti_hev_igm');
  });

  it('HEPATITES_VIRAIS: campo "Outros" da provável fonte de infecção exige especificação por texto', () => {
    const semOutros = visibleFields(HEPATITES_VIRAIS_BODY_SCHEMA, { provavel_fonte_mecanismo_infeccao: '01' }).map((f) => f.code);
    expect(semOutros).not.toContain('provavel_fonte_outros_especifique');
    const comOutros = visibleFields(HEPATITES_VIRAIS_BODY_SCHEMA, { provavel_fonte_mecanismo_infeccao: '12' }).map((f) => f.code);
    expect(comOutros).toContain('provavel_fonte_outros_especifique');
  });

  it('SIFILIS: todos os campos aparecem sem valores preenchidos (nenhum condicional)', () => {
    const sifilisVisible = visibleFields(SIFILIS_BODY_SCHEMA, {}).map((f) => f.code);
    expect(sifilisVisible).toContain('classificacao_sifilis');
    expect(sifilisVisible).toContain('vdrl');
  });

  it('LEPTOSPIROSE: sem "tratamento" nem "choque_hipotensao" (campos inventados na v1 — reescrito em 2026-09-11 contra a ficha oficial)', () => {
    const codes = LEPTOSPIROSE_BODY_SCHEMA.groups.flatMap((g) => g.fields).map((f) => f.code);
    expect(codes).not.toContain('tratamento');
    expect(codes).not.toContain('choque_hipotensao');
    expect(codes).not.toContain('enchente_alagamento');
    expect(codes).not.toContain('mat_microaglutinacao');
    expect(codes).toContain('situacao_risco_agua_lama_enchente');
    expect(codes).toContain('resultado_micro_1a_amostra');
  });

  it('LEPTOSPIROSE: evolução do caso usa as opções reais da ficha oficial, não as genéricas', () => {
    const evolucao = LEPTOSPIROSE_BODY_SCHEMA.groups.flatMap((g) => g.fields).find((f) => f.code === 'evolucao_caso');
    expect(evolucao?.options?.map((o) => o.label)).toEqual(['Cura', 'Óbito por leptospirose', 'Óbito por outras causas', 'Ignorado']);
  });

  it('LEPTOSPIROSE: campos condicionais respeitam visibleWhen (casos anteriores, hospitalização, autoctonia, óbito)', () => {
    const semCasosAnteriores = visibleFields(LEPTOSPIROSE_BODY_SCHEMA, { casos_anteriores_leptospirose_local: '2' }).map((f) => f.code);
    expect(semCasosAnteriores).not.toContain('casos_anteriores_humanos');
    const comCasosAnteriores = visibleFields(LEPTOSPIROSE_BODY_SCHEMA, { casos_anteriores_leptospirose_local: '1' }).map((f) => f.code);
    expect(comCasosAnteriores).toContain('casos_anteriores_humanos');

    const semHospitalizacao = visibleFields(LEPTOSPIROSE_BODY_SCHEMA, { ocorreu_hospitalizacao: '2' }).map((f) => f.code);
    expect(semHospitalizacao).not.toContain('nome_hospital');
    const comHospitalizacao = visibleFields(LEPTOSPIROSE_BODY_SCHEMA, { ocorreu_hospitalizacao: '1' }).map((f) => f.code);
    expect(comHospitalizacao).toContain('nome_hospital');

    const naoAutoctone = visibleFields(LEPTOSPIROSE_BODY_SCHEMA, { caso_autoctone: '2' }).map((f) => f.code);
    expect(naoAutoctone).toContain('municipio_provavel_infeccao');

    const obito = visibleFields(LEPTOSPIROSE_BODY_SCHEMA, { evolucao_caso: '2' }).map((f) => f.code);
    expect(obito).toContain('data_obito');
  });

  it('schemaCode de cada schema bate com o código já cadastrado em app.notifiable_diseases (migration 0049)', () => {
    expect(TUBERCULOSE_BODY_SCHEMA.schemaCode).toBe('TUBERCULOSE');
    expect(HANSENIASE_BODY_SCHEMA.schemaCode).toBe('HANSENIASE');
    expect(SIFILIS_BODY_SCHEMA.schemaCode).toBe('SIFILIS');
    expect(HEPATITES_VIRAIS_BODY_SCHEMA.schemaCode).toBe('HEPATITES_VIRAIS');
    expect(LEPTOSPIROSE_BODY_SCHEMA.schemaCode).toBe('LEPTOSPIROSE');
  });
});
