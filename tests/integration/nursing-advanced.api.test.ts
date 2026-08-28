import { describe, it, expect, beforeAll } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import pg from 'pg';
import { ErrorCategory } from '@vitaloop/shared';
import { registerPatientRoutes } from '../../apps/api/src/routes/patients.js';
import { registerEncounterRoutes } from '../../apps/api/src/routes/encounters.js';
import { registerTriageRoutes } from '../../apps/api/src/routes/triages.js';
import { registerNursingRoutes } from '../../apps/api/src/routes/nursing.js';
import { failure } from '../../apps/api/src/http/envelope.js';

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  throw new Error('DATABASE_URL não configurada no ambiente de testes.');
}

const poolDb = new pg.Pool({ connectionString: dbUrl });
const poolAdmin = new pg.Pool({ connectionString: dbUrl.replace('vitaloop_app.', 'postgres.') });

const TEST_MOCK_USER_ID = '11111111-1111-1111-1111-111111111111';

const identityFull = {
  authUserId: 'auth-full',
  appUserId: '83ad7af3-c506-48be-b2a0-6fbd0bb6bf1b',
  appUserStatus: 'active',
  roles: ['test_patient_full', 'nurse', 'nursing_technician', 'doctor', 'receptionist', 'admin'],
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
  registerNursingRoutes(app, poolDb);

  return app;
};

