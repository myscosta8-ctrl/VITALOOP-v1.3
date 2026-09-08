import { describe, expect, it } from 'vitest';
import { validateFormValues } from '../clinical-forms/rules.js';
import { THERAPEUTIC_PLAN_SCHEMA } from './schema.js';

describe('THERAPEUTIC_PLAN_SCHEMA', () => {
  it('todo campo type=code tem pelo menos uma opção', () => {
    const codeFields = THERAPEUTIC_PLAN_SCHEMA.groups.flatMap((g) => g.fields).filter((f) => f.type === 'code');
    for (const field of codeFields) {
      expect(field.options?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it('exige diagnóstico, motivo, objetivos, tempo previsto e dados do médico responsável', () => {
    const errors = validateFormValues(THERAPEUTIC_PLAN_SCHEMA, {});
    const missingFields = errors.map((e) => e.fieldCode);
    expect(missingFields).toEqual(
      expect.arrayContaining([
        'diagnostico_principal',
        'motivo_internacao',
        'objetivos_terapeutica',
        'tempo_internacao_previsto_dias',
        'medico_responsavel_nome',
        'medico_responsavel_crm',
        'data_emissao',
      ]),
    );
  });

  it('não exige nenhum protocolo institucional nem membro da equipe multidisciplinar', () => {
    const errors = validateFormValues(THERAPEUTIC_PLAN_SCHEMA, {
      diagnostico_principal: 'x',
      motivo_internacao: 'x',
      objetivos_terapeutica: 'x',
      tempo_internacao_previsto_dias: '5',
      medico_responsavel_nome: 'Dr. Teste',
      medico_responsavel_crm: '12345',
      data_emissao: '2026-09-07',
    });
    expect(errors).toHaveLength(0);
  });
});
