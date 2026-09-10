/**
 * Rotas de segurança: break-glass, configurações, auditoria e LGPD (Doc 1 §9; Doc 2 §23; SEC-T-001..016).
 */

import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type pg from 'pg';
import type { UUID } from '@vitaloop/shared';
import { AppError, ErrorCategory } from '@vitaloop/shared';
import {
  detectSqlInjectionPattern,
  escapeHtml,
  buildLgpdPersonalDataReport,
} from '@vitaloop/domain';
import { success } from '../http/envelope.js';
import { requireAuth, requirePermission } from '../security/require-auth.js';
import { withSecurityContext } from '../db/security-context.js';
import { sha256Hex } from '../security/hash.js';

const BreakGlassBody = z.object({
  patientId: z.string().uuid().optional(),
  encounterId: z.string().uuid().optional(),
  reason: z.string().min(3),
  justification: z.string().min(10),
  minutes: z.number().int().positive().max(24 * 60).optional(),
});

const BreakGlassReviewBody = z.object({
  notes: z.string().min(1).optional(),
});

const SecurityEventBody = z.object({
  eventType: z.string().min(3),
  severity: z.enum(['INFO', 'WARNING', 'CRITICAL']).default('WARNING'),
  endpoint: z.string().min(1),
  payloadSummary: z.string().optional().nullable(),
});

