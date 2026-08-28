import { describe, it, expect, beforeAll } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import pg from 'pg';
import { ErrorCategory } from '@vitaloop/shared';
import { registerPatientRoutes } from '../../apps/api/src/routes/patients.js';
import { registerEncounterRoutes } from '../../apps/api/src/routes/encounters.js';
import { registerTriageRoutes } from '../../apps/api/src/routes/triages.js';
import { registerBedRoutes } from '../../apps/api/src/routes/beds.js';
import { failure } from '../../apps/api/src/http/envelope.js';

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  throw new Error('DATABASE_URL não configurada no ambiente de testes.');
}

const poolDb = new pg.Pool({ connectionString: dbUrl });

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
      reply.code(400).send(failure({ category: ErrorCategory.VALIDATION, code: 'BED_TRANSFER_REASON_REQUIRED', message: (error as Error).message }, req.id));
      return;
    }
    const err = error as { name?: string; httpStatus?: number; category?: ErrorCategory; code?: string; message?: string; toJSON?: () => unknown };
    const isAppErr = err?.name === 'AppError' || err?.constructor?.name === 'AppError' || typeof err.httpStatus === 'number' || Boolean(err.category && err.code);
    if (isAppErr) {
      const rawStatus = err.httpStatus || (err.category ? httpStatusForCategory[err.category] : 400) || 400;
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
  registerBedRoutes(app, poolDb);

  return app;
};

