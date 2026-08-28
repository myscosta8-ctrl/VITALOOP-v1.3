import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import pg from 'pg';
import fs from 'fs';
import { AppError, ErrorCategory } from '@vitaloop/shared';
import { failure } from '../../apps/api/src/http/envelope';
import { registerPatientRoutes } from '../../apps/api/src/routes/patients';
import { registerEncounterRoutes } from '../../apps/api/src/routes/encounters';
import { registerTriageRoutes } from '../../apps/api/src/routes/triages';
import { registerMedicalRoutes } from '../../apps/api/src/routes/medical';
import { registerPrescriptionRoutes } from '../../apps/api/src/routes/prescriptions';
import { registerNursingRoutes } from '../../apps/api/src/routes/nursing';

const envText = fs.readFileSync('./.env', 'utf8');
const dbUrlMatch = envText.match(/^DATABASE_URL=(.+)$/m);
if (!dbUrlMatch) {
  throw new Error('DATABASE_URL não encontrada no .env');
}
const dbUrl = dbUrlMatch[1].trim();

const poolDb = new pg.Pool({ connectionString: dbUrl });

const identityFull = {
  authUserId: 'auth-full',
  appUserId: '83ad7af3-c506-48be-b2a0-6fbd0bb6bf1b',
  appUserStatus: 'active',
  roles: ['test_patient_full', 'nurse', 'nursing_technician', 'doctor'],
};

