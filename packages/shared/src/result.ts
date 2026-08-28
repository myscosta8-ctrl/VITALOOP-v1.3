/**
 * Result<T, E> — resultado explícito de operações que podem falhar.
 *
 * Fundação para tornar erros de domínio parte do contrato (Doc 2 §31/§34),
 * evitando exceções silenciosas em regras clínicas críticas.
 */

export type Ok<T> = { readonly ok: true; readonly value: T };
export type Err<E> = { readonly ok: false; readonly error: E };
export type Result<T, E> = Ok<T> | Err<E>;

export const ok = <T>(value: T): Ok<T> => ({ ok: true, value });
export const err = <E>(error: E): Err<E> => ({ ok: false, error });

export const isOk = <T, E>(r: Result<T, E>): r is Ok<T> => r.ok;
export const isErr = <T, E>(r: Result<T, E>): r is Err<E> => !r.ok;

/** Extrai o valor ou lança — usar apenas em bordas/testes, nunca em regra crítica. */
export const unwrap = <T, E>(r: Result<T, E>): T => {
  if (r.ok) return r.value;
  throw new Error(`Result unwrap on Err: ${JSON.stringify(r.error)}`);
};
