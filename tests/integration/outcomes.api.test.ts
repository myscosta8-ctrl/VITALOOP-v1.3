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
import { registerPrescriptionRoutes } from '../../apps/api/src/routes/prescriptions.js';
import { registerExamRoutes } from '../../apps/api/src/routes/exams.js';
import { registerOutcomeRoutes } from '../../apps/api/src/routes/outcomes.js';
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
    const err = error as { httpStatus?: number; category?: string; code?: string; message?: string; toJSON?: () => unknown };
    if (error instanceof AppError || (err && typeof err.httpStatus === 'number')) {
      const httpStatus = err.httpStatus || 400;
      const json = typeof err.toJSON === 'function'
        ? err.toJSON()
        : { category: err.category || 'VALIDATION', code: err.code || 'VALIDATION_ERROR', message: err.message };
      reply.code(httpStatus).send(failure(json, req.id));
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
  registerPrescriptionRoutes(app, poolDb);
  registerExamRoutes(app, poolDb);
  registerOutcomeRoutes(app, poolDb);

  return app;
};

run('API de Desfechos Assistenciais e Sumário de Alta — integração real (vitaloop_app, RLS efetiva)', { timeout: 240000 }, () => {
  let app: FastifyInstance;
  let testPatientId: string;
  let testEncounterId: string;
  let noDiagEncounterId: string;

  const createdPatientIds: string[] = [];
  const createdEncounterIds: string[] = [];

  it('setup da aplicação Fastify para testes de desfecho e sumário de alta', async () => {
    app = buildTestApp(pool);
    expect(app).toBeDefined();
  });

  it('1. RLS — SELECT direto nas tabelas de desfecho sem contexto de sessão retorna 0 linhas', async () => {
    const client = await pool.connect();
    try {
      await client.query('begin');
      await client.query(`select set_config('vitaloop.user_id', '', true), set_config('vitaloop.roles', '', true)`);
      const r1 = await client.query('select count(*)::int as n from app.encounter_outcomes');
      const r2 = await client.query('select count(*)::int as n from app.encounter_summaries');
      expect(r1.rows[0].n).toBe(0);
      expect(r2.rows[0].n).toBe(0);
      await client.query('rollback');
    } finally {
      client.release();
    }
  });

  it('2. criação autorizada de paciente e atendimentos de teste', async () => {
    const createPat = await app.inject({
      method: 'POST',
      url: '/api/v1/patients',
      headers: { 'x-test-identity': 'full' },
      payload: { fullName: 'Paciente Desfecho e Alta Teste' },
    });
    expect(createPat.statusCode).toBe(201);
    testPatientId = JSON.parse(createPat.body).data.id;
    createdPatientIds.push(testPatientId);

    // Atendimento 1 (Completo, com CID-10 principal)
    const createEnc1 = await app.inject({
      method: 'POST',
      url: '/api/v1/encounters',
      headers: { 'x-test-identity': 'full' },
      payload: {
        patientId: testPatientId,
        encounterType: 'urgency',
        origin: 'spontaneous',
        chiefComplaint: 'Tosse intensa e febre alta',
      },
    });
    expect(createEnc1.statusCode).toBe(201);
    testEncounterId = JSON.parse(createEnc1.body).data.id;
    createdEncounterIds.push(testEncounterId);

    await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${testEncounterId}/triage`,
      headers: { 'x-test-identity': 'full' },
      payload: { chiefComplaint: 'Tosse intensa', riskColor: 'yellow' },
    });

    await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${testEncounterId}/consultation`,
      headers: { 'x-test-identity': 'full' },
      payload: {
        chiefComplaint: 'Tosse intensa e febre alta',
        historyPresentIllness: 'Paciente relata febre e tosse há 3 dias',
        generalExam: 'BEG',
        diagnosticHypothesis: 'Pneumonia bacteriana',
      },
    });

    // Adiciona Diagnóstico CID-10 Principal (J18.9)
    await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${testEncounterId}/diagnoses`,
      headers: { 'x-test-identity': 'full' },
      payload: { cidCode: 'J18.9', diagnosisType: 'principal' },
    });

    // Atendimento 2 (Sem diagnóstico principal para teste de bloqueio - usa segundo paciente)
    const createPat2 = await app.inject({
      method: 'POST',
      url: '/api/v1/patients',
      headers: { 'x-test-identity': 'full' },
      payload: { fullName: 'Paciente 2 Sem Diagnóstico Teste' },
    });
    expect(createPat2.statusCode).toBe(201);
    const testPatient2Id = JSON.parse(createPat2.body).data.id;
    createdPatientIds.push(testPatient2Id);

    const createEnc2 = await app.inject({
      method: 'POST',
      url: '/api/v1/encounters',
      headers: { 'x-test-identity': 'full' },
      payload: {
        patientId: testPatient2Id,
        encounterType: 'urgency',
        origin: 'spontaneous',
        chiefComplaint: 'Dor de cabeça leve',
      },
    });
    expect(createEnc2.statusCode).toBe(201);
    noDiagEncounterId = JSON.parse(createEnc2.body).data.id;
    createdEncounterIds.push(noDiagEncounterId);

    const createTri2 = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${noDiagEncounterId}/triage`,
      headers: { 'x-test-identity': 'full' },
      payload: { chiefComplaint: 'Dor de cabeça leve', riskColor: 'green' },
    });
    expect(createTri2.statusCode).toBe(201);

    const createCons2 = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${noDiagEncounterId}/consultation`,
      headers: { 'x-test-identity': 'full' },
      payload: {
        chiefComplaint: 'Dor de cabeça leve',
        historyPresentIllness: 'Paciente com cefaleia tensionada',
        generalExam: 'BEG',
        diagnosticHypothesis: 'Cefaleia tensionada',
      },
    });
    expect(createCons2.statusCode).toBe(201);
  });

  it('3. registro de desfecho sem autenticação -> 401 AUTH_REQUIRED', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${testEncounterId}/outcome`,
      headers: { 'x-test-identity': 'null' },
      payload: { outcomeType: 'medical_discharge' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('4. registro de desfecho sem permissão (outcome.write) -> 403 ACCESS_DENIED', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${testEncounterId}/outcome`,
      headers: { 'x-test-identity': 'noperm' },
      payload: { outcomeType: 'medical_discharge' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('5. alta médica em atendimento SEM diagnóstico principal ativo -> BLOQUEIO 400 DISCHARGE_REQUIRES_PRIMARY_DIAGNOSIS', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${noDiagEncounterId}/outcome`,
      headers: { 'x-test-identity': 'full' },
      payload: { outcomeType: 'medical_discharge' },
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error.code).toBe('DISCHARGE_REQUIRES_PRIMARY_DIAGNOSIS');
  });

  it('6. transferência externa SEM unidade de destino -> BLOQUEIO 400 TRANSFER_DESTINATION_REQUIRED', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${testEncounterId}/outcome`,
      headers: { 'x-test-identity': 'full' },
      payload: { outcomeType: 'transfer', destinationUnit: '  ' },
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error.code).toBe('TRANSFER_DESTINATION_REQUIRED');
  });

  it('7. alta a pedido SEM justificativa (min 10 chars) -> BLOQUEIO 400 DISCHARGE_AGAINST_ADVICE_NOTES_REQUIRED', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${testEncounterId}/outcome`,
      headers: { 'x-test-identity': 'full' },
      payload: { outcomeType: 'discharge_against_medical_advice', notes: 'Curto' },
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error.code).toBe('DISCHARGE_AGAINST_ADVICE_NOTES_REQUIRED');
  });

  it('8. concessão autorizada de Alta Médica com Orientações -> 201 Created', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${testEncounterId}/outcome`,
      headers: { 'x-test-identity': 'full' },
      payload: {
        outcomeType: 'medical_discharge',
        notes: 'Paciente em excelente estado geral após medicação sintomática',
        dischargeInstructions: 'Manter uso do antibiótico prescrito por 7 dias. Retornar em caso de febre alta persistente.',
      },
    });

    expect(res.statusCode).toBe(201);
    const data = JSON.parse(res.body).data;
    expect(data.outcome.outcomeType).toBe('medical_discharge');
    expect(data.summary.primaryDiagnosisCode).toBe('J18.9');
    expect(data.summary.dischargeInstructions).toContain('7 dias');
  });

  it('9. tentativa de registrar SEGUNDO desfecho em atendimento já encerrado -> BLOQUEIO 409 ENCOUNTER_ALREADY_CLOSED', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${testEncounterId}/outcome`,
      headers: { 'x-test-identity': 'full' },
      payload: { outcomeType: 'medical_discharge' },
    });
    expect(res.statusCode).toBe(409);
    expect(JSON.parse(res.body).error.code).toBe('ENCOUNTER_ALREADY_CLOSED');
  });

  it('10. consulta do Sumário de Alta gerado -> 200 OK', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/encounters/${testEncounterId}/summary`,
      headers: { 'x-test-identity': 'full' },
    });

    expect(res.statusCode).toBe(200);
    const summary = JSON.parse(res.body).data;
    expect(summary.primaryDiagnosisCode).toBe('J18.9');
    expect(summary.chiefComplaint).toBe('Tosse intensa e febre alta');
  });

  it('11. eventos OutcomeRecorded, EncounterClosed e SummaryGenerated surgem na app.patient_timeline', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/patients/${testPatientId}/timeline`,
      headers: { 'x-test-identity': 'full' },
    });

    expect(res.statusCode).toBe(200);
    const events = JSON.parse(res.body).data;

    const outEv = events.find((e: { type: string }) => e.type === 'OutcomeRecorded');
    const closeEv = events.find((e: { type: string }) => e.type === 'EncounterClosed');
    const sumEv = events.find((e: { type: string }) => e.type === 'SummaryGenerated');

    expect(outEv).toBeDefined();
    expect(closeEv).toBeDefined();
    expect(sumEv).toBeDefined();
  });

  it('limpeza de dados de teste de desfechos e altas', async () => {
    const client = await pool.connect();
    try {
      for (const encId of createdEncounterIds) {
        try { await client.query('delete from app.encounter_summaries where encounter_id = $1', [encId]); } catch { /* ignore */ }
        try { await client.query('delete from app.encounter_outcomes where encounter_id = $1', [encId]); } catch { /* ignore */ }
        try { await client.query('delete from app.interconsultations where encounter_id = $1', [encId]); } catch { /* ignore */ }
        try { await client.query('delete from app.procedure_requests where encounter_id = $1', [encId]); } catch { /* ignore */ }
        try { await client.query('delete from app.exam_requests where encounter_id = $1', [encId]); } catch { /* ignore */ }
        try { await client.query('delete from app.allergy_alerts where prescription_id in (select id from app.prescriptions where encounter_id = $1)', [encId]); } catch { /* ignore */ }
        try { await client.query('delete from app.prescription_items where prescription_id in (select id from app.prescriptions where encounter_id = $1)', [encId]); } catch { /* ignore */ }
        try { await client.query('delete from app.prescriptions where encounter_id = $1', [encId]); } catch { /* ignore */ }
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