describe('API de SAE, Escalas, Balanço e Dispositivos — integração real (vitaloop_app, RLS efetiva)', () => {
  let app: FastifyInstance;
  let testPatientId: string;
  let testEncounterId: string;
  let testDeviceId: string;

  beforeAll(() => {
    app = buildTestApp();
  });

  it('1. RLS — SELECT direto nas tabelas SAE/escalas sem contexto de sessão retorna 0 linhas', async () => {
    const client = await poolDb.connect();
    try {
      const { rows: r1 } = await client.query('select * from app.nursing_diagnoses');
      const { rows: r2 } = await client.query('select * from app.nursing_scale_evaluations');
      const { rows: r3 } = await client.query('select * from app.fluid_balance_records');
      const { rows: r4 } = await client.query('select * from app.invasive_devices');
      expect(r1.length).toBe(0);
      expect(r2.length).toBe(0);
      expect(r3.length).toBe(0);
      expect(r4.length).toBe(0);
    } finally {
      client.release();
    }
  }, 30000);

  it('2. criação autorizada de paciente e atendimento de teste para SAE', async () => {
    const createPat = await app.inject({
      method: 'POST',
      url: '/api/v1/patients',
      headers: { 'x-test-identity': 'full' },
      payload: {
        fullName: 'Paciente Teste SAE Enfermagem',
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
        chiefComplaint: 'Paciente em observação UPA para avaliação de SAE',
      },
    });
    expect(createEnc.statusCode).toBe(201);
    testEncounterId = JSON.parse(createEnc.body).data.id;
  }, 30000);

  it('3. registro de Diagnósticos NANDA e Prescrição de Cuidados SAE (NUR-004..006)', async () => {
    const saeRes = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${testEncounterId}/nursing/sae`,
      headers: { 'x-test-identity': 'full' },
      payload: {
        diagnoses: [
          {
            code: 'NANDA-00047',
            title: 'Risco de Lesão por Pressão',
            domainName: 'Segurança/Proteção',
            relatedFactors: 'Imobilidade no leito',
          },
        ],
        prescriptions: [
          {
            careDescription: 'Mudança de decúbito de 2 em 2 horas alternada',
            frequencyHours: 2,
          },
        ],
      },
    });
    expect(saeRes.statusCode).toBe(201);
    const body = JSON.parse(saeRes.body);
    expect(body.data.diagnoses.length).toBe(1);
    expect(body.data.prescriptions.length).toBe(1);
  }, 30000);

  it('4. aplicação da Escala de Braden com escore alto risco (NUR-010)', async () => {
    const scaleRes = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${testEncounterId}/nursing/scales`,
      headers: { 'x-test-identity': 'full' },
      payload: {
        scaleType: 'braden',
        scoreDetails: {
          sensory: 2,
          moisture: 2,
          activity: 2,
          mobility: 2,
          nutrition: 2,
          friction: 1,
        },
      },
    });
    expect(scaleRes.statusCode).toBe(201);
    const body = JSON.parse(scaleRes.body);
    expect(body.data.total_score).toBe(11);
    expect(body.data.risk_level).toBe('high');
  }, 30000);

  it('5. listagem das avaliações de escalas do atendimento', async () => {
    const listRes = await app.inject({
      method: 'GET',
      url: `/api/v1/encounters/${testEncounterId}/nursing/scales`,
      headers: { 'x-test-identity': 'full' },
    });
    expect(listRes.statusCode).toBe(200);
    const body = JSON.parse(listRes.body);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    expect(body.data[0].scale_type).toBe('braden');
  }, 30000);

  it('6. registro de balanço hídrico — entrada e saída (NUR-009)', async () => {
    const intakeRes = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${testEncounterId}/nursing/fluid-balance`,
      headers: { 'x-test-identity': 'full' },
      payload: {
        direction: 'intake',
        fluidType: 'intravenous',
        volumeMl: 500,
        description: 'Soro Fisiológico 0.9%',
      },
    });
    expect(intakeRes.statusCode).toBe(201);

    const outputRes = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${testEncounterId}/nursing/fluid-balance`,
      headers: { 'x-test-identity': 'full' },
      payload: {
        direction: 'output',
        fluidType: 'urine',
        volumeMl: 200,
        description: 'Diurese espontânea',
      },
    });
    expect(outputRes.statusCode).toBe(201);
  }, 30000);

  it('7. consulta de resumo do balanço hídrico acumulado', async () => {
    const getRes = await app.inject({
      method: 'GET',
      url: `/api/v1/encounters/${testEncounterId}/nursing/fluid-balance`,
      headers: { 'x-test-identity': 'full' },
    });
    expect(getRes.statusCode).toBe(200);
    const body = JSON.parse(getRes.body);
    expect(body.data.summary.intakeTotal).toBe(500);
    expect(body.data.summary.outputTotal).toBe(200);
    expect(body.data.summary.netBalance).toBe(300);
  }, 30000);

  it('8. inserção de dispositivo invasivo (NUR-011)', async () => {
    const devRes = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${testEncounterId}/nursing/devices`,
      headers: { 'x-test-identity': 'full' },
      payload: {
        deviceType: 'peripheral_venous_access',
        anatomicalSite: 'Antebraço Esquerdo Jelco 20G',
        expectedReplacementDays: 3,
      },
    });
    expect(devRes.statusCode).toBe(201);
    const body = JSON.parse(devRes.body);
    testDeviceId = body.data.id;
    expect(body.data.device_type).toBe('peripheral_venous_access');
  }, 30000);

  it('9. remoção autorizada do dispositivo invasivo (NUR-011)', async () => {
    const removeRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/nursing/devices/${testDeviceId}/remove`,
      headers: { 'x-test-identity': 'full' },
      payload: {
        removalReason: 'Retirada por alta assistencial e extravasamento leve',
      },
    });
    expect(removeRes.statusCode).toBe(200);
    const body = JSON.parse(removeRes.body);
    expect(body.data.status).toBe('removed');
  }, 30000);

  it('10. eventos avançados de enfermagem surgem na app.patient_timeline', async () => {
    const client = await poolDb.connect();
    try {
      await client.query("select set_config('vitaloop.user_id', $1, false)", [TEST_MOCK_USER_ID]);
      await client.query("select set_config('vitaloop.roles', $1, false)", ['nurse']);

      const { rows } = await client.query(
        'select type from app.patient_timeline where patient_id = $1 order by occurred_at asc',
        [testPatientId],
      );
      expect(rows.length).toBeGreaterThan(0);
      const eventTypes = rows.map((r) => r.type);
      expect(eventTypes).toContain('NursingSaeRecorded');
      expect(eventTypes).toContain('ScaleApplied');
      expect(eventTypes).toContain('FluidBalanceRecorded');
      expect(eventTypes).toContain('InvasiveDeviceInserted');
      expect(eventTypes).toContain('InvasiveDeviceRemoved');
    } finally {
      client.release();
    }
  }, 30000);

  it('11. limpeza de dados de teste de SAE/Enfermagem avançada', async () => {
    const client = await poolAdmin.connect();
    try {
      if (testEncounterId) {
        try { await client.query('delete from app.invasive_devices where encounter_id = $1', [testEncounterId]); } catch { /* ignore */ }
        try { await client.query('delete from app.fluid_balance_records where encounter_id = $1', [testEncounterId]); } catch { /* ignore */ }
        try { await client.query('delete from app.patient_risk_assessments where encounter_id = $1', [testEncounterId]); } catch { /* ignore */ }
        try { await client.query('delete from app.nursing_scale_evaluations where encounter_id = $1', [testEncounterId]); } catch { /* ignore */ }
        try { await client.query('delete from app.nursing_prescriptions where encounter_id = $1', [testEncounterId]); } catch { /* ignore */ }
        try { await client.query('delete from app.nursing_diagnoses where encounter_id = $1', [testEncounterId]); } catch { /* ignore */ }
        try { await client.query('delete from app.triages where encounter_id = $1', [testEncounterId]); } catch { /* ignore */ }
        try { await client.query('delete from app.encounters where id = $1', [testEncounterId]); } catch { /* ignore */ }
      }
      if (testPatientId) {
        try { await client.query('delete from app.domain_events where patient_id = $1', [testPatientId]); } catch { /* ignore */ }
        try { await client.query('delete from app.audit_events where actor_user_id = $1', [identityFull.appUserId]); } catch { /* ignore */ }
        try { await client.query('delete from app.patients where id = $1', [testPatientId]); } catch { /* ignore */ }
      }

      const { rows: diagRem } = await client.query('select count(*)::int as n from app.nursing_diagnoses where encounter_id = $1', [testEncounterId]);
      expect(diagRem[0].n).toBe(0);
    } finally {
      client.release();
    }
  }, 30000);
});

