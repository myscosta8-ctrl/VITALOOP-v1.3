/**
 * Rotas de Gestão de Filas, Chamamento e Painel de Espera (Fase 3, Etapa 1/6) — QUE-001..012.
 *
 * Consome integralmente as regras de `@vitaloop/domain` (packages/domain/src/queue).
 * Conexão com Supabase via `vitaloop_app` (RLS ativa). Transações executadas com `withSecurityContext`.
 */

import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type pg from 'pg';
import { AppError, ErrorCategory, type UUID } from '@vitaloop/shared';
import {
  assertValidTicketStatusTransition,
  createPatientCalledToRoomEvent,
  createPatientCallRepeatedEvent,
  createPatientEnteredConsultationEvent,
  createPatientMarkedAbsentEvent,
  isWaitTimeExceeded,
  validateTicketCallInput,
  type ManchesterRiskColor,
  type Queue,
  type QueueTicket,
  type QueueType,
  type TicketStatus,
} from '@vitaloop/domain';
import { success } from '../http/envelope.js';
import { requirePermission } from '../security/require-auth.js';
import { withSecurityContext } from '../db/security-context.js';
import { sha256Hex } from '../security/hash.js';
import { transitionEncounterStatus } from '../services/encounter-status.js';
import { enqueueEncounterTicket } from '../services/queue-enqueue.js';

const requireReadAndWrite = (db: pg.Pool | null, writePerm: string, readPerm: string) => [
  requirePermission(db, writePerm),
  requirePermission(db, readPerm),
];

interface DomainEventRecord {
  readonly id: UUID;
  readonly eventType: string;
  readonly aggregateType: string;
  readonly aggregateId: UUID;
  readonly actorUserId: UUID | null;
  readonly patientId: UUID;
  readonly payload: unknown;
  readonly schemaVersion: number;
}

