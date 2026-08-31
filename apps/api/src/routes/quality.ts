/**
 * Rotas de Qualidade: Impressão de Laudos PDF, Validação de Concorrência e Disaster Recovery / Backup (QLT-001..015).
 */

import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type pg from 'pg';
import type { UUID } from '@vitaloop/shared';
import {
  generateClinicalPrintPdf,
  assertNoConcurrentUpdateConflict,
  executeBackupJob,
} from '@vitaloop/domain';
import { success } from '../http/envelope.js';
import { requireAuth, requirePermission } from '../security/require-auth.js';
import { withSecurityContext } from '../db/security-context.js';
import { sha256Hex } from '../security/hash.js';

const PrintBody = z.object({
  documentType: z.string().min(2),
  patientName: z.string().min(2),
  issuerName: z.string().min(2),
  content: z.string().min(5),
});

const ConcurrencyBody = z.object({
  currentVersion: z.number().int().positive(),
  expectedVersion: z.number().int().positive(),
});

const BackupJobBody = z.object({
  jobType: z.enum(['backup_logical', 'restore_validation', 'dr_failover']),
  snapshotHash: z.string().optional(),
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

export const registerQualityRoutes = (app: FastifyInstance, db: pg.Pool | null): void => {
  // POST /api/v1/quality/documents/:id/print (QLT-014)
  app.post(
    '/api/v1/quality/documents/:id/print',
    { preHandler: db ? requirePermission(db, 'document.read') : requireAuth },
    async (req, reply) => {
      const { id } = req.params as { id: UUID };
      const parsed = PrintBody.parse(req.body);
      const identity = req.identity!;
      const actorId = identity.appUserId!;

      const pdfResult = await withSecurityContext(
        db!,
        { userId: actorId, roles: identity.roles },
        async (client) => {
          const pdf = generateClinicalPrintPdf({
            documentId: id,
            documentType: parsed.documentType,
            patientName: parsed.patientName,
            issuerName: parsed.issuerName,
            content: parsed.content,
          });

          await auditAction(client, actorId, 'view', 'clinical_document_print', id, req, {
            documentType: parsed.documentType,
            footerChecksum: pdf.footerChecksum,
          });

          return pdf;
        },
      );

      reply.code(200).send(success(pdfResult, req.id));
    },
  );

  // POST /api/v1/quality/simulate-concurrency (QLT-007)
  app.post(
    '/api/v1/quality/simulate-concurrency',
    { preHandler: db ? requirePermission(db, 'patient.read') : requireAuth },
    async (req, reply) => {
      const parsed = ConcurrencyBody.parse(req.body);
      assertNoConcurrentUpdateConflict(parsed);
      reply.code(200).send(success({ status: 'CONCURRENCY_OK', message: 'Sem conflito de versão.' }, req.id));
    },
  );

  // POST /api/v1/quality/backup-restore/execute (QLT-011..013)
  app.post(
    '/api/v1/quality/backup-restore/execute',
    { preHandler: db ? requirePermission(db, 'backup.manage') : requireAuth },
    async (req, reply) => {
      const parsed = BackupJobBody.parse(req.body);
      const identity = req.identity!;
      const actorId = identity.appUserId!;

      const domainJob = executeBackupJob(parsed);

      const dbRecord = await withSecurityContext(
        db!,
        { userId: actorId, roles: identity.roles },
        async (client) => {
          const res = await client.query(
            `insert into app.backup_restore_jobs (job_type, status, snapshot_hash, rpo_minutes, rto_minutes, executed_by, finished_at)
             values ($1, $2, $3, $4, $5, $6, now())
             returning *`,
            [
              domainJob.jobType,
              domainJob.status,
              domainJob.snapshotHash,
              domainJob.rpoMinutes,
              domainJob.rtoMinutes,
              actorId,
            ],
          );
          const r = res.rows[0];

          await auditAction(client, actorId, 'create', 'backup_restore_job', r.id, req, {
            jobType: r.job_type,
            snapshotHash: r.snapshot_hash,
          });

          return {
            id: r.id,
            jobType: r.job_type,
            status: r.status,
            snapshotHash: r.snapshot_hash,
            rpoMinutes: r.rpo_minutes,
            rtoMinutes: r.rto_minutes,
            createdAt: r.created_at.toISOString(),
          };
        },
      );

      reply.code(201).send(success(dbRecord, req.id));
    },
  );

  // GET /api/v1/quality/backup-restore/jobs (QLT-011..013)
  app.get(
    '/api/v1/quality/backup-restore/jobs',
    { preHandler: db ? requirePermission(db, 'security.read') : requireAuth },
    async (req, reply) => {
      const identity = req.identity!;

      const jobs = await withSecurityContext(
        db!,
        { userId: identity.appUserId!, roles: identity.roles },
        async (client) => {
          const res = await client.query('select * from app.backup_restore_jobs order by created_at desc');
          return res.rows.map((r) => ({
            id: r.id,
            jobType: r.job_type,
            status: r.status,
            snapshotHash: r.snapshot_hash,
            rpoMinutes: r.rpo_minutes,
            rtoMinutes: r.rto_minutes,
            createdAt: r.created_at.toISOString(),
          }));
        },
      );

      reply.code(200).send(success(jobs, req.id));
    },
  );
};
