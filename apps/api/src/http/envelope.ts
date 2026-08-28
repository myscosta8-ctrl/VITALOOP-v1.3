/**
 * Envelopes padronizados de resposta (Doc 2 §31).
 * Nunca retornar stack trace ao cliente.
 */

import type { AppErrorShape } from '@vitaloop/shared';

export interface SuccessEnvelope<T> {
  readonly data: T;
  readonly meta?: Record<string, unknown>;
  readonly requestId: string;
}

export interface ErrorEnvelope {
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details?: ReadonlyArray<{ field?: string; issue: string }>;
    readonly requestId: string;
  };
}

export const success = <T>(
  data: T,
  requestId: string,
  meta?: Record<string, unknown>,
): SuccessEnvelope<T> => ({
  data,
  requestId,
  ...(meta ? { meta } : {}),
});

export const failure = (
  shape: AppErrorShape,
  requestId: string,
): ErrorEnvelope => ({
  error: {
    code: shape.code,
    message: shape.message,
    ...(shape.details ? { details: shape.details } : {}),
    requestId,
  },
});
