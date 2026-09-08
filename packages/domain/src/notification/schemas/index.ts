import type { SinanBodySchema } from '../types.js';
import { ANIMAIS_PECONHENTOS_BODY_SCHEMA } from './animais-peconhentos.js';

/**
 * Registro de schemas por doença. Só as fichas já mapeadas aparecem aqui —
 * `getBodySchema` retorna `undefined` pras demais, e a tela deve tratar
 * isso mostrando só o campo de observações em texto livre (fallback atual),
 * não travar o registro da notificação.
 */
export const SINAN_BODY_SCHEMAS: Readonly<Record<string, SinanBodySchema>> = {
  [ANIMAIS_PECONHENTOS_BODY_SCHEMA.schemaCode]: ANIMAIS_PECONHENTOS_BODY_SCHEMA,
};

export const getBodySchema = (diseaseCode: string): SinanBodySchema | undefined => SINAN_BODY_SCHEMAS[diseaseCode];

export { ANIMAIS_PECONHENTOS_BODY_SCHEMA };
