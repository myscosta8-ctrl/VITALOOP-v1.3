import { describe, expect, it } from 'vitest';
import { visibleFields } from '../../clinical-forms/rules.js';
import { CHAGAS_BODY_SCHEMA } from './chagas.js';
import { MALARIA_BODY_SCHEMA } from './malaria.js';

// Malária e Chagas — adicionadas a `app.notifiable_diseases` na migration
// 0080 (já tinham cabeçalho de PDF calibrado, mas não eram doença
// notificável cadastrada). Testes do motor genérico vivem em
// clinical-forms/rules.test.ts — aqui só os schemas reais destas duas.
describe('Lote 5 — schemas de Malária e Chagas', () => {
  const schemas = [MALARIA_BODY_SCHEMA, CHAGAS_BODY_SCHEMA];

  it('todo campo type=code de todo schema do lote tem pelo menos uma opção', () => {
    for (const schema of schemas) {
      const codeFields = schema.groups.flatMap((g) => g.fields).filter((f) => f.type === 'code');
      for (const field of codeFields) {
        expect(field.options?.length ?? 0, `${schema.schemaCode}.${field.code}`).toBeGreaterThan(0);
      }
    }
  });

  it('MALARIA: campos de país/UF/município/distrito/bairro/localidade da infecção só aparecem quando caso_autoctone = Não (reescrito em 2026-09-11 contra a ficha oficial)', () => {
    const visible = visibleFields(MALARIA_BODY_SCHEMA, { caso_autoctone: '2' }).map((f) => f.code);
    expect(visible).toContain('pais_provavel_infeccao');
    expect(visible).toContain('uf_provavel_infeccao');
    expect(visible).toContain('municipio_provavel_infeccao');
    expect(visible).toContain('distrito_provavel_infeccao');
    expect(visible).toContain('bairro_provavel_infeccao');
    expect(visible).toContain('localidade_provavel_infeccao');

    const hidden = visibleFields(MALARIA_BODY_SCHEMA, { caso_autoctone: '1' }).map((f) => f.code);
    expect(hidden).not.toContain('pais_provavel_infeccao');
  });

  it('MALARIA: sem "especie_plasmodium"/"gota_espessa_lamina"/"teste_rapido_tdr"/"pcr_biologia_molecular"/"evolucao_caso" (campos inventados na v1, não existem na ficha real)', () => {
    const codes = MALARIA_BODY_SCHEMA.groups.flatMap((g) => g.fields).map((f) => f.code);
    expect(codes).not.toContain('especie_plasmodium');
    expect(codes).not.toContain('gota_espessa_lamina');
    expect(codes).not.toContain('teste_rapido_tdr');
    expect(codes).not.toContain('pcr_biologia_molecular');
    expect(codes).not.toContain('evolucao_caso');
    expect(codes).toContain('resultado_exame');
    expect(codes).toContain('parasitemia_cruzes');
    expect(codes).toContain('tipo_lamina');
  });

  it('MALARIA: esquema de tratamento "Outro" (código 99) exige especificação por texto', () => {
    const semOutro = visibleFields(MALARIA_BODY_SCHEMA, { esquema_tratamento: '1' }).map((f) => f.code);
    expect(semOutro).not.toContain('esquema_tratamento_outro_especifique');
    const comOutro = visibleFields(MALARIA_BODY_SCHEMA, { esquema_tratamento: '99' }).map((f) => f.code);
    expect(comOutro).toContain('esquema_tratamento_outro_especifique');
  });

  it('CHAGAS: sem "fase_doenca"/"forma_clinica"/"ecg" (a ficha oficial é só Doença de Chagas AGUDA — não existe fase crônica no SINAN, reescrito em 2026-09-11)', () => {
    const codes = CHAGAS_BODY_SCHEMA.groups.flatMap((g) => g.fields).map((f) => f.code);
    expect(codes).not.toContain('fase_doenca');
    expect(codes).not.toContain('forma_clinica');
    expect(codes).not.toContain('ecg');
    expect(codes).toContain('parasitologico_direto');
    expect(codes).toContain('parasitologico_indireto');
  });

  it('CHAGAS: campos condicionais respeitam visibleWhen (vestígios, tratamento específico, evolução, autoctonia, modo outra)', () => {
    const semVestigios = visibleFields(CHAGAS_BODY_SCHEMA, { vestigios_triatomideos_intradomicilio: '2' }).map((f) => f.code);
    expect(semVestigios).not.toContain('data_encontro_vestigios');
    const comVestigios = visibleFields(CHAGAS_BODY_SCHEMA, { vestigios_triatomideos_intradomicilio: '1' }).map((f) => f.code);
    expect(comVestigios).toContain('data_encontro_vestigios');

    const semEspecifico = visibleFields(CHAGAS_BODY_SCHEMA, { tratamento_especifico: '2' }).map((f) => f.code);
    expect(semEspecifico).not.toContain('droga_tratamento_especifico');
    const comEspecifico = visibleFields(CHAGAS_BODY_SCHEMA, { tratamento_especifico: '1' }).map((f) => f.code);
    expect(comEspecifico).toContain('droga_tratamento_especifico');

    const obito = visibleFields(CHAGAS_BODY_SCHEMA, { evolucao_caso: '2' }).map((f) => f.code);
    expect(obito).toContain('data_obito');

    const naoAutoctone = visibleFields(CHAGAS_BODY_SCHEMA, { caso_autoctone: '2' }).map((f) => f.code);
    expect(naoAutoctone).toContain('municipio_provavel_infeccao');
    expect(naoAutoctone).toContain('distrito_provavel_infeccao');

    const modoOutra = visibleFields(CHAGAS_BODY_SCHEMA, { modo_provavel_infeccao: '6' }).map((f) => f.code);
    expect(modoOutra).toContain('modo_provavel_infeccao_outra_especifique');
  });

  it('schemaCode de cada schema bate com o código já cadastrado na migration 0080', () => {
    expect(MALARIA_BODY_SCHEMA.schemaCode).toBe('MALARIA');
    expect(CHAGAS_BODY_SCHEMA.schemaCode).toBe('CHAGAS');
  });
});
