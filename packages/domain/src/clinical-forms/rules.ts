import type {
  ClinicalFormField,
  ClinicalFormFieldError,
  ClinicalFormSchema,
  ClinicalFormValues,
} from './types.js';

/** Um campo está visível se não tem `visibleWhen`, ou se o campo controlador tem um dos valores esperados. */
export const isFieldVisible = (field: ClinicalFormField, values: ClinicalFormValues): boolean => {
  if (!field.visibleWhen) return true;
  const controllingValue = values[field.visibleWhen.fieldCode];
  if (controllingValue === undefined) return false;
  return field.visibleWhen.equals.includes(controllingValue);
};

/** Todos os campos visíveis de um schema, na ordem declarada, resolvendo condicionais em cascata. */
export const visibleFields = (schema: ClinicalFormSchema, values: ClinicalFormValues): ClinicalFormField[] => {
  const all = schema.groups.flatMap((group) => group.fields);
  return all.filter((field) => isFieldVisible(field, values));
};

// `Date.parse` é permissivo demais pra validar campo `date` (aceita formatos
// soltos e, em alguns motores, "corrige" datas fora do calendário como
// 2026-02-30 em vez de rejeitar) — exige exatamente `YYYY-MM-DD` e confere
// se os componentes batem de volta com o que foi construído, rejeitando
// dias inexistentes.
const isValidCalendarDate = (value: string): boolean => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [, yearStr, monthStr, dayStr] = match;
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};

/**
 * Valida os valores preenchidos contra o schema: obrigatoriedade (só pra
 * campos visíveis) e se o código escolhido existe entre as opções do campo.
 * Não valida campos ocultos por `visibleWhen` — um valor deixado de um
 * estado anterior (ex.: usuário mudou de opção) é ignorado, não gera erro.
 */
export const validateFormValues = (
  schema: ClinicalFormSchema,
  values: ClinicalFormValues,
): ClinicalFormFieldError[] => {
  const errors: ClinicalFormFieldError[] = [];

  for (const field of visibleFields(schema, values)) {
    const value = values[field.code];

    if (field.required && (value === undefined || value === '')) {
      errors.push({ fieldCode: field.code, message: `${field.label} é obrigatório.` });
      continue;
    }

    if (value === undefined || value === '') continue;

    if (field.type === 'code' && field.options && !field.options.some((opt) => opt.code === value)) {
      errors.push({ fieldCode: field.code, message: `${field.label}: código "${value}" não é uma opção válida.` });
    }

    if (field.type === 'text' && field.maxLength && value.length > field.maxLength) {
      errors.push({ fieldCode: field.code, message: `${field.label} excede o tamanho máximo de ${field.maxLength} caracteres.` });
    }

    if (field.type === 'number' && Number.isNaN(Number(value))) {
      errors.push({ fieldCode: field.code, message: `${field.label} deve ser um número válido.` });
    }

    if (field.type === 'date' && !isValidCalendarDate(value)) {
      errors.push({ fieldCode: field.code, message: `${field.label} deve ser uma data válida.` });
    }
  }

  return errors;
};

/**
 * Remove do objeto de valores os campos que não pertencem ao schema ou que
 * estão ocultos pela condição de visibilidade atual — usado antes de gravar,
 * pra não persistir lixo de um campo condicional que o usuário preencheu e
 * depois tornou irrelevante ao mudar a opção que o controla.
 */
export const sanitizeFormValues = (
  schema: ClinicalFormSchema,
  values: ClinicalFormValues,
): ClinicalFormValues => {
  const visible = new Set(visibleFields(schema, values).map((f) => f.code));
  const result: ClinicalFormValues = {};
  for (const [code, value] of Object.entries(values)) {
    if (visible.has(code) && value !== '') result[code] = value;
  }
  return result;
};
