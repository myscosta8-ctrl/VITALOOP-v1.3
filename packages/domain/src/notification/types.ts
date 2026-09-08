/**
 * Tipos de domínio para Notificação Compulsória de Agravos (campos
 * clínicos/epidemiológicos específicos de cada ficha SINAN, campos 17+ do
 * impresso oficial — o bloco de identificação, campos 1-16, é tratado à
 * parte no gerador de PDF do cabeçalho, não aqui).
 *
 * O motor de schema em si (campo/opção/condição de visibilidade) é
 * genérico — ver `@vitaloop/domain`'s módulo `clinical-forms`, reaproveitado
 * também por outros formulários clínicos (ex.: Solicitação de Sangue). Os
 * apelidos `Sinan*` abaixo só dão um nome mais claro no contexto de
 * notificação; a forma é idêntica a `ClinicalForm*`.
 */
import type {
  ClinicalFieldOption,
  ClinicalFieldType,
  ClinicalFieldVisibleWhen,
  ClinicalFormField,
  ClinicalFormFieldError,
  ClinicalFormFieldGroup,
  ClinicalFormSchema,
  ClinicalFormValues,
} from '../clinical-forms/types.js';

export type SinanFieldType = ClinicalFieldType;
export type SinanFieldOption = ClinicalFieldOption;
export type SinanFieldVisibleWhen = ClinicalFieldVisibleWhen;
export type SinanBodyField = ClinicalFormField;
export type SinanBodyFieldGroup = ClinicalFormFieldGroup;
export type SinanBodySchema = ClinicalFormSchema;
export type SinanBodyFieldValues = ClinicalFormValues;
export type SinanBodyFieldError = ClinicalFormFieldError;
