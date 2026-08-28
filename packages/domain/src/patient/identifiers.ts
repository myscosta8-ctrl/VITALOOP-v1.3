/**
 * Normalização e validação de CPF/CNS (Doc 1 §11: "validação de identificadores").
 *
 * O banco (migration 0017) já valida FORMATO via CHECK (11/15 dígitos). Esta
 * camada adiciona validação de DÍGITO VERIFICADOR — algoritmo público e
 * padronizado (Receita Federal/DATASUS), não uma regra institucional
 * inventada por este projeto. Nenhuma unicidade é decidida aqui (isso é
 * responsabilidade da detecção de duplicidade — Doc 1 §11 exige confirmação
 * humana, não bloqueio automático; ver migration 0019 e `duplicate-detection.ts`).
 */

import type { Result } from '@vitaloop/shared';
import { err, ok } from '@vitaloop/shared';
import type { AppError } from '@vitaloop/shared';
import { invalidCnsError, invalidCpfError } from './errors.js';

/** Remove tudo que não for dígito — tolera entrada formatada (ex.: "123.456.789-09"). */
export const extractDigits = (raw: string): string => raw.replace(/\D/g, '');

/**
 * Valida o dígito verificador de CPF (algoritmo módulo 11 da Receita
 * Federal). Rejeita sequências de dígito único (ex.: "000.000.000-00"),
 * que passam pela fórmula mas nunca são CPFs válidos emitidos.
 */
export const isValidCpfChecksum = (digits: string): boolean => {
  if (digits.length !== 11 || !/^\d{11}$/.test(digits)) return false;
  const d = digits.split('').map(Number);
  if (new Set(d).size === 1) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += (d[i] ?? 0) * (10 - i);
  let rest = sum % 11;
  const dv1 = rest < 2 ? 0 : 11 - rest;
  if (dv1 !== d[9]) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += (d[i] ?? 0) * (11 - i);
  rest = sum % 11;
  const dv2 = rest < 2 ? 0 : 11 - rest;
  return dv2 === d[10];
};

/**
 * Normaliza (extrai dígitos) e valida CPF. `null`/vazio é aceito como
 * "não informado" (Doc 1 §11) e retorna `ok(null)` — CPF não é obrigatório.
 */
export const normalizeAndValidateCpf = (
  raw: string | null | undefined,
): Result<string | null, AppError> => {
  if (raw === null || raw === undefined || raw.trim() === '') return ok(null);
  const digits = extractDigits(raw);
  if (!isValidCpfChecksum(digits)) return err(invalidCpfError(raw));
  return ok(digits);
};

/**
 * Valida o dígito verificador de CNS "provisório" (prefixo 7/8/9) —
 * algoritmo módulo 11 sobre os 15 dígitos, padronizado pelo DATASUS.
 *
 * CNS "definitivo" (prefixo 1/2, derivado do PIS/PASEP) usa um algoritmo de
 * dígito verificador mais complexo que NÃO é implementado aqui — risco de
 * implementar incorretamente um checksum a partir de memória é maior do que
 * o benefício; para esse prefixo, valida-se apenas o FORMATO (15 dígitos,
 * já garantido pelo banco), registrado honestamente como limitação técnica,
 * não como validação completa. Ver `docs/TRACEABILITY_PHASE_2.md` PAT-004.
 */
export const isValidCnsProvisionalChecksum = (digits: string): boolean => {
  if (digits.length !== 15 || !/^\d{15}$/.test(digits)) return false;
  if (!['7', '8', '9'].includes(digits.charAt(0))) return false;
  const d = digits.split('').map(Number);
  let sum = 0;
  for (let i = 0; i < 15; i++) sum += (d[i] ?? 0) * (15 - i);
  return sum % 11 === 0;
};

/**
 * Normaliza (extrai dígitos) e valida CNS. Para prefixo 1/2 (definitivo),
 * apenas o formato é verificado (ver limitação documentada acima). Para
 * prefixo 7/8/9 (provisório), o dígito verificador é validado de fato.
 * Qualquer outro prefixo é rejeitado (não é um CNS reconhecido).
 */
export const normalizeAndValidateCns = (
  raw: string | null | undefined,
): Result<string | null, AppError> => {
  if (raw === null || raw === undefined || raw.trim() === '') return ok(null);
  const digits = extractDigits(raw);
  if (digits.length !== 15 || !/^\d{15}$/.test(digits)) return err(invalidCnsError(raw));

  const prefix = digits.charAt(0);
  if (['7', '8', '9'].includes(prefix)) {
    if (!isValidCnsProvisionalChecksum(digits)) return err(invalidCnsError(raw));
    return ok(digits);
  }
  if (['1', '2'].includes(prefix)) {
    // Formato validado; dígito verificador do CNS definitivo não implementado (ver acima).
    return ok(digits);
  }
  return err(invalidCnsError(raw));
};
