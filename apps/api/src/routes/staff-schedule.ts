import type { FastifyInstance } from 'fastify';
import pg from 'pg';
import { z } from 'zod';
import { AppError, ErrorCategory } from '@vitaloop/shared';
import { success } from '../http/envelope.js';
import { withSecurityContext } from '../db/security-context.js';
import { requirePermission } from '../security/require-auth.js';

const createLeaveSchema = z.object({
  userId: z.string().uuid(),
  leaveType: z.enum(['ferias', 'atestado', 'licenca', 'outro']),
  startDate: z.string().min(10),
  endDate: z.string().min(10),
  notes: z.string().optional().nullable(),
});

const createShiftSchema = z.object({
  userId: z.string().uuid(),
  shiftDate: z.string().min(10),
  shiftPeriod: z.string().min(2),
  roleAtShift: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const registerStaffScheduleRoutes = (app: FastifyInstance, pool: pg.Pool | null): void => {
  // 1. GET /api/v1/staff/users — servidores disponíveis pra escalar (nome + papéis)
  app.get(
    '/api/v1/staff/users',
    { preHandler: requirePermission(pool, 'staff_schedule.read') },
    async (req, reply) => {
      const identity = req.identity!;
      const users = await withSecurityContext(pool!, { userId: identity.appUserId!, roles: identity.roles }, async (client) => {
        const { rows } = await client.query(
          `select u.id, u.name, u.status,
                  coalesce(array_agg(distinct r.code) filter (where r.code is not null), '{}') as roles
           from app.users u
           left join app.user_roles ur on ur.user_id = u.id and ur.status = 'active'
           left join app.roles r on r.id = ur.role_id
           where u.status = 'active'
           group by u.id, u.name, u.status
           order by u.name asc`,
        );
        return rows;
      });

      return reply.status(200).send(success(users, req.id));
    },
  );

  // 2. GET /api/v1/staff/leaves — férias/afastamentos
  app.get(
    '/api/v1/staff/leaves',
    { preHandler: requirePermission(pool, 'staff_schedule.read') },
    async (req, reply) => {
      const identity = req.identity!;
      const leaves = await withSecurityContext(pool!, { userId: identity.appUserId!, roles: identity.roles }, async (client) => {
        const { rows } = await client.query(
          `select l.id, l.user_id as "userId", u.name as "userName", l.leave_type as "leaveType",
                  l.start_date as "startDate", l.end_date as "endDate", l.notes,
                  l.created_at as "createdAt"
           from app.staff_leaves l
           join app.users u on u.id = l.user_id
           order by l.start_date desc`,
        );
        return rows;
      });

      return reply.status(200).send(success(leaves, req.id));
    },
  );

  // 3. POST /api/v1/staff/leaves
  app.post(
    '/api/v1/staff/leaves',
    { preHandler: requirePermission(pool, 'staff_schedule.write') },
    async (req, reply) => {
      const identity = req.identity!;
      const body = createLeaveSchema.parse(req.body);

      if (new Date(body.endDate) < new Date(body.startDate)) {
        throw new AppError({
          category: ErrorCategory.VALIDATION,
          code: 'INVALID_LEAVE_PERIOD',
          message: 'A data final não pode ser anterior à data inicial.',
        });
      }

      const leave = await withSecurityContext(pool!, { userId: identity.appUserId!, roles: identity.roles }, async (client) => {
        const { rows } = await client.query(
          `insert into app.staff_leaves (user_id, leave_type, start_date, end_date, notes, created_by)
           values ($1, $2, $3, $4, $5, $6)
           returning id, user_id as "userId", leave_type as "leaveType", start_date as "startDate",
                     end_date as "endDate", notes, created_at as "createdAt"`,
          [body.userId, body.leaveType, body.startDate, body.endDate, body.notes || null, identity.appUserId],
        );
        return rows[0];
      });

      return reply.status(201).send(success(leave, req.id));
    },
  );

  // 4. DELETE /api/v1/staff/leaves/:id
  app.delete(
    '/api/v1/staff/leaves/:id',
    { preHandler: requirePermission(pool, 'staff_schedule.write') },
    async (req, reply) => {
      const identity = req.identity!;
      const { id } = req.params as { id: string };

      await withSecurityContext(pool!, { userId: identity.appUserId!, roles: identity.roles }, async (client) => {
        await client.query(`delete from app.staff_leaves where id = $1`, [id]);
      });

      return reply.status(200).send(success({ id, deleted: true }, req.id));
    },
  );

  // 5. GET /api/v1/staff/shifts — escala de plantão
  app.get(
    '/api/v1/staff/shifts',
    { preHandler: requirePermission(pool, 'staff_schedule.read') },
    async (req, reply) => {
      const identity = req.identity!;
      const shifts = await withSecurityContext(pool!, { userId: identity.appUserId!, roles: identity.roles }, async (client) => {
        const { rows } = await client.query(
          `select s.id, s.user_id as "userId", u.name as "userName", s.shift_date as "shiftDate",
                  s.shift_period as "shiftPeriod", s.role_at_shift as "roleAtShift", s.notes,
                  s.created_at as "createdAt"
           from app.staff_shifts s
           join app.users u on u.id = s.user_id
           order by s.shift_date desc, s.shift_period asc`,
        );
        return rows;
      });

      return reply.status(200).send(success(shifts, req.id));
    },
  );

  // 6. POST /api/v1/staff/shifts
  app.post(
    '/api/v1/staff/shifts',
    { preHandler: requirePermission(pool, 'staff_schedule.write') },
    async (req, reply) => {
      const identity = req.identity!;
      const body = createShiftSchema.parse(req.body);

      const shift = await withSecurityContext(pool!, { userId: identity.appUserId!, roles: identity.roles }, async (client) => {
        const { rows } = await client.query(
          `insert into app.staff_shifts (user_id, shift_date, shift_period, role_at_shift, notes, created_by)
           values ($1, $2, $3, $4, $5, $6)
           on conflict (user_id, shift_date, shift_period) do update set notes = excluded.notes
           returning id, user_id as "userId", shift_date as "shiftDate", shift_period as "shiftPeriod",
                     role_at_shift as "roleAtShift", notes, created_at as "createdAt"`,
          [body.userId, body.shiftDate, body.shiftPeriod, body.roleAtShift || null, body.notes || null, identity.appUserId],
        );
        return rows[0];
      });

      return reply.status(201).send(success(shift, req.id));
    },
  );

  // 7. DELETE /api/v1/staff/shifts/:id
  app.delete(
    '/api/v1/staff/shifts/:id',
    { preHandler: requirePermission(pool, 'staff_schedule.write') },
    async (req, reply) => {
      const identity = req.identity!;
      const { id } = req.params as { id: string };

      await withSecurityContext(pool!, { userId: identity.appUserId!, roles: identity.roles }, async (client) => {
        await client.query(`delete from app.staff_shifts where id = $1`, [id]);
      });

      return reply.status(200).send(success({ id, deleted: true }, req.id));
    },
  );
};
