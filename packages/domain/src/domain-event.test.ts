import { describe, it, expect } from 'vitest';
import { createDomainEvent } from './domain-event.js';
import { isUuid } from '@vitaloop/shared';
import type { UUID } from '@vitaloop/shared';

const aggId = '22222222-2222-4222-8222-222222222222' as UUID;
const actor = '33333333-3333-4333-8333-333333333333' as UUID;
const fixedClock = () => new Date('2026-08-19T12:00:00.000Z');

describe('createDomainEvent', () => {
  it('produces an identifiable, timestamped event with required fields', () => {
    const e = createDomainEvent(
      {
        type: 'ExampleHappened',
        aggregateType: 'example',
        aggregateId: aggId,
        actorId: actor,
        payload: { foo: 'bar' },
        correlationId: aggId,
        idempotencyKey: 'op-1',
      },
      fixedClock,
    );

    expect(isUuid(e.eventId)).toBe(true);
    expect(e.type).toBe('ExampleHappened');
    expect(e.aggregateId).toBe(aggId);
    expect(e.actorId).toBe(actor);
    expect(e.occurredAt).toBe('2026-08-19T12:00:00.000Z');
    expect(e.schemaVersion).toBe(1);
    expect(e.correlationId).toBe(aggId);
    expect(e.idempotencyKey).toBe('op-1');
    expect(e.payload).toEqual({ foo: 'bar' });
  });

  it('generates a unique eventId per call', () => {
    const base = {
      type: 'X',
      aggregateType: 'example',
      aggregateId: aggId,
      actorId: actor,
      payload: {},
    };
    const a = createDomainEvent(base, fixedClock);
    const b = createDomainEvent(base, fixedClock);
    expect(a.eventId).not.toBe(b.eventId);
  });

  it('allows null actor only explicitly (system events)', () => {
    const e = createDomainEvent(
      {
        type: 'SystemTick',
        aggregateType: 'system',
        aggregateId: aggId,
        actorId: null,
        payload: {},
      },
      fixedClock,
    );
    expect(e.actorId).toBeNull();
  });
});
