import type { FastifyInstance, FastifyRequest } from 'fastify';
import pg from 'pg';
import { z } from 'zod';
import type { UUID } from '@vitaloop/shared';
import { AppError, ErrorCategory } from '@vitaloop/shared';
import {
  validateFluidBalanceEntryInput,
  validateFluidBalanceStatusTransition,
  computeFluidBalanceTotals,
  type FluidBalanceEntry,
  type FluidBalanceStatus,
} from '@vitaloop/domain';
import { success } from '../http/envelope.js';
import { withSecurityContext } from '../db/security-context.js';
import { requirePermission } from '../security/require-auth.js';
import { sha256Hex } from '../security/hash.js';

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

const mapEntryRow = (r: pg.QueryResultRow): FluidBalanceEntry => ({
  id: r.id,
  periodId: r.period_id,
  direction: r.direction,
  itemName: r.item_name,
  volumeMl: Number(r.volume_ml),
  entryDate: r.entry_date instanceof Date ? r.entry_date.toISOString().slice(0, 10) : r.entry_date,
  entryHour: r.entry_hour,
  entryMinute: r.entry_minute,
  region: r.region,
  laterality: r.laterality,
  recordedBy: r.recorded_by,
  createdAt: r.created_at.toISOString(),
});

const mapPeriodRow = (r: pg.QueryResultRow) => ({
  id: r.id,
  encounterId: r.encounter_id,
  patientId: r.patient_id,
  balanceNumber: r.balance_number,
  status: r.status as FluidBalanceStatus,
  referenceDate: r.reference_date instanceof Date ? r.reference_date.toISOString().slice(0, 10) : r.reference_date,
  periodStart: r.period_start.toISOString(),
  periodEnd: r.period_end ? r.period_end.toISOString() : null,
  createdBy: r.created_by,
  closedBy: r.closed_by,
  closedAt: r.closed_at ? r.closed_at.toISOString() : null,
  createdAt: r.created_at.toISOString(),
  updatedAt: r.updated_at.toISOString(),
});

const createEntrySchema = z.object({
  direction: z.enum(['gain', 'loss']),
  itemName: z.string(),
  volumeMl: z.number(),
  entryDate: z.string(),
  entryHour: z.number(),
  entryMinute: z.number().optional(),
  region: z.string().optional().nullable(),
  laterality: z.enum(['left', 'right', 'bilateral']).optional().nullable(),
});

const closePeriodSchema = z.object({
  targetStatus: z.enum(['partially_closed', 'closed']),
});