const persistDomainEvent = async (client: pg.PoolClient, ev: DomainEventRecord): Promise<void> => {
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

const auditAction = async (
  client: pg.PoolClient,
  actorUserId: string,
  action: 'create' | 'update',
  resourceType: string,
  resourceId: string,
  req: FastifyRequest,
  details?: Record<string, unknown>,
): Promise<void> => {
  const ip = (req.headers['x-forwarded-for'] as string) || req.ip || '127.0.0.1';
  const ipHash = sha256Hex(ip);

  await client.query(
    `insert into app.audit_events (actor_user_id, action, resource_type, resource_id, request_id, ip_hash, after_data)
     values ($1, $2, $3, $4, $5, $6, $7)`,
    [actorUserId, action, resourceType, resourceId, req.id, ipHash, details ? JSON.stringify(details) : null],
  );
};

interface DbQueueRow {
  id: string;
  institution_id: string;
  unit_id: string | null;
  sector_id: string | null;
  name: string;
  queue_type: QueueType;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

interface DbTicketRow {
  id: string;
  queue_id: string;
  encounter_id: string;
  patient_id: string;
  ticket_number: string;
  priority_score: number;
  risk_color: ManchesterRiskColor | null;
  call_room: string | null;
  consultation_room_id: string | null;
  status: TicketStatus;
  call_count: number;
  called_at: Date | null;
  called_by: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  // Bloco 5 (item 10) — colunas adicionadas pelo JOIN da listagem de
  // tickets (não existem na tabela app.queue_tickets); undefined quando a
  // query não fizer o join (ex.: outras rotas que só fazem `select *`).
  patient_name?: string;
  consultation_room_name?: string | null;
  destination_type?: string | null;
}

const mapRowToQueue = (row: DbQueueRow): Queue => ({
  id: row.id,
  institutionId: row.institution_id,
  unitId: row.unit_id,
  sectorId: row.sector_id,
  name: row.name,
  queueType: row.queue_type,
  isActive: row.is_active,
  createdAt: new Date(row.created_at).toISOString(),
  updatedAt: new Date(row.updated_at).toISOString(),
});

const mapRowToTicket = (
  row: DbTicketRow,
): QueueTicket & { isExceeded: boolean; patientName?: string; destinationType?: string | null; consultationRoomName?: string | null } => {
  const createdAtIso = new Date(row.created_at).toISOString();
  return {
    id: row.id,
    queueId: row.queue_id,
    encounterId: row.encounter_id,
    patientId: row.patient_id,
    ticketNumber: row.ticket_number,
    priorityScore: Number(row.priority_score),
    riskColor: row.risk_color,
    callRoom: row.call_room,
    consultationRoomId: row.consultation_room_id,
    status: row.status,
    callCount: Number(row.call_count),
    calledAt: row.called_at ? new Date(row.called_at).toISOString() : null,
    calledBy: row.called_by,
    notes: row.notes,
    createdAt: createdAtIso,
    updatedAt: new Date(row.updated_at).toISOString(),
    isExceeded: isWaitTimeExceeded(row.risk_color, createdAtIso),
    ...(row.patient_name !== undefined ? { patientName: row.patient_name } : {}),
    destinationType: row.destination_type ?? null,
    consultationRoomName: row.consultation_room_name ?? null,
  };
};

const enqueueBodySchema = z.object({
  encounterId: z.string().uuid('ID de atendimento inválido.'),
  ticketNumber: z.string().optional().nullable(),
});

const callBodySchema = z.object({
  callRoom: z.string().min(1, 'O consultório/local é obrigatório.'),
});

const updateStatusBodySchema = z.object({
  status: z.enum(['waiting', 'called', 'in_service', 'absent', 'finished', 'canceled']),
  notes: z.string().optional().nullable(),
});

export const registerQueueRoutes = (app: FastifyInstance, pool: pg.Pool | null): void => {
  // ---------- GET /api/v1/queues (Listagem de Filas Assistenciais) ----------
  app.get(
    '/api/v1/queues',
    { preHandler: requirePermission(pool, 'queue.read') },
    async (req, reply) => {
      const identity = req.identity!;
      if (!identity.appUserId) {
        throw new AppError({
          category: ErrorCategory.AUTH,
          code: 'AUTH_REQUIRED',
          message: 'Usuário não possui ID de aplicação associado.',
        });
      }

      const queues = await withSecurityContext(
        pool!,
        { userId: identity.appUserId, roles: identity.roles },
        async (client) => {
          const res = await client.query<DbQueueRow>('select * from app.queues order by created_at asc');
          if (res.rowCount === 0) {
            // Se nenhuma fila existir, cria a fila padrão de consulta médica
            const instRes = await client.query('select id from app.institutions limit 1');
            if (instRes.rowCount! > 0) {
              const instId = instRes.rows[0].id;
              const created = await client.query<DbQueueRow>(
                `insert into app.queues (institution_id, name, queue_type)
                 values ($1, 'Fila Principal de Atendimento Médico', 'medical')
                 returning *`,
                [instId],
              );
              return [mapRowToQueue(created.rows[0]!)];
            }
          }
          return res.rows.map(mapRowToQueue);
        },
      );

      return reply.send(success(queues, req.id));
    },
  );

  // ---------- GET /api/v1/queues/:queueId/tickets (Listagem Ordenada de Senhas/Fila) ----------
  app.get(
    '/api/v1/queues/:queueId/tickets',
    { preHandler: requirePermission(pool, 'queue.read') },
    async (req, reply) => {
      const paramsSchema = z.object({ queueId: z.string().uuid('ID de fila inválido.') });
      const { queueId } = paramsSchema.parse(req.params);
      const identity = req.identity!;

      if (!identity.appUserId) {
        throw new AppError({
          category: ErrorCategory.AUTH,
          code: 'AUTH_REQUIRED',
          message: 'Usuário não possui ID de aplicação associado.',
        });
      }

      const tickets = await withSecurityContext(
        pool!,
        { userId: identity.appUserId, roles: identity.roles },
        async (client) => {
          // Bloco 5 (item 10) — join com paciente/consultório/triagem só
          // para exibição no painel de fila; nenhuma dessas colunas
          // pertence a app.queue_tickets.
          const res = await client.query<DbTicketRow>(
            `select qt.*, p.full_name as patient_name, cr.name as consultation_room_name,
                    t.destination_type as destination_type
             from app.queue_tickets qt
             join app.patients p on p.id = qt.patient_id
             left join app.consultation_rooms cr on cr.id = qt.consultation_room_id
             left join lateral (
               select destination_type from app.triages
               where encounter_id = qt.encounter_id
               order by created_at desc limit 1
             ) t on true
             where qt.queue_id = $1 and qt.status in ('waiting', 'called', 'in_service')
             order by qt.priority_score desc, qt.created_at asc`,
            [queueId],
          );
          return res.rows.map(mapRowToTicket);
        },
      );

      return reply.send(success(tickets, req.id));
    },
  );

  // ---------- POST /api/v1/queues/:queueId/enqueue (Enfileirar Atendimento) ----------
  app.post(
    '/api/v1/queues/:queueId/enqueue',
    { preHandler: requireReadAndWrite(pool, 'queue.write', 'queue.read') },
    async (req, reply) => {
      const paramsSchema = z.object({ queueId: z.string().uuid('ID de fila inválido.') });
      const { queueId } = paramsSchema.parse(req.params);
      const parsed = enqueueBodySchema.parse(req.body);
      const identity = req.identity!;

      if (!identity.appUserId) {
        throw new AppError({
          category: ErrorCategory.AUTH,
          code: 'AUTH_REQUIRED',
          message: 'Usuário não possui ID de aplicação associado.',
        });
      }

      const appUserId = identity.appUserId;

      const ticket = await withSecurityContext(
        pool!,
        { userId: appUserId, roles: identity.roles },
        async (client) => {
          // 1. Busca atendimento e triagem associada (se existir)
          const encRes = await client.query(
            `select e.id, e.patient_id, e.institution_id, t.risk_color
             from app.encounters e
             left join app.triages t on t.encounter_id = e.id
             where e.id = $1 order by t.created_at desc limit 1`,
            [parsed.encounterId],
          );

          if (encRes.rowCount === 0 || !encRes.rows[0]) {
            throw new AppError({
              category: ErrorCategory.NOT_FOUND,
              code: 'ENCOUNTER_NOT_FOUND',
              message: 'Atendimento não encontrado para enfileiramento.',
            });
          }

          const enc = encRes.rows[0];

          // 2/3. Valida entrada, gera prioridade e insere o ticket (núcleo compartilhado
          // com o auto-enfileiramento disparado na abertura do atendimento, ver encounters.ts)
          const insertedRow = await enqueueEncounterTicket(client, {
            queueId,
            encounterId: parsed.encounterId,
            patientId: enc.patient_id,
            riskColor: enc.risk_color ?? null,
            ticketNumber: parsed.ticketNumber ?? null,
          });

          const newTicket = mapRowToTicket(insertedRow as DbTicketRow);

          // 4. Auditoria de Enfileiramento
          await auditAction(client, appUserId, 'create', 'queue_ticket', newTicket.id, req, {
            queueId,
            encounterId: parsed.encounterId,
            ticketNumber: newTicket.ticketNumber,
            priorityScore: newTicket.priorityScore,
            riskColor: newTicket.riskColor,
          });

          return newTicket;
        },
      );

      return reply.status(201).send(success(ticket, req.id));
    },
  );

  // ---------- POST /api/v1/queues/tickets/:ticketId/call (Chamar Paciente) ----------
  app.post(
    '/api/v1/queues/tickets/:ticketId/call',
    { preHandler: requireReadAndWrite(pool, 'queue.write', 'queue.read') },
    async (req, reply) => {
      const paramsSchema = z.object({ ticketId: z.string().uuid('ID de ticket inválido.') });
      const { ticketId } = paramsSchema.parse(req.params);
      const parsed = callBodySchema.parse(req.body);
      const identity = req.identity!;

      if (!identity.appUserId) {
        throw new AppError({
          category: ErrorCategory.AUTH,
          code: 'AUTH_REQUIRED',
          message: 'Usuário não possui ID de aplicação associado.',
        });
      }

      const appUserId = identity.appUserId;

      const ticket = await withSecurityContext(
        pool!,
        { userId: appUserId, roles: identity.roles },
        async (client) => {
          const currentRes = await client.query<DbTicketRow>(
            'select * from app.queue_tickets where id = $1 for update',
            [ticketId],
          );

          if (currentRes.rowCount === 0 || !currentRes.rows[0]) {
            throw new AppError({
              category: ErrorCategory.NOT_FOUND,
              code: 'TICKET_NOT_FOUND',
              message: 'Ticket de fila não encontrado.',
            });
          }

          const currentTicket = mapRowToTicket(currentRes.rows[0]);
          assertValidTicketStatusTransition(currentTicket.status, 'called');
          const validated = validateTicketCallInput({ ticketId, callRoom: parsed.callRoom, calledByUserId: appUserId });

          const updateRes = await client.query<DbTicketRow>(
            `update app.queue_tickets
             set status = 'called', call_room = $1, called_by = $2,
                 call_count = call_count + 1, called_at = now(), updated_at = now()
             where id = $3
             returning *`,
            [validated.callRoomNormalized, appUserId, ticketId],
          );

          const calledTicket = mapRowToTicket(updateRes.rows[0]!);

          // Evento de Domínio e Auditoria
          const callEvent = createPatientCalledToRoomEvent(calledTicket, appUserId as UUID);
          await persistDomainEvent(client, {
            id: callEvent.eventId,
            eventType: callEvent.type,
            aggregateType: callEvent.aggregateType,
            aggregateId: callEvent.aggregateId,
            actorUserId: (callEvent.actorId as UUID) || (appUserId as UUID),
            patientId: calledTicket.patientId as UUID,
            payload: callEvent.payload,
            schemaVersion: callEvent.schemaVersion,
          });

          await auditAction(client, appUserId, 'update', 'queue_ticket_call', calledTicket.id, req, {
            callRoom: calledTicket.callRoom,
            callCount: calledTicket.callCount,
          });

          return calledTicket;
        },
      );

      return reply.send(success(ticket, req.id));
    },
  );

  // ---------- POST /api/v1/queues/tickets/:ticketId/recall (Rechamar Paciente) ----------
  app.post(
    '/api/v1/queues/tickets/:ticketId/recall',
    { preHandler: requireReadAndWrite(pool, 'queue.write', 'queue.read') },
    async (req, reply) => {
      const paramsSchema = z.object({ ticketId: z.string().uuid('ID de ticket inválido.') });
      const { ticketId } = paramsSchema.parse(req.params);
      const identity = req.identity!;

      if (!identity.appUserId) {
        throw new AppError({
          category: ErrorCategory.AUTH,
          code: 'AUTH_REQUIRED',
          message: 'Usuário não possui ID de aplicação associado.',
        });
      }

      const appUserId = identity.appUserId;

      const ticket = await withSecurityContext(
        pool!,
        { userId: appUserId, roles: identity.roles },
        async (client) => {
          const currentRes = await client.query<DbTicketRow>(
            'select * from app.queue_tickets where id = $1 for update',
            [ticketId],
          );

          if (currentRes.rowCount === 0 || !currentRes.rows[0]) {
            throw new AppError({
              category: ErrorCategory.NOT_FOUND,
              code: 'TICKET_NOT_FOUND',
              message: 'Ticket de fila não encontrado.',
            });
          }

          const currentTicket = mapRowToTicket(currentRes.rows[0]);
          assertValidTicketStatusTransition(currentTicket.status, 'called');

          const updateRes = await client.query<DbTicketRow>(
            `update app.queue_tickets
             set call_count = call_count + 1, called_at = now(), updated_at = now()
             where id = $1
             returning *`,
            [ticketId],
          );

          const recalledTicket = mapRowToTicket(updateRes.rows[0]!);

          const recallEvent = createPatientCallRepeatedEvent(recalledTicket, appUserId as UUID);
          await persistDomainEvent(client, {
            id: recallEvent.eventId,
            eventType: recallEvent.type,
            aggregateType: recallEvent.aggregateType,
            aggregateId: recallEvent.aggregateId,
            actorUserId: (recallEvent.actorId as UUID) || (appUserId as UUID),
            patientId: recalledTicket.patientId as UUID,
            payload: recallEvent.payload,
            schemaVersion: recallEvent.schemaVersion,
          });

          await auditAction(client, appUserId, 'update', 'queue_ticket_recall', recalledTicket.id, req, {
            callCount: recalledTicket.callCount,
          });

          return recalledTicket;
        },
      );

      return reply.send(success(ticket, req.id));
    },
  );

  // ---------- PATCH /api/v1/queues/tickets/:ticketId/status (Alterar Estado do Ticket) ----------
  app.patch(
    '/api/v1/queues/tickets/:ticketId/status',
    { preHandler: requirePermission(pool, 'queue.write') },
    async (req, reply) => {
      const paramsSchema = z.object({ ticketId: z.string().uuid('ID de ticket inválido.') });
      const { ticketId } = paramsSchema.parse(req.params);
      const parsed = updateStatusBodySchema.parse(req.body);
      const identity = req.identity!;

      if (!identity.appUserId) {
        throw new AppError({
          category: ErrorCategory.AUTH,
          code: 'AUTH_REQUIRED',
          message: 'Usuário não possui ID de aplicação associado.',
        });
      }

      const appUserId = identity.appUserId;

      const ticket = await withSecurityContext(
        pool!,
        { userId: appUserId, roles: identity.roles },
        async (client) => {
          const currentRes = await client.query<DbTicketRow>(
            'select * from app.queue_tickets where id = $1 for update',
            [ticketId],
          );

          if (currentRes.rowCount === 0 || !currentRes.rows[0]) {
            throw new AppError({
              category: ErrorCategory.NOT_FOUND,
              code: 'TICKET_NOT_FOUND',
              message: 'Ticket de fila não encontrado.',
            });
          }

          const currentTicket = mapRowToTicket(currentRes.rows[0]);
          assertValidTicketStatusTransition(currentTicket.status, parsed.status);

          const updateRes = await client.query<DbTicketRow>(
            `update app.queue_tickets
             set status = $1, notes = coalesce($2, notes), updated_at = now()
             where id = $3
             returning *`,
            [parsed.status, parsed.notes ?? null, ticketId],
          );

          const updatedTicket = mapRowToTicket(updateRes.rows[0]!);

          if (parsed.status === 'absent') {
            const absentEvent = createPatientMarkedAbsentEvent(updatedTicket, appUserId as UUID);
            await persistDomainEvent(client, {
              id: absentEvent.eventId,
              eventType: absentEvent.type,
              aggregateType: absentEvent.aggregateType,
              aggregateId: absentEvent.aggregateId,
              actorUserId: (absentEvent.actorId as UUID) || (appUserId as UUID),
              patientId: updatedTicket.patientId as UUID,
              payload: absentEvent.payload,
              schemaVersion: absentEvent.schemaVersion,
            });
          } else if (parsed.status === 'in_service') {
            const inServiceEvent = createPatientEnteredConsultationEvent(updatedTicket, appUserId as UUID);
            await persistDomainEvent(client, {
              id: inServiceEvent.eventId,
              eventType: inServiceEvent.type,
              aggregateType: inServiceEvent.aggregateType,
              aggregateId: inServiceEvent.aggregateId,
              actorUserId: (inServiceEvent.actorId as UUID) || (appUserId as UUID),
              patientId: updatedTicket.patientId as UUID,
              payload: inServiceEvent.payload,
              schemaVersion: inServiceEvent.schemaVersion,
            });

            // Transita atendimento para 'in_consultation'
            await transitionEncounterStatus(client, {
              encounterId: updatedTicket.encounterId,
              toStatus: 'in_consultation',
              actorUserId: appUserId as UUID,
            });

            // Bloco 6 — "médico assume o atendimento": este É o ponto do
            // sistema onde isso acontece (a fila já tinha esse botão —
            // "Iniciar Atendimento" — desde antes deste bloco). Reaproveita
            // `app.encounters.assigned_user_id`, coluna já existente e usada
            // hoje só na abertura do atendimento pela Recepção — nenhuma
            // migration nova. Concorrência já protegida pelo `for update` no
            // ticket acima + `assertValidTicketStatusTransition` (uma
            // segunda tentativa simultânea de 'in_service'->'in_service'
            // não é uma transição válida e é rejeitada com CONFLICT antes de
            // chegar aqui).
            await client.query(
              `update app.encounters set assigned_user_id = $1, updated_by = $1, updated_at = now() where id = $2`,
              [appUserId, updatedTicket.encounterId],
            );
          }

          await auditAction(client, appUserId, 'update', 'queue_ticket_status', updatedTicket.id, req, {
            previousStatus: currentTicket.status,
            newStatus: updatedTicket.status,
          });

          return updatedTicket;
        },
      );

      return reply.send(success(ticket, req.id));
    },
  );
};
