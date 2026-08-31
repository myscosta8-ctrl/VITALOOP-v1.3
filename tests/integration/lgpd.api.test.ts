import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import pg from 'pg';
import { ErrorCategory } from '@vitaloop/shared';
import { registerPatientRoutes } from '../../apps/api/src/routes/patients.js';
import { registerEncounterRoutes } from '../../apps/api/src/routes/encounters.js';
import { registerSecurityRoutes } from '../../apps/api/src/routes/security.js';
import { failure } from '../../apps/api/src/http/envelope.js';

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  throw new Error('DATABASE_URL não configurada no ambiente de testes.');
}

const poolDb = new pg.Pool({ connectionString: dbUrl });
const poolAdmin = new pg.Pool({ connectionString: dbUrl.replace('vitaloop_app.', 'postgres.') });

const makeValidCpf = (seed: number): string => {
  const base = String(seed).padStart(9, '0').slice(-9).split('').map(Number);
  const calcDv = (digits: number[], factorStart: number): number => {
    let sum = 0;
    for (let i = 0; i < digits.length; i++) sum += digits[i] * (factorStart - i);
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  const dv1 = calcDv(base, 10);
  const dv2 = calcDv([...base, dv1], 11);
  return [...base, dv1, dv2].join('');
};

const identityFull = {
  authUserId: 'auth-full',
  appUserId: '83ad7af3-c506-48be-b2a0-6fbd0bb6bf1b',
  appUserStatus: 'active',
  roles: ['test_patient_full', 'doctor', 'nurse', 'admin'],
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

  registerPatientRoutes(app, poolDb);
  registerEncounterRoutes(app, poolDb);
  registerSecurityRoutes(app, poolDb);

  return app;
};

describe('API Direitos do Titular LGPD, Minimização e Retenção (SEC-T-012..016) — integração real (vitaloop_app, RLS)', () => {
  let app: FastifyInstance;

  let testPatientId: string;
  let testEncounterId: string;

  beforeAll(async () => {
    app = buildTestApp();
    await app.ready();
  });

  afterAll(async () => {
    if (app) await app.close();
    if (poolDb) await poolDb.end();
    if (poolAdmin) await poolAdmin.end();
  });

  it('1. RLS — SELECT direto nas tabelas de solicitações LGPD e retenção sem contexto de sessão retorna 0 linhas', async () => {
    const client = await poolDb.connect();
    try {
      const { rows: r1 } = await client.query('select * from app.lgpd_data_requests');
      const { rows: r2 } = await client.query('select * from app.data_retention_policies');
      expect(r1.length).toBe(0);
      expect(r2.length).toBe(0);
    } finally {
      client.release();
    }
  }, 60000);

  it('2. criação autorizada de paciente e atendimento para testes LGPD', async () => {
    const validCpf = makeValidCpf(Date.now() % 100000000);

    const createPat = await app.inject({
      method: 'POST',
      url: '/api/v1/patients',
      headers: { 'x-test-identity': 'full' },
      payload: { fullName: 'Paciente Teste Direitos Titular LGPD', cpf: validCpf },
    });
    expect(createPat.statusCode).toBe(201);
    testPatientId = JSON.parse(createPat.body).data.id;

    const createEnc = await app.inject({
      method: 'POST',
      url: '/api/v1/encounters',
      headers: { 'x-test-identity': 'full' },
      payload: {
        patientId: testPatientId,
        encounterType: 'urgency',
        origin: 'spontaneous',
        chiefComplaint: 'Paciente solicitando extrato LGPD de dados assistenciais',
      },
    });
    expect(createEnc.statusCode).toBe(201);
    testEncounterId = JSON.parse(createEnc.body).data.id;
    expect(testEncounterId).toBeTruthy();
  }, 60000);

  it('3. geração e exportação de extrato de transparência LGPD com CPF mascarado e integridade de hash (SEC-T-012, SEC-T-013, SEC-T-014)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/lgpd/patients/${testPatientId}/export`,
      headers: { 'x-test-identity': 'full' },
    });
    expect(res.statusCode).toBe(201);
    const data = JSON.parse(res.body).data;
    expect(data.personalData.fullName).toBe('Paciente Teste Direitos Titular LGPD');
    expect(data.personalData.maskedCpf).toContain('***.***');
    expect(data.dataHash).toBeTruthy();
    expect(data.processingSummary.encountersCount).toBe(1);
  }, 60000);

  it('4. consulta de políticas de retenção legal assistencial de 20 anos (SEC-T-015)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/lgpd/retention-policies',
      headers: { 'x-test-identity': 'full' },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    const medPolicy = body.data.find((p: { entityType: string }) => p.entityType === 'medical_records');
    expect(medPolicy.retentionYears).toBe(20);
  }, 60000);

  it('5. RBAC / IDOR — tentativa de exportar extrato LGPD sem permissão é negada (403 ACCESS_DENIED)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/lgpd/patients/${testPatientId}/export`,
      headers: { 'x-test-identity': 'guest' },
    });
    expect(res.statusCode).toBe(403);
  }, 60000);

  it('6. limpeza de dados de teste de privacidade LGPD', async () => {
    const client = await poolAdmin.connect();
    try {
      if (testPatientId) {
        await client.query('delete from app.lgpd_data_requests where patient_id = $1', [testPatientId]);
        await client.query('delete from app.encounters where patient_id = $1', [testPatientId]);
        await client.query('delete from app.patients where id = $1', [testPatientId]);
      }
    } finally {
      client.release();
    }
  }, 60000);
});
