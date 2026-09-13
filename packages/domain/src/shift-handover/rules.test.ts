import { describe, expect, it } from 'vitest';
import { AppError } from '@vitaloop/shared';
import { validateShiftHandoverCreateInput } from './rules.js';

describe('validateShiftHandoverCreateInput', () => {
  it('rejeita resumo vazio ou curto demais', () => {
    expect(() =>
      validateShiftHandoverCreateInput({ shiftPeriod: 'manha', summaryNotes: 'curto' }),
    ).toThrowError(AppError);
  });

  it('aceita resumo válido e recorta campos', () => {
    const result = validateShiftHandoverCreateInput({
      shiftPeriod: 'noite',
      summaryNotes: '  Setor estável, sem intercorrências no plantão.  ',
      pendingTasks: '  reavaliar leito 4  ',
    });
    expect(result.summaryNotes).toBe('Setor estável, sem intercorrências no plantão.');
    expect(result.pendingTasks).toBe('reavaliar leito 4');
  });

  it('rejeita censo negativo', () => {
    expect(() =>
      validateShiftHandoverCreateInput({ shiftPeriod: 'tarde', summaryNotes: 'Resumo válido de plantão.', patientCensus: -1 }),
    ).toThrowError(AppError);
  });
});
