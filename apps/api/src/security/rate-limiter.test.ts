import { describe, it, expect } from 'vitest';
import { createRateLimiter } from './rate-limiter.js';

describe('createRateLimiter', () => {
  it('allows attempts up to the limit then blocks', () => {
    const now = 1000;
    const rl = createRateLimiter({ maxAttempts: 3, windowMs: 1000, clock: () => now });
    expect(rl.attempt('k').allowed).toBe(true);
    expect(rl.attempt('k').allowed).toBe(true);
    expect(rl.attempt('k').allowed).toBe(true);
    const fourth = rl.attempt('k');
    expect(fourth.allowed).toBe(false);
    expect(fourth.retryAfterMs).toBeGreaterThan(0);
  });

  it('resets the window after it elapses', () => {
    let now = 0;
    const rl = createRateLimiter({ maxAttempts: 1, windowMs: 100, clock: () => now });
    expect(rl.attempt('k').allowed).toBe(true);
    expect(rl.attempt('k').allowed).toBe(false);
    now = 200; // window elapsed
    expect(rl.attempt('k').allowed).toBe(true);
  });

  it('tracks keys independently', () => {
    const rl = createRateLimiter({ maxAttempts: 1, windowMs: 1000 });
    expect(rl.attempt('a').allowed).toBe(true);
    expect(rl.attempt('b').allowed).toBe(true);
    expect(rl.attempt('a').allowed).toBe(false);
  });

  it('reset() clears the key immediately', () => {
    const rl = createRateLimiter({ maxAttempts: 1, windowMs: 1000 });
    expect(rl.attempt('k').allowed).toBe(true);
    expect(rl.attempt('k').allowed).toBe(false);
    rl.reset('k');
    expect(rl.attempt('k').allowed).toBe(true);
  });
});
