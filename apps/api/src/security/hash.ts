/**
 * Hashing para minimização de dados (Doc 2 §52; Doc 1 §72 LGPD).
 * IP e tokens de sessão nunca são armazenados em claro.
 */

import { createHash } from 'node:crypto';

export const sha256Hex = (input: string): string =>
  createHash('sha256').update(input).digest('hex');
