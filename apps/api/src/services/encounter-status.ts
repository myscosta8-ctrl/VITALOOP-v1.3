/**
 * Transição de status de atendimento compartilhada entre rotas.
 *
 * Antes desta extração, `triages.ts` e `queues.ts` avançavam `app.encounters.status`
 * (para 'triaged' e 'in_consultation' respectivamente) com um `UPDATE` SQL direto,
 * sem passar por `assertValidEncounterStatusTransition` — só a rota
 * `PATCH /api/v1/encounters/:id/status` (`encounters.ts`) validava contra a máquina
 * de estados. Isso duplicava a lógica de transição e deixava as duas transições
 * automáticas sem a mesma garantia de consistência das manuais (achado de auditoria
 * do fluxo Pronto Atendimento, 12/09/2026). Esta função é o único lugar que qualquer
 * rota deve usar para avançar `encounter.status` — inclusive futuras.
 *
 * Recebe um `client` já dentro de uma transação `withSecurityContext` aberta pelo
 * chamador — não abre transação própria.
 */
import type pg from 'pg';
import { AppError, ErrorCategory, type UUID } from '@vitaloop/shared';
import {
  assertValidEncounterStatusTransition,
  createEncounterClosedEvent,
  createEncounterStatusChangedEvent,
  isTerminalEncounterStatus,
  type Encounter,
  type EncounterStatus,
  type PostConsultationDetail,
} from '@vitaloop/domain';

interface TransitionEncounterStatusParams {
  readonly encounterId: string;
  readonly toStatus: EncounterStatus;
  readonly actorUserId: UUID;
  // Bloco 7 — obrigatório pela máquina de estados (assertValidEncounterStatusTransition)
  // quando toStatus === 'post_consultation'; ignorado para os demais status.
  readonly postConsultationDetail?: PostConsultationDetail | null;
}

interface TransitionEncounterStatusResult {
  readonly id: string;
  readonly patientId: string;
  readonly oldStatus: EncounterStatus;
  readonly newStatus: EncounterStatus;
}

const persistDomainEvent = async (
  client: pg.PoolClient,
  ev: {
    id: UUID;
    eventType: string;
    aggregateType: string;
    aggregateId: UUID;
    actorUserId: UUID | null;
    patientId: UUID;
    payload: unknown;
    schemaVersion: number;
  },
): Promise<void> => {
  await client.query(
    `insert into app.domain_events (id, event_type, aggregate_type, aggregate_id, actor_user_id, patient_id, payload, schema_version, occurred_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, now())`,
    [
      ev.id,
      ev.eventType,
      ev.aggregateType,
      ev.aggregateId,
      ev.actorUserId,
      ev.patientId,
      JSON.stringify(ev.payload),
      ev.schemaVersion,
    ],
  );
};

export const transitionEncounterStatus = async (
  client: pg.PoolClient,
  params: TransitionEncounterStatusParams,
): Promise<TransitionEncounterStatusResult> => {
  const { encounterId, toStatus, actorUserId, postConsultationDetail } = params;

  const currentRes = await client.query<{ id: string; patient_id: string; status: EncounterStatus; cancel_reason: string | null }>(
    'select id, patient_id, status, cancel_reason from app.encounters where id = $1 for update',
    [encounterId],
  );

  if (currentRes.rowCount === 0 || !currentRes.rows[0]) {
    throw new AppError({
      category: ErrorCategory.NOT_FOUND,
      code: 'ENCOUNTER_NOT_FOUND',
      message: 'Atendimento não encontrado para transição de status.',
    });
  }

  const current = currentRes.rows[0];
  const oldStatus = current.status;

  assertValidEncounterStatusTransition(oldStatus, toStatus, null, postConsultationDetail);

  const updateRes = await client.query<{ id: string; patient_id: string; status: EncounterStatus; cancel_reason: string | null }>(
    `update app.encounters
     set status = $1, updated_by = $2, updated_at = now(),
         post_consultation_detail = case when $1 = 'post_consultation' then $4::app.post_consultation_detail else post_consultation_detail end
     where id = $3
     returning id, patient_id, status, cancel_reason`,
    [toStatus, actorUserId, encounterId, postConsultationDetail ?? null],
  );
  const updated = updateRes.rows[0]!;

  // createEncounterStatusChangedEvent/createEncounterClosedEvent só leem
  // id/patientId/status/cancelReason do Encounter recebido (ver
  // packages/domain/src/encounter/events.ts) — objeto mínimo é suficiente aqui,
  // não precisamos buscar/montar o Encounter completo pra emitir o evento.
  const minimalEncounter = {
    id: updated.id,
    patientId: updated.patient_id,
    status: updated.status,
    cancelReason: updated.cancel_reason,
  } as unknown as Encounter;

  const statusEvent = createEncounterStatusChangedEvent(minimalEncounter, oldStatus, actorUserId);
  await persistDomainEvent(client, {
    id: statusEvent.eventId as UUID,
    eventType: statusEvent.type,
    aggregateType: statusEvent.aggregateType,
    aggregateId: statusEvent.aggregateId as UUID,
    actorUserId,
    patientId: updated.patient_id as UUID,
    payload: statusEvent.payload,
    schemaVersion: statusEvent.schemaVersion,
  });

  if (isTerminalEncounterStatus(updated.status)) {
    const closedEvent = createEncounterClosedEvent(minimalEncounter, actorUserId);
    await persistDomainEvent(client, {
      id: closedEvent.eventId as UUID,
      eventType: closedEvent.type,
      aggregateType: closedEvent.aggregateType,
      aggregateId: closedEvent.aggregateId as UUID,
      actorUserId,
      patientId: updated.patient_id as UUID,
      payload: closedEvent.payload,
      schemaVersion: closedEvent.schemaVersion,
    });
  }

  return {
    id: updated.id,
    patientId: updated.patient_id,
    oldStatus,
    newStatus: updated.status,
  };
};
