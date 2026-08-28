import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import pg from 'pg';
import { ErrorCategory } from '@vitaloop/shared';
import { registerPatientRoutes } from '../../apps/api/src/routes/patients.js';
import { registerEncounterRoutes } from '../../apps/api/src/routes/encounters.js';
import { registerManagementRoutes } from '../../apps/api/src/routes/management.js';
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
  roles: ['test_patient_full', 'doctor', 'nurse', 'admin'],
};

const buildTestApp = (): FastifyInstance => {
  const app = Fastify();

  app.addHook('onRequest', async (req) => {
    const identityHeader = req.headers['x-test-identity'] as string;
    if (identityHeader === 'full') {
      req.identity = identityFull;
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

  registerPatientRoutes(app, poolDb);
  registerEncounterRoutes(app, poolDb);
  registerManagementRoutes(app, poolDb);

  return app;
};

describe('API de Gestão Operacional e Dashboards — integração real (vitaloop_app, RLS efetiva)', () => {
  let app: FastifyInstance;
  let testAlertId: string;

  beforeAll(async () => {
    app = buildTestApp();
    await app.ready();
  });

  afterAll(async () => {
    if (app) await app.close();
    if (poolDb) await poolDb.end();
    if (poolAdmin) await poolAdmin.end();
  });

  it('1. RLS — SELECT direto na tabela app.management_alerts sem contexto de sessão retorna 0 linhas', async () => {
    const client = await poolDb.connect();
    try {
      const { rows } = await client.query('select * from app.management_alerts');
      expect(rows.length).toBe(0);
    } finally {
      client.release();
    }
  }, 30000);

  it('2. inserção administrativa de alerta gerencial de teste para sobrecarga', async () => {
    const client = await poolAdmin.connect();
    try {
      const res = await client.query(
        `insert into app.management_alerts (alert_type, severity, message, metric_value, threshold_value)
         values ($1, $2, $3, $4, $5)
         returning id`,
        ['queue_overcrowded', 'critical', 'Fila de espera de atendimento excedeu limite crítico de 15 pacientes.', 18, 15],
      );
      testAlertId = res.rows[0].id;
      expect(testAlertId).toBeTruthy();
    } finally {
      client.release();
    }
  }, 30000);

  it('3. consulta autorizada do Dashboard Operacional em tempo real (MGT-001..005)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/management/dashboard',
      headers: { 'x-test-identity': 'full' },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toHaveProperty('summary');
    expect(body.data).toHaveProperty('averageTmpHours');
    expect(body.data).toHaveProperty('manchesterKpis');
    expect(body.data).toHaveProperty('alerts');
  }, 30000);

  it('4. consulta de alertas gerenciais de sobrecarga (MGT-009)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/management/alerts',
      headers: { 'x-test-identity': 'full' },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
  }, 30000);

  it('5. reconhecimento autorizado de alerta gerencial (MGT-009)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/management/alerts/${testAlertId}/acknowledge`,
      headers: { 'x-test-identity': 'full' },
    });
    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res.body).data;
    expect(data.isAcknowledged).toBe(true);
  }, 30000);

  it('6. exportação de relatório gerencial em CSV com máscara LGPD (MGT-008)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/management/reports/export?format=csv',
      headers: { 'x-test-identity': 'full' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.body).toContain('EncounterID;Status;CreatedAt;PatientName');
  }, 30000);

  it('7. limpeza de dados de teste da gestão operacional', async () => {
    const client = await poolAdmin.connect();
    try {
      if (testAlertId) {
        await client.query('delete from app.management_alerts where id = $1', [testAlertId]);
      }
    } finally {
      client.release();
    }
  }, 30000);
});
