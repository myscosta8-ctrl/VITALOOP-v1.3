/**
 * Rotas de Observabilidade Avançada, Telemetria, Métricas e DR Ambiental (PRD-011..020).
 */

import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type pg from 'pg';
import { computeMetricHealth, validateEnvironmentalDr, type MetricSnapshot } from '@vitaloop/domain';
import { success } from '../http/envelope.js';
import { requireAuth, requirePermission } from '../security/require-auth.js';
import { withSecurityContext } from '../db/security-context.js';
import { sha256Hex } from '../security/hash.js';

const MetricBody = z.object({
  metricName: z.string().min(2),
  metricValue: z.number(),
  tags: z.record(z.string()).optional(),
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

export const registerObservabilityRoutes = (app: FastifyInstance, db: pg.Pool | null): void => {
  // POST /api/v1/observability/metrics (PRD-015, PRD-019)
  app.post(
    '/api/v1/observability/metrics',
    { preHandler: db ? requirePermission(db, 'observability.manage') : requireAuth },
    async (req, reply) => {
      const parsed = MetricBody.parse(req.body);
      const identity = req.identity!;
      const actorId = identity.appUserId!;

      const dbRecord = await withSecurityContext(
        db!,
        { userId: actorId, roles: identity.roles },
        async (client) => {
          const res = await client.query(
            `insert into app.system_metrics (metric_name, metric_value, tags)
             values ($1, $2, $3)
             returning *`,
            [parsed.metricName, parsed.metricValue, parsed.tags ? JSON.stringify(parsed.tags) : '{}'],
          );
          const r = res.rows[0];

          await auditAction(client, actorId, 'create', 'system_metric', r.id, req, {
            metricName: r.metric_name,
            metricValue: r.metric_value,
          });

          return {
            id: r.id,
            metricName: r.metric_name,
            metricValue: Number(r.metric_value),
            tags: r.tags,
            recordedAt: r.recorded_at.toISOString(),
          };
        },
      );

      reply.code(201).send(success(dbRecord, req.id));
    },
  );

  // GET /api/v1/observability/metrics (PRD-015, PRD-016, PRD-019)
  app.get(
    '/api/v1/observability/metrics',
    { preHandler: db ? requirePermission(db, 'observability.read') : requireAuth },
    async (req, reply) => {
      const identity = req.identity!;

      const result = await withSecurityContext(
        db!,
        { userId: identity.appUserId!, roles: identity.roles },
        async (client) => {
          const res = await client.query('select * from app.system_metrics order by recorded_at desc limit 100');
          const rawMetrics: MetricSnapshot[] = res.rows.map((r) => ({
            name: r.metric_name,
            value: Number(r.metric_value),
            tags: r.tags,
            timestamp: r.recorded_at.toISOString(),
          }));

          const health = computeMetricHealth(rawMetrics);

          return {
            health,
            metrics: rawMetrics,
          };
        },
      );

      reply.code(200).send(success(result, req.id));
    },
  );

  // GET /api/v1/observability/dr-status (PRD-011..014, PRD-020)
  app.get(
    '/api/v1/observability/dr-status',
    { preHandler: db ? requirePermission(db, 'security.read') : requireAuth },
    async (req, reply) => {
      const drStatus = validateEnvironmentalDr();
      reply.code(200).send(success(drStatus, req.id));
    },
  );
};
