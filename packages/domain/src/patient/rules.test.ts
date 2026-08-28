import { describe, it, expect } from 'vitest';
import { isOk, isErr } from '@vitaloop/shared';
import {
  assertAllergyContentUnchanged,
  assertNoImmutablePatientFieldsChanged,
  normalizePatientCreateInput,
  validateBirthDate,
  validateMergeRequestPatients,
  validatePatientActiveProblemCreateInput,
  validatePatientAllergyCreateInput,
  validatePatientAntecedentCreateInput,
  validatePatientContactCreateInput,
  validatePatientContinuousMedicationCreateInput,
} from './rules.js';
import type { UUID } from '@vitaloop/shared';

const fixedToday = () => new Date('2026-08-20T00:00:00.000Z');

describe('normalizePatientCreateInput — criação válida', () => {
  it('aceita cadastro mínimo válido (apenas nome)', () => {
    const r = normalizePatientCreateInput({ fullName: 'Maria Souza' }, fixedToday);
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.fullName).toBe('Maria Souza');
      expect(r.value.cpf).toBeNull();
      expect(r.value.cns).toBeNull();
    }
  });

  it('aceita cadastro completo com CPF/CNS/nascimento válidos', () => {
    const r = normalizePatientCreateInput(
      {
        fullName: '  João Pedro  ',
        cpf: '111.444.777-35',
        cns: '777082203934924',
        birthDate: '1990-01-01',
        sex: 'male',
      },
      fixedToday,
    );
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.fullName).toBe('João Pedro'); // trim aplicado
      expect(r.value.cpf).toBe('11144477735'); // normalizado (somente dígitos)
      expect(r.value.cns).toBe('777082203934924');
    }
  });

  it('rejeita nome ausente/vazio', () => {
    const r = normalizePatientCreateInput({ fullName: '' }, fixedToday);
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.code).toBe('PATIENT_REQUIRED_FIELD');
  });

  it('rejeita CPF inválido mesmo com o resto do cadastro correto', () => {
    const r = normalizePatientCreateInput({ fullName: 'Ana', cpf: '123' }, fixedToday);
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.code).toBe('PATIENT_INVALID_CPF');
  });

  it('rejeita CNS inválido mesmo com o resto do cadastro correto', () => {
    const r = normalizePatientCreateInput({ fullName: 'Ana', cns: '123' }, fixedToday);
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.code).toBe('PATIENT_INVALID_CNS');
  });
});

describe('validateBirthDate', () => {
  it('aceita data passada válida', () => {
    expect(isOk(validateBirthDate('1990-01-01', fixedToday))).toBe(true);
  });

  it('aceita ausência de data', () => {
    expect(isOk(validateBirthDate(null, fixedToday))).toBe(true);
  });

  it('rejeita data futura (espelha patients_birth_date_not_future_ck)', () => {
    const r = validateBirthDate('2099-01-01', fixedToday);
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.code).toBe('PATIENT_INVALID_BIRTH_DATE');
  });

  it('aceita hoje exatamente (não é "futuro")', () => {
    expect(isOk(validateBirthDate('2026-08-20', fixedToday))).toBe(true);
  });

  it('rejeita formato inválido', () => {
    expect(isErr(validateBirthDate('20/08/2026', fixedToday))).toBe(true);
  });
});

describe('assertNoImmutablePatientFieldsChanged', () => {
  it('permite atualização de campos editáveis', () => {
    const r = assertNoImmutablePatientFieldsChanged({ phone: '11999998888' });
    expect(isOk(r)).toBe(true);
  });

  it('rejeita tentativa de alterar medicalRecordNumber', () => {
    const r = assertNoImmutablePatientFieldsChanged({ medicalRecordNumber: '2026000099' });
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.code).toBe('PATIENT_IMMUTABLE_FIELD');
  });

  it('rejeita tentativa de alterar id/createdAt/createdBy', () => {
    for (const field of ['id', 'createdAt', 'createdBy']) {
      const r = assertNoImmutablePatientFieldsChanged({ [field]: 'qualquer' });
      expect(isErr(r)).toBe(true);
    }
  });
});

