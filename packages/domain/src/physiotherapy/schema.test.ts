import { describe, expect, it } from 'vitest';
import { validateFormValues, visibleFields } from '../clinical-forms/rules.js';
import { PHYSIOTHERAPY_ASSESSMENT_SCHEMA } from './schema.js';

describe('PHYSIOTHERAPY_ASSESSMENT_SCHEMA', () => {
  it('todo campo type=code tem pelo menos uma opção', () => {
    const codeFields = PHYSIOTHERAPY_ASSESSMENT_SCHEMA.groups.flatMap((g) => g.fields).filter((f) => f.type === 'code');
    for (const field of codeFields) {
      expect(field.options?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it('sempre exige o tipo de registro e os dados do fisioterapeuta', () => {
    const errors = validateFormValues(PHYSIOTHERAPY_ASSESSMENT_SCHEMA, {});
    const missingFields = errors.map((e) => e.fieldCode);
    expect(missingFields).toEqual(
      expect.arrayContaining(['tipo_registro', 'fisioterapeuta_nome', 'fisioterapeuta_crefito', 'data_registro']),
    );
  });

  it('tipo_registro=avaliacao_inicial mostra só os campos de avaliação, não os de evolução', () => {
    const visible = visibleFields(PHYSIOTHERAPY_ASSESSMENT_SCHEMA, { tipo_registro: 'avaliacao_inicial' }).map((f) => f.code);
    expect(visible).toContain('motivo_encaminhamento');
    expect(visible).toContain('diagnostico_cinetico_funcional');
    expect(visible).toContain('nivel_dependencia_funcional');
    expect(visible).not.toContain('evolucao_fisioterapeutica');
    expect(visible).not.toContain('conduta_fisioterapeutica');
  });

  it('tipo_registro=evolucao mostra só os campos de evolução, não os de avaliação inicial', () => {
    const visible = visibleFields(PHYSIOTHERAPY_ASSESSMENT_SCHEMA, { tipo_registro: 'evolucao' }).map((f) => f.code);
    expect(visible).toContain('evolucao_fisioterapeutica');
    expect(visible).toContain('conduta_fisioterapeutica');
    expect(visible).not.toContain('motivo_encaminhamento');
    expect(visible).not.toContain('diagnostico_cinetico_funcional');
  });

  it('avaliação inicial completa não gera erros', () => {
    const errors = validateFormValues(PHYSIOTHERAPY_ASSESSMENT_SCHEMA, {
      tipo_registro: 'avaliacao_inicial',
      motivo_encaminhamento: 'Redução de mobilidade pós-cirúrgica',
      nivel_dependencia_funcional: 'dependencia_parcial',
      diagnostico_cinetico_funcional: 'Redução de mobilidade em MMII',
      objetivos_tratamento: 'Restaurar marcha independente',
      fisioterapeuta_nome: 'Fulano',
      fisioterapeuta_crefito: '12345',
      data_registro: '2026-09-07',
    });
    expect(errors).toHaveLength(0);
  });

  it('evolução completa não gera erros nem exige campos da avaliação inicial', () => {
    const errors = validateFormValues(PHYSIOTHERAPY_ASSESSMENT_SCHEMA, {
      tipo_registro: 'evolucao',
      evolucao_fisioterapeutica: 'Paciente colaborativo, realizou exercícios propostos.',
      conduta_fisioterapeutica: 'Cinesioterapia motora e respiratória.',
      fisioterapeuta_nome: 'Fulano',
      fisioterapeuta_crefito: '12345',
      data_registro: '2026-09-07',
    });
    expect(errors).toHaveLength(0);
  });
});
