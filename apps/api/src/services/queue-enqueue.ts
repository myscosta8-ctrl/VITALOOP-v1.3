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
}

interface EnqueueEncounterTicketParams {
  readonly queueId: string;
  readonly encounterId: string;
  readonly patientId: string;
  readonly riskColor?: ManchesterRiskColor | null;
  readonly ticketNumber?: string | null;
}

export const resolveDefaultQueueId = async (
  client: pg.PoolClient,
  institutionId: string,
): Promise<string | null> => {
  const existing = await client.query<{ id: string }>(
    'select id from app.queues where institution_id = $1 order by created_at asc limit 1',
    [institutionId],
  );
  if (existing.rowCount! > 0) {
    return existing.rows[0]!.id;
  }

  const created = await client.query<{ id: string }>(
    `insert into app.queues (institution_id, name, queue_type)
     values ($1, 'Fila Principal de Atendimento Médico', 'medical')
     returning id`,
    [institutionId],
  );
  return created.rows[0]?.id ?? null;
};

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
         queue_id, encounter_id, patient_id, ticket_number, priority_score, risk_color, status
       ) values ($1, $2, $3, $4, $5, $6, 'waiting')
       returning *`,
      [
        params.queueId,
        params.encounterId,
        params.patientId,
        validated.formattedTicketNumber,
        validated.priorityScore,
        validated.riskColor ?? null,
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
