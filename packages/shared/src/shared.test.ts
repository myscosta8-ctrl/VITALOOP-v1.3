import { describe, it, expect } from 'vitest';
import { ok, err, isOk, isErr, unwrap } from './result.js';
import { AppError, ErrorCategory, httpStatusForCategory } from './errors.js';
import { newUuid, isUuid, nowIso } from './ids.js';

describe('Result', () => {
  it('ok carries value and narrows', () => {
    const r = ok(42);
    expect(isOk(r)).toBe(true);
    expect(isErr(r)).toBe(false);
    if (isOk(r)) expect(r.value).toBe(42);
    expect(unwrap(r)).toBe(42);
  });

  it('err carries error and unwrap throws', () => {
    const r = err('boom');
    expect(isErr(r)).toBe(true);
    expect(() => unwrap(r)).toThrow(/Err/);
  });
});

describe('AppError', () => {
  it('maps category to stable HTTP status', () => {
    const e = new AppError({
      category: ErrorCategory.STATE,
      code: 'STATE_INVALID_TRANSITION',
      message: 'invalid',
    });
    expect(e.httpStatus).toBe(422);
    expect(e.httpStatus).toBe(httpStatusForCategory.STATE);
    expect(e.toJSON().code).toBe('STATE_INVALID_TRANSITION');
  });

  it('access category is 403 and auth is 401', () => {
    expect(httpStatusForCategory.ACCESS).toBe(403);
    expect(httpStatusForCategory.AUTH).toBe(401);
  });
});

describe('ids', () => {
  it('generates valid uuid v4', () => {
    const id = newUuid();
    expect(isUuid(id)).toBe(true);
  });

  it('rejects non-uuid', () => {
    expect(isUuid('not-a-uuid')).toBe(false);
    expect(isUuid(123)).toBe(false);
  });

  it('nowIso uses injected clock', () => {
    const fixed = new Date('2026-08-19T12:00:00.000Z');
    expect(nowIso(() => fixed)).toBe('2026-08-19T12:00:00.000Z');
  });
});
