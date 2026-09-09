/**
 * Cadastro de profissionais (conta de login + papel + setor de lotação).
 *
 * Distinto de staff-schedule.ts (férias/plantão de quem já tem conta) —
 * aqui é a CRIAÇÃO da conta em si. Exige o papel `system_admin`: as tabelas
 * app.users/app.user_roles têm RLS que checa literalmente
 * app.ctx_has_role('system_admin') (migration 0010), não uma permissão
 * genérica — refletido aqui para dar um erro amigável antes de bater no
 * banco, mas o banco é a autoridade final.
 */
import type { FastifyInstance } from 'fastify';
import pg from 'pg';
import { z } from 'zod';
import { AppError, ErrorCategory } from '@vitaloop/shared';
import { success } from '../http/envelope.js';
import { withSecurityContext } from '../db/security-context.js';
import { requirePermission } from '../security/require-auth.js';
import type { SupabaseAdminClient } from '../security/supabase-admin-client.js';

const createStaffAccountSchema = z.object({
  name: z.string().min(2),
  username: z
    .string()
    .min(3)
    .max(32)
    .regex(/^[a-z0-9._-]+$/, 'Usuário deve conter apenas letras minúsculas, números, ponto, hífen ou underscore.'),
  password: z.string().min(8),
  roleCode: z.string().min(1),
  sectorId: z.string().uuid(),
});

const syntheticEmail = (username: string): string => `${username.toLowerCase()}@vitaloop.local`;

export const registerStaffAccountRoutes = (
  app: FastifyInstance,
  pool: pg.Pool | null,
  adminClient: SupabaseAdminClient | null,
): void => {
  // Papéis reais disponíveis para atribuir (exclui as roles de teste/dev).
  app.get(
    '/api/v1/staff/accounts/roles',
    { preHandler: requirePermission(pool, 'user.manage') },
    async (req, reply) => {
      const identity = req.identity!;
      const roles = await withSecurityContext(pool!, { userId: identity.appUserId!, roles: identity.roles }, async (client) => {
        const { rows } = await client.query<{ code: string; name: string }>(
          `select code, name from app.roles
           where status = 'active' and code not like 'test\\_%' escape '\\'
           order by name asc`,
        );
        return rows;
      });
      return reply.status(200).send(success(roles, req.id));
    },
  );

  // Setores físicos disponíveis para lotação.
  app.get(
    '/api/v1/staff/accounts/sectors',
    { preHandler: requirePermission(pool, 'user.manage') },
    async (req, reply) => {
      const identity = req.identity!;
      const sectors = await withSecurityContext(pool!, { userId: identity.appUserId!, roles: identity.roles }, async (client) => {
        const { rows } = await client.query<{ id: string; name: string }>(
          `select id, name from app.bed_sectors order by name asc`,
        );
        return rows;
      });
      return reply.status(200).send(success(sectors, req.id));
    },
  );

  // Profissionais já cadastrados (conta + papel + setor).
  app.get(
    '/api/v1/staff/accounts',
    { preHandler: requirePermission(pool, 'user.manage') },
    async (req, reply) => {
      const identity = req.identity!;
      const accounts = await withSecurityContext(pool!, { userId: identity.appUserId!, roles: identity.roles }, async (client) => {
        const { rows } = await client.query(
          `select u.id, u.username, u.name, u.status,
                  coalesce(array_agg(distinct r.code) filter (where r.code is not null), '{}') as roles,
                  coalesce(array_agg(distinct bs.name) filter (where bs.name is not null), '{}') as sectors
           from app.users u
           left join app.user_roles ur on ur.user_id = u.id and ur.status = 'active'
           left join app.roles r on r.id = ur.role_id
           left join app.access_assignments aa on aa.user_id = u.id and aa.status = 'active' and aa.scope_type = 'sector'
           left join app.bed_sectors bs on bs.id = aa.scope_id
           where u.username not like 'test\\_%' escape '\\'
           group by u.id, u.username, u.name, u.status
           order by u.name asc`,
        );
        return rows;
      });
      return reply.status(200).send(success(accounts, req.id));
    },
  );

  app.post(
    '/api/v1/staff/accounts',
    { preHandler: requirePermission(pool, 'user.manage') },
    async (req, reply) => {
      const identity = req.identity!;
      const body = createStaffAccountSchema.parse(req.body);

      if (!identity.roles.includes('system_admin')) {
        throw new AppError({
          category: ErrorCategory.ACCESS,
          code: 'ACCESS_DENIED',
          message: 'Criar contas de profissionais exige o papel de Administrador do Sistema.',
        });
      }
      if (!adminClient) {
        throw new AppError({
          category: ErrorCategory.INTERNAL,
          code: 'AUTH_ADMIN_UNAVAILABLE',
          message: 'Cadastro de profissionais indisponível (SUPABASE_SERVICE_ROLE não configurada).',
        });
      }

      const username = body.username.toLowerCase();
      const authResult = await adminClient.createUser(syntheticEmail(username), body.password);
      if (!authResult.ok) {
        throw new AppError({
          category: ErrorCategory.VALIDATION,
          code: 'STAFF_ACCOUNT_AUTH_FAILED',
          message: authResult.message,
        });
      }

      const account = await withSecurityContext(pool!, { userId: identity.appUserId!, roles: identity.roles }, async (client) => {
        const { rows: userRows } = await client.query<{ id: string }>(
          `insert into app.users (auth_subject, username, name, status)
           values ($1, $2, $3, 'active')
           returning id`,
          [authResult.data.id, username, body.name],
        );
        const newUserId = userRows[0]!.id;

        const { rows: roleRows } = await client.query<{ id: string }>(
          `select id from app.roles where code = $1 and status = 'active'`,
          [body.roleCode],
        );
        if (!roleRows[0]) {
          throw new AppError({
            category: ErrorCategory.VALIDATION,
            code: 'STAFF_ACCOUNT_INVALID_ROLE',
            message: 'Papel informado não existe.',
          });
        }
        await client.query(
          `insert into app.user_roles (user_id, role_id, status) values ($1, $2, 'active')`,
          [newUserId, roleRows[0].id],
        );

        await client.query(
          `insert into app.access_assignments (user_id, scope_type, scope_id, relationship_type, granted_by, status)
           values ($1, 'sector', $2, 'lotacao', $3, 'active')`,
          [newUserId, body.sectorId, identity.appUserId],
        );

        return { id: newUserId, username, name: body.name, roleCode: body.roleCode, sectorId: body.sectorId };
      });

      reply.status(201).send(success(account, req.id));
    },
  );
};
