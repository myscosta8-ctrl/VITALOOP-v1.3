import { describe, it, expect } from 'vitest';
import { isOk, isErr } from '@vitaloop/shared';
import {
  extractDigits,
  isValidCpfChecksum,
  isValidCnsProvisionalChecksum,
  normalizeAndValidateCpf,
  normalizeAndValidateCns,
} from './identifiers.js';

describe('extractDigits', () => {
  it('remove pontuação de CPF/CNS formatado', () => {
    expect(extractDigits('111.444.777-35')).toBe('11144477735');
  });
});

describe('isValidCpfChecksum', () => {
  it('aceita um CPF de teste publicamente conhecido como válido', () => {
    expect(isValidCpfChecksum('11144477735')).toBe(true);
  });

  it('rejeita dígito verificador incorreto', () => {
    expect(isValidCpfChecksum('11144477736')).toBe(false);
  });

  it('rejeita sequência de dígito único (nunca é CPF real emitido)', () => {
    expect(isValidCpfChecksum('00000000000')).toBe(false);
    expect(isValidCpfChecksum('11111111111')).toBe(false);
  });

  it('rejeita tamanho diferente de 11 dígitos', () => {
    expect(isValidCpfChecksum('123')).toBe(false);
  });
});

describe('normalizeAndValidateCpf', () => {
  it('aceita CPF válido formatado e retorna somente dígitos', () => {
    const r = normalizeAndValidateCpf('111.444.777-35');
    expect(isOk(r)).toBe(true);
    if (isOk(r)) expect(r.value).toBe('11144477735');
  });

  it('rejeita CPF inválido com erro de domínio estável', () => {
    const r = normalizeAndValidateCpf('123.456.789-00');
    expect(isErr(r)).toBe(true);
    if (isErr(r)) {
      expect(r.error.code).toBe('PATIENT_INVALID_CPF');
      expect(r.error.category).toBe('VALIDATION');
    }
  });

  it('aceita ausência de CPF (não é obrigatório — Doc 1 §11)', () => {
    expect(isOk(normalizeAndValidateCpf(null))).toBe(true);
    expect(isOk(normalizeAndValidateCpf(undefined))).toBe(true);
    expect(isOk(normalizeAndValidateCpf('   '))).toBe(true);
  });
});

describe('isValidCnsProvisionalChecksum (prefixo 7/8/9)', () => {
  it('aceita um CNS provisório com dígito verificador correto (gerado e verificado por algoritmo módulo 11)', () => {
    expect(isValidCnsProvisionalChecksum('777082203934924')).toBe(true);
  });

  it('rejeita dígito verificador incorreto', () => {
    expect(isValidCnsProvisionalChecksum('777082203934925')).toBe(false);
  });

  it('rejeita prefixo fora de 7/8/9', () => {
    expect(isValidCnsProvisionalChecksum('177082203934924')).toBe(false);
  });
});

describe('normalizeAndValidateCns', () => {
  it('aceita CNS provisório válido', () => {
    const r = normalizeAndValidateCns('777082203934924');
    expect(isOk(r)).toBe(true);
    if (isOk(r)) expect(r.value).toBe('777082203934924');
  });

  it('rejeita CNS provisório com dígito verificador incorreto', () => {
    const r = normalizeAndValidateCns('777082203934925');
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.code).toBe('PATIENT_INVALID_CNS');
  });

  it('rejeita formato inválido (tamanho errado)', () => {
    const r = normalizeAndValidateCns('12345');
    expect(isErr(r)).toBe(true);
  });

  it('aceita formato de CNS definitivo (prefixo 1/2) — apenas validação de formato, dígito verificador não implementado (limitação documentada)', () => {
    const r = normalizeAndValidateCns('123456789012345');
    expect(isOk(r)).toBe(true);
  });

  it('rejeita prefixo não reconhecido (nem 1/2 nem 7/8/9)', () => {
    const r = normalizeAndValidateCns('523456789012345');
    expect(isErr(r)).toBe(true);
  });

  it('aceita ausência de CNS (não é obrigatório)', () => {
    expect(isOk(normalizeAndValidateCns(null))).toBe(true);
  });
});
