import { describe, expect, it } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import pg from 'pg';
import { AppError, ErrorCategory, newUuid } from '@vitaloop/shared';
import { failure } from '../../apps/api/src/http/envelope.js';
import { registerPatientRoutes } from '../../apps/api/src/routes/patients.js';
import { registerEncounterRoutes } from '../../apps/api/src/routes/encounters.js';
import { registerTriageRoutes } from '../../apps/api/src/routes/triages.js';
import { registerMedicalRoutes } from '../../apps/api/src/routes/medical.js';
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
    console.error('SERVER ERROR IN TEST:', error);
    reply.code(500).send(
      failure({ category: ErrorCategory.INTERNAL, code: 'INTERNAL_ERROR', message: (error as Error)?.message || 'Erro interno.' }, req.id),
    );
  });

  registerPatientRoutes(app, poolDb);
  registerEncounterRoutes(app, poolDb);
  registerTriageRoutes(app, poolDb);
  registerMedicalRoutes(app, poolDb);

  return app;
};

run('API de Consulta Médica — integração real (vitaloop_app, RLS efetiva)', { timeout: 90000 }, () => {
  let app: FastifyInstance;
  let testPatientId: string;
  let testEncounterId: string;
  let createdConsultationId: string;

  const createdPatientIds: string[] = [];
  const createdEncounterIds: string[] = [];

  it('setup da aplicação Fastify para testes médicos', async () => {
    app = buildTestApp(pool);
    expect(app).toBeDefined();
  });

  it('1. RLS — SELECT direto na tabela app.medical_consultations sem contexto de sessão retorna 0 linhas', async () => {
    const client = await pool.connect();
    try {
      await client.query('begin');
      await client.query(`select set_config('vitaloop.user_id', '', true), set_config('vitaloop.roles', '', true)`);
      const res = await client.query('select count(*)::int as n from app.medical_consultations');
      expect(res.rows[0].n).toBe(0);
      await client.query('rollback');
    } finally {
      client.release();
    }
  });

  it('2. criação autorizada de paciente, atendimento e triagem (Amarelo) para teste médico', async () => {
    const createPat = await app.inject({
      method: 'POST',
      url: '/api/v1/patients',
      headers: { 'x-test-identity': 'full' },
      payload: { fullName: 'Paciente Teste Consulta Médica' },
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
        chiefComplaint: 'Dor de cabeça e febre',
      },
    });
    expect(createEnc.statusCode).toBe(201);
    testEncounterId = JSON.parse(createEnc.body).data.id;
    createdEncounterIds.push(testEncounterId);

    const createTri = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${testEncounterId}/triage`,
      headers: { 'x-test-identity': 'full' },
      payload: {
        chiefComplaint: 'Cefaleia e febre há 1 dia',
        riskColor: 'yellow',
      },
    });
    expect(createTri.statusCode).toBe(201);
  });

  it('3. registro de consulta médica sem autenticação -> 401 AUTH_REQUIRED', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${testEncounterId}/consultation`,
      headers: { 'x-test-identity': 'null' },
      payload: {
        chiefComplaint: 'Cefaleia intensa',
        historyPresentIllness: 'Paciente com cefaleia há 12 horas',
        generalExam: 'BEG',
        diagnosticHypothesis: 'Cefaleia a esclarecer',
      },
    });

    expect(res.statusCode).toBe(401);
  });

  it('4. registro de consulta médica sem permissão (medical.write) -> 403 ACCESS_DENIED', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${testEncounterId}/consultation`,
      headers: { 'x-test-identity': 'noperm' },
      payload: {
        chiefComplaint: 'Cefaleia intensa',
        historyPresentIllness: 'Paciente com cefaleia há 12 horas',
        generalExam: 'BEG',
        diagnosticHypothesis: 'Cefaleia a esclarecer',
      },
    });

    expect(res.statusCode).toBe(403);
  });

  it('5. registro de consulta médica autorizada -> 201 Created, transita atendimento para in_consultation', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${testEncounterId}/consultation`,
      headers: { 'x-test-identity': 'full' },
      payload: {
        chiefComplaint: 'Cefaleia holocraniana intensa',
        historyPresentIllness: 'Paciente refere cefaleia pulsátil com náuseas há 12 horas',
        pastMedicalHistory: 'Nega comorbidades prévias',
        generalExam: 'BEG, anictérico, acianótico, corado, hidratado',
        segmentalExam: {
          cardiovascular: 'RCR 2T BNF sem sopros',
          respiratory: 'MV+ sem ruídos adventícios',
          neurological: 'Consciente, orientado, sem déficits focais',
        },
        diagnosticHypothesis: 'Enxaqueca sem aura / Cefaleia tensional',
        initialConduct: 'Sintomáticos EV e observação por 2 horas',
      },
    });

    if (res.statusCode !== 201) {
      console.error('Test 5 FAILED body:', res.body);
    }
    expect(res.statusCode).toBe(201);
    const consultation = JSON.parse(res.body).data;
    createdConsultationId = consultation.id;

    expect(consultation.chiefComplaint).toBe('Cefaleia holocraniana intensa');
    expect(consultation.diagnosticHypothesis).toBe('Enxaqueca sem aura / Cefaleia tensional');
    expect(consultation.segmentalExam.cardiovascular).toBe('RCR 2T BNF sem sopros');

    // Confirma se o atendimento transitou para 'in_consultation'
    const encRes = await app.inject({
      method: 'GET',
      url: `/api/v1/encounters/${testEncounterId}`,
      headers: { 'x-test-identity': 'full' },
    });
    expect(encRes.statusCode).toBe(200);
    expect(JSON.parse(encRes.body).data.status).toBe('in_consultation');
  });

  it('6. tentativa de registrar segunda consulta no mesmo atendimento -> 409 CONSULTATION_ALREADY_EXISTS', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${testEncounterId}/consultation`,
      headers: { 'x-test-identity': 'full' },
      payload: {
        chiefComplaint: 'Outra queixa',
        historyPresentIllness: 'HMA',
        generalExam: 'BEG',
        diagnosticHypothesis: 'Outra hipótese',
      },
    });

    expect(res.statusCode).toBe(409);
    expect(JSON.parse(res.body).error.code).toBe('CONSULTATION_ALREADY_EXISTS');
  });

  it('7. obtenção da consulta médica registrada -> 200 OK', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/encounters/${testEncounterId}/consultation`,
      headers: { 'x-test-identity': 'full' },
    });

    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res.body).data;
    expect(data.id).toBe(createdConsultationId);
    expect(data.historyPresentIllness).toContain('cefaleia pulsátil');
  });

  it('8. registro de evolução médica sequencial -> 201 Created', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${testEncounterId}/consultation/evolutions`,
      headers: { 'x-test-identity': 'full' },
      payload: {
        evolutionText: 'Reavaliado após medicação analgésica. Relata remissão completa da dor de cabeça.',
        clinicalStatus: 'em_melhora',
      },
    });

    expect(res.statusCode).toBe(201);
    const evo = JSON.parse(res.body).data;
    expect(evo.consultationId).toBe(createdConsultationId);
    expect(evo.clinicalStatus).toBe('em_melhora');
  });

  it('9. eventos de consulta médica e evolução surgem na app.patient_timeline do paciente', async () => {
    const timelineRes = await app.inject({
      method: 'GET',
      url: `/api/v1/patients/${testPatientId}/timeline`,
      headers: { 'x-test-identity': 'full' },
    });
    expect(timelineRes.statusCode).toBe(200);
    const events = JSON.parse(timelineRes.body).data;

    const consEvent = events.find((e: { type: string }) => e.type === 'MedicalConsultationRecorded');
    const evoEvent = events.find((e: { type: string }) => e.type === 'MedicalEvolutionRecorded');

    expect(consEvent).toBeDefined();
    expect(evoEvent).toBeDefined();
  });

  it('limpeza de dados de teste de atendimento médico', async () => {
    const client = await pool.connect();
    try {
      for (const encId of createdEncounterIds) {
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
