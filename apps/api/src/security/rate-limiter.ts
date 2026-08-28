/**
 * Rate limiting / proteção contra brute-force (Doc 2 §28; Doc 3 SEC-011/SEC-012).
 *
 * Janela deslizante simples em memória, por identificador (ex.: IP, e-mail).
 * Complementa (não substitui) o bloqueio persistido em app.login_attempts —
 * este limitador reage mais rápido e não depende do banco estar disponível.
 */

export interface RateLimiter {
  /** Registra uma tentativa e retorna se ela deve ser permitida. */
  attempt(key: string): { allowed: boolean; retryAfterMs: number };
  reset(key: string): void;
}

export interface RateLimiterOptions {
  readonly maxAttempts: number;
  readonly windowMs: number;
  readonly clock?: () => number;
}

export const createRateLimiter = (opts: RateLimiterOptions): RateLimiter => {
  const clock = opts.clock ?? (() => Date.now());
  const hits = new Map<string, number[]>();

  const prune = (key: string): number[] => {
    const now = clock();
    const list = (hits.get(key) ?? []).filter((t) => now - t < opts.windowMs);
    hits.set(key, list);
    return list;
  };

  return {
    attempt(key: string) {
      const list = prune(key);
      if (list.length >= opts.maxAttempts) {
        const oldest = list[0] ?? clock();
        return { allowed: false, retryAfterMs: Math.max(0, opts.windowMs - (clock() - oldest)) };
      }
      list.push(clock());
      hits.set(key, list);
      return { allowed: true, retryAfterMs: 0 };
    },
    reset(key: string) {
      hits.delete(key);
    },
  };
};
