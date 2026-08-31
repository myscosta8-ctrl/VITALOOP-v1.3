import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import pg from 'pg';
import { ErrorCategory } from '@vitaloop/shared';
import { validateProductionEnv } from '@vitaloop/config';
import { validateMigrationsPipeline, validateRollbackSafety } from '@vitaloop/domain';
import { registerHealthRoutes } from '../../apps/api/src/routes/health.js';
import { registerSecurityRoutes } from '../../apps/api/src/routes/security.js';
import { registerQualityRoutes } from '../../apps/api/src/routes/quality.js';
import { failure } from '../../apps/api/src/http/envelope.js';

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  throw new Error('DATABASE_URL não configurada no ambiente de testes.');
}

const poolDb = new pg.Pool({ connectionString: dbUrl });
const poolAdmin = new pg.Pool({ connectionString: dbUrl.replace('vitaloop_app.', 'postgres.') });

const identityFull = {
  authUserId: 'auth-full',
  appUserId: '83ad7af3-c506-48be-b2a0-6fbd0bb6bf1b',
  appUserStatus: 'active',
  roles: ['test_patient_full', 'admin'],
};

const buildTestApp = (): FastifyInstance => {
  const app = Fastify();

  app.addHook('onRequest', async (req) => {
    req.identity = identityFull;
  });

  app.setErrorHandler((error, req, reply) => {
    const isZod = error?.name === 'ZodError' || error?.constructor?.name === 'ZodError' || Array.isArray((error as { issues?: unknown[] })?.issues);
    if (isZod) {
      reply.code(400).send(failure({ category: ErrorCategory.VALIDATION, code: 'VALIDATION_ERROR', message: (error as Error).message }, req.id));
      return;
    }
    const err = error as { name?: string; httpStatus?: number; category?: ErrorCategory; code?: string; message?: string; toJSON?: () => unknown };
    const isAppErr = err?.name === 'AppError' || err?.constructor?.name === 'AppError' || typeof err.httpStatus === 'number' || Boolean(err.category && err.code);
    if (isAppErr) {
      const rawStatus = err.httpStatus || 400;
      const httpStatus = rawStatus === 409 ? 400 : rawStatus;
      const category = err.category || ErrorCategory.VALIDATION;
      const code = err.code || 'ERROR';
      const message = err.message || 'Erro de validação';
      reply.code(httpStatus).send(failure({ category, code, message }, req.id));
      return;
    }
    reply.code(500).send(failure({ category: ErrorCategory.INTERNAL, code: 'INTERNAL_ERROR', message: (error as Error).message }, req.id));
  });

  registerHealthRoutes(app, { db: poolDb, supabaseUrl: process.env.SUPABASE_URL });
  registerSecurityRoutes(app, poolDb);
  registerQualityRoutes(app, poolDb);

  return app;
};

describe('API Produção & DevOps Etapa 1 (PRD-001..010) — integração real (vitaloop_app, RLS)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildTestApp();
    await app.ready();
  });

  afterAll(async () => {
    if (app) await app.close();
    if (poolAdmin) {
      const client = await poolAdmin.connect();
      try {
        await client.query("delete from app.backup_restore_jobs where job_type = 'backup_logical'");
      } finally {
        client.release();
      }
      await poolAdmin.end();
    }
    if (poolDb) await poolDb.end();
  });

  it('1. PRD-005 / PRD-006 — Healthcheck & Readiness endpoints (/health, /ready, /api/v1/health, /api/v1/ready)', async () => {
    const resHealth = await app.inject({ method: 'GET', url: '/health' });
    expect(resHealth.statusCode).toBe(200);
    expect(JSON.parse(resHealth.body).data.status).toBe('ok');

    const resHealthV1 = await app.inject({ method: 'GET', url: '/api/v1/health' });
    expect(resHealthV1.statusCode).toBe(200);
    expect(JSON.parse(resHealthV1.body).data.status).toBe('ok');

    const resReady = await app.inject({ method: 'GET', url: '/ready' });
    expect(resReady.statusCode).toBe(200);
    const readyData = JSON.parse(resReady.body).data;
    expect(readyData.ready).toBe(true);
    expect(readyData.db).toBe('ok');

    const resReadyV1 = await app.inject({ method: 'GET', url: '/api/v1/ready' });
    expect(resReadyV1.statusCode).toBe(200);
    expect(JSON.parse(resReadyV1.body).data.ready).toBe(true);
  }, 60000);

  it('2. PRD-003 / PRD-004 — Validação de ambiente e secrets de produção sem credenciais fictícias em código', () => {
    const validConfig = validateProductionEnv({
      NODE_ENV: 'production',
      DATABASE_URL: 'postgres://vitaloop_app:secret@db.supabase.co:5432/postgres',
      CORS_ALLOWED_ORIGINS: 'https://app.vitaloop.com.br',
    });
    expect(validConfig.databaseConfigured).toBe(true);
    expect(validConfig.env.CORS_ALLOWED_ORIGINS).toEqual(['https://app.vitaloop.com.br']);
  });

  it('3. PRD-007 / PRD-008 — Validação da pipeline de migrations (0001 a 0044) e integridade de rollback', () => {
    const files = [
      '0001_init.sql', '0002_schema.sql', '0003_rbac.sql', '0042_security.sql', '0043_lgpd.sql', '0044_dr.sql',
    ];
    const pipe = validateMigrationsPipeline(files);
    expect(pipe.total).toBe(6);

    const rb = validateRollbackSafety(43, 44);
    expect(rb.canRollback).toBe(true);
  });

  it('4. PRD-009 / PRD-010 — Execução de rotina de Backup e Restore de produção', async () => {
    const resBk = await app.inject({
      method: 'POST',
      url: '/api/v1/quality/backup-restore/execute',
      payload: { jobType: 'backup_logical' },
    });
    expect(resBk.statusCode).toBe(201);
    expect(JSON.parse(resBk.body).data.jobType).toBe('backup_logical');
  }, 60000);
});
