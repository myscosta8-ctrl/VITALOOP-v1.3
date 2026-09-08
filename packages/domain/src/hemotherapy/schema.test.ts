import { describe, expect, it } from 'vitest';
import { visibleFields, validateFormValues } from '../clinical-forms/rules.js';
import { BLOOD_PRODUCT_REQUEST_SCHEMA } from './schema.js';

describe('BLOOD_PRODUCT_REQUEST_SCHEMA', () => {
  it('todo campo type=code tem pelo menos uma opção', () => {
    const codeFields = BLOOD_PRODUCT_REQUEST_SCHEMA.groups.flatMap((g) => g.fields).filter((f) => f.type === 'code');
    for (const field of codeFields) {
      expect(field.options?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it('sub-campos de "Programada" só aparecem quando urgencia_tipo = "programada"', () => {
    const visible = visibleFields(BLOOD_PRODUCT_REQUEST_SCHEMA, { urgencia_tipo: 'programada' }).map((f) => f.code);
    expect(visible).toContain('programada_subtipo');
    expect(visible).toContain('programada_data');

    const hidden = visibleFields(BLOOD_PRODUCT_REQUEST_SCHEMA, { urgencia_tipo: 'urgencia' }).map((f) => f.code);
    expect(hidden).not.toContain('programada_subtipo');
  });

  it('sub-campos de extrema urgência só aparecem quando autorizada = "1"', () => {
    const visible = visibleFields(BLOOD_PRODUCT_REQUEST_SCHEMA, { extrema_urgencia_autorizada: '1' }).map((f) => f.code);
    expect(visible).toContain('coletado_por');

    const hidden = visibleFields(BLOOD_PRODUCT_REQUEST_SCHEMA, { extrema_urgencia_autorizada: '2' }).map((f) => f.code);
    expect(hidden).not.toContain('coletado_por');
  });

  it('exige médico solicitante, CRM, data da solicitação e as duas triagens obrigatórias', () => {
    const errors = validateFormValues(BLOOD_PRODUCT_REQUEST_SCHEMA, { urgencia_tipo: 'urgencia' });
    const missingFields = errors.map((e) => e.fieldCode);
    expect(missingFields).toEqual(
      expect.arrayContaining(['recebeu_transfusao', 'anticorpo_irregular', 'medico_solicitante_nome', 'medico_solicitante_crm', 'data_solicitacao']),
    );
  });
});
