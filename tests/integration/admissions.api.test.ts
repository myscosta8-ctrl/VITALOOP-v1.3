import { describe, expect, it } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import pg from 'pg';
import { AppError, ErrorCategory, newUuid } from '@vitaloop/shared';
import { failure } from '../../apps/api/src/http/envelope.js';
import { registerPatientRoutes } from '../../apps/api/src/routes/patients.js';
import { registerEncounterRoutes } from '../../apps/api/src/routes/encounters.js';
import { registerTriageRoutes } from '../../apps/api/src/routes/triages.js';
import { registerMedicalRoutes } from '../../apps/api/src/routes/medical.js';
import { registerBedRoutes } from '../../apps/api/src/routes/beds.js';
import { registerAdmissionRoutes } from '../../apps/api/src/routes/admissions.js';
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
  registerBedRoutes(app, poolDb);
  registerAdmissionRoutes(app, poolDb);

  return app;
};

run('API de Internação (ADM-001..008) — integração real (vitaloop_app, RLS + gatilho de leito efetivos)', { timeout: 240000 }, () => {
  let app: FastifyInstance;
  let testPatientId: string;
  let testEncounterId: string;
  let testSectorId: string;
  let testBedId: string;
  let testAdmissionId: string;

  const createdPatientIds: string[] = [];
  const createdEncounterIds: string[] = [];
  const createdSectorIds: string[] = [];

  it('setup da aplicação Fastify para testes de internação', async () => {
    app = buildTestApp(pool);
    expect(app).toBeDefined();
  });

  it('1. RLS — SELECT direto em app.admissions sem contexto de sessão retorna 0 linhas', async () => {
    const client = await pool.connect();
    try {
      await client.query('begin');
      await client.query(`select set_config('vitaloop.user_id', '', true), set_config('vitaloop.roles', '', true)`);
      const r = await client.query('select count(*)::int as n from app.admissions');
      expect(r.rows[0].n).toBe(0);
      await client.query('rollback');
    } finally {
      client.release();
    }
  });

  it('2. criação de paciente, atendimento, triagem e consulta (encounter chega em in_consultation)', async () => {
    const createPat = await app.inject({
      method: 'POST',
      url: '/api/v1/patients',
      headers: { 'x-test-identity': 'full' },
      payload: { fullName: 'Paciente Internação Teste' },
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
        chiefComplaint: 'Dispneia e febre há 3 dias',
      },
    });
    expect(createEnc.statusCode).toBe(201);
    testEncounterId = JSON.parse(createEnc.body).data.id;
    createdEncounterIds.push(testEncounterId);

    const triage = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${testEncounterId}/triage`,
      headers: { 'x-test-identity': 'full' },
      payload: { chiefComplaint: 'Dispneia e febre', riskColor: 'orange' },
    });
    expect(triage.statusCode).toBe(201);

    const consultation = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${testEncounterId}/consultation`,
      headers: { 'x-test-identity': 'full' },
      payload: {
        chiefComplaint: 'Dispneia e febre há 3 dias',
        historyPresentIllness: 'Paciente com piora progressiva da dispneia',
        generalExam: 'REG, taquipneico',
        diagnosticHypothesis: 'Pneumonia bacteriana grave',
      },
    });
    expect(consultation.statusCode).toBe(201);

    const enc = await app.inject({
      method: 'GET',
      url: `/api/v1/encounters/${testEncounterId}`,
      headers: { 'x-test-identity': 'full' },
    });
    expect(JSON.parse(enc.body).data.status).toBe('in_consultation');
  });

  it('3. POST /admission sem autenticação -> 401 AUTH_REQUIRED', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${testEncounterId}/admission`,
      headers: { 'x-test-identity': 'null' },
      payload: { admissionDiagnosisDescription: 'Pneumonia', admissionJustification: 'Necessita internação para tratamento.' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('4. POST /admission sem permissão (admission.write) -> 403 ACCESS_DENIED', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${testEncounterId}/admission`,
      headers: { 'x-test-identity': 'noperm' },
      payload: { admissionDiagnosisDescription: 'Pneumonia', admissionJustification: 'Necessita internação para tratamento.' },
    });
    expect(res.statusCode).toBe(403);
  });

  // Prova de ponta a ponta do gatilho `encounters_guard_admission`
  // (migration 0082): internar sem leito ativo alocado tem que ser
  // rejeitado pelo BANCO, não só pela camada de aplicação.
  it('5. POST /admission SEM leito ativo alocado -> BLOQUEIO 409 ADMISSION_GUARD_REJECTED (gatilho do banco)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${testEncounterId}/admission`,
      headers: { 'x-test-identity': 'full' },
      payload: {
        admissionDiagnosisDescription: 'Pneumonia bacteriana grave',
        admissionJustification: 'Necessita antibioticoterapia venosa e monitorização contínua.',
      },
    });
    expect(res.statusCode).toBe(409);
    expect(JSON.parse(res.body).error.code).toBe('ADMISSION_GUARD_REJECTED');
  });

  it('6. criação de setor/leito e alocação do leito ao atendimento', async () => {
    const code = `INT_${Math.floor(1000 + Math.random() * 9000)}`;
    const createSec = await app.inject({
      method: 'POST',
      url: '/api/v1/bed-sectors',
      headers: { 'x-test-identity': 'full' },
      payload: { name: 'Internação Teste', code, capacity: 2 },
    });
    expect(createSec.statusCode).toBe(201);
    testSectorId = JSON.parse(createSec.body).data.id;
    createdSectorIds.push(testSectorId);

    const listBeds = await app.inject({
      method: 'GET',
      url: '/api/v1/beds',
      headers: { 'x-test-identity': 'full' },
    });
    expect(listBeds.statusCode).toBe(200);
    const beds = JSON.parse(listBeds.body).data as Array<{ id: string; sectorId: string; bedNumber: string }>;
    const bed = beds.find((b) => b.sectorId === testSectorId);
    expect(bed).toBeDefined();
    testBedId = bed!.id;

    const allocate = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${testEncounterId}/beds/allocate`,
      headers: { 'x-test-identity': 'full' },
      payload: { bedId: testBedId, patientId: testPatientId },
    });
    expect(allocate.statusCode).toBe(201);
  });

  it('7. diagnóstico de admissão curto demais (< 3 caracteres) -> 400 ADMISSION_DIAGNOSIS_REQUIRED', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${testEncounterId}/admission`,
      headers: { 'x-test-identity': 'full' },
      payload: { admissionDiagnosisDescription: 'AB', admissionJustification: 'Justificativa clínica válida com detalhes.' },
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error.code).toBe('ADMISSION_DIAGNOSIS_REQUIRED');
  });

  it('8. internação autorizada COM leito ativo -> 201 Created, e o atendimento vira "admitted"', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${testEncounterId}/admission`,
      headers: { 'x-test-identity': 'full' },
      payload: {
        admissionDiagnosisCode: 'J18.9',
        admissionDiagnosisDescription: 'Pneumonia bacteriana grave',
        admissionJustification: 'Necessita antibioticoterapia venosa e monitorização contínua.',
      },
    });
    expect(res.statusCode).toBe(201);
    const admission = JSON.parse(res.body).data;
    expect(admission.status).toBe('active');
    expect(admission.admissionDiagnosisCode).toBe('J18.9');
    testAdmissionId = admission.id;

    const enc = await app.inject({
      method: 'GET',
      url: `/api/v1/encounters/${testEncounterId}`,
      headers: { 'x-test-identity': 'full' },
    });
    expect(JSON.parse(enc.body).data.status).toBe('admitted');
  });

  it('9. tentativa de SEGUNDA internação com uma já ativa -> BLOQUEIO 409 ACTIVE_ADMISSION_EXISTS', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${testEncounterId}/admission`,
      headers: { 'x-test-identity': 'full' },
      payload: {
        admissionDiagnosisDescription: 'Outro diagnóstico qualquer',
        admissionJustification: 'Outra justificativa clínica válida aqui.',
      },
    });
    expect(res.statusCode).toBe(409);
    expect(JSON.parse(res.body).error.code).toBe('ACTIVE_ADMISSION_EXISTS');
  });

  it('10. GET /admission retorna a internação ativa', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/encounters/${testEncounterId}/admission`,
      headers: { 'x-test-identity': 'full' },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data.id).toBe(testAdmissionId);
  });

  it('11. PATCH /admission sem nenhum campo -> 400 ADMISSION_UPDATE_EMPTY', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/encounters/${testEncounterId}/admission`,
      headers: { 'x-test-identity': 'full' },
      payload: {},
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error.code).toBe('ADMISSION_UPDATE_EMPTY');
  });

  it('12. PATCH /admission (evolução) com nova justificativa -> 200 OK', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/encounters/${testEncounterId}/admission`,
      headers: { 'x-test-identity': 'full' },
      payload: { admissionJustification: 'Paciente evoluindo com melhora progressiva do quadro respiratório.' },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data.admissionJustification).toContain('melhora progressiva');
  });

  it('13. POST /admission/discharge com status "deceased" e SEM causa -> 400 ADMISSION_DEATH_REASON_REQUIRED', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${testEncounterId}/admission/discharge`,
      headers: { 'x-test-identity': 'full' },
      payload: { status: 'deceased' },
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error.code).toBe('ADMISSION_DEATH_REASON_REQUIRED');
  });

  it('14. POST /admission/discharge com status "discharged" -> 200 OK, admissão encerrada', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${testEncounterId}/admission/discharge`,
      headers: { 'x-test-identity': 'full' },
      payload: { status: 'discharged', endReason: 'Melhora clínica completa, alta hospitalar autorizada.' },
    });
    expect(res.statusCode).toBe(200);
    const discharged = JSON.parse(res.body).data;
    expect(discharged.status).toBe('discharged');
    expect(discharged.endedAt).toBeDefined();

    // Confirma que o atendimento AINDA não pode ser concluído sem passar
    // pelo fluxo de desfecho (aba "Desfecho") — a internação foi encerrada,
    // mas o encounter continua em 'admitted' até o desfecho ser registrado.
    const enc = await app.inject({
      method: 'GET',
      url: `/api/v1/encounters/${testEncounterId}`,
      headers: { 'x-test-identity': 'full' },
    });
    expect(JSON.parse(enc.body).data.status).toBe('admitted');
  });

  it('15. PATCH /admission depois de encerrada -> 404 ACTIVE_ADMISSION_NOT_FOUND (não há mais internação ativa)', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/encounters/${testEncounterId}/admission`,
      headers: { 'x-test-identity': 'full' },
      payload: { admissionJustification: 'Tentativa de evoluir internação já encerrada.' },
    });
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body).error.code).toBe('ACTIVE_ADMISSION_NOT_FOUND');
  });

  it('limpeza de dados de teste de internação', async () => {
    const client = await pool.connect();
    try {
      for (const encId of createdEncounterIds) {
        try { await client.query('delete from app.admissions where encounter_id = $1', [encId]); } catch { /* ignore */ }
        try { await client.query('delete from app.bed_allocations where encounter_id = $1', [encId]); } catch { /* ignore */ }
        try { await client.query('delete from app.medical_evolutions where encounter_id = $1', [encId]); } catch { /* ignore */ }
        try { await client.query('delete from app.medical_consultations where encounter_id = $1', [encId]); } catch { /* ignore */ }
        try { await client.query('delete from app.queue_tickets where encounter_id = $1', [encId]); } catch { /* ignore */ }
        try { await client.query('delete from app.triages where encounter_id = $1', [encId]); } catch { /* ignore */ }
        try { await client.query('delete from app.encounters where id = $1', [encId]); } catch { /* ignore */ }
      }
      for (const secId of createdSectorIds) {
        try { await client.query('delete from app.beds where sector_id = $1', [secId]); } catch { /* ignore */ }
        try { await client.query('delete from app.bed_sectors where id = $1', [secId]); } catch { /* ignore */ }
      }
      for (const patId of createdPatientIds) {
        try { await client.query('delete from app.patients where id = $1', [patId]); } catch { /* ignore */ }
      }
    } finally {
      client.release();
    }
  });
});
