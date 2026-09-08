import { describe, expect, it } from 'vitest';
import { validateFormValues } from '../clinical-forms/rules.js';
import { APAC_CLINICAL_FIELDS_SCHEMA, APAC_AUTHORIZATION_FIELDS_SCHEMA } from './apac-clinical-schema.js';

describe('APAC_CLINICAL_FIELDS_SCHEMA', () => {
  it('todo campo type=code tem pelo menos uma opção', () => {
    const codeFields = APAC_CLINICAL_FIELDS_SCHEMA.groups.flatMap((g) => g.fields).filter((f) => f.type === 'code');
    for (const field of codeFields) {
      expect(field.options?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it('exige descrição do diagnóstico e dados do solicitante', () => {
    const errors = validateFormValues(APAC_CLINICAL_FIELDS_SCHEMA, {});
    const missingFields = errors.map((e) => e.fieldCode);
    expect(missingFields).toEqual(
      expect.arrayContaining([
        'descricao_diagnostico',
        'profissional_solicitante_nome',
        'solicitante_tipo_documento',
        'solicitante_numero_documento',
        'data_solicitacao',
      ]),
    );
  });

  it('solicitação completa não gera erros (bloco de autorização não faz parte deste schema)', () => {
    const errors = validateFormValues(APAC_CLINICAL_FIELDS_SCHEMA, {
      descricao_diagnostico: 'x',
      profissional_solicitante_nome: 'Dr. Teste',
      solicitante_tipo_documento: 'cns',
      solicitante_numero_documento: '123456789012345',
      data_solicitacao: '2026-09-07',
    });
    expect(errors).toHaveLength(0);
  });
});

describe('APAC_AUTHORIZATION_FIELDS_SCHEMA', () => {
  it('exige profissional autorizador, data, número e período de validade da autorização', () => {
    const errors = validateFormValues(APAC_AUTHORIZATION_FIELDS_SCHEMA, {});
    const missingFields = errors.map((e) => e.fieldCode);
    expect(missingFields).toEqual(
      expect.arrayContaining([
        'profissional_autorizador_nome',
        'data_autorizacao',
        'numero_autorizacao_apac',
        'validade_inicio',
        'validade_fim',
      ]),
    );
  });

  it('autorização completa não gera erros', () => {
    const errors = validateFormValues(APAC_AUTHORIZATION_FIELDS_SCHEMA, {
      profissional_autorizador_nome: 'Dra. Teste',
      data_autorizacao: '2026-09-07',
      numero_autorizacao_apac: 'APAC-12345',
      validade_inicio: '2026-09-07',
      validade_fim: '2026-12-07',
    });
    expect(errors).toHaveLength(0);
  });
});
