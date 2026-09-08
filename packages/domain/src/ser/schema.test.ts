import { describe, expect, it } from 'vitest';
import { validateFormValues, visibleFields } from '../clinical-forms/rules.js';
import { SER_UPDATE_SCHEMA } from './schema.js';

describe('SER_UPDATE_SCHEMA', () => {
  it('todo campo type=code tem pelo menos uma opção', () => {
    const codeFields = SER_UPDATE_SCHEMA.groups.flatMap((g) => g.fields).filter((f) => f.type === 'code');
    for (const field of codeFields) {
      expect(field.options?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it('"novo diagnóstico" só aparece quando houve mudança de diagnóstico', () => {
    const visible = visibleFields(SER_UPDATE_SCHEMA, { mudanca_diagnostico: 'sim' }).map((f) => f.code);
    expect(visible).toContain('mudanca_diagnostico_para');

    const hidden = visibleFields(SER_UPDATE_SCHEMA, { mudanca_diagnostico: 'nao' }).map((f) => f.code);
    expect(hidden).not.toContain('mudanca_diagnostico_para');
  });

  it('exige número da solicitação, diagnóstico regulado, evolução, conduta e dados do médico', () => {
    const errors = validateFormValues(SER_UPDATE_SCHEMA, { mudanca_diagnostico: 'nao' });
    const missingFields = errors.map((e) => e.fieldCode);
    expect(missingFields).toEqual(
      expect.arrayContaining([
        'numero_solicitacao_ser',
        'diagnostico_regulado',
        'evolucao_diaria',
        'conduta',
        'medico_responsavel_nome',
        'medico_responsavel_crm',
        'data_evolucao',
      ]),
    );
  });

  it('exige o novo diagnóstico quando houve mudança, mesmo sem os outros sinais vitais', () => {
    const errors = validateFormValues(SER_UPDATE_SCHEMA, { mudanca_diagnostico: 'sim' });
    expect(errors.map((e) => e.fieldCode)).toContain('mudanca_diagnostico_para');
  });
});