export const registerFluidBalanceRoutes = (app: FastifyInstance, pool: pg.Pool | null): void => {
  // Cria (ou reaproveita, se já existir pro mesmo dia) o período de balanço
  // hídrico corrente do atendimento — `balance_number` é sequencial por
  // atendimento, igual ao modelo real (ex.: "Balanço Hídrico: 8559").
  app.post(
    '/api/v1/encounters/:encounterId/fluid-balance/periods',
    { preHandler: requirePermission(pool, 'nursing.balance') },
    async (req, reply) => {
      const { encounterId } = req.params as { encounterId: UUID };
      const { referenceDate } = z.object({ referenceDate: z.string().optional() }).parse(req.body ?? {});
      const identity = req.identity!;
      const createdBy = identity.appUserId!;
      const refDate = referenceDate ?? new Date().toISOString().slice(0, 10);

      const period = await withSecurityContext(pool!, { userId: createdBy, roles: identity.roles }, async (client) => {
        const encRes = await client.query('select patient_id from app.encounters where id = $1', [encounterId]);
        if (encRes.rows.length === 0) {
          throw new AppError({ category: ErrorCategory.NOT_FOUND, code: 'ENCOUNTER_NOT_FOUND', message: 'Atendimento não encontrado.' });
        }
        const patientId = encRes.rows[0].patient_id;

        const existing = await client.query(
          `select * from app.fluid_balance_periods where encounter_id = $1 and reference_date = $2 order by balance_number desc limit 1`,
          [encounterId, refDate],
        );
        if (existing.rows.length > 0) {
          return mapPeriodRow(existing.rows[0]);
        }

        const nextNumberRes = await client.query(
          `select coalesce(max(balance_number), 0) + 1 as next from app.fluid_balance_periods where encounter_id = $1`,
          [encounterId],
        );
        const nextNumber = nextNumberRes.rows[0].next as number;

        const insertRes = await client.query(
          `insert into app.fluid_balance_periods (encounter_id, patient_id, balance_number, reference_date, created_by)
           values ($1, $2, $3, $4, $5)
           returning *`,
          [encounterId, patientId, nextNumber, refDate, createdBy],
        );
        const row = insertRes.rows[0];
        await auditAction(client, createdBy, 'create', 'fluid_balance_period', row.id, req, { encounterId, balanceNumber: nextNumber });
        return mapPeriodRow(row);
      });

      return reply.status(201).send(success(period, req.id));
    },
  );

  // Histórico de balanços do atendimento, com totais já calculados.
  app.get(
    '/api/v1/encounters/:encounterId/fluid-balance/periods',
    { preHandler: requirePermission(pool, 'nursing.read') },
    async (req, reply) => {
      const { encounterId } = req.params as { encounterId: UUID };
      const identity = req.identity!;

      const periods = await withSecurityContext(pool!, { userId: identity.appUserId!, roles: identity.roles }, async (client) => {
        const periodsRes = await client.query(
          `select * from app.fluid_balance_periods where encounter_id = $1 order by balance_number desc`,
          [encounterId],
        );
        const results = [];
        for (const row of periodsRes.rows) {
          const entriesRes = await client.query('select * from app.fluid_balance_entries where period_id = $1', [row.id]);
          const totals = computeFluidBalanceTotals(entriesRes.rows.map(mapEntryRow));
          results.push({ ...mapPeriodRow(row), totals });
        }
        return results;
      });

      return reply.status(200).send(success(periods, req.id));
    },
  );

  // Um período específico com todos os lançamentos e totais.
  app.get(
    '/api/v1/fluid-balance/periods/:id',
    { preHandler: requirePermission(pool, 'nursing.read') },
    async (req, reply) => {
      const { id } = req.params as { id: UUID };
      const identity = req.identity!;

      const result = await withSecurityContext(pool!, { userId: identity.appUserId!, roles: identity.roles }, async (client) => {
        const periodRes = await client.query('select * from app.fluid_balance_periods where id = $1', [id]);
        if (periodRes.rows.length === 0) {
          throw new AppError({ category: ErrorCategory.NOT_FOUND, code: 'FLUID_BALANCE_PERIOD_NOT_FOUND', message: 'Balanço hídrico não encontrado.' });
        }
        const entriesRes = await client.query('select * from app.fluid_balance_entries where period_id = $1 order by entry_date, entry_hour, entry_minute', [id]);
        const entries = entriesRes.rows.map(mapEntryRow);
        const totals = computeFluidBalanceTotals(entries);
        return { ...mapPeriodRow(periodRes.rows[0]), entries, totals };
      });

      return reply.status(200).send(success(result, req.id));
    },
  );

  // Lança um item de ganho ou perda dentro de um período.
  app.post(
    '/api/v1/fluid-balance/periods/:id/entries',
    { preHandler: requirePermission(pool, 'nursing.balance') },
    async (req, reply) => {
      const { id } = req.params as { id: UUID };
      const parsedBody = createEntrySchema.parse(req.body);
      const identity = req.identity!;
      const recordedBy = identity.appUserId!;

      validateFluidBalanceEntryInput({ periodId: id, ...parsedBody });

      const entry = await withSecurityContext(pool!, { userId: recordedBy, roles: identity.roles }, async (client) => {
        const periodRes = await client.query('select status from app.fluid_balance_periods where id = $1', [id]);
        if (periodRes.rows.length === 0) {
          throw new AppError({ category: ErrorCategory.NOT_FOUND, code: 'FLUID_BALANCE_PERIOD_NOT_FOUND', message: 'Balanço hídrico não encontrado.' });
        }
        if (periodRes.rows[0].status === 'closed') {
          throw new AppError({ category: ErrorCategory.VALIDATION, code: 'FLUID_BALANCE_ALREADY_CLOSED', message: 'Este balanço hídrico já está fechado e não pode receber novos lançamentos.' });
        }

        const insertRes = await client.query(
          `insert into app.fluid_balance_entries (period_id, direction, item_name, volume_ml, entry_date, entry_hour, entry_minute, region, laterality, recorded_by)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           returning *`,
          [
            id,
            parsedBody.direction,
            parsedBody.itemName,
            parsedBody.volumeMl,
            parsedBody.entryDate,
            parsedBody.entryHour,
            parsedBody.entryMinute ?? 0,
            parsedBody.region ?? null,
            parsedBody.laterality ?? null,
            recordedBy,
          ],
        );
        const row = insertRes.rows[0];
        await auditAction(client, recordedBy, 'create', 'fluid_balance_entry', row.id, req, { periodId: id, direction: parsedBody.direction, volumeMl: parsedBody.volumeMl });
        return mapEntryRow(row);
      });

      return reply.status(201).send(success(entry, req.id));
    },
  );

  // Fecha o período (parcial ou totalmente) — bloqueia novos lançamentos.
  app.post(
    '/api/v1/fluid-balance/periods/:id/close',
    { preHandler: requirePermission(pool, 'nursing.balance') },
    async (req, reply) => {
      const { id } = req.params as { id: UUID };
      const { targetStatus } = closePeriodSchema.parse(req.body);
      const identity = req.identity!;
      const closedBy = identity.appUserId!;

      const period = await withSecurityContext(pool!, { userId: closedBy, roles: identity.roles }, async (client) => {
        const periodRes = await client.query('select status from app.fluid_balance_periods where id = $1', [id]);
        if (periodRes.rows.length === 0) {
          throw new AppError({ category: ErrorCategory.NOT_FOUND, code: 'FLUID_BALANCE_PERIOD_NOT_FOUND', message: 'Balanço hídrico não encontrado.' });
        }
        const currentStatus = periodRes.rows[0].status as FluidBalanceStatus;
        validateFluidBalanceStatusTransition(currentStatus, targetStatus);

        const updateRes = await client.query(
          `update app.fluid_balance_periods
           set status = $1, closed_by = $2, closed_at = now(), period_end = now(), updated_at = now()
           where id = $3
           returning *`,
          [targetStatus, closedBy, id],
        );
        const row = updateRes.rows[0];
        await auditAction(client, closedBy, 'update', 'fluid_balance_period', row.id, req, { targetStatus });
        return mapPeriodRow(row);
      });

      return reply.status(200).send(success(period, req.id));
    },
  );
};
