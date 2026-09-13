import type { FastifyInstance } from 'fastify';
import pg from 'pg';
import { z } from 'zod';
import type { UUID } from '@vitaloop/shared';
import { AppError, ErrorCategory } from '@vitaloop/shared';
import {
  applyStockMovement,
  createStockBatchReceivedEvent,
  createStockMovementRecordedEvent,
  validatePharmacyStockBatchCreateInput,
  validatePharmacyStockMovementCreateInput,
  type PharmacyStockBatch,
  type PharmacyStockMovement,
  type StockMovementType,
} from '@vitaloop/domain';
import { success } from '../http/envelope.js';
import { withSecurityContext } from '../db/security-context.js';
import { requirePermission } from '../security/require-auth.js';

const persistDomainEvent = async (
  client: pg.PoolClient,
  ev: { id: UUID; eventType: string; aggregateType: string; aggregateId: UUID; actorUserId: UUID | null; patientId: UUID | null; payload: unknown; schemaVersion: number },
): Promise<void> => {
  await client.query(
    `insert into app.domain_events (id, event_type, aggregate_type, aggregate_id, actor_user_id, patient_id, payload, schema_version, occurred_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, now())`,
    [ev.id, ev.eventType, ev.aggregateType, ev.aggregateId, ev.actorUserId, ev.patientId, JSON.stringify(ev.payload), ev.schemaVersion],
  );
};

const mapBatchRow = (r: pg.QueryResultRow): PharmacyStockBatch & { medicationName?: string } => ({
  id: r.id,
  medicationId: r.medication_id,
  batchNumber: r.batch_number,
  expiryDate: r.expiry_date instanceof Date ? r.expiry_date.toISOString().slice(0, 10) : r.expiry_date,
  quantityOnHand: Number(r.quantity_on_hand),
  unit: r.unit,
  receivedAt: r.received_at.toISOString(),
  receivedBy: r.received_by,
  notes: r.notes,
  ...(r.medication_name ? { medicationName: r.medication_name } : {}),
});

const mapMovementRow = (r: pg.QueryResultRow): PharmacyStockMovement => ({
  id: r.id,
  batchId: r.batch_id,
  movementType: r.movement_type as StockMovementType,
  quantity: Number(r.quantity),
  reason: r.reason,
  performedBy: r.performed_by,
  createdAt: r.created_at.toISOString(),
});

const createBatchSchema = z.object({
  medicationId: z.string().uuid(),
  batchNumber: z.string(),
  expiryDate: z.string(),
  quantityOnHand: z.number(),
  unit: z.string(),
  notes: z.string().optional().nullable().transform((v) => v ?? null),
});

const createMovementSchema = z.object({
  batchId: z.string().uuid(),
  movementType: z.enum(['entrada', 'saida', 'ajuste']),
  quantity: z.number(),
  reason: z.string().optional().nullable().transform((v) => v ?? null),
});

export const registerPharmacyStockRoutes = (app: FastifyInstance, pool: pg.Pool | null): void => {
  // Lista lotes com nome do medicamento e alerta de validade (<=30 dias) —
  // usado tanto na tela de estoque quanto pra alertar validade próxima.
  app.get(
    '/api/v1/pharmacy/stock-batches',
    { preHandler: requirePermission(pool, 'pharmacy.stock_read') },
    async (req, reply) => {
      const identity = req.identity!;
      const batches = await withSecurityContext(pool!, { userId: identity.appUserId!, roles: identity.roles }, async (client) => {
        const res = await client.query(
          `select b.*, mc.name as medication_name
           from app.pharmacy_stock_batches b
           join app.medication_catalog mc on mc.id = b.medication_id
           order by b.expiry_date asc`,
        );
        return res.rows.map(mapBatchRow);
      });
      return reply.send(success(batches, req.id));
    },
  );

  app.post(
    '/api/v1/pharmacy/stock-batches',
    { preHandler: requirePermission(pool, 'pharmacy.stock_write') },
    async (req, reply) => {
      const parsedBody = createBatchSchema.parse(req.body);
      const identity = req.identity!;
      const receivedBy = identity.appUserId!;

      const batch = await withSecurityContext(pool!, { userId: receivedBy, roles: identity.roles }, async (client) => {
        const validated = validatePharmacyStockBatchCreateInput(parsedBody);

        const insertRes = await client.query(
          `insert into app.pharmacy_stock_batches (medication_id, batch_number, expiry_date, quantity_on_hand, unit, received_by, notes)
           values ($1, $2, $3, $4, $5, $6, $7)
           returning *`,
          [validated.medicationId, validated.batchNumber, validated.expiryDate, validated.quantityOnHand, validated.unit, receivedBy, validated.notes],
        );
        const newBatch = mapBatchRow(insertRes.rows[0]!);

        const event = createStockBatchReceivedEvent(newBatch, receivedBy as UUID);
        await persistDomainEvent(client, {
          id: event.eventId as UUID, eventType: event.type, aggregateType: event.aggregateType,
          aggregateId: event.aggregateId as UUID, actorUserId: receivedBy as UUID, patientId: null,
          payload: event.payload, schemaVersion: event.schemaVersion,
        });

        return newBatch;
      });

      return reply.status(201).send(success(batch, req.id));
    },
  );

  // Registra movimentação (entrada/saída/ajuste) e atualiza a quantidade do
  // lote na mesma transação — `applyStockMovement` (domínio) valida que uma
  // saída não deixe o estoque negativo.
  app.post(
    '/api/v1/pharmacy/stock-batches/:batchId/movements',
    { preHandler: requirePermission(pool, 'pharmacy.stock_write') },
    async (req, reply) => {
      const { batchId } = req.params as { batchId: UUID };
      const parsedBody = createMovementSchema.parse({ ...(req.body as object), batchId });
      const identity = req.identity!;
      const performedBy = identity.appUserId!;

      const movement = await withSecurityContext(pool!, { userId: performedBy, roles: identity.roles }, async (client) => {
        const validated = validatePharmacyStockMovementCreateInput(parsedBody);

        const batchRes = await client.query('select quantity_on_hand from app.pharmacy_stock_batches where id = $1 for update', [batchId]);
        if (batchRes.rowCount === 0 || !batchRes.rows[0]) {
          throw new AppError({ category: ErrorCategory.NOT_FOUND, code: 'PHARMACY_STOCK_BATCH_NOT_FOUND', message: 'Lote de estoque não encontrado.' });
        }
        const currentQuantity = Number(batchRes.rows[0].quantity_on_hand);
        const nextQuantity = applyStockMovement(currentQuantity, validated.movementType, validated.quantity);

        await client.query('update app.pharmacy_stock_batches set quantity_on_hand = $1 where id = $2', [nextQuantity, batchId]);

        const insertRes = await client.query(
          `insert into app.pharmacy_stock_movements (batch_id, movement_type, quantity, reason, performed_by)
           values ($1, $2, $3, $4, $5)
           returning *`,
          [batchId, validated.movementType, validated.quantity, validated.reason, performedBy],
        );
        const newMovement = mapMovementRow(insertRes.rows[0]!);

        const event = createStockMovementRecordedEvent(newMovement, performedBy as UUID);
        await persistDomainEvent(client, {
          id: event.eventId as UUID, eventType: event.type, aggregateType: event.aggregateType,
          aggregateId: event.aggregateId as UUID, actorUserId: performedBy as UUID, patientId: null,
          payload: event.payload, schemaVersion: event.schemaVersion,
        });

        return newMovement;
      });

      return reply.status(201).send(success(movement, req.id));
    },
  );
};
