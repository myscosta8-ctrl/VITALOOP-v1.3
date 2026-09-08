import { describe, expect, it } from 'vitest';
import { isFieldVisible, sanitizeFormValues, validateFormValues, visibleFields } from './rules.js';
import type { ClinicalFormSchema } from './types.js';

const SIMPLE_SCHEMA: ClinicalFormSchema = {
  schemaCode: 'TESTE',
  groups: [
    {
      title: 'Grupo 1',
      fields: [
        {
          code: 'a',
          label: 'Campo A',
          type: 'code',
          required: true,
          options: [
            { code: '1', label: 'Sim' },
            { code: '2', label: 'Não' },
          ],
        },
        {
          code: 'b',
          label: 'Campo B (só se A=1)',
          type: 'text',
          visibleWhen: { fieldCode: 'a', equals: ['1'] },
        },
        { code: 'c', label: 'Campo C (número)', type: 'number' },
        { code: 'd', label: 'Campo D (data)', type: 'date' },
      ],
    },
  ],
};

describe('Clinical Forms Domain Rules (motor genérico)', () => {
  describe('isFieldVisible / visibleFields', () => {
    it('campo sem visibleWhen está sempre visível', () => {
      expect(isFieldVisible(SIMPLE_SCHEMA.groups[0]!.fields[0]!, {})).toBe(true);
    });

    it('campo com visibleWhen fica oculto se o campo controlador não bate', () => {
      const fieldB = SIMPLE_SCHEMA.groups[0]!.fields[1]!;
      expect(isFieldVisible(fieldB, {})).toBe(false);
      expect(isFieldVisible(fieldB, { a: '2' })).toBe(false);
      expect(isFieldVisible(fieldB, { a: '1' })).toBe(true);
    });

    it('visibleFields retorna só os campos visíveis pro estado atual', () => {
      expect(visibleFields(SIMPLE_SCHEMA, {}).map((f) => f.code)).toEqual(['a', 'c', 'd']);
      expect(visibleFields(SIMPLE_SCHEMA, { a: '1' }).map((f) => f.code)).toEqual(['a', 'b', 'c', 'd']);
    });
  });

  describe('validateFormValues', () => {
    it('acusa campo obrigatório visível e vazio', () => {
      const errors = validateFormValues(SIMPLE_SCHEMA, {});
      expect(errors).toHaveLength(1);
      expect(errors[0]!.fieldCode).toBe('a');
    });

    it('acusa código fora das opções do campo', () => {
      const errors = validateFormValues(SIMPLE_SCHEMA, { a: '9' });
      expect(errors.some((e) => e.fieldCode === 'a')).toBe(true);
    });

    it('não acusa erro em campo condicional oculto, mesmo com valor "sujo" de estado anterior', () => {
      // usuário preencheu B enquanto A=1, depois mudou A pra 2 — B fica oculto e não deve ser validado
      const errors = validateFormValues(SIMPLE_SCHEMA, { a: '2', b: 'texto antigo' });
      expect(errors).toHaveLength(0);
    });

    it('sem erros quando tudo preenchido certo', () => {
      expect(validateFormValues(SIMPLE_SCHEMA, { a: '1', b: 'ok' })).toHaveLength(0);
    });

    it('acusa campo number com valor não numérico', () => {
      const errors = validateFormValues(SIMPLE_SCHEMA, { a: '1', c: 'abc' });
      expect(errors.some((e) => e.fieldCode === 'c')).toBe(true);
    });

    it('aceita campo number com valor numérico válido', () => {
      const errors = validateFormValues(SIMPLE_SCHEMA, { a: '1', c: '42.5' });
      expect(errors.some((e) => e.fieldCode === 'c')).toBe(false);
    });

    it('acusa campo date com valor não parseável como data', () => {
      const errors = validateFormValues(SIMPLE_SCHEMA, { a: '1', d: 'não é uma data' });
      expect(errors.some((e) => e.fieldCode === 'd')).toBe(true);
    });

    it('aceita campo date com valor de data válido', () => {
      const errors = validateFormValues(SIMPLE_SCHEMA, { a: '1', d: '2026-09-06' });
      expect(errors.some((e) => e.fieldCode === 'd')).toBe(false);
    });

    it('acusa campo date com dia inexistente no calendário (Date.parse é permissivo demais pra isso)', () => {
      const errors = validateFormValues(SIMPLE_SCHEMA, { a: '1', d: '2026-02-30' });
      expect(errors.some((e) => e.fieldCode === 'd')).toBe(true);
    });

    it('acusa campo date fora do formato YYYY-MM-DD mesmo que pareça uma data', () => {
      const errors = validateFormValues(SIMPLE_SCHEMA, { a: '1', d: '09/06/2026' });
      expect(errors.some((e) => e.fieldCode === 'd')).toBe(true);
    });
  });

  describe('sanitizeFormValues', () => {
    it('remove valor de campo oculto pela condição de visibilidade', () => {
      const sanitized = sanitizeFormValues(SIMPLE_SCHEMA, { a: '2', b: 'texto antigo' });
      expect(sanitized).toEqual({ a: '2' });
    });

    it('mantém valor de campo visível', () => {
      const sanitized = sanitizeFormValues(SIMPLE_SCHEMA, { a: '1', b: 'ok' });
      expect(sanitized).toEqual({ a: '1', b: 'ok' });
    });

    it('remove strings vazias', () => {
      expect(sanitizeFormValues(SIMPLE_SCHEMA, { a: '' })).toEqual({});
    });
  });
});
