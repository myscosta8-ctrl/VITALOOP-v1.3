/**
 * Infraestrutura de eventos de domínio (Doc 1 §66; Doc 2 §37/§38; Doc 4 §19).
 *
 * Eventos são a fonte única para Timeline, auditoria, notificações e integrações
 * (Doc 2 §38 — não criar segunda fonte de verdade). Esta é a estrutura genérica;
 * os tipos de evento concretos serão adicionados por cada módulo em fases futuras.
 */

import { newUuid, nowIso } from '@vitaloop/shared';
import type { IsoTimestamp, UUID } from '@vitaloop/shared';

export interface DomainEvent<TType extends string = string, TPayload = unknown> {
  readonly eventId: UUID;
  readonly type: TType;
  readonly aggregateType: string;
  readonly aggregateId: UUID;
  /** Identidade real do ator; null apenas para eventos de sistema legítimos. */
  readonly actorId: UUID | null;
  readonly occurredAt: IsoTimestamp;
  readonly payload: TPayload;
  /** Correlação da operação de origem (request/uso). */
  readonly correlationId?: UUID;
  /** Evento que causou este (encadeamento causal). */
  readonly causationId?: UUID;
  /** Versão do schema do evento — permite evolução. */
  readonly schemaVersion: number;
  /** Chave de idempotência da operação que originou o evento (Doc 2 §48). */
  readonly idempotencyKey?: string;
}

export interface CreateEventInput<TType extends string, TPayload> {
  readonly type: TType;
  readonly aggregateType: string;
  readonly aggregateId: UUID;
  readonly actorId: UUID | null;
  readonly payload: TPayload;
  readonly correlationId?: UUID;
  readonly causationId?: UUID;
  readonly schemaVersion?: number;
  readonly idempotencyKey?: string;
}

/**
 * Cria um DomainEvent com identidade e timestamp.
 * `clock` injetável para testes determinísticos.
 */
export const createDomainEvent = <TType extends string, TPayload>(
  input: CreateEventInput<TType, TPayload>,
  clock: () => Date = () => new Date(),
): DomainEvent<TType, TPayload> => ({
  eventId: newUuid(),
  type: input.type,
  aggregateType: input.aggregateType,
  aggregateId: input.aggregateId,
  actorId: input.actorId,
  occurredAt: nowIso(clock) as IsoTimestamp,
  payload: input.payload,
  schemaVersion: input.schemaVersion ?? 1,
  ...(input.correlationId !== undefined
    ? { correlationId: input.correlationId }
    : {}),
  ...(input.causationId !== undefined ? { causationId: input.causationId } : {}),
  ...(input.idempotencyKey !== undefined
    ? { idempotencyKey: input.idempotencyKey }
    : {}),
});
