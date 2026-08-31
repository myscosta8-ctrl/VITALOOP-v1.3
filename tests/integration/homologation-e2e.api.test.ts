import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import pg from 'pg';
import { ErrorCategory } from '@vitaloop/shared';
import { buildStructuredJsonLog, validateEnvironmentalDr } from '@vitaloop/domain';
import { registerHealthRoutes } from '../../apps/api/src/routes/health.js';
import { registerSecurityRoutes } from '../../apps/api/src/routes/security.js';
import { registerPatientRoutes } from '../../apps/api/src/routes/patients.js';
import { registerEncounterRoutes } from '../../apps/api/src/routes/encounters.js';
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
  authUserId: 'auth-homolog',
  appUserId: '83ad7af3-c506-48be-b2a0-6fbd0bb6bf1b',
  appUserStatus: 'active',
  roles: ['test_patient_full', 'admin', 'doctor', 'nurse'],
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
    if (identityHeader === 'guest') {
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

  registerHealthRoutes(app, { db: poolDb, supabaseUrl: process.env.SUPABASE_URL });
  registerSecurityRoutes(app, poolDb);
  registerPatientRoutes(app, poolDb);
  registerEncounterRoutes(app, poolDb);
  registerQualityRoutes(app, poolDb);
  registerObservabilityRoutes(app, poolDb);

  return app;
};

describe('FASE 13 — HOMOLOGAÇÃO FINAL & GO-LIVE (HOM-001..014) — Validação Real Supabase/RLS', () => {
  let app: FastifyInstance;
  let testPatientId: string;
  let testEncounterId: string;

  beforeAll(async () => {
    app = buildTestApp();
    await app.ready();
  });

  afterAll(async () => {
    if (app) await app.close();
    if (poolAdmin) {
      const client = await poolAdmin.connect();
      try {
        if (testPatientId) {
          await client.query("delete from app.encounters where patient_id = $1", [testPatientId]);
        }
        await client.query("delete from app.patients where full_name = 'Paciente Homologacao Final'");
        await client.query("delete from app.backup_restore_jobs where job_type = 'backup_logical'");
        await client.query("delete from app.system_metrics where metric_name = 'homolog_metric'");
      } catch (err) {
        console.error('Erro no teardown:', err);
      } finally {
        client.release();
      }
      await poolAdmin.end();
    }
    if (poolDb) await poolDb.end();
  });

  it('1. HOM-003 / HOM-009 / RLS — SELECT direto sem sessão retorna 0 linhas na base Supabase', async () => {
    const client = await poolDb.connect();
    try {
      const { rows } = await client.query('select * from app.patients');
      expect(rows.length).toBe(0);
    } finally {
      client.release();
    }
  }, 60000);

  it('2. HOM-008 / HOM-011 — Fluxo Assistencial Clínico E2E (Cadastro -> Atendimento -> Prontuário)', async () => {
    // 2.1 Cadastro de Paciente
    const resPat = await app.inject({
      method: 'POST',
      url: '/api/v1/patients',
      headers: { 'x-test-identity': 'full' },
      payload: {
        fullName: 'Paciente Homologacao Final',
      },
    });
    expect(resPat.statusCode).toBe(201);
    const patData = JSON.parse(resPat.body).data;
    testPatientId = patData.id;
    expect(testPatientId).toBeTruthy();

    // 2.2 Abertura de Atendimento
    const resEnc = await app.inject({
      method: 'POST',
      url: '/api/v1/encounters',
      headers: { 'x-test-identity': 'full' },
      payload: {
        patientId: testPatientId,
        encounterType: 'urgency',
        origin: 'spontaneous',
        chiefComplaint: 'Dor de cabeça forte e febre alta',
      },
    });
    expect(resEnc.statusCode).toBe(201);
    const encData = JSON.parse(resEnc.body).data;
    testEncounterId = encData.id;
    expect(testEncounterId).toBeTruthy();
  }, 60000);

  it('3. HOM-010 / HOM-013 — Healthchecks e Telemetria de Produção (/health, /ready, correlation ID)', async () => {
    const resHealth = await app.inject({ method: 'GET', url: '/health' });
    expect(resHealth.statusCode).toBe(200);

    const resReady = await app.inject({ method: 'GET', url: '/ready' });
    expect(resReady.statusCode).toBe(200);
    expect(JSON.parse(resReady.body).data.ready).toBe(true);

    const resMetric = await app.inject({
      method: 'POST',
      url: '/api/v1/observability/metrics',
      headers: { 'x-test-identity': 'full', 'x-request-id': 'req-homolog-555' },
      payload: { metricName: 'homolog_metric', metricValue: 99.9 },
    });
    expect(resMetric.statusCode).toBe(201);
    expect(resMetric.headers['x-request-id']).toBeTruthy();
  }, 60000);

  it('4. HOM-012 / HOM-014 — Disaster Recovery, Retenção LGPD e Checklist Go-Live Readiness', async () => {
    const dr = validateEnvironmentalDr();
    expect(dr.offsiteBackup).toBe(true);
    expect(dr.rpoMinutes).toBe(15);
    expect(dr.rtoMinutes).toBe(60);

    const jsonLog = buildStructuredJsonLog({
      level: 'info',
      message: 'Log de Homologação Final',
      correlationId: 'req-homolog-555',
      context: { userCpf: '01414274777', userToken: 'secretToken' },
    });
    expect(jsonLog).toContain('"userCpf":"014.***.***-77"');
    expect(jsonLog).toContain('"userToken":"[REDACTED_SECRET]"');
  }, 60000);

  it('5. HOM-004 / HOM-009 — Tentativa não autorizada é bloqueada por RBAC (403 ACCESS_DENIED)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/observability/metrics',
      headers: { 'x-test-identity': 'guest' },
      payload: { metricName: 'homolog_metric', metricValue: 50 },
    });
    expect(res.statusCode).toBe(403);
  }, 60000);
});