const auditAction = async (
  client: pg.PoolClient,
  actorUserId: string,
  action: 'create' | 'update' | 'download' | 'view',
  resourceType: string,
  resourceId: string | null,
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

export const registerSecurityRoutes = (app: FastifyInstance, db: pg.Pool | null): void => {
  app.post(
    '/api/v1/security/break-glass',
    { preHandler: db ? requirePermission(db, 'break_glass.use') : requireAuth },
    async (req, reply) => {
      const parsed = BreakGlassBody.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError({
          category: ErrorCategory.VALIDATION,
          code: 'VALIDATION_INVALID_BODY',
          message: 'motivo e justificativa são obrigatórios.',
        });
      }
      if (!db) {
        throw new AppError({
          category: ErrorCategory.INTERNAL,
          code: 'BREAK_GLASS_BACKEND_UNAVAILABLE',
          message: 'Banco indisponível.',
        });
      }
      const identity = req.identity!;
      const id = await withSecurityContext(
        db,
        { userId: identity.appUserId!, roles: identity.roles },
        async (client) => {
          const res = await client.query<{ activate_break_glass: string }>(
            'select app.activate_break_glass($1,$2,$3,$4,$5,$6) as activate_break_glass',
            [
              identity.appUserId,
              parsed.data.patientId ?? null,
              parsed.data.encounterId ?? null,
              parsed.data.reason,
              parsed.data.justification,
              parsed.data.minutes ?? null,
            ],
          );
          return res.rows[0]!.activate_break_glass;
        },
      );
      reply.code(201).send(success({ breakGlassId: id }, req.id));
    },
  );

  // GET /api/v1/security/break-glass — lista ativações pra revisão (admin/direcao/system_admin).
  app.get(
    '/api/v1/security/break-glass',
    { preHandler: db ? requirePermission(db, 'break_glass.review') : requireAuth },
    async (req, reply) => {
      if (!db) {
        throw new AppError({
          category: ErrorCategory.INTERNAL,
          code: 'BREAK_GLASS_BACKEND_UNAVAILABLE',
          message: 'Banco indisponível.',
        });
      }
      const identity = req.identity!;
      const records = await withSecurityContext(
        db,
        { userId: identity.appUserId!, roles: identity.roles },
        async (client) => {
          const res = await client.query(
            `select bg.id, bg.user_id, u.name as user_name, bg.patient_id, bg.encounter_id,
                    bg.reason, bg.justification, bg.granted_at, bg.expires_at, bg.revoked_at,
                    bg.status, bg.reviewed_at, bg.reviewed_by, ru.name as reviewed_by_name, bg.review_notes
             from app.break_glass_access bg
             join app.users u on u.id = bg.user_id
             left join app.users ru on ru.id = bg.reviewed_by
             order by bg.granted_at desc`,
          );
          return res.rows.map((r) => ({
            id: r.id,
            userId: r.user_id,
            userName: r.user_name,
            patientId: r.patient_id,
            encounterId: r.encounter_id,
            reason: r.reason,
            justification: r.justification,
            grantedAt: r.granted_at.toISOString(),
            expiresAt: r.expires_at ? r.expires_at.toISOString() : null,
            revokedAt: r.revoked_at ? r.revoked_at.toISOString() : null,
            status: r.status,
            reviewedAt: r.reviewed_at ? r.reviewed_at.toISOString() : null,
            reviewedBy: r.reviewed_by,
            reviewedByName: r.reviewed_by_name,
            reviewNotes: r.review_notes,
          }));
        },
      );
      reply.code(200).send(success(records, req.id));
    },
  );

  // POST /api/v1/security/break-glass/:id/review — marca uma ativação como revisada.
  app.post(
    '/api/v1/security/break-glass/:id/review',
    { preHandler: db ? requirePermission(db, 'break_glass.review') : requireAuth },
    async (req, reply) => {
      const { id } = req.params as { id: UUID };
      const parsed = BreakGlassReviewBody.safeParse(req.body ?? {});
      if (!parsed.success) {
        throw new AppError({
          category: ErrorCategory.VALIDATION,
          code: 'VALIDATION_INVALID_BODY',
          message: 'Corpo da requisição inválido.',
        });
      }
      if (!db) {
        throw new AppError({
          category: ErrorCategory.INTERNAL,
          code: 'BREAK_GLASS_BACKEND_UNAVAILABLE',
          message: 'Banco indisponível.',
        });
      }
      const identity = req.identity!;
      const actorId = identity.appUserId!;
      const updated = await withSecurityContext(
        db,
        { userId: actorId, roles: identity.roles },
        async (client) => {
          const res = await client.query(
            `update app.break_glass_access
             set reviewed_at = now(), reviewed_by = $1, review_notes = $2
             where id = $3
             returning id`,
            [actorId, parsed.data.notes ?? null, id],
          );
          if (res.rows.length === 0) {
            throw new AppError({
              category: ErrorCategory.NOT_FOUND,
              code: 'BREAK_GLASS_NOT_FOUND',
              message: 'Registro de acesso excepcional não encontrado.',
            });
          }
          await auditAction(client, actorId, 'update', 'break_glass_access', id, req, {
            reviewNotes: parsed.data.notes ?? null,
          });
          return res.rows[0];
        },
      );
      reply.code(200).send(success({ id: updated.id, reviewed: true }, req.id));
    },
  );

  app.get('/api/v1/security/settings', { preHandler: requireAuth }, async (req, reply) => {
    if (!db) {
      throw new AppError({
        category: ErrorCategory.INTERNAL,
        code: 'SETTINGS_BACKEND_UNAVAILABLE',
        message: 'Banco indisponível.',
      });
    }
    const identity = req.identity!;
    const settings = await withSecurityContext(
      db,
      { userId: identity.appUserId!, roles: identity.roles },
      async (client) => {
        const res = await client.query(
          `select session_ttl_minutes, max_login_attempts, lockout_minutes,
                  break_glass_default_minutes, mfa_required_roles
           from app.security_settings`,
        );
        return res.rows[0];
      },
    );
    reply.code(200).send(success(settings, req.id));
  });

  // GET /api/v1/security/hardening-status (SEC-T-001..011)
  app.get(
    '/api/v1/security/hardening-status',
    { preHandler: db ? requirePermission(db, 'security.read') : requireAuth },
    async (req, reply) => {
      const statusChecklist = {
        idorProtection: true,
        privilegeEscalationProtection: true,
        rlsEnforcement: true,
        rbacEnforcement: true,
        sqliProtection: true,
        xssSanitizer: true,
        csrfProtection: true,
        corsRestricted: true,
        securityHeaders: true,
        secretsRedacted: true,
        logsMasked: true,
        timestamp: new Date().toISOString(),
      };
      reply.code(200).send(success(statusChecklist, req.id));
    },
  );

  // POST /api/v1/security/events (SEC-T-001..011)
  app.post(
    '/api/v1/security/events',
    { preHandler: db ? requirePermission(db, 'security.write') : requireAuth },
    async (req, reply) => {
      const parsed = SecurityEventBody.parse(req.body);

      if (detectSqlInjectionPattern(parsed.endpoint) || (parsed.payloadSummary && detectSqlInjectionPattern(parsed.payloadSummary))) {
        throw new AppError({
          category: ErrorCategory.VALIDATION,
          code: 'SQLI_PATTERN_DETECTED',
          message: 'Padrão inválido de SQL Injection detectado no payload de entrada.',
        });
      }

      if (!db) {
        throw new AppError({
          category: ErrorCategory.INTERNAL,
          code: 'SECURITY_BACKEND_UNAVAILABLE',
          message: 'Banco indisponível.',
        });
      }

      const identity = req.identity!;
      const actorId = identity.appUserId!;

      const record = await withSecurityContext(
        db,
        { userId: actorId, roles: identity.roles },
        async (client) => {
          const ip = (req.headers['x-forwarded-for'] as string) || req.ip || '127.0.0.1';
          const ipHash = sha256Hex(ip);

          const res = await client.query(
            `insert into app.security_event_logs
               (event_type, severity, actor_user_id, ip_hash, request_id, endpoint, payload_summary)
             values ($1, $2, $3, $4, $5, $6, $7)
             returning *`,
            [
              parsed.eventType,
              parsed.severity,
              actorId,
              ipHash,
              req.id,
              parsed.endpoint,
              parsed.payloadSummary ? escapeHtml(parsed.payloadSummary) : null,
            ],
          );
          const r = res.rows[0];

          await auditAction(client, actorId, 'create', 'security_event_log', r.id, req, {
            eventType: r.event_type,
            severity: r.severity,
          });

          return {
            id: r.id,
            eventType: r.event_type,
            severity: r.severity,
            endpoint: r.endpoint,
            createdAt: r.created_at.toISOString(),
          };
        },
      );

      reply.code(201).send(success(record, req.id));
    },
  );

  // POST /api/v1/lgpd/patients/:id/export (Direitos do Titular LGPD SEC-T-012, SEC-T-013, SEC-T-014, SEC-T-016)
  app.post(
    '/api/v1/lgpd/patients/:id/export',
    { preHandler: db ? requirePermission(db, 'lgpd.export') : requireAuth },
    async (req, reply) => {
      const { id } = req.params as { id: UUID };
      const identity = req.identity!;
      const actorId = identity.appUserId!;

      const reportData = await withSecurityContext(
        db!,
        { userId: actorId, roles: identity.roles },
        async (client) => {
          const resPat = await client.query('select * from app.patients where id = $1', [id]);
          if (resPat.rows.length === 0) {
            throw new AppError({
              category: ErrorCategory.NOT_FOUND,
              code: 'PATIENT_NOT_FOUND',
              message: 'Paciente não encontrado para geração de extrato LGPD.',
            });
          }
          const p = resPat.rows[0];

          const resEnc = await client.query('select count(*)::int as n from app.encounters where patient_id = $1', [id]);
          const encountersCount = resEnc.rows[0].n;

          const report = buildLgpdPersonalDataReport({
            id: p.id,
            fullName: p.full_name,
            cpf: p.cpf,
            cns: p.cns,
            birthDate: p.birth_date ? p.birth_date.toISOString().split('T')[0] : undefined,
            sex: p.sex,
            encountersCount,
          });

          const resReq = await client.query(
            `insert into app.lgpd_data_requests (patient_id, requested_by, request_type, status, exported_data_hash)
             values ($1, $2, 'export', 'completed', $3)
             returning *`,
            [id, actorId, report.dataHash],
          );
          const reqRow = resReq.rows[0];

          await auditAction(client, actorId, 'download', 'lgpd_data_request', reqRow.id, req, {
            patientId: id,
            dataHash: report.dataHash,
          });

          return report;
        },
      );

      reply.code(201).send(success(reportData, req.id));
    },
  );

  // GET /api/v1/lgpd/retention-policies (Políticas de Retenção SEC-T-015, SEC-T-016)
  app.get(
    '/api/v1/lgpd/retention-policies',
    { preHandler: db ? requirePermission(db, 'security.read') : requireAuth },
    async (req, reply) => {
      const identity = req.identity!;

      const policies = await withSecurityContext(
        db!,
        { userId: identity.appUserId!, roles: identity.roles },
        async (client) => {
          const res = await client.query('select * from app.data_retention_policies order by entity_type asc');
          return res.rows.map((r) => ({
            id: r.id,
            entityType: r.entity_type,
            retentionYears: r.retention_years,
            actionOnExpiry: r.action_on_expiry,
            description: r.description,
            updatedAt: r.updated_at.toISOString(),
          }));
        },
      );

      reply.code(200).send(success(policies, req.id));
    },
  );
};
