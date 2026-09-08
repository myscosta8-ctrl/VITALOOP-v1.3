import { describe, expect, it } from 'vitest';
import { validateFormValues, visibleFields } from '../clinical-forms/rules.js';
import { SBAR_TRANSFER_SCHEMA } from './schema.js';

describe('SBAR_TRANSFER_SCHEMA', () => {
  it('todo campo type=code tem pelo menos uma opção', () => {
    const codeFields = SBAR_TRANSFER_SCHEMA.groups.flatMap((g) => g.fields).filter((f) => f.type === 'code');
    for (const field of codeFields) {
      expect(field.options?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it('"local do curativo" só aparece quando há curativo', () => {
    const visible = visibleFields(SBAR_TRANSFER_SCHEMA, { curativo: 'sim' }).map((f) => f.code);
    expect(visible).toContain('curativo_local');

    const hidden = visibleFields(SBAR_TRANSFER_SCHEMA, { curativo: 'nao' }).map((f) => f.code);
    expect(hidden).not.toContain('curativo_local');
  });

  it('"detalhe da intercorrência" só aparece quando houve intercorrência no transporte', () => {
    const visible = visibleFields(SBAR_TRANSFER_SCHEMA, { intercorrencia_transporte: 'sim' }).map((f) => f.code);
    expect(visible).toContain('intercorrencia_transporte_detalhe');

    const hidden = visibleFields(SBAR_TRANSFER_SCHEMA, { intercorrencia_transporte: 'nao' }).map((f) => f.code);
    expect(hidden).not.toContain('intercorrencia_transporte_detalhe');
  });

  it('exige setor de origem/destino, situação clínica e rastreabilidade dos enfermeiros', () => {
    const errors = validateFormValues(SBAR_TRANSFER_SCHEMA, {
      curativo: 'nao',
      intercorrencia_transporte: 'nao',
    });
    const missingFields = errors.map((e) => e.fieldCode);
    expect(missingFields).toEqual(
      expect.arrayContaining([
        'setor_origem',
        'setor_destino',
        'data_transferencia',
        'horario_transferencia',
        'impressao_diagnostica',
        'alergia',
        'nivel_consciencia',
        'suporte_ventilatorio',
        'enfermeiro_responsavel_transporte',
        'enfermeiro_responsavel_recebimento',
      ]),
    );
  });
});
