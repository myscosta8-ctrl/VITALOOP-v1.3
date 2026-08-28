import { describe, expect, it } from 'vitest';
import { AppError } from '@vitaloop/shared';
import {
  assertValidEncounterStatusTransition,
  isTerminalEncounterStatus,
  isValidEncounterStatusTransition,
} from './state-machine.js';

describe('Encounter State Machine (ENC-006)', () => {
  it('valida estados terminais corretamente', () => {
    expect(isTerminalEncounterStatus('completed')).toBe(true);
    expect(isTerminalEncounterStatus('canceled')).toBe(true);
    expect(isTerminalEncounterStatus('created')).toBe(false);
    expect(isTerminalEncounterStatus('in_consultation')).toBe(false);
  });

  it('permite transições de estado válidas', () => {
    expect(isValidEncounterStatusTransition('created', 'triage_pending')).toBe(true);
    expect(isValidEncounterStatusTransition('triage_pending', 'triaged')).toBe(true);
    expect(isValidEncounterStatusTransition('triaged', 'consultation_pending')).toBe(true);
    expect(isValidEncounterStatusTransition('consultation_pending', 'in_consultation')).toBe(true);
    expect(isValidEncounterStatusTransition('in_consultation', 'completed')).toBe(true);
    expect(isValidEncounterStatusTransition('in_consultation', 'canceled')).toBe(true);
  });

  it('rejeita transições de estado inválidas', () => {
    expect(isValidEncounterStatusTransition('created', 'completed')).toBe(false);
    expect(isValidEncounterStatusTransition('triaged', 'in_consultation')).toBe(false);
    expect(isValidEncounterStatusTransition('completed', 'in_consultation')).toBe(false);
    expect(isValidEncounterStatusTransition('canceled', 'created')).toBe(false);
  });

  it('assertValidEncounterStatusTransition lança exceção em transições proibidas', () => {
    expect(() => assertValidEncounterStatusTransition('created', 'completed')).toThrow(AppError);
    expect(() => assertValidEncounterStatusTransition('completed', 'in_consultation')).toThrow(AppError);
  });

  it('exige motivo de cancelamento ao mudar para canceled', () => {
    expect(() => assertValidEncounterStatusTransition('created', 'canceled', '')).toThrow(AppError);
    expect(() => assertValidEncounterStatusTransition('created', 'canceled', '  ')).toThrow(AppError);
    expect(() =>
      assertValidEncounterStatusTransition('created', 'canceled', 'Desistência do paciente'),
    ).not.toThrow();
  });
});
