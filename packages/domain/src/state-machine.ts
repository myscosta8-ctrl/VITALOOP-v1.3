/**
 * Máquina de estados genérica (Doc 1 §13/§68; Doc 2 §36; Doc 4 §18).
 *
 * - Toda transição declara: origem, destino, evento causador, ator, timestamp, motivo.
 * - Transições inválidas são REJEITADAS com erro estável (não lançam por padrão).
 * - Produz um TransitionRecord auditável — insumo para auditoria/eventos/timeline.
 *
 * Esta fundação NÃO define estados clínicos concretos; cada agregado (atendimento,
 * prescrição, leito...) fornecerá sua própria definição em fases posteriores.
 */

import { AppError, ErrorCategory, type Result, ok, err } from '@vitaloop/shared';
import type { IsoTimestamp, UUID } from '@vitaloop/shared';

/** Definição declarativa: para cada estado, os pares evento -> estado destino permitidos. */
export type TransitionTable<S extends string, E extends string> = {
  readonly [State in S]?: {
    readonly [Event in E]?: S;
  };
};

export interface StateMachineDefinition<S extends string, E extends string> {
  readonly name: string;
  readonly initial: S;
  readonly states: readonly S[];
  readonly events: readonly E[];
  readonly transitions: TransitionTable<S, E>;
}

export interface TransitionContext {
  /** Identidade real do ator (Doc 4 §15). Obrigatória para rastreabilidade. */
  readonly actorId: UUID;
  readonly occurredAt: IsoTimestamp;
  readonly reason?: string;
  readonly correlationId?: UUID;
}

export interface TransitionRecord<S extends string, E extends string> {
  readonly machine: string;
  readonly from: S;
  readonly to: S;
  readonly event: E;
  readonly actorId: UUID;
  readonly occurredAt: IsoTimestamp;
  readonly reason?: string;
  readonly correlationId?: UUID;
}

export class StateMachine<S extends string, E extends string> {
  constructor(private readonly def: StateMachineDefinition<S, E>) {}

  get initial(): S {
    return this.def.initial;
  }

  /** True se `event` é permitido a partir de `from`. */
  can(from: S, event: E): boolean {
    return this.def.transitions[from]?.[event] !== undefined;
  }

  /** Estado destino de uma transição válida, ou undefined. */
  target(from: S, event: E): S | undefined {
    return this.def.transitions[from]?.[event];
  }

  /**
   * Aplica uma transição. Retorna Result — nunca lança para transição inválida,
   * para que a rejeição faça parte do contrato (Doc 2 §36).
   */
  transition(
    from: S,
    event: E,
    ctx: TransitionContext,
  ): Result<TransitionRecord<S, E>, AppError> {
    if (!this.def.states.includes(from)) {
      return err(
        new AppError({
          category: ErrorCategory.STATE,
          code: 'STATE_UNKNOWN_SOURCE',
          message: `Estado de origem desconhecido para a máquina '${this.def.name}'.`,
          details: [{ field: 'from', issue: String(from) }],
        }),
      );
    }
    const to = this.target(from, event);
    if (to === undefined) {
      return err(
        new AppError({
          category: ErrorCategory.STATE,
          code: 'STATE_INVALID_TRANSITION',
          message: `Transição inválida em '${this.def.name}': ${from} --(${event})-->.`,
          details: [
            { field: 'from', issue: String(from) },
            { field: 'event', issue: String(event) },
          ],
        }),
      );
    }
    return ok({
      machine: this.def.name,
      from,
      to,
      event,
      actorId: ctx.actorId,
      occurredAt: ctx.occurredAt,
      ...(ctx.reason !== undefined ? { reason: ctx.reason } : {}),
      ...(ctx.correlationId !== undefined
        ? { correlationId: ctx.correlationId }
        : {}),
    });
  }
}

export const defineStateMachine = <S extends string, E extends string>(
  def: StateMachineDefinition<S, E>,
): StateMachine<S, E> => new StateMachine(def);
