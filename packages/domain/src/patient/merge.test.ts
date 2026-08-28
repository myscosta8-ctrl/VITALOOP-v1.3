import { describe, it, expect } from 'vitest';
import { isOk, isErr } from '@vitaloop/shared';
import { mergeRequestStateMachine } from './merge.js';
import type { IsoTimestamp, UUID } from '@vitaloop/shared';

const ctx = {
  actorId: '11111111-1111-4111-8111-111111111111' as UUID,
  occurredAt: '2026-08-20T12:00:00.000Z' as IsoTimestamp,
};

describe('mergeRequestStateMachine', () => {
  it('permite requested -> approved', () => {
    const r = mergeRequestStateMachine.transition('requested', 'APPROVE', ctx);
    expect(isOk(r)).toBe(true);
    if (isOk(r)) expect(r.value.to).toBe('approved');
  });

  it('permite requested -> rejected', () => {
    const r = mergeRequestStateMachine.transition('requested', 'REJECT', ctx);
    expect(isOk(r)).toBe(true);
    if (isOk(r)) expect(r.value.to).toBe('rejected');
  });

  it('rejeita transição a partir de approved (estado terminal para este domínio)', () => {
    const r = mergeRequestStateMachine.transition('approved', 'APPROVE', ctx);
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.code).toBe('STATE_INVALID_TRANSITION');
  });

  it('não expõe nenhuma transição para "executed" — execução do merge é NÃO DEFINIDO (decisão institucional pendente)', () => {
    expect(mergeRequestStateMachine.can('approved', 'APPROVE')).toBe(false);
    expect(mergeRequestStateMachine.can('rejected', 'APPROVE')).toBe(false);
    expect(mergeRequestStateMachine.target('requested', 'APPROVE')).toBe('approved');
    // Nenhuma transição declarada tem 'executed' como destino.
    expect(mergeRequestStateMachine.can('requested', 'REJECT')).toBe(true);
  });
});
