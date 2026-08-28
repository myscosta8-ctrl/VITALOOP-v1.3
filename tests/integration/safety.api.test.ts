import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import pg from 'pg';
import { ErrorCategory } from '@vitaloop/shared';
import { registerPatientRoutes } from '../../apps/api/src/routes/patients.js';
import { registerEncounterRoutes } from '../../apps/api/src/routes/encounters.js';
import { registerSafetyRoutes } from '../../apps/api/src/routes/safety.js';
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
  registerSafetyRoutes(app, poolDb);

  return app;
};

describe('API de Segurança do Paciente, Eventos Adversos e Isolamento — integração real (vitaloop_app, RLS efetiva)', () => {
  let app: FastifyInstance;

  let testPatientId: string;
  let testEncounterId: string;
  let testIsolationId: string;

  beforeAll(async () => {
    app = buildTestApp();
    await app.ready();
  });

  afterAll(async () => {
    if (app) await app.close();
    if (poolDb) await poolDb.end();
    if (poolAdmin) await poolAdmin.end();
  });

  it('1. RLS — SELECT direto nas tabelas de segurança do paciente sem contexto de sessão retorna 0 linhas', async () => {
    const client = await poolDb.connect();
    try {
      const { rows: r1 } = await client.query('select * from app.adverse_events');
      const { rows: r2 } = await client.query('select * from app.patient_isolations');
      expect(r1.length).toBe(0);
      expect(r2.length).toBe(0);
    } finally {
      client.release();
    }
  }, 30000);

  it('2. criação autorizada de paciente e atendimento de teste para segurança do paciente', async () => {
    const createPat = await app.inject({
      method: 'POST',
      url: '/api/v1/patients',
      headers: { 'x-test-identity': 'full' },
      payload: {
        fullName: 'Paciente Teste Segurança',
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
        chiefComplaint: 'Paciente com suspeita de RAM e infecção bacteriana',
      },
    });
    expect(createEnc.statusCode).toBe(201);
    testEncounterId = JSON.parse(createEnc.body).data.id;
  }, 30000);

  it('3. notificação autorizada de evento adverso (SAF-001/006)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/safety/adverse-events',
      headers: { 'x-test-identity': 'full' },
      payload: {
        encounterId: testEncounterId,
        patientId: testPatientId,
        eventCategory: 'medicação',
        severity: 'mild',
        description: 'Paciente apresentou prurido e eritema leve após infusão de antibiótico.',
        immediateAction: 'Suspenso fármaco e administrado anti-histamínico.',
      },
    });
    expect(res.statusCode).toBe(201);
    const data = JSON.parse(res.body).data;
    expect(data.eventCategory).toBe('medicação');
    expect(data.severity).toBe('mild');
  }, 30000);

  it('4. notificação epidemiológica compulsória com código SINAN (SAF-010)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/safety/adverse-events',
      headers: { 'x-test-identity': 'full' },
      payload: {
        encounterId: testEncounterId,
        patientId: testPatientId,
        eventCategory: 'notificação_compulsória',
        severity: 'moderate',
        description: 'Notificação compulsória imediata de caso suspeito de Dengue com sinais de alarme.',
        isEpidemiologicalNotification: true,
        sinanCode: 'A90',
      },
    });
    expect(res.statusCode).toBe(201);
    const data = JSON.parse(res.body).data;
    expect(data.isEpidemiologicalNotification).toBe(true);
    expect(data.sinanCode).toBe('A90');
  }, 30000);

  it('5. listagem de eventos adversos no painel NSP (SAF-011)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/safety/adverse-events',
      headers: { 'x-test-identity': 'full' },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.length).toBeGreaterThanOrEqual(2);
  }, 30000);

  it('6. prescrição autorizada de isolamento assistencial de contato (SAF-007/008)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${testEncounterId}/isolations`,
      headers: { 'x-test-identity': 'full' },
      payload: {
        isolationType: 'contact',
        reason: 'Suspeita ou confirmação de colonização por bactéria multirresistente (KPC).',
        pathogenSuspected: 'Klebsiella pneumoniae KPC',
      },
    });
    expect(res.statusCode).toBe(201);
    const data = JSON.parse(res.body).data;
    testIsolationId = data.id;
    expect(data.isolationType).toBe('contact');
    expect(data.isActive).toBe(true);
  }, 30000);

  it('7. listagem dos isolamentos ativos do atendimento', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/encounters/${testEncounterId}/isolations`,
      headers: { 'x-test-identity': 'full' },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.length).toBe(1);
    expect(body.data[0].isolationType).toBe('contact');
  }, 30000);

  it('8. encerramento autorizado de isolamento assistencial (SAF-007)', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/isolations/${testIsolationId}/end`,
      headers: { 'x-test-identity': 'full' },
    });
    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res.body).data;
    expect(data.isActive).toBe(false);
  }, 30000);

  it('9. tentativa de re-encerrar isolamento já inativo -> BLOQUEIO 400', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/isolations/${testIsolationId}/end`,
      headers: { 'x-test-identity': 'full' },
    });
    expect(res.statusCode).toBe(400);
  }, 30000);

  it('10. eventos de segurança do paciente surgem na app.patient_timeline', async () => {
    const client = await poolDb.connect();
    try {
      await client.query("select set_config('vitaloop.user_id', $1, false)", ['11111111-1111-1111-1111-111111111111']);
      await client.query("select set_config('vitaloop.roles', $1, false)", ['doctor']);

      const { rows } = await client.query(
        'select * from app.patient_timeline where patient_id = $1 order by occurred_at asc',
        [testPatientId],
      );

      expect(rows.length).toBeGreaterThan(0);
      const eventTypes = rows.map((r) => r.type);
      expect(eventTypes).toContain('AdverseEventReported');
      expect(eventTypes).toContain('PatientIsolationPrescribed');
      expect(eventTypes).toContain('PatientIsolationEnded');
    } finally {
      client.release();
    }
  }, 30000);

  it('11. limpeza de dados de teste de segurança do paciente', async () => {
    const client = await poolAdmin.connect();
    try {
      if (testPatientId) {
        await client.query('delete from app.patient_isolations where patient_id = $1', [testPatientId]);
        await client.query('delete from app.adverse_events where patient_id = $1', [testPatientId]);
        await client.query('delete from app.encounters where patient_id = $1', [testPatientId]);
        await client.query('delete from app.patients where id = $1', [testPatientId]);
      }
    } finally {
      client.release();
    }
  }, 30000);
});
