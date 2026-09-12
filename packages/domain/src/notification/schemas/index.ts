import type { SinanBodySchema } from '../types.js';
import { ANIMAIS_PECONHENTOS_BODY_SCHEMA } from './animais-peconhentos.js';
import { HANSENIASE_BODY_SCHEMA } from './hanseniase.js';
import { INTOXICACAO_EXOGENA_BODY_SCHEMA } from './intoxicacao-exogena.js';
import { SIFILIS_BODY_SCHEMA } from './sifilis.js';
import { TETANO_ACIDENTAL_BODY_SCHEMA } from './tetano-acidental.js';
import { ZIKA_BODY_SCHEMA } from './zika.js';

/**
 * Registro de schemas por doença. Só as fichas já mapeadas aparecem aqui —
 * `getBodySchema` retorna `undefined` pras demais, e a tela deve tratar
 * isso mostrando só o campo de observações em texto livre (fallback atual),
 * não travar o registro da notificação.
 */
export const SINAN_BODY_SCHEMAS: Readonly<Record<string, SinanBodySchema>> = {
  [ANIMAIS_PECONHENTOS_BODY_SCHEMA.schemaCode]: ANIMAIS_PECONHENTOS_BODY_SCHEMA,
  [ZIKA_BODY_SCHEMA.schemaCode]: ZIKA_BODY_SCHEMA,
  [HANSENIASE_BODY_SCHEMA.schemaCode]: HANSENIASE_BODY_SCHEMA,
  [SIFILIS_BODY_SCHEMA.schemaCode]: SIFILIS_BODY_SCHEMA,
  [TETANO_ACIDENTAL_BODY_SCHEMA.schemaCode]: TETANO_ACIDENTAL_BODY_SCHEMA,
  [INTOXICACAO_EXOGENA_BODY_SCHEMA.schemaCode]: INTOXICACAO_EXOGENA_BODY_SCHEMA,
};

export const getBodySchema = (diseaseCode: string): SinanBodySchema | undefined => SINAN_BODY_SCHEMAS[diseaseCode];

export {
  ANIMAIS_PECONHENTOS_BODY_SCHEMA,
  HANSENIASE_BODY_SCHEMA,
  INTOXICACAO_EXOGENA_BODY_SCHEMA,
  SIFILIS_BODY_SCHEMA,
  TETANO_ACIDENTAL_BODY_SCHEMA,
  ZIKA_BODY_SCHEMA,
};
