import { describe, expect, it } from 'vitest';
import { AppError } from '@vitaloop/shared';
import { validateVitalSignsRecordInput } from './rules.js';
import type { VitalSignsRecordInput } from './types.js';

const baseInput: VitalSignsRecordInput = {
  encounterId: 'enc-1',
  patientId: 'pat-1',
  source: 'consulta',
  vitals: {},
};

describe('validateVitalSignsRecordInput', () => {
  it('aceita uma reaferição com ao menos um sinal vital informado', () => {
    const result = validateVitalSignsRecordInput({ ...baseInput, vitals: { heartRate: 80 } });
    expect(result.vitals.heartRate).toBe(80);
  });

  it('rejeita uma reaferição totalmente vazia', () => {
    expect(() => validateVitalSignsRecordInput(baseInput)).toThrow(AppError);
  });

  it('rejeita valores fora do limite clínico (reaproveita validateVitalSigns da Triagem)', () => {
    expect(() =>
      validateVitalSignsRecordInput({ ...baseInput, vitals: { heartRate: 500 } }),
    ).toThrow(AppError);
  });

  it('normaliza e recorta as observações', () => {
    const result = validateVitalSignsRecordInput({
      ...baseInput,
      vitals: { temperature: 37.2 },
      notes: '  paciente refere melhora  ',
    });
    expect(result.notes).toBe('paciente refere melhora');
  });
});
