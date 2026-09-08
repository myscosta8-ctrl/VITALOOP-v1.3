import { describe, expect, it } from 'vitest';
import { visibleFields } from '../clinical-forms/rules.js';
import { ANIMAIS_PECONHENTOS_BODY_SCHEMA } from './schemas/animais-peconhentos.js';

// Testes do motor genérico (isFieldVisible/validate/sanitize) vivem em
// clinical-forms/rules.test.ts — aqui só o schema real desta ficha.
describe('ANIMAIS_PECONHENTOS_BODY_SCHEMA', () => {
  it('campo 46 (Serpente) só aparece quando campo 45 = "1"', () => {
    expect(
      visibleFields(ANIMAIS_PECONHENTOS_BODY_SCHEMA, { '45': '1' }).some((f) => f.code === '46'),
    ).toBe(true);
    expect(
      visibleFields(ANIMAIS_PECONHENTOS_BODY_SCHEMA, { '45': '2' }).some((f) => f.code === '46'),
    ).toBe(false);
  });

  it('sub-itens do campo 41 (Manifestações Locais) só aparecem quando campo 40 = "1"', () => {
    const visible = visibleFields(ANIMAIS_PECONHENTOS_BODY_SCHEMA, { '40': '1' }).map((f) => f.code);
    expect(visible).toContain('41_dor');
    expect(visible).toContain('41_edema');

    const hidden = visibleFields(ANIMAIS_PECONHENTOS_BODY_SCHEMA, { '40': '2' }).map((f) => f.code);
    expect(hidden).not.toContain('41_dor');
  });

  it('todo campo type=code tem pelo menos uma opção', () => {
    const codeFields = ANIMAIS_PECONHENTOS_BODY_SCHEMA.groups.flatMap((g) => g.fields).filter((f) => f.type === 'code');
    for (const field of codeFields) {
      expect(field.options?.length ?? 0).toBeGreaterThan(0);
    }
  });
});
