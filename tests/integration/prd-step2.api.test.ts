import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import pg from 'pg';
import { ErrorCategory } from '@vitaloop/shared';
import { buildStructuredJsonLog } from '@vitaloop/domain';
import { registerSecurityRoutes } from '../../apps/api/src/routes/security.js';
import { registerQualityRoutes } from '../../apps/api/src/routes/quality.js';
import { registerObservabilityRoutes } from '../../apps/api/src/routes/observability.js';
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

  app.addHook('onRequest', async (req, reply) => {
    reply.header('X-Request-Id', req.id);
    const identityHeader = req.headers['x-test-identity'] as string;
    if (identityHeader === 'full') {
      req.identity = identityFull;
    } else if (identityHeader === 'guest') {
      req.identity = identityGuest;
    } else {
      req.identity = identityFull;
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
  registerObservabilityRoutes(app, poolDb);

  return app;
};

describe('API Produção & DevOps Etapa 2 (PRD-011..020) — integração real (vitaloop_app, RLS)', () => {
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
        await client.query("delete from app.system_metrics where metric_name = 'http_request_duration_ms'");
      } finally {
        client.release();
      }
      await poolAdmin.end();
    }
    if (poolDb) await poolDb.end();
  });

  it('1. RLS — SELECT direto na tabela app.system_metrics sem contexto de sessão retorna 0 linhas', async () => {
    const client = await poolDb.connect();
    try {
      const { rows } = await client.query('select * from app.system_metrics');
      expect(rows.length).toBe(0);
    } finally {
      client.release();
    }
  }, 60000);

  it('2. PRD-015 / PRD-019 — Emissão de telemetria e métrica operacional', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/observability/metrics',
      headers: { 'x-test-identity': 'full', 'x-request-id': 'req-corr-999' },
      payload: { metricName: 'http_request_duration_ms', metricValue: 135, tags: { path: '/api/v1/patients' } },
    });
    expect(res.statusCode).toBe(201);
    expect(res.headers['x-request-id']).toBeTruthy();
    const data = JSON.parse(res.body).data;
    expect(data.metricName).toBe('http_request_duration_ms');
  }, 60000);

  it('3. PRD-015 / PRD-016 / PRD-019 — Consulta de métricas e relatório de saúde operacional', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/observability/metrics',
      headers: { 'x-test-identity': 'full' },
    });
    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res.body).data;
    expect(data.health).toBeTruthy();
    expect(data.health.isHealthy).toBe(true);
  }, 60000);

  it('4. PRD-011..014 / PRD-020 — Status de Disaster Recovery ambiental e retenção', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/observability/dr-status',
      headers: { 'x-test-identity': 'full' },
    });
    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res.body).data;
    expect(data.offsiteBackup).toBe(true);
    expect(data.rpoMinutes).toBe(15);
  }, 60000);

  it('5. PRD-017 — Sanitização e mascaramento estrito de logs em JSON sem vazar CPF ou secrets', () => {
    const jsonLog = buildStructuredJsonLog({
      level: 'info',
      message: 'Log de teste',
      correlationId: 'test-corr-id',
      context: { cpf: '12345678901', password: 'mySecretPassword' },
    });
    expect(jsonLog).toContain('"cpf":"123.***.***-01"');
    expect(jsonLog).toContain('"password":"[REDACTED_SECRET]"');
  });

  it('6. RBAC — tentativa de emitir métrica sem permissão é negada (403 ACCESS_DENIED)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/observability/metrics',
      headers: { 'x-test-identity': 'guest' },
      payload: { metricName: 'http_request_duration_ms', metricValue: 100 },
    });
    expect(res.statusCode).toBe(403);
  }, 60000);
});
