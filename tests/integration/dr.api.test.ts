import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import pg from 'pg';
import { ErrorCategory } from '@vitaloop/shared';
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

const identityGuest = {
  authUserId: 'auth-guest',
  appUserId: '83ad7af3-c506-48be-b2a0-6fbd0bb6bf1b',
  appUserStatus: 'active',
  roles: ['guest'],
};

const buildTestApp = (): FastifyInstance => {
  const app = Fastify();

  app.addHook('onRequest', async (req) => {
    const identityHeader = req.headers['x-test-identity'] as string;
    if (identityHeader === 'full') {
      req.identity = identityFull;
    } else if (identityHeader === 'guest') {
      req.identity = identityGuest;
    } else {
      req.identity = null;
    }
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

  registerSecurityRoutes(app, poolDb);
  registerQualityRoutes(app, poolDb);

  return app;
};

describe('API Disaster Recovery, Backup & Restore (QLT-011..013) — integração real (vitaloop_app, RLS)', () => {
  let app: FastifyInstance;
  let testJobId: string;

  beforeAll(async () => {
    app = buildTestApp();
    await app.ready();
  });

  afterAll(async () => {
    if (app) await app.close();
    if (poolDb) await poolDb.end();
    if (poolAdmin) await poolAdmin.end();
  });

  it('1. RLS — SELECT direto na tabela app.backup_restore_jobs sem contexto de sessão retorna 0 linhas', async () => {
    const client = await poolDb.connect();
    try {
      const { rows } = await client.query('select * from app.backup_restore_jobs');
      expect(rows.length).toBe(0);
    } finally {
      client.release();
    }
  }, 60000);

  it('2. QLT-011 — Execução autorizada de Backup Lógico', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/quality/backup-restore/execute',
      headers: { 'x-test-identity': 'full' },
      payload: { jobType: 'backup_logical' },
    });
    if (res.statusCode !== 201) {
      console.log('TEST 2 ERROR BODY:', res.body);
    }
    expect(res.statusCode).toBe(201);
    const data = JSON.parse(res.body).data;
    testJobId = data.id;
    expect(testJobId).toBeTruthy();
    expect(data.jobType).toBe('backup_logical');
    expect(data.status).toBe('completed');
    expect(data.snapshotHash).toBeTruthy();
  }, 60000);

  it('3. QLT-012 — Validação autorizada de Restore & Integridade', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/quality/backup-restore/execute',
      headers: { 'x-test-identity': 'full' },
      payload: { jobType: 'restore_validation', snapshotHash: 'SHA256-SNAP-VALIDATED-123' },
    });
    expect(res.statusCode).toBe(201);
    const data = JSON.parse(res.body).data;
    expect(data.jobType).toBe('restore_validation');
    expect(data.rpoMinutes).toBe(15);
    expect(data.rtoMinutes).toBe(60);
  }, 60000);

  it('4. QLT-013 — Simulação autorizada de Disaster Recovery Failover', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/quality/backup-restore/execute',
      headers: { 'x-test-identity': 'full' },
      payload: { jobType: 'dr_failover' },
    });
    expect(res.statusCode).toBe(201);
    const data = JSON.parse(res.body).data;
    expect(data.jobType).toBe('dr_failover');
  }, 60000);

  it('5. RBAC — tentativa de executar backup sem permissão é negada (403 ACCESS_DENIED)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/quality/backup-restore/execute',
      headers: { 'x-test-identity': 'guest' },
      payload: { jobType: 'backup_logical' },
    });
    expect(res.statusCode).toBe(403);
  }, 60000);

  it('6. Limpeza de dados de teste de backup e DR', async () => {
    const client = await poolAdmin.connect();
    try {
      await client.query("delete from app.backup_restore_jobs where job_type in ('backup_logical', 'restore_validation', 'dr_failover')");
    } finally {
      client.release();
    }
  }, 60000);
});
