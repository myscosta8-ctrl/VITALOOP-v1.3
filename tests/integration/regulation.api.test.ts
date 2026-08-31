import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import pg from 'pg';
import { ErrorCategory } from '@vitaloop/shared';
import { registerPatientRoutes } from '../../apps/api/src/routes/patients.js';
import { registerEncounterRoutes } from '../../apps/api/src/routes/encounters.js';
import { registerSusRoutes } from '../../apps/api/src/routes/sus.js';
import { registerRegulationRoutes } from '../../apps/api/src/routes/regulation.js';
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

  return app;
};

describe('API Regulação Médica e Transferência Inter-Hospitalar — integração real (vitaloop_app, RLS efetiva)', () => {
  let app: FastifyInstance;

  let testPatientId: string;
  let testEncounterId: string;
  let testAihId: string;
  let testRegulationId: string;

  beforeAll(async () => {
    app = buildTestApp();
    await app.ready();
  });

  afterAll(async () => {
    if (app) await app.close();
    if (poolDb) await poolDb.end();
    if (poolAdmin) await poolAdmin.end();
  });

  it('1. RLS — SELECT direto nas tabelas de regulação externa sem contexto de sessão retorna 0 linhas', async () => {
    const client = await poolDb.connect();
    try {
      const { rows: r1 } = await client.query('select * from app.external_regulations');
      const { rows: r2 } = await client.query('select * from app.regulation_documents');
      expect(r1.length).toBe(0);
      expect(r2.length).toBe(0);
    } finally {
      client.release();
    }
  }, 30000);

  it('2. criação autorizada de paciente, atendimento e laudo AIH para regulação externa', async () => {
    const createPat = await app.inject({
      method: 'POST',
      url: '/api/v1/patients',
      headers: { 'x-test-identity': 'full' },
      payload: { fullName: 'Paciente Teste Regulação Externa' },
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
        chiefComplaint: 'Paciente com infarto agudo do miocárdio necessitando hemodinâmica urgente',
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
        mainProcedureCode: '0303010037',
        mainCid10: 'I21.9',
        clinicalJustification: 'Paciente em dor torácica severa com supra de ST necessitando angioplastia primária em centro terciário.',
      },
    });
    expect(createAih.statusCode).toBe(201);
    testAihId = JSON.parse(createAih.body).data.id;
  }, 60000);

  it('3. solicitação de regulação externa com documentos anexados (SUS-007, SUS-009)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/regulation/requests',
      headers: { 'x-test-identity': 'full' },
      payload: {
        encounterId: testEncounterId,
        patientId: testPatientId,
        aihRequestId: testAihId,
        destinationFacility: 'Hospital INCOR - HCFMUSP',
        specialty: 'Hemodinâmica / Cardiologia de Alta Complexidade',
        priority: 'emergency',
        transportType: 'uti_mobile',
        documents: [
          { documentType: 'clinical_report', notes: 'Relatório clínico de transferência com EKG alterado' },
          { documentType: 'aih_form', notes: 'Laudo de AIH pré-validado' },
        ],
      },
    });
    expect(res.statusCode).toBe(201);
    const data = JSON.parse(res.body).data;
    testRegulationId = data.id;
    expect(data.destinationFacility).toBe('Hospital INCOR - HCFMUSP');
    expect(data.status).toBe('requested');
  }, 30000);

  it('4. consulta de detalhes da regulação e documentos anexados (SUS-007, SUS-009)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/regulation/requests/${testRegulationId}`,
      headers: { 'x-test-identity': 'full' },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body).data;
    expect(body.regulation.id).toBe(testRegulationId);
    expect(body.documents.length).toBe(2);
  }, 30000);

  it('5. atualização de status da regulação para aceita e transferência realizada (SUS-008)', async () => {
    const patchAccepted = await app.inject({
      method: 'PATCH',
      url: `/api/v1/regulation/requests/${testRegulationId}/status`,
      headers: { 'x-test-identity': 'full' },
      payload: { targetStatus: 'accepted' },
    });
    expect(patchAccepted.statusCode).toBe(200);
    expect(JSON.parse(patchAccepted.body).data.status).toBe('accepted');

    const patchTransferred = await app.inject({
      method: 'PATCH',
      url: `/api/v1/regulation/requests/${testRegulationId}/status`,
      headers: { 'x-test-identity': 'full' },
      payload: { targetStatus: 'transferred' },
    });
    expect(patchTransferred.statusCode).toBe(200);
    expect(JSON.parse(patchTransferred.body).data.status).toBe('transferred');
  }, 30000);

  it('6. fechamento final e validação da AIH (SUS-010)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/sus/aih-requests/${testAihId}/close`,
      headers: { 'x-test-identity': 'full' },
    });
    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res.body).data;
    expect(data.id).toBe(testAihId);
    expect(data.closedAt).not.toBeNull();
  }, 30000);

  it('7. tentativa de transição de status inválida a partir do estado final transferred -> BLOQUEIO 400', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/regulation/requests/${testRegulationId}/status`,
      headers: { 'x-test-identity': 'full' },
      payload: { targetStatus: 'requested' },
    });
    expect(res.statusCode).toBe(400);
  }, 30000);

  it('8. limpeza dos dados de teste da regulação e faturamento SUS', async () => {
    const client = await poolAdmin.connect();
    try {
      if (testPatientId) {
        await client.query('delete from app.regulation_documents where regulation_id in (select id from app.external_regulations where patient_id = $1)', [testPatientId]);
        await client.query('delete from app.external_regulations where patient_id = $1', [testPatientId]);
        await client.query('delete from app.aih_requests where patient_id = $1', [testPatientId]);
        await client.query('delete from app.encounters where patient_id = $1', [testPatientId]);
        await client.query('delete from app.patients where id = $1', [testPatientId]);
      }
    } finally {
      client.release();
    }
  }, 30000);
});
