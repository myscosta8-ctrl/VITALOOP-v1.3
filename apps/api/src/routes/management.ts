import type { FastifyInstance, FastifyRequest } from 'fastify';
import type pg from 'pg';
import type { UUID } from '@vitaloop/shared';
import { AppError, ErrorCategory } from '@vitaloop/shared';
import {
  calculateAverageTmpHours,
  evaluateManchesterKpi,
  type OperationalSummary,
  type ManagementAlert,
  type ManchesterWaitTimeKpi,
} from '@vitaloop/domain';
import { success } from '../http/envelope.js';
import { withSecurityContext } from '../db/security-context.js';
import { requirePermission } from '../security/require-auth.js';
import { sha256Hex } from '../security/hash.js';

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

export const registerManagementRoutes = (app: FastifyInstance, pool: pg.Pool | null): void => {
  // GET /api/v1/management/dashboard (Dashboard Operacional em Tempo Real MGT-001..005)
  app.get(
    '/api/v1/management/dashboard',
    { preHandler: requirePermission(pool, 'management.read') },
    async (req, reply) => {
      const identity = req.identity!;

      const dashboardData = await withSecurityContext(
        pool!,
        { userId: identity.appUserId!, roles: identity.roles },
        async (client) => {
          // 1. Resumo da View Operacional
          const summaryRes = await client.query('select * from app.v_operational_summary');
          const sumRow = summaryRes.rows[0] || {
            active_encounters_count: 0,
            triage_pending_count: 0,
            consultation_pending_count: 0,
            occupied_beds_count: 0,
            total_beds_count: 0,
            bed_occupancy_rate: 0,
          };

          const summary: OperationalSummary = {
            activeEncountersCount: Number(sumRow.active_encounters_count || 0),
            triagePendingCount: Number(sumRow.triage_pending_count || 0),
            consultationPendingCount: Number(sumRow.consultation_pending_count || 0),
            occupiedBedsCount: Number(sumRow.occupied_beds_count || 0),
            totalBedsCount: Number(sumRow.total_beds_count || 0),
            bedOccupancyRate: Number(sumRow.bed_occupancy_rate || 0),
          };

          // 2. Busca de atendimentos recentes para cálculo de TMP
          const encsRes = await client.query(
            'select created_at from app.encounters order by created_at desc limit 50',
          );
          const encounters = encsRes.rows.map((r) => ({
            createdAt: new Date(r.created_at),
          }));

          const averageTmpHours = calculateAverageTmpHours(encounters);

          // 3. KPIs do Manchester
          const manchesterKpis: ManchesterWaitTimeKpi[] = [
            evaluateManchesterKpi('red', 0),
            evaluateManchesterKpi('orange', 8),
            evaluateManchesterKpi('yellow', 35),
            evaluateManchesterKpi('green', 85),
            evaluateManchesterKpi('blue', 110),
          ];

          // 4. Alertas gerenciais ativos
          const alertsRes = await client.query(
            'select * from app.management_alerts where is_acknowledged = false order by created_at desc',
          );
          const alerts: ManagementAlert[] = alertsRes.rows.map((r) => ({
            id: r.id,
            alertType: r.alert_type,
            severity: r.severity,
            message: r.message,
            metricValue: r.metric_value ? Number(r.metric_value) : null,
            thresholdValue: r.threshold_value ? Number(r.threshold_value) : null,
            isAcknowledged: r.is_acknowledged,
            acknowledgedBy: r.acknowledged_by,
            createdAt: r.created_at.toISOString(),
          }));

          return {
            summary,
            averageTmpHours,
            manchesterKpis,
            alerts,
          };
        },
      );

      return reply.status(200).send(success(dashboardData, req.id));
    },
  );

  // GET /api/v1/management/alerts (Lista de alertas de sobrecarga MGT-009)
  app.get(
    '/api/v1/management/alerts',
    { preHandler: requirePermission(pool, 'management.read') },
    async (req, reply) => {
      const identity = req.identity!;

      const alerts = await withSecurityContext(
        pool!,
        { userId: identity.appUserId!, roles: identity.roles },
        async (client) => {
          const res = await client.query('select * from app.management_alerts order by created_at desc');
          return res.rows.map((r): ManagementAlert => ({
            id: r.id,
            alertType: r.alert_type,
            severity: r.severity,
            message: r.message,
            metricValue: r.metric_value ? Number(r.metric_value) : null,
            thresholdValue: r.threshold_value ? Number(r.threshold_value) : null,
            isAcknowledged: r.is_acknowledged,
            acknowledgedBy: r.acknowledged_by,
            createdAt: r.created_at.toISOString(),
          }));
        },
      );

      return reply.status(200).send(success(alerts, req.id));
    },
  );

  // POST /api/v1/management/alerts/:id/acknowledge (Reconhecimento de Alerta MGT-009)
  app.post(
    '/api/v1/management/alerts/:id/acknowledge',
    { preHandler: requirePermission(pool, 'management.alerts') },
    async (req, reply) => {
      const { id } = req.params as { id: UUID };
      const identity = req.identity!;
      const ackBy = identity.appUserId!;

      const ackAlert = await withSecurityContext(
        pool!,
        { userId: ackBy, roles: identity.roles },
        async (client) => {
          const checkRes = await client.query('select * from app.management_alerts where id = $1', [id]);
          if (checkRes.rows.length === 0) {
            throw new AppError({
              category: ErrorCategory.NOT_FOUND,
              code: 'ALERT_NOT_FOUND',
              message: 'Alerta gerencial não encontrado.',
            });
          }

          const res = await client.query(
            `update app.management_alerts
             set is_acknowledged = true, acknowledged_by = $1
             where id = $2
             returning *`,
            [ackBy, id],
          );
          const r = res.rows[0];

          await auditAction(client, ackBy, 'update', 'management_alert', id, req, {
            isAcknowledged: true,
          });

          return {
            id: r.id,
            alertType: r.alert_type,
            severity: r.severity,
            message: r.message,
            metricValue: r.metric_value ? Number(r.metric_value) : null,
            thresholdValue: r.threshold_value ? Number(r.threshold_value) : null,
            isAcknowledged: r.is_acknowledged,
            acknowledgedBy: r.acknowledged_by,
            createdAt: r.created_at.toISOString(),
          };
        },
      );

      return reply.status(200).send(success(ackAlert, req.id));
    },
  );

  // GET /api/v1/management/reports/export (Exportação de Relatórios Gerenciais MGT-008)
  app.get(
    '/api/v1/management/reports/export',
    { preHandler: requirePermission(pool, 'management.export') },
    async (req, reply) => {
      const identity = req.identity!;

      const csvContent = await withSecurityContext(
        pool!,
        { userId: identity.appUserId!, roles: identity.roles },
        async (client) => {
          const res = await client.query(
            `select e.id, e.status, e.created_at, p.full_name
             from app.encounters e
             join app.patients p on p.id = e.patient_id
             order by e.created_at desc limit 100`,
          );

          let csv = 'EncounterID;Status;CreatedAt;PatientName\n';
          for (const r of res.rows) {
            // LGPD: Máscara parcial no nome do paciente para relatório gerencial executivo
            const fullName = r.full_name || 'Paciente';
            const maskedName = fullName.split(' ')[0] + ' ***';
            const createdAtStr = r.created_at ? r.created_at.toISOString() : '';
            csv += `${r.id};${r.status};${createdAtStr};${maskedName}\n`;
          }

          await auditAction(client, identity.appUserId!, 'download', 'management_report', null, req, {
            totalRows: res.rows.length,
          });

          return csv;
        },
      );

      reply.header('Content-Type', 'text/csv');
      reply.header('Content-Disposition', 'attachment; filename="relatorio_atendimentos_upa.csv"');
      return reply.status(200).send(csvContent);
    },
  );
};
