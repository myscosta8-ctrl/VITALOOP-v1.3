import { describe, expect, it } from 'vitest';
import { validateFormValues } from '../clinical-forms/rules.js';
import { AIH_CLINICAL_FIELDS_SCHEMA, AIH_AUTHORIZATION_FIELDS_SCHEMA } from './aih-clinical-schema.js';

describe('AIH_CLINICAL_FIELDS_SCHEMA', () => {
  it('todo campo type=code tem pelo menos uma opção', () => {
    const codeFields = AIH_CLINICAL_FIELDS_SCHEMA.groups.flatMap((g) => g.fields).filter((f) => f.type === 'code');
    for (const field of codeFields) {
      expect(field.options?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it('exige história da doença atual, estado geral, clínica/especialidade, caráter e dados do solicitante', () => {
    const errors = validateFormValues(AIH_CLINICAL_FIELDS_SCHEMA, {});
    const missingFields = errors.map((e) => e.fieldCode);
    expect(missingFields).toEqual(
      expect.arrayContaining([
        'historia_doenca_atual',
        'estado_geral_admissao',
        'clinica_especialidade',
        'carater_internacao',
        'medico_solicitante_nome',
        'medico_solicitante_crm',
        'data_solicitacao',
      ]),
    );
  });

  it('solicitação completa não gera erros (número de autorização não faz parte deste schema)', () => {
    const errors = validateFormValues(AIH_CLINICAL_FIELDS_SCHEMA, {
      historia_doenca_atual: 'x',
      estado_geral_admissao: 'x',
      clinica_especialidade: 'x',
      carater_internacao: 'urgencia',
      medico_solicitante_nome: 'Dr. Teste',
      medico_solicitante_crm: '12345',
      data_solicitacao: '2026-09-07',
    });
    expect(errors).toHaveLength(0);
  });
});

describe('AIH_AUTHORIZATION_FIELDS_SCHEMA', () => {
  it('exige profissional autorizador, número de autorização e data', () => {
    const errors = validateFormValues(AIH_AUTHORIZATION_FIELDS_SCHEMA, {});
    const missingFields = errors.map((e) => e.fieldCode);
    expect(missingFields).toEqual(
      expect.arrayContaining(['profissional_autorizador_nome', 'numero_autorizacao', 'data_autorizacao']),
    );
  });

  it('autorização completa não gera erros', () => {
    const errors = validateFormValues(AIH_AUTHORIZATION_FIELDS_SCHEMA, {
      profissional_autorizador_nome: 'Dra. Teste',
      numero_autorizacao: 'AIH-12345',
      data_autorizacao: '2026-09-07',
    });
    expect(errors).toHaveLength(0);
  });
});