describe('assertAllergyContentUnchanged — espelha o trigger forbid_allergy_content_update (T5 real no banco)', () => {
  const patientId = '11111111-1111-4111-8111-111111111111' as UUID;
  const base = {
    substance: 'Dipirona',
    reaction: 'Urticária' as string | null,
    severity: 'moderate' as const,
    patientId,
  };

  it('permite quando substance/reaction/severity/patientId não mudam (apenas status muda em outro lugar)', () => {
    const r = assertAllergyContentUnchanged(base, { ...base });
    expect(isOk(r)).toBe(true);
  });

  it('bloqueia alteração de substance', () => {
    const r = assertAllergyContentUnchanged(base, { ...base, substance: 'Penicilina' });
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.code).toBe('PATIENT_IMMUTABLE_FIELD');
  });

  it('bloqueia alteração de reaction', () => {
    const r = assertAllergyContentUnchanged(base, { ...base, reaction: 'Anafilaxia' });
    expect(isErr(r)).toBe(true);
  });

  it('bloqueia alteração de severity', () => {
    const r = assertAllergyContentUnchanged(base, { ...base, severity: 'severe' });
    expect(isErr(r)).toBe(true);
  });
});

describe('satélites — validação de campos obrigatórios', () => {
  it('contato: exige name e phone', () => {
    expect(isErr(validatePatientContactCreateInput({ name: '', phone: '123' }))).toBe(true);
    expect(isErr(validatePatientContactCreateInput({ name: 'Maria', phone: '' }))).toBe(true);
    expect(
      isOk(validatePatientContactCreateInput({ name: 'Maria', phone: '11999998888' })),
    ).toBe(true);
  });

  it('contato de emergência: isEmergency é aceito como parte do mesmo tipo (PAT-008)', () => {
    const r = validatePatientContactCreateInput({
      name: 'Maria',
      phone: '11999998888',
      isEmergency: true,
    });
    expect(isOk(r)).toBe(true);
    if (isOk(r)) expect(r.value.isEmergency).toBe(true);
  });

  it('alergia: exige substance (nunca assume "nega" sem registro explícito — Doc 1 §11)', () => {
    expect(isErr(validatePatientAllergyCreateInput({ substance: '' }))).toBe(true);
    expect(isOk(validatePatientAllergyCreateInput({ substance: 'Dipirona' }))).toBe(true);
  });

  it('antecedente: exige description', () => {
    expect(isErr(validatePatientAntecedentCreateInput({ description: '' }))).toBe(true);
    expect(
      isOk(validatePatientAntecedentCreateInput({ description: 'Hipertensão' })),
    ).toBe(true);
  });

  it('medicamento contínuo: exige medication', () => {
    expect(
      isErr(validatePatientContinuousMedicationCreateInput({ medication: '' })),
    ).toBe(true);
    expect(
      isOk(validatePatientContinuousMedicationCreateInput({ medication: 'Losartana' })),
    ).toBe(true);
  });

  it('problema ativo: exige description', () => {
    expect(isErr(validatePatientActiveProblemCreateInput({ description: '' }))).toBe(true);
    expect(
      isOk(validatePatientActiveProblemCreateInput({ description: 'Diabetes tipo 2' })),
    ).toBe(true);
  });
});

describe('validateMergeRequestPatients', () => {
  it('rejeita origem e destino iguais (espelha patient_merge_distinct_ck)', () => {
    const id = '11111111-1111-4111-8111-111111111111' as UUID;
    const r = validateMergeRequestPatients(id, id);
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.code).toBe('PATIENT_MERGE_SAME_PATIENT');
  });

  it('aceita origem e destino distintos', () => {
    const a = '11111111-1111-4111-8111-111111111111' as UUID;
    const b = '22222222-2222-4222-8222-222222222222' as UUID;
    expect(isOk(validateMergeRequestPatients(a, b))).toBe(true);
  });
});
