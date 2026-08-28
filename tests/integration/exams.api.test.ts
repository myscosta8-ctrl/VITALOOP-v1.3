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
  registerPrescriptionRoutes(app, poolDb);
  registerExamRoutes(app, poolDb);

  return app;
};

run('API de Exames, Procedimentos e Interconsultas — integração real (vitaloop_app, RLS efetiva)', { timeout: 90000 }, () => {
  let app: FastifyInstance;
  let testPatientId: string;
  let testEncounterId: string;
  let createdExamRequestId: string;
  let createdProcedureRequestId: string;
  let createdInterconsultationId: string;

  const createdPatientIds: string[] = [];
  const createdEncounterIds: string[] = [];

  it('setup da aplicação Fastify para testes de exames e procedimentos', async () => {
    app = buildTestApp(pool);
    expect(app).toBeDefined();
  });

  it('1. RLS — SELECT direto nas tabelas de exames sem contexto de sessão retorna 0 linhas', async () => {
    const client = await pool.connect();
    try {
      await client.query('begin');
      await client.query(`select set_config('vitaloop.user_id', '', true), set_config('vitaloop.roles', '', true)`);
      const r1 = await client.query('select count(*)::int as n from app.exam_requests');
      const r2 = await client.query('select count(*)::int as n from app.procedure_requests');
      const r3 = await client.query('select count(*)::int as n from app.interconsultations');
      expect(r1.rows[0].n).toBe(0);
      expect(r2.rows[0].n).toBe(0);
      expect(r3.rows[0].n).toBe(0);
      await client.query('rollback');
    } finally {
      client.release();
    }
  });

  it('2. criação autorizada de paciente, atendimento, triagem e consulta médica para teste', async () => {
    const createPat = await app.inject({
      method: 'POST',
      url: '/api/v1/patients',
      headers: { 'x-test-identity': 'full' },
      payload: { fullName: 'Paciente Exames e Procedimentos Teste' },
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
        chiefComplaint: 'Dor torácica e tosse',
      },
    });
    expect(createEnc.statusCode).toBe(201);
    testEncounterId = JSON.parse(createEnc.body).data.id;
    createdEncounterIds.push(testEncounterId);

    await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${testEncounterId}/triage`,
      headers: { 'x-test-identity': 'full' },
      payload: { chiefComplaint: 'Dor torácica', riskColor: 'yellow' },
    });

    const consRes = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${testEncounterId}/consultation`,
      headers: { 'x-test-identity': 'full' },
      payload: {
        chiefComplaint: 'Dor torácica e tosse',
        historyPresentIllness: 'Paciente relata dor torácica atípica há 2 dias',
        generalExam: 'BEG',
        diagnosticHypothesis: 'Síndrome coronariana aguda a esclarecer',
      },
    });
    expect(consRes.statusCode).toBe(201);
  });

  it('3. busca de exames e procedimentos no catálogo -> 200 OK', async () => {
    const exaRes = await app.inject({
      method: 'GET',
      url: '/api/v1/exams/catalog?q=Hemograma',
      headers: { 'x-test-identity': 'full' },
    });
    expect(exaRes.statusCode).toBe(200);
    expect(JSON.parse(exaRes.body).data.length).toBeGreaterThan(0);

    const procRes = await app.inject({
      method: 'GET',
      url: '/api/v1/procedures/catalog?q=Sutura',
      headers: { 'x-test-identity': 'full' },
    });
    expect(procRes.statusCode).toBe(200);
    expect(JSON.parse(procRes.body).data.length).toBeGreaterThan(0);
  });

  it('4. solicitação de exame sem autenticação -> 401 AUTH_REQUIRED', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${testEncounterId}/exams`,
      headers: { 'x-test-identity': 'null' },
      payload: { examName: 'Hemograma Completo', clinicalIndication: 'Investigação de infecção' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('5. solicitação de exame sem permissão (exam.write) -> 403 ACCESS_DENIED', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${testEncounterId}/exams`,
      headers: { 'x-test-identity': 'noperm' },
      payload: { examName: 'Hemograma Completo', clinicalIndication: 'Investigação de infecção' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('6. solicitação autorizada de exame (Raio-X de Tórax) -> 201 Created', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${testEncounterId}/exams`,
      headers: { 'x-test-identity': 'full' },
      payload: {
        examName: 'Raio-X de Tórax (AP/Perfil)',
        examType: 'imaging',
        clinicalIndication: 'Ausculta pulmonar alterada, investigar pneumonia',
      },
    });

    expect(res.statusCode).toBe(201);
    const exam = JSON.parse(res.body).data;
    createdExamRequestId = exam.id;
    expect(exam.status).toBe('requested');
    expect(exam.clinicalIndication).toContain('pneumonia');
  });

  it('7. lançamento de resultado/laudo do exame -> 200 OK (status = completed)', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/encounters/${testEncounterId}/exams/${createdExamRequestId}/result`,
      headers: { 'x-test-identity': 'full' },
      payload: {
        resultSummary: 'Opacidade em terço inferior do pulmão direito. Compatível com pneumonia bacteriana.',
      },
    });

    expect(res.statusCode).toBe(200);
    const exam = JSON.parse(res.body).data;
    expect(exam.status).toBe('completed');
    expect(exam.resultSummary).toContain('pneumonia bacteriana');
  });

  it('8. solicitação de procedimento ambulatorial (Nebulização) -> 201 Created', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${testEncounterId}/procedures`,
      headers: { 'x-test-identity': 'full' },
      payload: {
        procedureName: 'Nebulização / Inalação Contínua',
        instructions: 'Realizar nebulização com 5ml de soro fisiológico + 10 gotas de Salbutamol',
      },
    });

    expect(res.statusCode).toBe(201);
    const proc = JSON.parse(res.body).data;
    createdProcedureRequestId = proc.id;
    expect(proc.status).toBe('requested');
  });

  it('9. execução de procedimento ambulatorial -> 200 OK (status = completed)', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/encounters/${testEncounterId}/procedures/${createdProcedureRequestId}/execute`,
      headers: { 'x-test-identity': 'full' },
      payload: { notes: 'Nebulização realizada pela enfermagem com melhora da broncospasmo.' },
    });

    expect(res.statusCode).toBe(200);
    const proc = JSON.parse(res.body).data;
    expect(proc.status).toBe('completed');
  });

  it('10. solicitação de interconsulta médica (Cardiologia) -> 201 Created', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${testEncounterId}/interconsultations`,
      headers: { 'x-test-identity': 'full' },
      payload: {
        specialty: 'Cardiologia',
        priority: 'urgent',
        clinicalSummary: 'Paciente de 58 anos com dor torácica e ECG com supra discreto',
        question: 'Avaliação de necessidade de cineangiocoronariografia de urgência',
      },
    });

    expect(res.statusCode).toBe(201);
    const inter = JSON.parse(res.body).data;
    createdInterconsultationId = inter.id;
    expect(inter.status).toBe('requested');
    expect(inter.specialty).toBe('Cardiologia');
  });

  it('11. resposta de parecer de interconsulta médica -> 200 OK (status = answered)', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/encounters/${testEncounterId}/interconsultations/${createdInterconsultationId}/response`,
      headers: { 'x-test-identity': 'full' },
      payload: {
        responseNotes: 'Paciente avaliado pela Cardiologia. Sem critérios de supra-ST agudo. Manter conduta analgésica e dosagem seriada de troponina.',
      },
    });

    expect(res.statusCode).toBe(200);
    const inter = JSON.parse(res.body).data;
    expect(inter.status).toBe('answered');
    expect(inter.responseNotes).toContain('Cardiologia');
  });

  it('12. eventos de exames, procedimentos e interconsultas surgem na app.patient_timeline', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/patients/${testPatientId}/timeline`,
      headers: { 'x-test-identity': 'full' },
    });

    expect(res.statusCode).toBe(200);
    const events = JSON.parse(res.body).data;

    const examEv = events.find((e: { type: string }) => e.type === 'ExamRequested');
    const examResEv = events.find((e: { type: string }) => e.type === 'ExamResultRecorded');
    const procEv = events.find((e: { type: string }) => e.type === 'ProcedureRequested');
    const procCompEv = events.find((e: { type: string }) => e.type === 'ProcedureCompleted');
    const interEv = events.find((e: { type: string }) => e.type === 'InterconsultationRequested');
    const interAnsEv = events.find((e: { type: string }) => e.type === 'InterconsultationAnswered');

    expect(examEv).toBeDefined();
    expect(examResEv).toBeDefined();
    expect(procEv).toBeDefined();
    expect(procCompEv).toBeDefined();
    expect(interEv).toBeDefined();
    expect(interAnsEv).toBeDefined();
  });

  it('limpeza de dados de teste de exames e procedimentos', async () => {
    const client = await pool.connect();
    try {
      for (const encId of createdEncounterIds) {
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
