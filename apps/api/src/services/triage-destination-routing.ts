/**
 * Roteamento do encaminhamento da Triagem (Bloco 3/4) para o fluxo/fila
 * operacional (Bloco 5).
 *
 * Regra institucional (não deste código — do Bloco 5 em si): consultório e
 * Sala Vermelha entram numa fila assistencial (`app.queue_tickets`);
 * exame/procedimento não têm fluxo operacional próprio implementado ainda
 * (achado da auditoria: não existe módulo de solicitação/execução de exame
 * ou procedimento no projeto) — nesses casos o encaminhamento persistido no
 * Bloco 3/4 (`app.triages.destination_*` + `app.triage_destination_history`)
 * já é, por si só, o registro de "pendente de execução"; este módulo só
 * tira esses casos da fila médica/Sala Vermelha (onde não pertencem) sem
 * inventar um sistema de exames/procedimentos.
 *
 * Todo atendimento já ganha 1 ticket de fila na abertura (Recepção, ver
 * `queue-enqueue.ts`) — este módulo nunca cria um segundo ticket ativo
 * para o mesmo atendimento (a constraint `queue_tickets_single_active_uk`,
 * migration 0026, impediria e um retry idempotente não deve tentar de
 * novo): localiza o ticket ativo existente e o ATUALIZA (fila + consultório
 * vinculado). Só insere um ticket novo se nenhum estiver ativo (ex.: o
 * ticket anterior já foi finalizado/cancelado).
 *
 * Recebe um `client` já dentro da transação `withSecurityContext` aberta
 * pelo chamador (`triages.ts`) — mesma transação do INSERT/UPDATE de
 * `app.triages`, garantindo a atomicidade exigida pela regra 12 do Bloco 5.
 */
import type pg from 'pg';
import type { ManchesterRiskColor, TriageDestinationType } from '@vitaloop/domain';
import { enqueueEncounterTicket, resolveQueueIdByType } from './queue-enqueue.js';

interface DbActiveTicketRow {
  id: string;
  status: 'waiting' | 'called' | 'in_service';
}

interface RouteTicketForDestinationParams {
  readonly encounterId: string;
  readonly patientId: string;
  readonly institutionId: string;
  readonly destinationType: TriageDestinationType;
  readonly roomId?: string | null;
  readonly riskColor?: ManchesterRiskColor | null;
}

const QUEUE_TYPE_BY_DESTINATION: Partial<Record<TriageDestinationType, { queueType: 'medical' | 'red_room'; defaultName: string }>> = {
  medical_consultation: { queueType: 'medical', defaultName: 'Fila Principal de Atendimento Médico' },
  red_room: { queueType: 'red_room', defaultName: 'Fila da Sala Vermelha' },
};

/**
 * Roteia o ticket de fila do atendimento para refletir o encaminhamento
 * atual da Triagem. Idempotente: chamar de novo com o mesmo destino não
 * cria ticket duplicado nem gera efeito colateral adicional (regra 9 do
 * Bloco 5, item 8/9 dos testes).
 */
export const routeQueueTicketForDestination = async (
  client: pg.PoolClient,
  params: RouteTicketForDestinationParams,
): Promise<void> => {
  const activeRes = await client.query<DbActiveTicketRow>(
    `select id, status from app.queue_tickets
     where encounter_id = $1 and status in ('waiting', 'called', 'in_service')
     order by created_at desc limit 1 for update`,
    [params.encounterId],
  );
  const activeTicket = activeRes.rows[0] ?? null;

  const queueTarget = QUEUE_TYPE_BY_DESTINATION[params.destinationType];

  if (queueTarget) {
    // Consultório ou Sala Vermelha — precisa estar (ou entrar) numa fila
    // assistencial. `consultation_room_id` só é preenchido para consultório
    // (regra 6); Sala Vermelha nunca referencia um consultório.
    const queueId = await resolveQueueIdByType(client, params.institutionId, queueTarget.queueType, queueTarget.defaultName);
    const consultationRoomId = params.destinationType === 'medical_consultation' ? (params.roomId ?? null) : null;

    if (activeTicket) {
      await client.query(
        `update app.queue_tickets
         set queue_id = $1, consultation_room_id = $2, risk_color = coalesce($3, risk_color), updated_at = now()
         where id = $4`,
        [queueId, consultationRoomId, params.riskColor ?? null, activeTicket.id],
      );
    } else {
      // Só acontece se o ticket original já tiver sido finalizado/cancelado
      // antes do encaminhamento ser definido/alterado — caso raro, mas o
      // paciente ainda precisa aparecer na fila certa.
      await enqueueEncounterTicket(client, {
        queueId,
        encounterId: params.encounterId,
        patientId: params.patientId,
        riskColor: params.riskColor ?? null,
        consultationRoomId,
      });
    }
    return;
  }

  // Exame ou procedimento — sem fluxo operacional próprio implementado
  // ainda (regra 15 do Bloco 5.2/item 9: "preservar o encaminhamento como
  // pendente de execução e documentar" em vez de inventar um sistema
  // completo). O paciente não deve continuar ocupando a fila médica/Sala
  // Vermelha para essas duas categorias. Só cancela quando o ticket ainda
  // está 'waiting' — se já foi chamado ou está em atendimento, um
  // profissional está ativamente lidando com o paciente; encerrar o ticket
  // silenciosamente nesse ponto seria mais arriscado do que deixá-lo como
  // está (decisão deliberada, não uma limitação técnica).
  if (activeTicket && activeTicket.status === 'waiting') {
    await client.query(
      `update app.queue_tickets
       set status = 'canceled',
           notes = coalesce(notes || ' | ', '') || 'Encaminhado para fluxo de exame/procedimento (Bloco 5) — sem fila operacional própria implementada; ver app.triages.destination_* para o registro pendente de execução.',
           updated_at = now()
       where id = $1`,
      [activeTicket.id],
    );
  }
};
