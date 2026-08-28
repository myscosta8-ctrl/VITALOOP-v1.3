import { describe, it, expect } from 'vitest';
import {
  validateNursingRecordInput,
  validateMedicationScheduleInput,
  validateAdministerMedicationInput,
  calculateDefaultScheduleTimes,
} from './rules';
import { AppError } from '@vitaloop/shared';

describe('Módulo de Domínio — Enfermagem e Administração de Medicamentos', () => {
  it('1. validação de registro de enfermagem curto -> erro NURSING_CONTENT_TOO_SHORT', () => {
    expect(() =>
      validateNursingRecordInput({ recordType: 'annotation', content: 'abc' }),
    ).toThrowError(AppError);
  });

  it('2. validação de admissão sem justificativa mínima -> erro NURSING_ADMISSION_REASON_REQUIRED', () => {
    expect(() =>
      validateNursingRecordInput({ recordType: 'admission', content: 'Curto' }),
    ).toThrowError(AppError);
  });

  it('3. admissão válida -> sucesso', () => {
    expect(() =>
      validateNursingRecordInput({ recordType: 'admission', content: 'Paciente admitido no setor de observação adulto, BEG.' }),
    ).not.toThrow();
  });

  it('4. validação de aprazamento sem horários -> erro SCHEDULE_TIMES_REQUIRED', () => {
    expect(() => validateMedicationScheduleInput([])).toThrowError(AppError);
  });

  it('5. aprazamento válido -> sucesso', () => {
    expect(() => validateMedicationScheduleInput(['2026-08-26T20:00:00Z', '2026-08-27T04:00:00Z'])).not.toThrow();
  });

  it('6. recusa de administração sem justificativa (min 10 chars) -> erro MEDICATION_NON_ADMIN_REASON_REQUIRED', () => {
    expect(() =>
      validateAdministerMedicationInput({
        status: 'refused',
        nonAdminReason: 'Recusou',
        bedSideChecked: true,
      }),
    ).toThrowError(AppError);
  });

  it('7. administração autorizada com 5 certos (bedSideChecked = true) -> sucesso', () => {
    expect(() =>
      validateAdministerMedicationInput({
        status: 'administered',
        bedSideChecked: true,
      }),
    ).not.toThrow();
  });

  it('8. administração sem checagem beira-leito -> erro BEDSIDE_CHECK_REQUIRED', () => {
    expect(() =>
      validateAdministerMedicationInput({
        status: 'administered',
        bedSideChecked: false,
      }),
    ).toThrowError(AppError);
  });

  it('9. cálculo automático de aprazamento para 8/8h -> gera 3 horários', () => {
    const ref = new Date('2026-08-26T08:00:00Z');
    const times = calculateDefaultScheduleTimes('8/8h', ref);
    expect(times).toHaveLength(3);
    expect(times[0].toISOString()).toBe('2026-08-26T08:00:00.000Z');
    expect(times[1].toISOString()).toBe('2026-08-26T16:00:00.000Z');
    expect(times[2].toISOString()).toBe('2026-08-27T00:00:00.000Z');
  });
});
