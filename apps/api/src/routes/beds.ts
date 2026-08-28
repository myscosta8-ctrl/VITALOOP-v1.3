import type { FastifyInstance, FastifyRequest } from 'fastify';
import pg from 'pg';
import { z } from 'zod';
import type { UUID } from '@vitaloop/shared';
import { AppError, ErrorCategory } from '@vitaloop/shared';
import {
  validateAllocateBedInput,
  validateTransferBedInput,
  validateDischargeBedInput,
  calculateBedStayHours,
  createPatientBedAssignedEvent,
  createPatientBedTransferredEvent,
  createPatientBedDischargedEvent,
  type BedStatus,
  type DomainEvent,
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

const persistDomainEvent = async (client: pg.PoolClient, ev: DomainEvent, patientId: UUID): Promise<void> => {
  await client.query(
    `insert into app.domain_events (id, event_type, aggregate_type, aggregate_id, actor_user_id, patient_id, payload, schema_version, occurred_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, now())`,
    [
      ev.eventId,
      ev.type,
      ev.aggregateType,
      ev.aggregateId,
      ev.actorId,
      patientId,
      JSON.stringify(ev.payload),
      ev.schemaVersion,
    ],
  );
};

const allocateBedSchema = z.object({
  bedId: z.string().uuid(),
  patientId: z.string().uuid(),
  regulationCode: z.string().optional().nullable(),
});

const transferBedSchema = z.object({
  targetBedId: z.string().uuid(),
  transferReason: z.string().min(10, 'A justificativa de transferência exige no mínimo 10 caracteres.'),
});

const updateBedStatusSchema = z.object({
  status: z.enum(['available', 'occupied', 'reserved', 'cleaning', 'blocked', 'maintenance']),
});

const createSectorSchema = z.object({
  name: z.string().min(3),
  code: z.string().min(2),
  description: z.string().optional().nullable(),
  capacity: z.number().int().min(1),
});

const createBedSchema = z.object({
  sectorId: z.string().uuid(),
  bedNumber: z.string().min(1),
  isExtra: z.boolean().optional().default(false),
});

export const registerBedRoutes = (app: FastifyInstance, pool: pg.Pool | null): void => {
  // 1. GET /api/v1/bed-sectors
  app.get(
    '/api/v1/bed-sectors',
    { preHandler: requirePermission(pool, 'bed.read') },
    async (req, reply) => {
      const identity = req.identity!;
      const res = await withSecurityContext(pool!, { userId: identity.appUserId!, roles: identity.roles }, async (client) => {
        const { rows } = await client.query(
          `select id, name, code, description, capacity, created_at as "createdAt"
           from app.bed_sectors
           order by name asc`,
        );
        return rows;
      });

      return reply.status(200).send(success(res, req.id));
    },
  );

  // 2. POST /api/v1/bed-sectors
  app.post(
    '/api/v1/bed-sectors',
    { preHandler: requirePermission(pool, 'bed.write') },
    async (req, reply) => {
      const identity = req.identity!;
      const body = createSectorSchema.parse(req.body);

      const sector = await withSecurityContext(pool!, { userId: identity.appUserId!, roles: identity.roles }, async (client) => {
        const { rows } = await client.query(
          `insert into app.bed_sectors (name, code, description, capacity)
           values ($1, $2, $3, $4)
           returning id, name, code, description, capacity, created_at as "createdAt"`,
          [body.name, body.code.toUpperCase(), body.description || null, body.capacity],
        );
        return rows[0];
      });

      return reply.status(201).send(success(sector, req.id));
    },
  );

  // 3. GET /api/v1/beds
  app.get(
    '/api/v1/beds',
    { preHandler: requirePermission(pool, 'bed.read') },
    async (req, reply) => {
      const identity = req.identity!;
      const { sectorId } = req.query as { sectorId?: string };

      const beds = await withSecurityContext(pool!, { userId: identity.appUserId!, roles: identity.roles }, async (client) => {
        let query = `
          select b.id, b.sector_id as "sectorId", s.name as "sectorName", b.bed_number as "bedNumber",
                 b.status, b.is_extra as "isExtra", b.created_at as "createdAt", b.updated_at as "updatedAt"
          from app.beds b
          join app.bed_sectors s on s.id = b.sector_id
        `;
        const params: unknown[] = [];
        if (sectorId) {
          query += ` where b.sector_id = $1`;
          params.push(sectorId);
        }
        query += ` order by s.name asc, b.is_extra asc, b.bed_number asc`;

        const { rows } = await client.query(query, params);
        return rows;
      });

      return reply.status(200).send(success(beds, req.id));
    },
  );

  // 4. POST /api/v1/beds (Cria leito físico ou leito extra - BED-004)
  app.post(
    '/api/v1/beds',
    { preHandler: requirePermission(pool, 'bed.write') },
    async (req, reply) => {
      const identity = req.identity!;
      const body = createBedSchema.parse(req.body);

      const bed = await withSecurityContext(pool!, { userId: identity.appUserId!, roles: identity.roles }, async (client) => {
        const { rows } = await client.query(
          `insert into app.beds (sector_id, bed_number, is_extra, status)
           values ($1, $2, $3, 'available')
           returning id, sector_id as "sectorId", bed_number as "bedNumber", status, is_extra as "isExtra", created_at as "createdAt"`,
          [body.sectorId, body.bedNumber, body.isExtra],
        );
        await auditAction(client, identity.appUserId!, 'create', 'bed', rows[0].id, req, rows[0]);
        return rows[0];
      });

      return reply.status(201).send(success(bed, req.id));
    },
  );

  // 5. GET /api/v1/beds/map (Mapa de ocupação em tempo real - BED-003/BED-009)
  app.get(
    '/api/v1/beds/map',
    { preHandler: requirePermission(pool, 'bed.read') },
    async (req, reply) => {
      const identity = req.identity!;

      const mapData = await withSecurityContext(pool!, { userId: identity.appUserId!, roles: identity.roles }, async (client) => {
        const { rows: sectors } = await client.query(
          `select id, name, code, capacity from app.bed_sectors order by name asc`,
        );

        const { rows: beds } = await client.query(
          `select b.id, b.sector_id as "sectorId", b.bed_number as "bedNumber", b.status, b.is_extra as "isExtra",
                  ba.id as "allocationId", ba.encounter_id as "encounterId", ba.patient_id as "patientId",
                  ba.allocated_at as "allocatedAt", ba.regulation_code as "regulationCode",
                  p.full_name as "patientName", p.cpf as "patientCpf"
           from app.beds b
           left join app.bed_allocations ba on ba.bed_id = b.id and ba.status = 'active'
           left join app.patients p on p.id = ba.patient_id
           order by b.is_extra asc, b.bed_number asc`,
        );

        return sectors.map((s) => {
          const sectorBeds = beds.filter((b) => b.sectorId === s.id).map((b) => {
            let stayInfo = null;
            if (b.allocatedAt) {
              stayInfo = calculateBedStayHours(b.allocatedAt);
            }
            return {
              ...b,
              stayHours: stayInfo?.hours || 0,
              is24hLimitExceeded: stayInfo?.is24hLimitExceeded || false,
            };
          });

          const occupiedCount = sectorBeds.filter((b) => b.status === 'occupied').length;
          const totalCount = sectorBeds.length;
          const occupancyRate = totalCount > 0 ? Math.round((occupiedCount / totalCount) * 100) : 0;

          return {
            sector: s,
            beds: sectorBeds,
            metrics: {
              totalBeds: totalCount,
              occupiedBeds: occupiedCount,
              availableBeds: sectorBeds.filter((b) => b.status === 'available').length,
              cleaningBeds: sectorBeds.filter((b) => b.status === 'cleaning').length,
              occupancyRatePercentage: occupancyRate,
            },
          };
        });
      });

      return reply.status(200).send(success(mapData, req.id));
    },
  );

  // 6. POST /api/v1/encounters/:encounterId/beds/allocate (Alocação de Leito - BED-001/005/012)
  app.post(
    '/api/v1/encounters/:encounterId/beds/allocate',
    { preHandler: requirePermission(pool, 'bed.write') },
    async (req, reply) => {
      const identity = req.identity!;
      const { encounterId } = req.params as { encounterId: UUID };
      const body = allocateBedSchema.parse(req.body);

      const allocation = await withSecurityContext(pool!, { userId: identity.appUserId!, roles: identity.roles }, async (client) => {
        // 1. Checar se o atendimento já possui alocação ativa
        const { rows: existingEncAlloc } = await client.query(
          `select id from app.bed_allocations where encounter_id = $1 and status = 'active'`,
          [encounterId],
        );
        if (existingEncAlloc.length > 0) {
          throw new AppError({
            category: ErrorCategory.CONFLICT,
            code: 'ACTIVE_BED_ALLOCATION_EXISTS',
            message: 'O atendimento já possui uma alocação de leito ativa.',
          });
        }

        // 2. Obter leito e status atual
        const { rows: bedRows } = await client.query(
          `select id, sector_id, bed_number, status, is_extra from app.beds where id = $1 for update`,
          [body.bedId],
        );
        if (bedRows.length === 0) {
          throw new AppError({
            category: ErrorCategory.NOT_FOUND,
            code: 'BED_NOT_FOUND',
            message: 'Leito não encontrado.',
          });
        }

        const targetBed = bedRows[0];
        validateAllocateBedInput(
          {
            bedId: body.bedId as UUID,
            encounterId,
            patientId: body.patientId as UUID,
            allocatedBy: identity.appUserId as UUID,
            regulationCode: body.regulationCode,
          },
          targetBed.status as BedStatus,
        );

        // 3. Atualizar leito para 'occupied'
        await client.query(`update app.beds set status = 'occupied', updated_at = now() where id = $1`, [body.bedId]);

        // 4. Criar registro em app.bed_allocations
        const { rows: allocRows } = await client.query(
          `insert into app.bed_allocations (bed_id, encounter_id, patient_id, status, allocated_by, regulation_code)
           values ($1, $2, $3, 'active', $4, $5)
           returning id, bed_id as "bedId", encounter_id as "encounterId", patient_id as "patientId",
                     status, allocated_by as "allocatedBy", allocated_at as "allocatedAt", regulation_code as "regulationCode"`,
          [body.bedId, encounterId, body.patientId, identity.appUserId, body.regulationCode || null],
        );

        const createdAlloc = allocRows[0];

        // 5. Emissão de evento de domínio
        const domainEvent = createPatientBedAssignedEvent({
          allocationId: createdAlloc.id as UUID,
          bedId: targetBed.id as UUID,
          sectorId: targetBed.sector_id as UUID,
          bedNumber: targetBed.bed_number,
          encounterId,
          patientId: body.patientId as UUID,
          allocatedBy: identity.appUserId as UUID,
          isExtra: targetBed.is_extra,
          regulationCode: body.regulationCode,
        });

        await persistDomainEvent(client, domainEvent, body.patientId as UUID);
        await auditAction(client, identity.appUserId!, 'create', 'bed_allocation', createdAlloc.id, req, createdAlloc);

        return createdAlloc;
      });

      return reply.status(201).send(success(allocation, req.id));
    },
  );

  // 7. POST /api/v1/bed-allocations/:allocationId/transfer (Transferência Interna de Leito - BED-006)
  app.post(
    '/api/v1/bed-allocations/:allocationId/transfer',
    { preHandler: requirePermission(pool, 'bed.transfer') },
    async (req, reply) => {
      const identity = req.identity!;
      const { allocationId } = req.params as { allocationId: UUID };
      const body = transferBedSchema.parse(req.body);

      const result = await withSecurityContext(pool!, { userId: identity.appUserId!, roles: identity.roles }, async (client) => {
        // 1. Obter alocação atual ativa
        const { rows: currentAllocRows } = await client.query(
          `select id, bed_id, encounter_id, patient_id, status from app.bed_allocations where id = $1 for update`,
          [allocationId],
        );
        if (currentAllocRows.length === 0 || currentAllocRows[0].status !== 'active') {
          throw new AppError({
            category: ErrorCategory.NOT_FOUND,
            code: 'ACTIVE_BED_ALLOCATION_NOT_FOUND',
            message: 'Alocação de leito ativa não encontrada para transferência.',
          });
        }

        const oldAlloc = currentAllocRows[0];

        // 2. Obter leito destino
        const { rows: targetBedRows } = await client.query(
          `select id, sector_id, bed_number, status, is_extra from app.beds where id = $1 for update`,
          [body.targetBedId],
        );
        if (targetBedRows.length === 0) {
          throw new AppError({
            category: ErrorCategory.NOT_FOUND,
            code: 'TARGET_BED_NOT_FOUND',
            message: 'Leito de destino não encontrado.',
          });
        }

        const targetBed = targetBedRows[0];
        validateTransferBedInput(
          {
            allocationId,
            sourceBedId: oldAlloc.bed_id as UUID,
            targetBedId: body.targetBedId as UUID,
            encounterId: oldAlloc.encounter_id as UUID,
            patientId: oldAlloc.patient_id as UUID,
            transferredBy: identity.appUserId as UUID,
            transferReason: body.transferReason,
          },
          targetBed.status as BedStatus,
        );

        // 3. Encerrar alocação antiga
        await client.query(
          `update app.bed_allocations set status = 'transferred', discharged_at = now(), transfer_reason = $1, updated_at = now() where id = $2`,
          [body.transferReason, allocationId],
        );

        // 4. Liberar leito antigo para higienização ('cleaning') - BED-011
        await client.query(`update app.beds set status = 'cleaning', updated_at = now() where id = $1`, [oldAlloc.bed_id]);

        // 5. Ocupar novo leito ('occupied')
        await client.query(`update app.beds set status = 'occupied', updated_at = now() where id = $1`, [body.targetBedId]);

        // 6. Criar nova alocação ativa
        const { rows: newAllocRows } = await client.query(
          `insert into app.bed_allocations (bed_id, encounter_id, patient_id, status, allocated_by)
           values ($1, $2, $3, 'active', $4)
           returning id, bed_id as "bedId", encounter_id as "encounterId", patient_id as "patientId", status, allocated_at as "allocatedAt"`,
          [body.targetBedId, oldAlloc.encounter_id, oldAlloc.patient_id, identity.appUserId],
        );

        const newAlloc = newAllocRows[0];

        // 7. Eventos de Domínio
        const domainEvent = createPatientBedTransferredEvent({
          allocationId: newAlloc.id as UUID,
          sourceBedId: oldAlloc.bed_id as UUID,
          targetBedId: body.targetBedId as UUID,
          encounterId: oldAlloc.encounter_id as UUID,
          patientId: oldAlloc.patient_id as UUID,
          transferredBy: identity.appUserId as UUID,
          transferReason: body.transferReason,
        });

        await persistDomainEvent(client, domainEvent, oldAlloc.patient_id as UUID);

        await auditAction(client, identity.appUserId!, 'update', 'bed_allocation', newAlloc.id, req, {
          transferReason: body.transferReason,
          oldBedId: oldAlloc.bed_id,
          newBedId: body.targetBedId,
        });

        return newAlloc;
      });

      return reply.status(200).send(success(result, req.id));
    },
  );

  // 8. POST /api/v1/bed-allocations/:allocationId/discharge (Alta do Leito - BED-010/011)
  app.post(
    '/api/v1/bed-allocations/:allocationId/discharge',
    { preHandler: requirePermission(pool, 'bed.discharge') },
    async (req, reply) => {
      const identity = req.identity!;
      const { allocationId } = req.params as { allocationId: UUID };

      const dischargedAlloc = await withSecurityContext(pool!, { userId: identity.appUserId!, roles: identity.roles }, async (client) => {
        const { rows: currentAllocRows } = await client.query(
          `select id, bed_id, encounter_id, patient_id, status from app.bed_allocations where id = $1 for update`,
          [allocationId],
        );

        if (currentAllocRows.length === 0 || currentAllocRows[0].status !== 'active') {
          throw new AppError({
            category: ErrorCategory.NOT_FOUND,
            code: 'ACTIVE_BED_ALLOCATION_NOT_FOUND',
            message: 'Alocação de leito ativa não encontrada para alta.',
          });
        }

        const alloc = currentAllocRows[0];
        validateDischargeBedInput({
          allocationId,
          bedId: alloc.bed_id as UUID,
          encounterId: alloc.encounter_id as UUID,
          patientId: alloc.patient_id as UUID,
          dischargedBy: identity.appUserId as UUID,
        });

        // 1. Atualizar alocação para 'discharged'
        await client.query(
          `update app.bed_allocations set status = 'discharged', discharged_at = now(), updated_at = now() where id = $1`,
          [allocationId],
        );

        // 2. Transitar leito para 'cleaning' (BED-011)
        await client.query(`update app.beds set status = 'cleaning', updated_at = now() where id = $1`, [alloc.bed_id]);

        // 3. Evento de Domínio
        const domainEvent = createPatientBedDischargedEvent({
          allocationId,
          bedId: alloc.bed_id as UUID,
          encounterId: alloc.encounter_id as UUID,
          patientId: alloc.patient_id as UUID,
          dischargedBy: identity.appUserId as UUID,
          nextBedStatus: 'cleaning',
        });

        await persistDomainEvent(client, domainEvent, alloc.patient_id as UUID);
        await auditAction(client, identity.appUserId!, 'update', 'bed_allocation', allocationId, req, { status: 'discharged' });

        return { allocationId, status: 'discharged', bedStatus: 'cleaning' };
      });

      return reply.status(200).send(success(dischargedAlloc, req.id));
    },
  );

  // 9. PATCH /api/v1/beds/:bedId/status (Alteração/Conclusão de Higienização de Leito - BED-011)
  app.patch(
    '/api/v1/beds/:bedId/status',
    { preHandler: requirePermission(pool, 'bed.write') },
    async (req, reply) => {
      const identity = req.identity!;
      const { bedId } = req.params as { bedId: UUID };
      const body = updateBedStatusSchema.parse(req.body);

      const updatedBed = await withSecurityContext(pool!, { userId: identity.appUserId!, roles: identity.roles }, async (client) => {
        const { rows } = await client.query(
          `update app.beds set status = $1, updated_at = now() where id = $2
           returning id, sector_id as "sectorId", bed_number as "bedNumber", status, is_extra as "isExtra", updated_at as "updatedAt"`,
          [body.status, bedId],
        );

        if (rows.length === 0) {
          throw new AppError({
            category: ErrorCategory.NOT_FOUND,
            code: 'BED_NOT_FOUND',
            message: 'Leito não encontrado.',
          });
        }

        await auditAction(client, identity.appUserId!, 'update', 'bed', bedId, req, { newStatus: body.status });

        return rows[0];
      });

      return reply.status(200).send(success(updatedBed, req.id));
    },
  );
};
