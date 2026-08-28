import { describe, it, expect } from 'vitest';
import { defineStateMachine } from './state-machine.js';
import { isErr, isOk } from '@vitaloop/shared';
import type { IsoTimestamp, UUID } from '@vitaloop/shared';

// Máquina de exemplo APENAS para testar o motor genérico (não é definição clínica).
type S = 'DRAFT' | 'ACTIVE' | 'CLOSED';
type E = 'ACTIVATE' | 'CLOSE';

const sm = defineStateMachine<S, E>({
  name: 'example',
  initial: 'DRAFT',
  states: ['DRAFT', 'ACTIVE', 'CLOSED'],
  events: ['ACTIVATE', 'CLOSE'],
  transitions: {
    DRAFT: { ACTIVATE: 'ACTIVE' },
    ACTIVE: { CLOSE: 'CLOSED' },
  },
});

const ctx = {
  actorId: '11111111-1111-4111-8111-111111111111' as UUID,
  occurredAt: '2026-08-19T12:00:00.000Z' as IsoTimestamp,
};

describe('StateMachine', () => {
  it('allows a declared transition and produces an auditable record', () => {
    const r = sm.transition('DRAFT', 'ACTIVATE', ctx);
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.from).toBe('DRAFT');
      expect(r.value.to).toBe('ACTIVE');
      expect(r.value.event).toBe('ACTIVATE');
      expect(r.value.actorId).toBe(ctx.actorId);
      expect(r.value.machine).toBe('example');
    }
  });

  it('rejects an undeclared transition with a stable code', () => {
    const r = sm.transition('DRAFT', 'CLOSE', ctx);
    expect(isErr(r)).toBe(true);
    if (isErr(r)) {
      expect(r.error.code).toBe('STATE_INVALID_TRANSITION');
      expect(r.error.httpStatus).toBe(422);
    }
  });

  it('rejects an unknown source state', () => {
    const r = sm.transition('NOPE' as S, 'ACTIVATE', ctx);
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.code).toBe('STATE_UNKNOWN_SOURCE');
  });

  it('can()/target() reflect the transition table', () => {
    expect(sm.can('DRAFT', 'ACTIVATE')).toBe(true);
    expect(sm.can('CLOSED', 'ACTIVATE')).toBe(false);
    expect(sm.target('ACTIVE', 'CLOSE')).toBe('CLOSED');
    expect(sm.target('CLOSED', 'CLOSE')).toBeUndefined();
  });
});
