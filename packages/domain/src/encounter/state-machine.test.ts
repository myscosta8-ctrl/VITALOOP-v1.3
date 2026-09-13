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
    expect(isValidEncounterStatusTransition('in_consultation', 'post_consultation')).toBe(true);
    expect(isValidEncounterStatusTransition('in_consultation', 'completed')).toBe(true);
    expect(isValidEncounterStatusTransition('in_consultation', 'canceled')).toBe(true);
    expect(isValidEncounterStatusTransition('post_consultation', 'completed')).toBe(true);
    expect(isValidEncounterStatusTransition('post_consultation', 'canceled')).toBe(true);
  });

  // 'admitted' (internado): estado ativo de cuidado contínuo (migration
  // 0081/0082) — cobre o que ficou sem teste desde que o estado foi
  // introduzido: pode ser alcançado de in_consultation OU post_consultation,
  // permite auto-transição (evolução/reavaliação sem trocar de estado), só
  // sai para completed (nunca canceled — internação se encerra por alta/
  // óbito/transferência, não se "cancela"). A trava real de "precisa de
  // leito ativo" mora no banco (trigger guard_encounter_admission_transition,
  // não neste código puro), então não é testada aqui.
  it('permite internar (admitted) a partir de in_consultation ou post_consultation, e evoluir sem trocar de estado', () => {
    expect(isValidEncounterStatusTransition('in_consultation', 'admitted')).toBe(true);
    expect(isValidEncounterStatusTransition('post_consultation', 'admitted')).toBe(true);
    expect(isValidEncounterStatusTransition('admitted', 'admitted')).toBe(true);
  });

  it('só permite sair de admitted para completed (alta hospitalar) — nunca para canceled', () => {
    expect(isValidEncounterStatusTransition('admitted', 'completed')).toBe(true);
    expect(isValidEncounterStatusTransition('admitted', 'canceled')).toBe(false);
    expect(isValidEncounterStatusTransition('admitted', 'triage_pending')).toBe(false);
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

  it('exige sub-status ao mudar para post_consultation', () => {
    expect(() => assertValidEncounterStatusTransition('in_consultation', 'post_consultation')).toThrow(
      AppError,
    );
    expect(() =>
      assertValidEncounterStatusTransition('in_consultation', 'post_consultation', null, 'medicando'),
    ).not.toThrow();
  });

  it('permite concluir (completed) um atendimento internado sem exigir motivo de cancelamento ou sub-status', () => {
    expect(() => assertValidEncounterStatusTransition('admitted', 'completed')).not.toThrow();
    expect(() => assertValidEncounterStatusTransition('admitted', 'canceled', 'Qualquer motivo')).toThrow(
      AppError,
    );
  });
});
