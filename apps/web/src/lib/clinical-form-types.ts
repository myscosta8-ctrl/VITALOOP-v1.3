// Espelha @vitaloop/domain's ClinicalForm* (packages/domain/src/clinical-forms/types.ts)
// — redeclarado aqui, não importado (o `web` não depende de `@vitaloop/domain`
// hoje), só reflete a forma dos dados que a API já valida e retorna. Motor
// genérico de formulário clínico dirigido por schema, usado por qualquer
// feature cujos campos variam por tipo (doença notificável, tipo de
// solicitação, etc.) sem forma fixa em comum — ver DynamicClinicalForm.tsx.

export type ClinicalFieldType = 'code' | 'text' | 'number' | 'date';

export interface ClinicalFieldOption {
  code: string;
  label: string;
}

export interface ClinicalFieldVisibleWhen {
  fieldCode: string;
  equals: readonly string[];
}

export interface ClinicalFormField {
  code: string;
  label: string;
  type: ClinicalFieldType;
  options?: readonly ClinicalFieldOption[];
  maxLength?: number;
  required?: boolean;
  visibleWhen?: ClinicalFieldVisibleWhen;
  helpText?: string;
}

export interface ClinicalFormFieldGroup {
  title: string;
  fields: readonly ClinicalFormField[];
}

export interface ClinicalFormSchema {
  schemaCode: string;
  groups: readonly ClinicalFormFieldGroup[];
}

export type ClinicalFormValues = Record<string, string>;