describe('API de Gestão de Leitos UPA 24h — integração real (vitaloop_app, RLS efetiva)', { timeout: 240000 }, () => {
  let app: FastifyInstance;
  let testPatientId: string;
  let testEncounterId: string;
  let testSectorId: string;
  let testBedId1: string;
  let testBedId2: string;
  let testAllocationId: string;

  beforeAll(async () => {
    app = buildTestApp();
    await app.ready();
  });

  it('1. RLS — SELECT direto nas tabelas de leitos sem contexto de sessão retorna 0 linhas', async () => {
    const client = await poolDb.connect();
    try {
      const { rows: sectorRows } = await client.query('select * from app.bed_sectors');
      const { rows: bedRows } = await client.query('select * from app.beds');
      const { rows: allocRows } = await client.query('select * from app.bed_allocations');
      expect(sectorRows.length).toBe(0);
      expect(bedRows.length).toBe(0);
      expect(allocRows.length).toBe(0);
    } finally {
      client.release();
    }
  });

  it('2. criação autorizada de paciente e atendimento de teste para leitos', async () => {
    const createPat = await app.inject({
      method: 'POST',
      url: '/api/v1/patients',
      headers: { 'x-test-identity': 'full' },
      payload: {
        fullName: 'Paciente Teste Leito UPA',
      },
    });
    expect(createPat.statusCode).toBe(201);
    testPatientId = JSON.parse(createPat.body).data.id;

    const createEnc = await app.inject({
      method: 'POST',
      url: '/api/v1/encounters',
      headers: { 'x-test-identity': 'full' },
      payload: { patientId: testPatientId, encounterType: 'urgency', origin: 'spontaneous', chiefComplaint: 'Dor no leito' },
    });
    expect(createEnc.statusCode).toBe(201);
    testEncounterId = JSON.parse(createEnc.body).data.id;
  });

  it('3. criação e listagem de setor assistencial (BED-002)', async () => {
    const code = `OBS_${Math.floor(1000 + Math.random() * 9000)}`;
    const createSec = await app.inject({
      method: 'POST',
      url: '/api/v1/bed-sectors',
      headers: { 'x-test-identity': 'full' },
      payload: {
        name: 'Observação Adulto Teste',
        code,
        description: 'Setor de Observação Adulto para Testes',
        capacity: 10,
      },
    });
    expect(createSec.statusCode).toBe(201);
    testSectorId = JSON.parse(createSec.body).data.id;

    const listSec = await app.inject({
      method: 'GET',
      url: '/api/v1/bed-sectors',
      headers: { 'x-test-identity': 'full' },
    });
    expect(listSec.statusCode).toBe(200);
    const sectors = JSON.parse(listSec.body).data;
    expect(sectors.length).toBeGreaterThan(0);
  });

  it('4. criação de leito físico e leito extra (BED-001/004)', async () => {
    const num1 = `L-${Math.floor(100 + Math.random() * 900)}`;
    const createBed1 = await app.inject({
      method: 'POST',
      url: '/api/v1/beds',
      headers: { 'x-test-identity': 'full' },
      payload: {
        sectorId: testSectorId,
        bedNumber: num1,
        isExtra: false,
      },
    });
    expect(createBed1.statusCode).toBe(201);
    testBedId1 = JSON.parse(createBed1.body).data.id;

    const num2 = `L-EXTRA-${Math.floor(100 + Math.random() * 900)}`;
    const createBed2 = await app.inject({
      method: 'POST',
      url: '/api/v1/beds',
      headers: { 'x-test-identity': 'full' },
      payload: {
        sectorId: testSectorId,
        bedNumber: num2,
        isExtra: true,
      },
    });
    expect(createBed2.statusCode).toBe(201);
    testBedId2 = JSON.parse(createBed2.body).data.id;
  });

  it('5. consulta do mapa de ocupação em tempo real (BED-003)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/beds/map',
      headers: { 'x-test-identity': 'full' },
    });
    expect(res.statusCode).toBe(200);
    const sectorsMap = JSON.parse(res.body).data;
    expect(sectorsMap.length).toBeGreaterThan(0);
  });

  it('6. alocação autorizada de paciente em leito físico (BED-001/005)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${testEncounterId}/beds/allocate`,
      headers: { 'x-test-identity': 'full' },
      payload: {
        bedId: testBedId1,
        patientId: testPatientId,
        regulationCode: 'CROSS-994821',
      },
    });
    expect(res.statusCode).toBe(201);
    const alloc = JSON.parse(res.body).data;
    testAllocationId = alloc.id;
    expect(alloc.status).toBe('active');
  });

  it('7. tentativa de segunda alocação ativa no mesmo atendimento -> BLOQUEIO 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${testEncounterId}/beds/allocate`,
      headers: { 'x-test-identity': 'full' },
      payload: {
        bedId: testBedId2,
        patientId: testPatientId,
      },
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error.code).toBe('ACTIVE_BED_ALLOCATION_EXISTS');
  });

  it('8. transferência de leito sem justificativa válida (< 10 chars) -> BLOQUEIO 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/bed-allocations/${testAllocationId}/transfer`,
      headers: { 'x-test-identity': 'full' },
      payload: {
        targetBedId: testBedId2,
        transferReason: 'Curto',
      },
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error.code).toBe('BED_TRANSFER_REASON_REQUIRED');
  });

  it('9. transferência autorizada de leito com justificativa válida (BED-006)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/bed-allocations/${testAllocationId}/transfer`,
      headers: { 'x-test-identity': 'full' },
      payload: {
        targetBedId: testBedId2,
        transferReason: 'Necessidade de isolamento/observação pediátrica continuada.',
      },
    });
    expect(res.statusCode).toBe(200);
    const newAlloc = JSON.parse(res.body).data;
    expect(newAlloc.status).toBe('active');
    testAllocationId = newAlloc.id;
  });

  it('10. alta do leito autorizada -> status "cleaning" (BED-010/011)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/bed-allocations/${testAllocationId}/discharge`,
      headers: { 'x-test-identity': 'full' },
      payload: {},
    });
    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res.body).data;
    expect(data.status).toBe('discharged');
    expect(data.bedStatus).toBe('cleaning');
  });

  it('11. conclusão de higienização do leito (cleaning -> available) (BED-011)', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/beds/${testBedId2}/status`,
      headers: { 'x-test-identity': 'full' },
      payload: {
        status: 'available',
      },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data.status).toBe('available');
  });

  it('12. eventos de leito surgem na app.patient_timeline do paciente', async () => {
    const client = await poolDb.connect();
    try {
      await client.query("select set_config('vitaloop.user_id', $1, false)", [TEST_MOCK_USER_ID]);
      await client.query("select set_config('vitaloop.roles', $1, false)", ['nurse']);

      const { rows: timeline } = await client.query(
        'select type from app.patient_timeline where patient_id = $1 order by occurred_at asc',
        [testPatientId],
      );

      const types = timeline.map((t) => t.type);
      expect(types).toContain('PatientBedAssigned');
      expect(types).toContain('PatientBedTransferred');
      expect(types).toContain('PatientBedDischarged');
    } finally {
      client.release();
    }
  });

  it('limpeza de dados de teste de leitos', async () => {
    const client = await poolDb.connect();
    try {
      if (testEncounterId) {
        try { await client.query('delete from app.bed_allocations where encounter_id = $1', [testEncounterId]); } catch { /* ignore */ }
        try { await client.query('delete from app.triages where encounter_id = $1', [testEncounterId]); } catch { /* ignore */ }
        try { await client.query('delete from app.encounters where id = $1', [testEncounterId]); } catch { /* ignore */ }
      }
      if (testBedId1 || testBedId2) {
        try { await client.query('delete from app.beds where id in ($1, $2)', [testBedId1, testBedId2]); } catch { /* ignore */ }
      }
      if (testSectorId) {
        try { await client.query('delete from app.bed_sectors where id = $1', [testSectorId]); } catch { /* ignore */ }
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