const buildTestApp = (): FastifyInstance => {
  const app = Fastify({ logger: false });

  app.addHook('onRequest', async (req) => {
    const identityHeader = req.headers['x-test-identity'] as string;
    if (identityHeader === 'full') {
      req.identity = identityFull;
    } else {
      req.identity = null;
    }
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
  registerPrescriptionRoutes(app, poolDb);
  registerNursingRoutes(app, poolDb);

  return app;
};

describe('API de Enfermagem e Administração de Medicamentos — integração real (vitaloop_app, RLS efetiva)', { timeout: 240000 }, () => {
  let app: FastifyInstance;
  let testPatientId: string;
  let testEncounterId: string;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let testConsultationId: string;
  let testPrescriptionId: string;
  let createdScheduleIds: string[] = [];
  const createdAdminIds: string[] = [];
  const createdRecordIds: string[] = [];

  beforeAll(async () => {
    app = buildTestApp();
    await app.ready();
  });

  afterAll(async () => {
    await poolDb.end();
  });

  it('1. RLS — SELECT direto nas tabelas de enfermagem sem contexto de sessão retorna 0 linhas', async () => {
    const client = await poolDb.connect();
    try {
      const res1 = await client.query('select count(*)::int as n from app.nursing_records');
      const res2 = await client.query('select count(*)::int as n from app.medication_schedules');
      const res3 = await client.query('select count(*)::int as n from app.medication_administrations');
      expect(res1.rows[0].n).toBe(0);
      expect(res2.rows[0].n).toBe(0);
      expect(res3.rows[0].n).toBe(0);
    } finally {
      client.release();
    }
  });

  it('2. criação autorizada de paciente, atendimento, triagem, consulta e prescrição médica para teste de enfermagem', async () => {
    // 1. Criar paciente
    const createPat = await app.inject({
      method: 'POST',
      url: '/api/v1/patients',
      headers: { 'x-test-identity': 'full' },
      payload: { fullName: 'Paciente Teste Enfermagem Aprazamento' },
    });
    expect(createPat.statusCode).toBe(201);
    testPatientId = JSON.parse(createPat.body).data.id;

    // 2. Criar atendimento
    const createEnc = await app.inject({
      method: 'POST',
      url: '/api/v1/encounters',
      headers: { 'x-test-identity': 'full' },
      payload: { patientId: testPatientId, encounterType: 'urgency', origin: 'spontaneous', chiefComplaint: 'Febre alta' },
    });
    expect(createEnc.statusCode).toBe(201);
    testEncounterId = JSON.parse(createEnc.body).data.id;

    // 3. Triagem
    const createTri = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${testEncounterId}/triage`,
      headers: { 'x-test-identity': 'full' },
      payload: { chiefComplaint: 'Febre alta 39C', riskColor: 'yellow', systolicBp: 120, diastolicBp: 80, temperature: 39.1 },
    });
    expect(createTri.statusCode).toBe(201);

    // 4. Consulta Médica
    const createCons = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${testEncounterId}/consultation`,
      headers: { 'x-test-identity': 'full' },
      payload: {
        chiefComplaint: 'Febre alta',
        historyPresentIllness: 'Febre há 1 dia',
        generalExam: 'BEG, febril',
        diagnosticHypothesis: 'Síndrome febril',
      },
    });
    expect(createCons.statusCode).toBe(201);
    testConsultationId = JSON.parse(createCons.body).data.id;

    // 5. Prescrição Médica
    const createPres = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${testEncounterId}/prescriptions`,
      headers: { 'x-test-identity': 'full' },
      payload: {
        items: [
          {
            medicationName: 'Dipirona Sódica 500mg/ml',
            dose: 2,
            doseUnit: 'ml',
            route: 'EV',
            frequency: '8/8h',
          },
        ],
      },
    });
    expect(createPres.statusCode).toBe(201);
    testPrescriptionId = JSON.parse(createPres.body).data.id;
  });

  it('3. registro de anotação de enfermagem sem autenticação -> 401 AUTH_REQUIRED', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${testEncounterId}/nursing/records`,
      payload: { recordType: 'annotation', content: 'Paciente em repouso no leito 01.' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('4. registro autorizado de Admissão de Enfermagem (NUR-001) -> 201 Created', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${testEncounterId}/nursing/records`,
      headers: { 'x-test-identity': 'full' },
      payload: {
        recordType: 'admission',
        content: 'Paciente admitido na sala de observação adulto, instalado em AVP 20G em MSE.',
      },
    });
    expect(res.statusCode).toBe(201);
    const data = JSON.parse(res.body).data;
    expect(data.recordType).toBe('admission');
    createdRecordIds.push(data.id);
  });

  it('5. aprazamento autorizado da prescrição médica (MEDC-009) -> 201 Created', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${testEncounterId}/prescriptions/${testPrescriptionId}/schedule`,
      headers: { 'x-test-identity': 'full' },
      payload: {},
    });
    expect(res.statusCode).toBe(201);
    const schedules = JSON.parse(res.body).data;
    expect(schedules.length).toBeGreaterThan(0);
    createdScheduleIds = schedules.map((s: { id: string }) => s.id);
  });

  it('6. consulta da grade de aprazamento do atendimento -> 200 OK', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/encounters/${testEncounterId}/medication-schedules`,
      headers: { 'x-test-identity': 'full' },
    });
    expect(res.statusCode).toBe(200);
    const schedules = JSON.parse(res.body).data;
    expect(schedules.length).toBeGreaterThan(0);
    expect(schedules[0].status).toBe('pending');
  });

  it('7. recusa de administração sem justificativa técnica -> 400 MEDICATION_NON_ADMIN_REASON_REQUIRED', async () => {
    const targetScheduleId = createdScheduleIds[0];
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/medication-schedules/${targetScheduleId}/administer`,
      headers: { 'x-test-identity': 'full' },
      payload: { status: 'refused', nonAdminReason: 'Curto' },
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error.code).toBe('MEDICATION_NON_ADMIN_REASON_REQUIRED');
  });

  it('8. administração sem checagem beira-leito (bedSideChecked = false) -> 400 BEDSIDE_CHECK_REQUIRED', async () => {
    const targetScheduleId = createdScheduleIds[0];
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/medication-schedules/${targetScheduleId}/administer`,
      headers: { 'x-test-identity': 'full' },
      payload: { status: 'administered', bedSideChecked: false },
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error.code).toBe('BEDSIDE_CHECK_REQUIRED');
  });

  it('9. administração autorizada com checagem beira-leito (5 Certos, MEDC-010/011) -> 201 Created', async () => {
    const targetScheduleId = createdScheduleIds[0];
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/medication-schedules/${targetScheduleId}/administer`,
      headers: { 'x-test-identity': 'full' },
      payload: {
        status: 'administered',
        bedSideChecked: true,
        batchNumber: 'LOTE-DIP-2026',
      },
    });
    expect(res.statusCode).toBe(201);
    const admin = JSON.parse(res.body).data;
    expect(admin.status).toBe('administered');
    createdAdminIds.push(admin.id);
  });

  it('10. registro de Anotação de Enfermagem sequencial (NUR-003) -> 201 Created', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${testEncounterId}/nursing/records`,
      headers: { 'x-test-identity': 'full' },
      payload: {
        recordType: 'annotation',
        content: 'Dipirona EV administrada em MSE sem intercorrências. Paciente refere melhora febril.',
      },
    });
    expect(res.statusCode).toBe(201);
    const data = JSON.parse(res.body).data;
    createdRecordIds.push(data.id);
  });

  it('11. eventos de enfermagem surgem na app.patient_timeline do paciente', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/patients/${testPatientId}/timeline`,
      headers: { 'x-test-identity': 'full' },
    });

    expect(res.statusCode).toBe(200);
    const events = JSON.parse(res.body).data;
    const types = events.map((e: { type: string }) => e.type);

    expect(types).toContain('NursingAdmissionRecorded');
    expect(types).toContain('PrescriptionScheduled');
    expect(types).toContain('MedicationAdministered');
  });

  it('limpeza de dados de teste de enfermagem', async () => {
    const client = await poolDb.connect();
    try {
      if (testEncounterId) {
        try { await client.query('delete from app.medication_administrations where encounter_id = $1', [testEncounterId]); } catch { /* ignore */ }
        try { await client.query('delete from app.medication_schedules where encounter_id = $1', [testEncounterId]); } catch { /* ignore */ }
        try { await client.query('delete from app.nursing_records where encounter_id = $1', [testEncounterId]); } catch { /* ignore */ }
        try { await client.query('delete from app.prescription_items where prescription_id in (select id from app.prescriptions where encounter_id = $1)', [testEncounterId]); } catch { /* ignore */ }
        try { await client.query('delete from app.prescriptions where encounter_id = $1', [testEncounterId]); } catch { /* ignore */ }
        try { await client.query('delete from app.medical_consultations where encounter_id = $1', [testEncounterId]); } catch { /* ignore */ }
        try { await client.query('delete from app.triages where encounter_id = $1', [testEncounterId]); } catch { /* ignore */ }
        try { await client.query('delete from app.queue_tickets where encounter_id = $1', [testEncounterId]); } catch { /* ignore */ }
        try { await client.query('delete from app.encounters where id = $1', [testEncounterId]); } catch { /* ignore */ }
      }
      if (testPatientId) {
        try { await client.query('delete from app.domain_events where patient_id = $1', [testPatientId]); } catch { /* ignore */ }
        try { await client.query('delete from app.audit_events where patient_id = $1', [testPatientId]); } catch { /* ignore */ }
        try { await client.query('delete from app.patients where id = $1', [testPatientId]); } catch { /* ignore */ }
      }
    } finally {
      client.release();
    }
  });
});
