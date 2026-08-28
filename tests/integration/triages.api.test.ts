import { describe, expect, it } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import pg from 'pg';
import { AppError, ErrorCategory, newUuid } from '@vitaloop/shared';
import { failure } from '../../apps/api/src/http/envelope.js';
import { registerPatientRoutes } from '../../apps/api/src/routes/patients.js';
import { registerEncounterRoutes } from '../../apps/api/src/routes/encounters.js';
import { registerTriageRoutes } from '../../apps/api/src/routes/triages.js';
import type { RequestIdentity } from '../../apps/api/src/security/request-identity.js';

const url = process.env.DATABASE_URL;
const run = url ? describe : describe.skip;

const pool = url
  ? new pg.Pool({
      connectionString: url,
      max: 5,
      idleTimeoutMillis: 5000,
    })
  : (null as unknown as pg.Pool);

const FIXTURE = {
  institutionId: '11c93126-f2b2-47d4-9dd4-88dd547becc1',
  actorFullId: '83ad7af3-c506-48be-b2a0-6fbd0bb6bf1b',
  actorReadonlyId: '10243fdf-2cc4-4f35-8544-1f1d2e338472',
  actorNoPermId: '464ef92a-6d14-446e-9a9b-95801b515c6d',
} as const;

type TestIdentity = RequestIdentity | null;

const identityFull: TestIdentity = {
  authUserId: 'auth-full',
  appUserId: FIXTURE.actorFullId,
  appUserStatus: 'active',
  roles: ['test_patient_full'],
};

const identityReadonly: TestIdentity = {
  authUserId: 'auth-readonly',
  appUserId: FIXTURE.actorReadonlyId,
  appUserStatus: 'active',
  roles: ['test_patient_readonly'],
};

const identityNoPerm: TestIdentity = {
  authUserId: 'auth-noperm',
  appUserId: FIXTURE.actorNoPermId,
  appUserStatus: 'active',
  roles: [],
};

const buildTestApp = (poolDb: pg.Pool): FastifyInstance => {
  const app = Fastify({ genReqId: (req) => (req.headers['x-request-id'] as string) || newUuid() });

  app.addHook('onRequest', (req, reply, done) => {
    reply.header('X-Request-Id', req.id);
    const identityHeader = req.headers['x-test-identity'];
    if (typeof identityHeader === 'string') {
      req.identity =
        identityHeader === 'null'
          ? null
          : ({ full: identityFull, readonly: identityReadonly, noperm: identityNoPerm }[
              identityHeader
            ] ?? null);
    } else {
      req.identity = null;
    }
    done();
  });

  app.setErrorHandler((error, req, reply) => {
    if (error instanceof AppError) {
      reply.code(error.httpStatus).send(failure(error.toJSON(), req.id));
      return;
    }
    reply.code(500).send(
      failure({ category: ErrorCategory.INTERNAL, code: 'INTERNAL_ERROR', message: 'Erro interno.' }, req.id),
    );
  });

  registerPatientRoutes(app, poolDb);
  registerEncounterRoutes(app, poolDb);
  registerTriageRoutes(app, poolDb);

  return app;
};

