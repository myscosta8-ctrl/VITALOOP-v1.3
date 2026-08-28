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

  return app;
};

run('API de Prescrição Médica e Alertas de Alergia — integração real (vitaloop_app, RLS efetiva)', { timeout: 90000 }, () => {
  let app: FastifyInstance;
  let testPatientId: string;
  let testEncounterId: string;
  let _createdAllergicPrescriptionId: string;
  let createdSafePrescriptionId: string;

  const createdPatientIds: string[] = [];
  const createdEncounterIds: string[] = [];

  it('setup da aplicação Fastify para testes de prescrição', async () => {
    app = buildTestApp(pool);
    expect(app).toBeDefined();
  });

  it('1. RLS — SELECT direto na tabela app.prescriptions sem contexto de sessão retorna 0 linhas', async () => {
    const client = await pool.connect();
    try {
      await client.query('begin');
      await client.query(`select set_config('vitaloop.user_id', '', true), set_config('vitaloop.roles', '', true)`);
      const res = await client.query('select count(*)::int as n from app.prescriptions');
      expect(res.rows[0].n).toBe(0);
      await client.query('rollback');
    } finally {
      client.release();
    }
  });

  it('2. criação autorizada de paciente, atendimento, triagem (com alergia a Dipirona) e consulta médica', async () => {
    const createPat = await app.inject({
      method: 'POST',
      url: '/api/v1/patients',
      headers: { 'x-test-identity': 'full' },
      payload: { fullName: 'Paciente Alérgico a Dipirona Teste' },
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
        chiefComplaint: 'Dor intensa e febre',
      },
    });
    expect(createEnc.statusCode).toBe(201);
    testEncounterId = JSON.parse(createEnc.body).data.id;
    createdEncounterIds.push(testEncounterId);

    await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${testEncounterId}/triage`,
      headers: { 'x-test-identity': 'full' },
      payload: {
        chiefComplaint: 'Dor e febre. Alergia relatada: Dipirona',
        riskColor: 'yellow',
      },
    });

    const consRes = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${testEncounterId}/consultation`,
      headers: { 'x-test-identity': 'full' },
      payload: {
        chiefComplaint: 'Dor e febre',
        historyPresentIllness: 'Paciente com febre há 1 dia. Relata alergia grave a Dipirona',
        pastMedicalHistory: 'Alergia a Dipirona Sódica (urticária)',
        generalExam: 'BEG',
        diagnosticHypothesis: 'Síndrome febril a esclarecer',
      },
    });
    expect(consRes.statusCode).toBe(201);
  });

  it('3. busca de medicamento no catálogo -> 200 OK', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/medications/search?q=Dipirona',
      headers: { 'x-test-identity': 'full' },
    });

    expect(res.statusCode).toBe(200);
    const items = JSON.parse(res.body).data;
    expect(items.length).toBeGreaterThan(0);
    expect(items[0].name).toContain('Dipirona');
  });

  it('4. criação de prescrição sem autenticação -> 401 AUTH_REQUIRED', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${testEncounterId}/prescriptions`,
      headers: { 'x-test-identity': 'null' },
      payload: {
        items: [{ medicationName: 'Paracetamol 750mg', dose: 1, doseUnit: 'comprimido', route: 'VO', frequency: '8/8h' }],
      },
    });

    expect(res.statusCode).toBe(401);
  });

  it('5. criação de prescrição sem permissão (prescription.write) -> 403 ACCESS_DENIED', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${testEncounterId}/prescriptions`,
      headers: { 'x-test-identity': 'noperm' },
      payload: {
        items: [{ medicationName: 'Paracetamol 750mg', dose: 1, doseUnit: 'comprimido', route: 'VO', frequency: '8/8h' }],
      },
    });

    expect(res.statusCode).toBe(403);
  });

  it('6. prescrição de medicamento alérgico (Dipirona) SEM justificativa médica -> BLOQUEIO 400 ALLERGY_ALERT_REQUIRES_JUSTIFICATION', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${testEncounterId}/prescriptions`,
      headers: { 'x-test-identity': 'full' },
      payload: {
        items: [
          {
            medicationName: 'Dipirona Sódica 500mg',
            activeSubstance: 'dipirona',
            dose: 1,
            doseUnit: 'comprimido',
            route: 'VO',
            frequency: '6/6h',
          },
        ],
      },
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error.code).toBe('ALLERGY_ALERT_REQUIRES_JUSTIFICATION');
  });

  it('7. prescrição de medicamento alérgico (Dipirona) COM justificativa médica válida (min 10 caracteres) -> 201 Created', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${testEncounterId}/prescriptions`,
      headers: { 'x-test-identity': 'full' },
      payload: {
        overrideJustification: 'Paciente sob observação contínua. Alergia prévia leve e tratada.',
        items: [
          {
            medicationName: 'Dipirona Sódica 500mg',
            activeSubstance: 'dipirona',
            dose: 1,
            doseUnit: 'comprimido',
            route: 'VO',
            frequency: '6/6h',
          },
        ],
      },
    });

    expect(res.statusCode).toBe(201);
    const presc = JSON.parse(res.body).data;
    _createdAllergicPrescriptionId = presc.id;
    expect(presc.status).toBe('active');
    expect(presc.alerts.length).toBe(1);
    expect(presc.alerts[0].allergen).toContain('Dipirona');
    expect(presc.alerts[0].overrideReason).toContain('observação contínua');
  });

  it('8. prescrição de medicamento não-alérgico (Paracetamol 750mg) -> 201 Created sem alertas de sobreposição', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${testEncounterId}/prescriptions`,
      headers: { 'x-test-identity': 'full' },
      payload: {
        items: [
          {
            medicationName: 'Paracetamol 750mg',
            activeSubstance: 'paracetamol',
            dose: 1,
            doseUnit: 'comprimido',
            route: 'VO',
            frequency: '8/8h',
          },
        ],
      },
    });

    expect(res.statusCode).toBe(201);
    const presc = JSON.parse(res.body).data;
    createdSafePrescriptionId = presc.id;
    expect(presc.status).toBe('active');
    expect(presc.alerts.length).toBe(0);
  });

  it('9. listagem de prescrições do atendimento -> 200 OK', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/encounters/${testEncounterId}/prescriptions`,
      headers: { 'x-test-identity': 'full' },
    });

    expect(res.statusCode).toBe(200);
    const list = JSON.parse(res.body).data;
    expect(list.length).toBe(2);
  });

  it('10. cancelamento de prescrição sem motivo -> 400 PRESCRIPTION_CANCEL_REASON_REQUIRED', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${testEncounterId}/prescriptions/${createdSafePrescriptionId}/cancel`,
      headers: { 'x-test-identity': 'full' },
      payload: { cancelReason: '   ' },
    });

    expect(res.statusCode).toBe(400);
  });

  it('11. cancelamento de prescrição com motivo válido -> 200 OK (status = canceled)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${testEncounterId}/prescriptions/${createdSafePrescriptionId}/cancel`,
      headers: { 'x-test-identity': 'full' },
      payload: { cancelReason: 'Substituição de esquema analgésico por alteração de sintomatologia' },
    });

    expect(res.statusCode).toBe(200);
    const presc = JSON.parse(res.body).data;
    expect(presc.status).toBe('canceled');
    expect(presc.cancelReason).toContain('Substituição de esquema');
  });

  it('12. eventos PrescriptionRecorded, AllergyAlertOverridden e PrescriptionCanceled surgem na app.patient_timeline', async () => {
    const timelineRes = await app.inject({
      method: 'GET',
      url: `/api/v1/patients/${testPatientId}/timeline`,
      headers: { 'x-test-identity': 'full' },
    });
    expect(timelineRes.statusCode).toBe(200);
    const events = JSON.parse(timelineRes.body).data;

    const prescEvent = events.find((e: { type: string }) => e.type === 'PrescriptionRecorded');
    const alertEvent = events.find((e: { type: string }) => e.type === 'AllergyAlertOverridden');
    const cancelEvent = events.find((e: { type: string }) => e.type === 'PrescriptionCanceled');

    expect(prescEvent).toBeDefined();
    expect(alertEvent).toBeDefined();
    expect(cancelEvent).toBeDefined();
  });

  it('limpeza de dados de teste de prescrição', async () => {
    const client = await pool.connect();
    try {
      for (const encId of createdEncounterIds) {
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
