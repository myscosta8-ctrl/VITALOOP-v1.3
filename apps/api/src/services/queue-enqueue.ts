/**
 * Enfileiramento de atendimento compartilhado entre rotas.
 *
 * Antes desta extração, só existia `POST /api/v1/queues/:queueId/enqueue`
 * (`queues.ts`), uma ação manual separada de abrir o atendimento
 * (`POST /api/v1/encounters`, `encounters.ts`) — a recepção precisava lembrar
 * de fazer as duas coisas, e esquecer a segunda deixava o paciente fora do
 * painel de fila sem nenhum aviso (achado de auditoria do fluxo Pronto
 * Atendimento, 12/09/2026). Esta função é o núcleo de inserção do ticket,
 * reaproveitado tanto pela rota manual quanto pela abertura automática do
 * atendimento — mesmas regras de validação/prioridade, um único lugar.
 *
 * Recebe um `client` já dentro de uma transação `withSecurityContext` aberta
 * pelo chamador — não abre transação própria.
 */
import type pg from 'pg';
import { AppError, ErrorCategory } from '@vitaloop/shared';
import { validateTicketEnqueueInput, type ManchesterRiskColor } from '@vitaloop/domain';

interface DbTicketInsertRow {
  id: string;
  queue_id: string;
  encounter_id: string;
  patient_id: string;
  ticket_number: string;
  priority_score: number;
  risk_color: ManchesterRiskColor | null;
  consultation_room_id: string | null;
}

interface EnqueueEncounterTicketParams {
  readonly queueId: string;
  readonly encounterId: string;
  readonly patientId: string;
  readonly riskColor?: ManchesterRiskColor | null;
  readonly ticketNumber?: string | null;
  // Bloco 5 — preenchido só quando o ticket nasce já roteado para um
  // encaminhamento "medical_consultation" (migration 0094).
  readonly consultationRoomId?: string | null;
}

/**
 * Resolve (ou cria, se ainda não existir para a instituição) a fila de um
 * `queueType` específico — núcleo genérico usado tanto pelo
 * auto-enfileiramento da Recepção ('medical', via `resolveDefaultQueueId`
 * abaixo) quanto pelo roteamento pós-Triagem (Bloco 5: 'medical' ou
 * 'red_room', ver `triage-destination-routing.ts`). Sempre filtra por
 * `queue_type` — antes do Bloco 5 só existia 1 fila por instituição na
 * prática, então essa distinção não importava; agora que uma segunda fila
 * (Sala Vermelha) pode coexistir, pegar "a primeira fila da instituição"
 * sem filtrar por tipo arriscaria devolver a fila errada.
 */
export const resolveQueueIdByType = async (
  client: pg.PoolClient,
  institutionId: string,
  queueType: 'medical' | 'red_room',
  defaultName: string,
): Promise<string> => {
  const existing = await client.query<{ id: string }>(
    'select id from app.queues where institution_id = $1 and queue_type = $2 order by created_at asc limit 1',
    [institutionId, queueType],
  );
  if (existing.rowCount! > 0) {
    return existing.rows[0]!.id;
  }

  const created = await client.query<{ id: string }>(
    `insert into app.queues (institution_id, name, queue_type)
     values ($1, $2, $3)
     returning id`,
    [institutionId, defaultName, queueType],
  );
  return created.rows[0]!.id;
};

export const resolveDefaultQueueId = async (
  client: pg.PoolClient,
  institutionId: string,
): Promise<string | null> =>
  resolveQueueIdByType(client, institutionId, 'medical', 'Fila Principal de Atendimento Médico');

export const enqueueEncounterTicket = async (
  client: pg.PoolClient,
  params: EnqueueEncounterTicketParams,
): Promise<DbTicketInsertRow> => {
  const validated = validateTicketEnqueueInput({
    queueId: params.queueId,
    encounterId: params.encounterId,
    patientId: params.patientId,
    ticketNumber: params.ticketNumber ?? null,
    riskColor: params.riskColor ?? null,
  });

  try {
    const insertRes = await client.query<DbTicketInsertRow>(
      `insert into app.queue_tickets (
         queue_id, encounter_id, patient_id, ticket_number, priority_score, risk_color, consultation_room_id, status
       ) values ($1, $2, $3, $4, $5, $6, $7, 'waiting')
       returning *`,
      [
        params.queueId,
        params.encounterId,
        params.patientId,
        validated.formattedTicketNumber,
        validated.priorityScore,
        validated.riskColor ?? null,
        params.consultationRoomId ?? null,
      ],
    );
    return insertRes.rows[0]!;
  } catch (err: unknown) {
    const pgErr = err as { code?: string };
    if (pgErr.code === '23505') {
      throw new AppError({
        category: ErrorCategory.CONFLICT,
        code: 'TICKET_ACTIVE_EXISTS',
        message: 'Já existe uma senha/ticket ativo em fila para este atendimento.',
      });
    }
    throw err;
  }
};