run('API de Triagem — integração real (vitaloop_app, RLS efetiva)', { timeout: 30000 }, () => {
  let app: FastifyInstance;
  let testPatientId: string;
  let testEncounterId: string;
  let _createdTriageId: string;

  const createdPatientIds: string[] = [];
  const createdEncounterIds: string[] = [];

  it('setup da aplicação Fastify', () => {
    app = buildTestApp(pool);
    expect(app).toBeDefined();
  });

  it('1. RLS — SELECT direto na tabela app.triages sem contexto de sessão retorna 0 linhas', async () => {
    const client = await pool.connect();
    try {
      await client.query('begin');
      await client.query(`select set_config('vitaloop.user_id', '', true), set_config('vitaloop.roles', '', true)`);
      const res = await client.query('select count(*)::int as n from app.triages');
      expect(res.rows[0].n).toBe(0);
      await client.query('rollback');
    } finally {
      client.release();
    }
  });

  it('2. criação autorizada de paciente e atendimento para testes', async () => {
    const createPat = await app.inject({
      method: 'POST',
      url: '/api/v1/patients',
      headers: { 'x-test-identity': 'full' },
      payload: { fullName: 'Paciente Teste Triagem' },
    });
    expect(createPat.statusCode).toBe(201);
    testPatientId = JSON.parse(createPat.body).data.id;
    createdPatientIds.push(testPatientId);

    const createEnc = await app.inject({
      method: 'POST',
      url: '/api/v1/encounters',
      headers: { 'x-test-identity': 'full' },
      payload: {
        patientId: testPatientId,
        encounterType: 'urgency',
        origin: 'spontaneous',
        chiefComplaint: 'Dor de cabeça e febre alta',
      },
    });
    expect(createEnc.statusCode).toBe(201);
    testEncounterId = JSON.parse(createEnc.body).data.id;
    createdEncounterIds.push(testEncounterId);
  });

  it('3. registro de triagem sem autenticação -> 401 AUTH_REQUIRED', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${testEncounterId}/triage`,
      headers: { 'x-test-identity': 'null' },
      payload: { chiefComplaint: 'Teste sem auth', riskColor: 'yellow' },
    });
    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body).error.code).toBe('AUTH_REQUIRED');
  });

  it('4. registro de triagem sem permissão (triage.write) -> 403 ACCESS_DENIED', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${testEncounterId}/triage`,
      headers: { 'x-test-identity': 'noperm' },
      payload: { chiefComplaint: 'Teste sem permissão', riskColor: 'yellow' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('5. registro de triagem autorizada com Manchester (Amarelo -> 60 min, transita atendimento para triaged)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${testEncounterId}/triage`,
      headers: { 'x-test-identity': 'full' },
      payload: {
        chiefComplaint: 'Cefaleia intensa e febre 38.5C',
        symptomsDuration: '3 horas',
        vitals: {
          systolicBp: 130,
          diastolicBp: 85,
          heartRate: 88,
          respiratoryRate: 18,
          temperature: 38.5,
          oxygenSaturation: 97,
        },
        painScore: 6,
        glasgowScore: 15,
        capillaryGlucose: 98,
        flowchart: 'Cefaleia',
        discriminator: 'Dor moderada a severa',
        riskColor: 'yellow',
      },
    });

    if (res.statusCode !== 201) {
      console.log('TEST 5 ERROR BODY:', res.body);
    }
    expect(res.statusCode).toBe(201);
    const triageData = JSON.parse(res.body).data;
    _createdTriageId = triageData.id;

    expect(triageData.riskColor).toBe('yellow');
    expect(triageData.priority).toBe('urgent');
    expect(triageData.targetTimeMinutes).toBe(60);
    expect(triageData.vitals.temperature).toBe(38.5);

    // Verifica que o status do atendimento transitou para 'triaged'
    const encRes = await app.inject({
      method: 'GET',
      url: `/api/v1/encounters/${testEncounterId}`,
      headers: { 'x-test-identity': 'full' },
    });
    expect(encRes.statusCode).toBe(200);
    expect(JSON.parse(encRes.body).data.status).toBe('triaged');
  });

  it('6. reclassificação sem justificativa -> 400 TRIAGE_RECLASSIFICATION_REASON_REQUIRED', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/encounters/${testEncounterId}/triage/reclassify`,
      headers: { 'x-test-identity': 'full' },
      payload: {
        newRiskColor: 'orange',
        reclassificationReason: '   ', // Vazio!
      },
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error.code).toBe('TRIAGE_RECLASSIFICATION_REASON_REQUIRED');
  });

  it('7. reclassificação autorizada com justificativa (Amarelo -> Laranja, 10 min)', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/encounters/${testEncounterId}/triage/reclassify`,
      headers: { 'x-test-identity': 'full' },
      payload: {
        newRiskColor: 'orange',
        reclassificationReason: 'Piora clínica com elevação da frequência cardíaca',
      },
    });

    expect(res.statusCode).toBe(200);
    const updated = JSON.parse(res.body).data;
    expect(updated.riskColor).toBe('orange');
    expect(updated.priority).toBe('very_urgent');
    expect(updated.targetTimeMinutes).toBe(10);
    expect(updated.reclassificationReason).toBe('Piora clínica com elevação da frequência cardíaca');
    expect(updated.reclassifiedFrom).toBe('yellow');
  });

  it('8. eventos de triagem surgem na app.patient_timeline do paciente correto e respeitam RLS', async () => {
    const timelineRes = await app.inject({
      method: 'GET',
      url: `/api/v1/patients/${testPatientId}/timeline`,
      headers: { 'x-test-identity': 'full' },
    });
    expect(timelineRes.statusCode).toBe(200);
    const events = JSON.parse(timelineRes.body).data;

    const triageEvent = events.find((e: { type: string }) => e.type === 'TriageRecorded');
    const riskEvent = events.find((e: { type: string }) => e.type === 'PatientRiskClassified');
    const reclassifyEvent = events.find((e: { type: string }) => e.type === 'RiskReclassified');

    expect(triageEvent).toBeDefined();
    expect(riskEvent).toBeDefined();
    expect(reclassifyEvent).toBeDefined();

    // RLS: Consulta sem sessão direto na view `app.patient_timeline` retorna 0 linhas
    const client = await pool.connect();
    try {
      await client.query('begin');
      await client.query(`select set_config('vitaloop.user_id', '', true), set_config('vitaloop.roles', '', true)`);
      const unauth = await client.query('select count(*)::int as n from app.patient_timeline where patient_id = $1', [
        testPatientId,
      ]);
      expect(unauth.rows[0].n).toBe(0);
      await client.query('rollback');
    } finally {
      client.release();
    }
  });

  it('limpeza de dados de teste', async () => {
    const client = await pool.connect();
    try {
      for (const encId of createdEncounterIds) {
        try { await client.query('delete from app.triages where encounter_id = $1', [encId]); } catch { /* ignore */ }
        try { await client.query('delete from app.encounters where id = $1', [encId]); } catch { /* ignore */ }
      }
      for (const patId of createdPatientIds) {
        try { await client.query('delete from app.patients where id = $1', [patId]); } catch { /* ignore */ }
      }
    } finally {
      client.release();
    }
  });
});
