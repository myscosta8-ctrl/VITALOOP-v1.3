import React from 'react';
import type { ClinicalFormField, ClinicalFormSchema, ClinicalFormValues } from '../lib/clinical-form-types.js';

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

const fieldStyle: React.CSSProperties = { marginBottom: 'var(--space-3)' };
const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: 'var(--space-1)',
  color: 'var(--color-text)',
  fontSize: '0.9em',
};
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: 'var(--space-2)',
  border: '1px solid var(--color-border)',
  borderRadius: 4,
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
};

const FieldInput: React.FC<{
  field: ClinicalFormField;
  value: string;
  onChange: (value: string) => void;
  fieldId: string;
}> = ({ field, value, onChange, fieldId }) => {
  if (field.type === 'code') {
    return (
      <select id={fieldId} value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle} required={field.required}>
        <option value="">Selecione…</option>
        {field.options?.map((opt) => (
          <option key={opt.code} value={opt.code}>
            {opt.code} — {opt.label}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === 'date') {
    return (
      <input id={fieldId} type="date" value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle} required={field.required} />
    );
  }

  if (field.type === 'number') {
    return (
      <input id={fieldId} type="number" value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle} required={field.required} />
    );
  }

  return (
    <input
      id={fieldId}
      type="text"
      value={value}
      maxLength={field.maxLength}
      onChange={(e) => onChange(e.target.value)}
      style={inputStyle}
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
    <div data-testid="dynamic-clinical-form">
      {schema.groups.map((group) => {
        const visibleFields = group.fields.filter((field) => isFieldVisible(field, values));
        if (visibleFields.length === 0) return null;

        return (
          <fieldset
            key={group.title}
            style={{
              marginBottom: 'var(--space-4)',
              padding: 'var(--space-3)',
              border: '1px solid var(--color-border)',
              borderRadius: 6,
            }}
          >
            <legend style={{ color: 'var(--color-text)', fontWeight: 600, padding: '0 var(--space-2)' }}>
              {group.title}
            </legend>
            {visibleFields.map((field) => {
              const fieldId = `${prefix}-field-${field.code}`;
              return (
                <div key={field.code} style={fieldStyle}>
                  <label htmlFor={fieldId} style={labelStyle}>
                    {field.label}
                    {field.required ? ' *' : ''}
                  </label>
                  <FieldInput field={field} value={values[field.code] ?? ''} onChange={(v) => setFieldValue(field.code, v)} fieldId={fieldId} />
                  {field.helpText && (
                    <p style={{ color: 'var(--color-text-faint)', fontSize: '0.8em', margin: 'var(--space-1) 0 0' }}>
                      {field.helpText}
                    </p>
                  )}
                </div>
              );
            })}
          </fieldset>
        );
      })}
    </div>
  );
};
