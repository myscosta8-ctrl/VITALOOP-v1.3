/**
 * Motor genérico de formulário clínico dirigido por schema — usado por
 * qualquer módulo cujos campos variam por tipo (doença notificável, tipo
 * de solicitação, etc.) sem um formato fixo em comum. Extraído do trabalho
 * original de campos clínicos do SINAN (módulo `notification`) porque o
 * mesmo problema estrutural apareceu num contexto totalmente diferente
 * (Solicitação de Sangue, Componentes e Derivados) — não é específico de
 * doença nem de notificação compulsória.
 *
 * Um único componente de tela (`DynamicClinicalForm` no `web`) lê um
 * `ClinicalFormSchema` e renderiza os campos certos, resolvendo
 * visibilidade condicional em tempo real.
 */

export type ClinicalFieldType = 'code' | 'text' | 'number' | 'date';

export interface ClinicalFieldOption {
  code: string; // valor gravado (ex.: "1")
  label: string; // texto da opção (ex.: "Sim")
}

/** Condição de visibilidade: campo só aparece se `fieldCode` tiver um dos `equals`. */
export interface ClinicalFieldVisibleWhen {
  fieldCode: string;
  equals: readonly string[];
}

export interface ClinicalFormField {
  code: string; // chave gravada no JSONB
  label: string;
  type: ClinicalFieldType;
  options?: readonly ClinicalFieldOption[]; // obrigatório quando type === 'code'
  maxLength?: number; // usado quando type === 'text'
  required?: boolean;
  visibleWhen?: ClinicalFieldVisibleWhen;
  helpText?: string;
}

export interface ClinicalFormFieldGroup {
  title: string;
  fields: readonly ClinicalFormField[];
}

export interface ClinicalFormSchema {
  schemaCode: string; // identifica o schema (ex.: código da doença, ou do tipo de solicitação)
  groups: readonly ClinicalFormFieldGroup[];
}

/** Valores preenchidos pelo profissional: código do campo -> valor gravado (string sempre, mesmo pra number/date). */
export type ClinicalFormValues = Record<string, string>;

export interface ClinicalFormFieldError {
  fieldCode: string;
  message: string;
}
