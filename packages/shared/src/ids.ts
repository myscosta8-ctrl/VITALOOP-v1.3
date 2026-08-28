/**
 * Identificadores e utilidades de tempo.
 * UUID v4 gerado via Web Crypto (disponível em Node >=20 e no browser).
 */

export type UUID = string & { readonly __brand: 'UUID' };

export const newUuid = (): UUID => crypto.randomUUID() as UUID;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const isUuid = (v: unknown): v is UUID =>
  typeof v === 'string' && UUID_RE.test(v);

/** Timestamp ISO-8601 em UTC. Fonte única de "agora" para testabilidade. */
export type IsoTimestamp = string & { readonly __brand: 'IsoTimestamp' };

export const nowIso = (clock: () => Date = () => new Date()): IsoTimestamp =>
  clock().toISOString() as IsoTimestamp;
