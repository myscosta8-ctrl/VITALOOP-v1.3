import { describe, it, expect } from 'vitest';
import { normalizeText } from './normalize-text.js';

describe('normalizeText', () => {
  it('remove acentos, caixa e espaços extras — mesmo caso testado real no banco (T3)', () => {
    expect(normalizeText('José da Silva')).toBe('jose da silva');
    expect(normalizeText('jose   DA SÍLVA')).toBe('jose da silva');
  });

  it('colapsa espaços internos múltiplos', () => {
    expect(normalizeText('Maria    Souza')).toBe('maria souza');
  });

  it('remove espaços nas pontas', () => {
    expect(normalizeText('  Ana  ')).toBe('ana');
  });

  it('retorna null para vazio/whitespace/nulo/indefinido', () => {
    expect(normalizeText('')).toBeNull();
    expect(normalizeText('   ')).toBeNull();
    expect(normalizeText(null)).toBeNull();
    expect(normalizeText(undefined)).toBeNull();
  });
});
