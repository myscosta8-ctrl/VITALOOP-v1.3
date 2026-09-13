import React from 'react';
import type { ClinicalFormField, ClinicalFormSchema, ClinicalFormValues } from '../lib/clinical-form-types.js';
import { Label } from './ui/label.js';
import { Input } from './ui/input.js';
import { Select } from './ui/select.js';
import { Textarea } from './ui/textarea.js';

interface DynamicClinicalFormProps {
  schema: ClinicalFormSchema;
  values: ClinicalFormValues;
  onChange: (values: ClinicalFormValues) => void;
  /** Prefixo do id/data-testid — evita colisão quando duas instâncias renderizam na mesma tela. Padrão: schema.schemaCode. */
  idPrefix?: string;
}

// Espelha packages/domain/src/clinical-forms/rules.ts#isFieldVisible — não
// importado (o `web` não depende de `@vitaloop/domain`, ver clinical-form-types.ts),
// mas precisa da mesma regra pra decidir o que mostrar em tempo real.
const isFieldVisible = (field: ClinicalFormField, values: ClinicalFormValues): boolean => {
  if (!field.visibleWhen) return true;
  const controllingValue = values[field.visibleWhen.fieldCode];
  if (controllingValue === undefined) return false;
  return field.visibleWhen.equals.includes(controllingValue);
};

// Campo 'text' sem limite (ou limite alto) é texto livre/descritivo — melhor
// UX como área de texto multi-linha do que um <input> de uma linha só.
// Limiar de 200 é heurístico (não vem do schema): abaixo disso presumimos
// um campo curto (nome, código); acima, texto descritivo.
const TEXTAREA_THRESHOLD = 200;

const FieldInput: React.FC<{
  field: ClinicalFormField;
  value: string;
  onChange: (value: string) => void;
  fieldId: string;
}> = ({ field, value, onChange, fieldId }) => {
  if (field.type === 'code') {
    return (
      <Select id={fieldId} value={value} onChange={(e) => onChange(e.target.value)} required={field.required}>
        <option value="">Selecione…</option>
        {field.options?.map((opt) => (
          <option key={opt.code} value={opt.code}>
            {opt.code} — {opt.label}
          </option>
        ))}
      </Select>
    );
  }

  if (field.type === 'date') {
    return <Input id={fieldId} type="date" value={value} onChange={(e) => onChange(e.target.value)} required={field.required} />;
  }

  if (field.type === 'number') {
    return <Input id={fieldId} type="number" value={value} onChange={(e) => onChange(e.target.value)} required={field.required} />;
  }

  if (!field.maxLength || field.maxLength > TEXTAREA_THRESHOLD) {
    return (
      <Textarea
        id={fieldId}
        rows={3}
        value={value}
        maxLength={field.maxLength}
        onChange={(e) => onChange(e.target.value)}
        required={field.required}
      />
    );
  }

  return (
    <Input
      id={fieldId}
      type="text"
      value={value}
      maxLength={field.maxLength}
      onChange={(e) => onChange(e.target.value)}
      required={field.required}
    />
  );
};

/**
 * Renderiza os campos de um formulário clínico a partir do schema — um
 * único componente pra qualquer tipo de documento cujos campos variam por
 * tipo (doença notificável, tipo de solicitação, etc.), não um formulário
 * por tipo. Resolve visibilidade condicional em tempo real (ex.: um campo
 * só aparece se outro campo tiver um valor específico).
 */
export const DynamicClinicalForm: React.FC<DynamicClinicalFormProps> = ({ schema, values, onChange, idPrefix }) => {
  const prefix = idPrefix ?? schema.schemaCode;
  const setFieldValue = (code: string, value: string) => {
    onChange({ ...values, [code]: value });
  };

  return (
    <div data-testid="dynamic-clinical-form" className="space-y-4">
      {schema.groups.map((group) => {
        const visibleFields = group.fields.filter((field) => isFieldVisible(field, values));
        if (visibleFields.length === 0) return null;

        return (
          <fieldset key={group.title} className="rounded-md border border-border p-3">
            <legend className="px-2 font-semibold text-foreground">{group.title}</legend>
            <div className="space-y-3">
              {visibleFields.map((field) => {
                const fieldId = `${prefix}-field-${field.code}`;
                return (
                  <div key={field.code} className="space-y-1.5">
                    <Label htmlFor={fieldId}>
                      {field.label}
                      {field.required ? ' *' : ''}
                    </Label>
                    <FieldInput field={field} value={values[field.code] ?? ''} onChange={(v) => setFieldValue(field.code, v)} fieldId={fieldId} />
                    {field.helpText && <p className="text-xs text-muted-foreground">{field.helpText}</p>}
                  </div>
                );
              })}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
};
