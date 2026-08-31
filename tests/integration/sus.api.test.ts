import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import pg from 'pg';
import { ErrorCategory } from '@vitaloop/shared';
import { registerPatientRoutes } from '../../apps/api/src/routes/patients.js';
import { registerEncounterRoutes } from '../../apps/api/src/routes/encounters.js';
import { registerSusRoutes } from '../../apps/api/src/routes/sus.js';
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
  registerSusRoutes(app, poolDb);

  return app;
};

describe('API Faturamento SUS, SIGTAP e Laudo AIH — integração real (vitaloop_app, RLS efetiva)', () => {
  let app: FastifyInstance;

  let testPatientId: string;
  let testEncounterId: string;
  let testAihId: string;

  beforeAll(async () => {
    app = buildTestApp();
    await app.ready();
  });

  afterAll(async () => {
    if (app) await app.close();
    if (poolDb) await poolDb.end();
    if (poolAdmin) await poolAdmin.end();
  });

  it('1. RLS — SELECT direto nas tabelas de laudos de AIH sem contexto de sessão retorna 0 linhas', async () => {
    const client = await poolDb.connect();
    try {
      const { rows } = await client.query('select * from app.aih_requests');
      expect(rows.length).toBe(0);
    } finally {
      client.release();
    }
  }, 30000);

  it('2. criação autorizada de paciente e atendimento de teste para laudo AIH', async () => {
    const createPat = await app.inject({
      method: 'POST',
      url: '/api/v1/patients',
      headers: { 'x-test-identity': 'full' },
      payload: {
        fullName: 'Paciente Teste AIH SUS',
      },
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
        chiefComplaint: 'Paciente com insuficiência respiratória por pneumonia severa',
      },
    });
    expect(createEnc.statusCode).toBe(201);
    testEncounterId = JSON.parse(createEnc.body).data.id;
  }, 30000);

  it('3. busca de procedimentos no catálogo versionável SIGTAP (SUS-002)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/sus/sigtap/search?q=PNEUMONIA',
      headers: { 'x-test-identity': 'full' },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    expect(body.data[0].code).toBe('0303060280');
  }, 30000);

  it('4. validação de compatibilidade SUS positiva (SUS-005)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/sus/validate-compatibility',
      headers: { 'x-test-identity': 'full' },
      payload: {
        procedureCode: '0303060280',
        patientAgeMonths: 360,
        patientSex: 'female',
        cid10: 'J18.9',
      },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.isValid).toBe(true);
    expect(body.data.errors.length).toBe(0);
  }, 30000);

  it('5. validação de compatibilidade SUS negativa (incompatibilidade de sexo) (SUS-005)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/sus/validate-compatibility',
      headers: { 'x-test-identity': 'full' },
      payload: {
        procedureCode: '0303140054', // Tratamento de complicações do parto (apenas Feminino)
        patientAgeMonths: 360,
        patientSex: 'male',
        cid10: 'O72',
      },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.isValid).toBe(false);
    expect(body.data.errors[0]).toContain('Procedimento restrito ao sexo Feminino');
  }, 30000);

  it('6. emissão e validação autorizada do laudo de AIH (SUS-001/003/004/006)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/sus/aih-requests',
      headers: { 'x-test-identity': 'full' },
      payload: {
        encounterId: testEncounterId,
        patientId: testPatientId,
        mainProcedureCode: '0303060280',
        mainCid10: 'J18.9',
        clinicalJustification: 'Paciente apresentando dispneia severa e crepitações pulmonares bilaterais necessitando internação.',
      },
    });
    expect(res.statusCode).toBe(201);
    const data = JSON.parse(res.body).data;
    testAihId = data.id;
    expect(data.mainProcedureCode).toBe('0303060280');
    expect(data.status).toBe('validated');
  }, 30000);

  it('7. consulta do laudo de AIH emitido por ID (SUS-001)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/sus/aih-requests/${testAihId}`,
      headers: { 'x-test-identity': 'full' },
    });
    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res.body).data;
    expect(data.id).toBe(testAihId);
    expect(data.mainCid10).toBe('J18.9');
  }, 30000);

  it('8. tentativa de emissão de AIH com justificativa curta -> BLOQUEIO 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/sus/aih-requests',
      headers: { 'x-test-identity': 'full' },
      payload: {
        encounterId: testEncounterId,
        patientId: testPatientId,
        mainProcedureCode: '0303060280',
        mainCid10: 'J18.9',
        clinicalJustification: 'Curto',
      },
    });
    expect(res.statusCode).toBe(400);
  }, 30000);

  it('9. limpeza dos dados de teste do faturamento SUS e AIH', async () => {
    const client = await poolAdmin.connect();
    try {
      if (testPatientId) {
        await client.query('delete from app.aih_requests where patient_id = $1', [testPatientId]);
        await client.query('delete from app.encounters where patient_id = $1', [testPatientId]);
        await client.query('delete from app.patients where id = $1', [testPatientId]);
      }
    } finally {
      client.release();
    }
  }, 30000);
});
