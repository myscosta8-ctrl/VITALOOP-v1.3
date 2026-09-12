import type { SinanBodySchema } from '../types.js';
import { ANIMAIS_PECONHENTOS_BODY_SCHEMA } from './animais-peconhentos.js';
import { CHAGAS_BODY_SCHEMA } from './chagas.js';
import { CHIKUNGUNYA_BODY_SCHEMA } from './chikungunya.js';
import { COQUELUCHE_BODY_SCHEMA } from './coqueluche.js';
import { COVID19_BODY_SCHEMA } from './covid19.js';
import { DENGUE_BODY_SCHEMA } from './dengue.js';
import { FEBRE_AMARELA_BODY_SCHEMA } from './febre-amarela.js';
import { HANSENIASE_BODY_SCHEMA } from './hanseniase.js';
import { HEPATITES_VIRAIS_BODY_SCHEMA } from './hepatites-virais.js';
import { INTOXICACAO_EXOGENA_BODY_SCHEMA } from './intoxicacao-exogena.js';
import { LEPTOSPIROSE_BODY_SCHEMA } from './leptospirose.js';
import { MALARIA_BODY_SCHEMA } from './malaria.js';
import { MENINGITE_BODY_SCHEMA } from './meningite.js';
import { RAIVA_HUMANA_BODY_SCHEMA } from './raiva-humana.js';
import { SARAMPO_BODY_SCHEMA } from './sarampo.js';
import { SIFILIS_BODY_SCHEMA } from './sifilis.js';
import { SRAG_BODY_SCHEMA } from './srag.js';
import { TETANO_ACIDENTAL_BODY_SCHEMA } from './tetano-acidental.js';
import { TUBERCULOSE_BODY_SCHEMA } from './tuberculose.js';
import { VIOLENCIA_INTERPESSOAL_BODY_SCHEMA } from './violencia-interpessoal.js';
import { ZIKA_BODY_SCHEMA } from './zika.js';

/**
 * Registro de schemas por doença. Só as fichas já mapeadas aparecem aqui —
 * `getBodySchema` retorna `undefined` pras demais, e a tela deve tratar
 * isso mostrando só o campo de observações em texto livre (fallback atual),
 * não travar o registro da notificação.
 */
export const SINAN_BODY_SCHEMAS: Readonly<Record<string, SinanBodySchema>> = {
  [ANIMAIS_PECONHENTOS_BODY_SCHEMA.schemaCode]: ANIMAIS_PECONHENTOS_BODY_SCHEMA,
  [DENGUE_BODY_SCHEMA.schemaCode]: DENGUE_BODY_SCHEMA,
  [CHIKUNGUNYA_BODY_SCHEMA.schemaCode]: CHIKUNGUNYA_BODY_SCHEMA,
  [ZIKA_BODY_SCHEMA.schemaCode]: ZIKA_BODY_SCHEMA,
  [COVID19_BODY_SCHEMA.schemaCode]: COVID19_BODY_SCHEMA,
  [SRAG_BODY_SCHEMA.schemaCode]: SRAG_BODY_SCHEMA,
  [SARAMPO_BODY_SCHEMA.schemaCode]: SARAMPO_BODY_SCHEMA,
  [COQUELUCHE_BODY_SCHEMA.schemaCode]: COQUELUCHE_BODY_SCHEMA,
  [MENINGITE_BODY_SCHEMA.schemaCode]: MENINGITE_BODY_SCHEMA,
  [TUBERCULOSE_BODY_SCHEMA.schemaCode]: TUBERCULOSE_BODY_SCHEMA,
  [HANSENIASE_BODY_SCHEMA.schemaCode]: HANSENIASE_BODY_SCHEMA,
  [SIFILIS_BODY_SCHEMA.schemaCode]: SIFILIS_BODY_SCHEMA,
  [HEPATITES_VIRAIS_BODY_SCHEMA.schemaCode]: HEPATITES_VIRAIS_BODY_SCHEMA,
  [LEPTOSPIROSE_BODY_SCHEMA.schemaCode]: LEPTOSPIROSE_BODY_SCHEMA,
  [FEBRE_AMARELA_BODY_SCHEMA.schemaCode]: FEBRE_AMARELA_BODY_SCHEMA,
  [TETANO_ACIDENTAL_BODY_SCHEMA.schemaCode]: TETANO_ACIDENTAL_BODY_SCHEMA,
  [RAIVA_HUMANA_BODY_SCHEMA.schemaCode]: RAIVA_HUMANA_BODY_SCHEMA,
  [INTOXICACAO_EXOGENA_BODY_SCHEMA.schemaCode]: INTOXICACAO_EXOGENA_BODY_SCHEMA,
  [VIOLENCIA_INTERPESSOAL_BODY_SCHEMA.schemaCode]: VIOLENCIA_INTERPESSOAL_BODY_SCHEMA,
  [MALARIA_BODY_SCHEMA.schemaCode]: MALARIA_BODY_SCHEMA,
  [CHAGAS_BODY_SCHEMA.schemaCode]: CHAGAS_BODY_SCHEMA,
};

export const getBodySchema = (diseaseCode: string): SinanBodySchema | undefined => SINAN_BODY_SCHEMAS[diseaseCode];

export {
  ANIMAIS_PECONHENTOS_BODY_SCHEMA,
  CHAGAS_BODY_SCHEMA,
  CHIKUNGUNYA_BODY_SCHEMA,
  COQUELUCHE_BODY_SCHEMA,
  COVID19_BODY_SCHEMA,
  DENGUE_BODY_SCHEMA,
  FEBRE_AMARELA_BODY_SCHEMA,
  HANSENIASE_BODY_SCHEMA,
  HEPATITES_VIRAIS_BODY_SCHEMA,
  INTOXICACAO_EXOGENA_BODY_SCHEMA,
  LEPTOSPIROSE_BODY_SCHEMA,
  MALARIA_BODY_SCHEMA,
  MENINGITE_BODY_SCHEMA,
  RAIVA_HUMANA_BODY_SCHEMA,
  SARAMPO_BODY_SCHEMA,
  SIFILIS_BODY_SCHEMA,
  SRAG_BODY_SCHEMA,
  TETANO_ACIDENTAL_BODY_SCHEMA,
  TUBERCULOSE_BODY_SCHEMA,
  VIOLENCIA_INTERPESSOAL_BODY_SCHEMA,
  ZIKA_BODY_SCHEMA,
};
