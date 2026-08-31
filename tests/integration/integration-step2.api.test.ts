import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import pg from 'pg';
import { ErrorCategory } from '@vitaloop/shared';
import { registerPatientRoutes } from '../../apps/api/src/routes/patients.js';
import { registerEncounterRoutes } from '../../apps/api/src/routes/encounters.js';
import { registerSusRoutes } from '../../apps/api/src/routes/sus.js';
import { registerRegulationRoutes } from '../../apps/api/src/routes/regulation.js';
import { registerIntegrationRoutes } from '../../apps/api/src/routes/integration.js';
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
  registerRegulationRoutes(app, poolDb);
  registerIntegrationRoutes(app, poolDb);

  return app;
};

describe('API Barramento de Farmácia, RNDS, Lote AIH e Identidade Federada (INT-004..008) — integração real (vitaloop_app, RLS)', () => {
  let app: FastifyInstance;

  let testPatientId: string;
  let testEncounterId: string;
  let testAihId: string;
  let testBatchId: string;
  let testIdpId: string;

  beforeAll(async () => {
    app = buildTestApp();
    await app.ready();
  });

  afterAll(async () => {
    if (app) await app.close();
    if (poolDb) await poolDb.end();
    if (poolAdmin) await poolAdmin.end();
  });

  it('1. RLS — SELECT direto nas tabelas de farmácia, lote AIH e IdP sem contexto de sessão retorna 0 linhas', async () => {
    const client = await poolDb.connect();
    try {
      const { rows: r1 } = await client.query('select * from app.pharmacy_dispensations');
      const { rows: r2 } = await client.query('select * from app.aih_export_batches');
      const { rows: r3 } = await client.query('select * from app.identity_providers');
      expect(r1.length).toBe(0);
      expect(r2.length).toBe(0);
      expect(r3.length).toBe(0);
    } finally {
      client.release();
    }
  }, 30000);

  it('2. criação autorizada de paciente, atendimento e laudo AIH fechado para testes da Etapa 2', async () => {
    const createPat = await app.inject({
      method: 'POST',
      url: '/api/v1/patients',
      headers: { 'x-test-identity': 'full' },
      payload: { fullName: 'Paciente Teste Interoperabilidade Etapa 2' },
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
        chiefComplaint: 'Paciente em crise respiratória para dispensação e RNDS',
      },
    });
    expect(createEnc.statusCode).toBe(201);
    testEncounterId = JSON.parse(createEnc.body).data.id;

    const createAih = await app.inject({
      method: 'POST',
      url: '/api/v1/sus/aih-requests',
      headers: { 'x-test-identity': 'full' },
      payload: {
        encounterId: testEncounterId,
        patientId: testPatientId,
        mainProcedureCode: '0303060280',
        mainCid10: 'J18.9',
        clinicalJustification: 'Paciente em broncopneumonia severa com necessidade de faturamento de internação.',
      },
    });
    expect(createAih.statusCode).toBe(201);
    testAihId = JSON.parse(createAih.body).data.id;

    // Fechar AIH para torná-la elegível à exportação do lote
    const closeRes = await app.inject({
      method: 'POST',
      url: `/api/v1/sus/aih-requests/${testAihId}/close`,
      headers: { 'x-test-identity': 'full' },
    });
    expect(closeRes.statusCode).toBe(200);
  }, 60000);

  it('3. integração de dispensação eletrônica com Farmácia Central (INT-004)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/integration/pharmacy/dispense',
      headers: { 'x-test-identity': 'full' },
      payload: {
        encounterId: testEncounterId,
        patientId: testPatientId,
        items: [
          { medicationName: 'Ceftriaxona 1g IV', quantity: 2, dosage: '1g IV de 12/12h' },
          { medicationName: 'Salbutamol Spray 100mcg', quantity: 1, dosage: '2 jatos de 4/4h' },
        ],
      },
    });
    expect(res.statusCode).toBe(201);
    const data = JSON.parse(res.body).data;
    expect(data.status).toBe('dispensed');
  }, 30000);

  it('4. envio de pacote FHIR RNDS/DATASUS (INT-006)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/integration/rnds/send-bundle',
      headers: { 'x-test-identity': 'full' },
      payload: {
        patientCns: '700000000000001',
        encounterId: testEncounterId,
        clinicalSummary: 'Paciente tratado com broncodilatador e antibioticoterapia venosa',
      },
    });
    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res.body).data;
    expect(data.status).toBe('processed');
    expect(data.fhirBundle.resourceType).toBe('Bundle');
  }, 30000);

  it('5. exportação de lote estruturado de AIH faturamento SUS (INT-007)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/sus/aih-batches/export',
      headers: { 'x-test-identity': 'full' },
      payload: {
        aihIds: [testAihId],
      },
    });
    expect(res.statusCode).toBe(201);
    const data = JSON.parse(res.body).data;
    testBatchId = data.id;
    expect(data.batchNumber).toContain('LOTE-AIH-');
    expect(data.totalItems).toBe(1);
  }, 30000);

  it('6. configuração de Provedor de Identidade Federada Institucional (INT-008)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/federated/config',
      headers: { 'x-test-identity': 'full' },
      payload: {
        providerType: 'oidc',
        providerName: 'Gov.br Autenticação Federada',
        clientId: 'vitaloop-prod-client',
      },
    });
    expect(res.statusCode).toBe(201);
    const data = JSON.parse(res.body).data;
    testIdpId = data.id;
    expect(data.providerName).toBe('Gov.br Autenticação Federada');
    expect(data.isEnabled).toBe(true);
  }, 30000);

  it('7. limpeza dos dados de teste da Etapa 2 de Interoperabilidade', async () => {
    const client = await poolAdmin.connect();
    try {
      if (testPatientId) {
        await client.query('delete from app.pharmacy_dispensations where patient_id = $1', [testPatientId]);
        await client.query('delete from app.integration_messages where patient_id = $1 or encounter_id = $2', [testPatientId, testEncounterId]);
        if (testBatchId) {
          await client.query('delete from app.aih_export_batches where id = $1', [testBatchId]);
        }
        if (testIdpId) {
          await client.query('delete from app.identity_providers where id = $1', [testIdpId]);
        }
        await client.query('delete from app.aih_requests where patient_id = $1', [testPatientId]);
        await client.query('delete from app.encounters where patient_id = $1', [testPatientId]);
        await client.query('delete from app.patients where id = $1', [testPatientId]);
      }
    } finally {
      client.release();
    }
  }, 30000);
});
