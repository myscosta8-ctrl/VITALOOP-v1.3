import { describe, expect, it } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import pg from 'pg';
import { AppError, ErrorCategory, newUuid } from '@vitaloop/shared';
import { failure } from '../../apps/api/src/http/envelope.js';
import { registerPatientRoutes } from '../../apps/api/src/routes/patients.js';
import { registerEncounterRoutes } from '../../apps/api/src/routes/encounters.js';
import { registerTriageRoutes } from '../../apps/api/src/routes/triages.js';
import { registerMedicalRoutes } from '../../apps/api/src/routes/medical.js';
import { registerDiagnosisRoutes } from '../../apps/api/src/routes/diagnoses.js';
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
      failure({ category: ErrorCategory.INTERNAL, code: 'INTERNAL_ERROR', message: (error as Error)?.message || 'Erro interno.' }, req.id),
    );
  });

  registerPatientRoutes(app, poolDb);
  registerEncounterRoutes(app, poolDb);
  registerTriageRoutes(app, poolDb);
  registerMedicalRoutes(app, poolDb);
  registerDiagnosisRoutes(app, poolDb);

  return app;
};

run('API de Diagnósticos Clínicos e CID-10 — integração real (vitaloop_app, RLS efetiva)', { timeout: 90000 }, () => {
  let app: FastifyInstance;
  let testPatientId: string;
  let testEncounterId: string;
  let _createdPrincipalDiagId: string;
  let createdSecondaryDiagId: string;

  const createdPatientIds: string[] = [];
  const createdEncounterIds: string[] = [];

  it('setup da aplicação Fastify para testes de diagnósticos', async () => {
    app = buildTestApp(pool);
    expect(app).toBeDefined();
  });

  it('1. RLS — SELECT direto na tabela app.encounter_diagnoses sem contexto de sessão retorna 0 linhas', async () => {
    const client = await pool.connect();
    try {
      await client.query('begin');
      await client.query(`select set_config('vitaloop.user_id', '', true), set_config('vitaloop.roles', '', true)`);
      const res = await client.query('select count(*)::int as n from app.encounter_diagnoses');
      expect(res.rows[0].n).toBe(0);
      await client.query('rollback');
    } finally {
      client.release();
    }
  });

  it('2. criação autorizada de paciente, atendimento, triagem e consulta médica para teste de diagnósticos', async () => {
    const createPat = await app.inject({
      method: 'POST',
      url: '/api/v1/patients',
      headers: { 'x-test-identity': 'full' },
      payload: { fullName: 'Paciente Teste Diagnósticos CID' },
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
        chiefComplaint: 'Tosse e febre',
      },
    });
    expect(createEnc.statusCode).toBe(201);
    testEncounterId = JSON.parse(createEnc.body).data.id;
    createdEncounterIds.push(testEncounterId);

    await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${testEncounterId}/triage`,
      headers: { 'x-test-identity': 'full' },
      payload: { chiefComplaint: 'Tosse e febre', riskColor: 'yellow' },
    });

    const consRes = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${testEncounterId}/consultation`,
      headers: { 'x-test-identity': 'full' },
      payload: {
        chiefComplaint: 'Tosse com expectoração e febre há 3 dias',
        historyPresentIllness: 'Paciente relata início de tosse produtiva e febre de 38.5C há 3 dias',
        generalExam: 'BEG, febril ao toque, corado',
        diagnosticHypothesis: 'Pneumonia adquirida na comunidade',
      },
    });
    expect(consRes.statusCode).toBe(201);
  });

  it('3. busca de código no catálogo CID-10 -> 200 OK', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/cid/search?q=J18',
      headers: { 'x-test-identity': 'full' },
    });

    expect(res.statusCode).toBe(200);
    const items = JSON.parse(res.body).data;
    expect(items.length).toBeGreaterThan(0);
    expect(items[0].code).toBe('J18.9');
    expect(items[0].description).toContain('Pneumonia');
  });

  it('4. registro de diagnóstico sem autenticação -> 401 AUTH_REQUIRED', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${testEncounterId}/diagnoses`,
      headers: { 'x-test-identity': 'null' },
      payload: { cidCode: 'J18.9', diagnosisType: 'principal' },
    });

    expect(res.statusCode).toBe(401);
  });

  it('5. registro de diagnóstico sem permissão (diagnosis.write) -> 403 ACCESS_DENIED', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${testEncounterId}/diagnoses`,
      headers: { 'x-test-identity': 'noperm' },
      payload: { cidCode: 'J18.9', diagnosisType: 'principal' },
    });

    expect(res.statusCode).toBe(403);
  });

  it('6. registro autorização de Diagnóstico Principal (J18.9) -> 201 Created', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${testEncounterId}/diagnoses`,
      headers: { 'x-test-identity': 'full' },
      payload: {
        cidCode: 'J18.9',
        diagnosisType: 'principal',
        notes: 'Confirmado por estertores creptantes em base direita',
      },
    });

    expect(res.statusCode).toBe(201);
    const diag = JSON.parse(res.body).data;
    _createdPrincipalDiagId = diag.id;
    expect(diag.cidCode).toBe('J18.9');
    expect(diag.diagnosisType).toBe('principal');
    expect(diag.status).toBe('active');
  });

  it('7. tentativa de registrar segundo Diagnóstico Principal ativo no mesmo atendimento -> 409 PRINCIPAL_DIAGNOSIS_ALREADY_EXISTS', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${testEncounterId}/diagnoses`,
      headers: { 'x-test-identity': 'full' },
      payload: { cidCode: 'I10', diagnosisType: 'principal' },
    });

    expect(res.statusCode).toBe(409);
    expect(JSON.parse(res.body).error.code).toBe('PRINCIPAL_DIAGNOSIS_ALREADY_EXISTS');
  });

  it('8. registro de Diagnóstico Secundário (I10) -> 201 Created', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${testEncounterId}/diagnoses`,
      headers: { 'x-test-identity': 'full' },
      payload: {
        cidCode: 'I10',
        diagnosisType: 'secondary',
        notes: 'Comorbidade em uso de losartana',
      },
    });

    expect(res.statusCode).toBe(201);
    const diag = JSON.parse(res.body).data;
    createdSecondaryDiagId = diag.id;
    expect(diag.cidCode).toBe('I10');
    expect(diag.diagnosisType).toBe('secondary');
  });

  it('9. tentativa de registrar o mesmo CID (J18.9) duplamente ativo no atendimento -> 409 CID_ALREADY_ADDED', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${testEncounterId}/diagnoses`,
      headers: { 'x-test-identity': 'full' },
      payload: { cidCode: 'J18.9', diagnosisType: 'secondary' },
    });

    expect(res.statusCode).toBe(409);
    expect(JSON.parse(res.body).error.code).toBe('CID_ALREADY_ADDED');
  });

  it('10. listagem de diagnósticos do atendimento -> 200 OK com diagnóstico principal em primeiro lugar', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/encounters/${testEncounterId}/diagnoses`,
      headers: { 'x-test-identity': 'full' },
    });

    expect(res.statusCode).toBe(200);
    const items = JSON.parse(res.body).data;
    expect(items.length).toBe(2);
    expect(items[0].diagnosisType).toBe('principal');
    expect(items[0].cidCode).toBe('J18.9');
    expect(items[1].diagnosisType).toBe('secondary');
    expect(items[1].cidCode).toBe('I10');
  });

  it('11. refutação de diagnóstico secundário com justificativa médica -> 200 OK', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/encounters/${testEncounterId}/diagnoses/${createdSecondaryDiagId}/status`,
      headers: { 'x-test-identity': 'full' },
      payload: {
        status: 'refuted',
        notes: 'Paciente relata que não possui diagnóstico prévio de HAS',
      },
    });

    expect(res.statusCode).toBe(200);
    const diag = JSON.parse(res.body).data;
    expect(diag.status).toBe('refuted');
    expect(diag.notes).toContain('não possui diagnóstico prévio');
  });

  it('12. eventos PatientDiagnosisRecorded e PatientDiagnosisUpdated surgem na app.patient_timeline', async () => {
    const timelineRes = await app.inject({
      method: 'GET',
      url: `/api/v1/patients/${testPatientId}/timeline`,
      headers: { 'x-test-identity': 'full' },
    });
    expect(timelineRes.statusCode).toBe(200);
    const events = JSON.parse(timelineRes.body).data;

    const recEvent = events.find((e: { type: string }) => e.type === 'PatientDiagnosisRecorded');
    const updEvent = events.find((e: { type: string }) => e.type === 'PatientDiagnosisUpdated');

    expect(recEvent).toBeDefined();
    expect(updEvent).toBeDefined();
  });

  it('limpeza de dados de teste de diagnósticos', async () => {
    const client = await pool.connect();
    try {
      for (const encId of createdEncounterIds) {
        try { await client.query('delete from app.encounter_diagnoses where encounter_id = $1', [encId]); } catch { /* ignore */ }
        try { await client.query('delete from app.medical_evolutions where encounter_id = $1', [encId]); } catch { /* ignore */ }
        try { await client.query('delete from app.medical_consultations where encounter_id = $1', [encId]); } catch { /* ignore */ }
        try { await client.query('delete from app.queue_tickets where encounter_id = $1', [encId]); } catch { /* ignore */ }
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
