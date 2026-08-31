import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import pg from 'pg';
import { ErrorCategory } from '@vitaloop/shared';
import { registerPatientRoutes } from '../../apps/api/src/routes/patients.js';
import { registerEncounterRoutes } from '../../apps/api/src/routes/encounters.js';
import { registerIntegrationRoutes } from '../../apps/api/src/routes/integration.js';
import { failure } from '../../apps/api/src/http/envelope.js';

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  throw new Error('DATABASE_URL não configurada no ambiente de testes.');
}

const poolDb = new pg.Pool({ connectionString: dbUrl });
const poolAdmin = new pg.Pool({ connectionString: dbUrl.replace('vitaloop_app.', 'postgres.') });

const identityFull = {
  authUserId: 'auth-full',
  appUserId: '83ad7af3-c506-48be-b2a0-6fbd0bb6bf1b',
  appUserStatus: 'active',
  roles: ['test_patient_full', 'doctor', 'nurse', 'admin'],
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
      const category = err.category || ErrorCategory.VALIDATION;
      const code = err.code || 'ERROR';
      const message = err.message || 'Erro de validação';
      reply.code(httpStatus).send(failure({ category, code, message }, req.id));
      return;
    }
    reply.code(500).send(failure({ category: ErrorCategory.INTERNAL, code: 'INTERNAL_ERROR', message: (error as Error).message }, req.id));
  });

  registerPatientRoutes(app, poolDb);
  registerEncounterRoutes(app, poolDb);
  registerIntegrationRoutes(app, poolDb);

  return app;
};

describe('API Barramento FHIR R4, HL7 e PACS DICOM Web — integração real (vitaloop_app, RLS efetiva)', () => {
  let app: FastifyInstance;

  let testPatientId: string;
  let testEncounterId: string;

  beforeAll(async () => {
    app = buildTestApp();
    await app.ready();
  });

  afterAll(async () => {
    if (app) await app.close();
    if (poolDb) await poolDb.end();
    if (poolAdmin) await poolAdmin.end();
  });

  it('1. RLS — SELECT direto nas tabelas de integração sem contexto de sessão retorna 0 linhas', async () => {
    const client = await poolDb.connect();
    try {
      const { rows: r1 } = await client.query('select * from app.integration_messages');
      const { rows: r2 } = await client.query('select * from app.dicom_studies');
      const { rows: r3 } = await client.query('select * from app.fhir_resources');
      expect(r1.length).toBe(0);
      expect(r2.length).toBe(0);
      expect(r3.length).toBe(0);
    } finally {
      client.release();
    }
  }, 30000);

  it('2. criação autorizada de paciente e atendimento para testes do barramento', async () => {
    const createPat = await app.inject({
      method: 'POST',
      url: '/api/v1/patients',
      headers: { 'x-test-identity': 'full' },
      payload: { fullName: 'Paciente Teste Barramento Interoperabilidade' },
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
        chiefComplaint: 'Paciente com suspeita de embolia pulmonar para exames LIS/PACS',
      },
    });
    expect(createEnc.statusCode).toBe(201);
    testEncounterId = JSON.parse(createEnc.body).data.id;
  }, 30000);

  it('3. consulta de recurso FHIR R4 Patient (INT-009)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/fhir/R4/Patient/${testPatientId}`,
      headers: { 'x-test-identity': 'full' },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body).data;
    expect(body.resourceType).toBe('Patient');
    expect(body.id).toBe(testPatientId);
    expect(body.name[0].text).toBe('Paciente Teste Barramento Interoperabilidade');
  }, 30000);

  it('4. consulta de recurso FHIR R4 Encounter (INT-009)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/fhir/R4/Encounter/${testEncounterId}`,
      headers: { 'x-test-identity': 'full' },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body).data;
    expect(body.resourceType).toBe('Encounter');
    expect(body.id).toBe(testEncounterId);
    expect(body.subject.reference).toBe(`Patient/${testPatientId}`);
  }, 30000);

  it('5. recepção e processamento de laudo laboratorial HL7 ORU_R01 LIS (INT-001)', async () => {
    const rawHl7 = `MSH|^~\\&|LIS|LAB|VITALOOP|UPA|20260829100000||ORU^R01|MSG-8811|P|2.5\rPID|1||${testPatientId}||TESTE^PACIENTE||19900101|F\rOBX|1|NM|DDIMER||1250|ng/mL||||F`;

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/integration/hl7/oru',
      headers: { 'x-test-identity': 'full' },
      payload: {
        rawPayload: rawHl7,
        encounterId: testEncounterId,
        patientId: testPatientId,
      },
    });
    expect(res.statusCode).toBe(201);
    const data = JSON.parse(res.body).data;
    expect(data.messageType).toBe('HL7_ORU_R01');
    expect(data.status).toBe('processed');
  }, 30000);

  it('6. recepção e processamento de solicitação radiológica HL7 ORM_O01 RIS (INT-002)', async () => {
    const rawHl7 = `MSH|^~\\&|VITALOOP|UPA|RIS|RAD|20260829100000||ORM^O01|MSG-9922|P|2.5`;

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/integration/hl7/orm',
      headers: { 'x-test-identity': 'full' },
      payload: {
        rawPayload: rawHl7,
        encounterId: testEncounterId,
        patientId: testPatientId,
      },
    });
    expect(res.statusCode).toBe(201);
    const data = JSON.parse(res.body).data;
    expect(data.messageType).toBe('HL7_ORM_O01');
    expect(data.status).toBe('processed');
  }, 30000);

  it('7. vinculação e registro de metadados DICOM Web WADO-RS PACS (INT-003)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/integration/dicom/wado',
      headers: { 'x-test-identity': 'full' },
      payload: {
        encounterId: testEncounterId,
        patientId: testPatientId,
        studyInstanceUid: `1.2.840.113619.2.55.3.${Date.now()}`,
        modality: 'CT',
        description: 'Angiotomografia de Tórax para protocolo de TEP',
        seriesCount: 2,
        instanceCount: 150,
        wadoUrl: 'https://pacs.vitaloop.local/wado/studies/1.2.840.113619.2.55.3',
      },
    });
    expect(res.statusCode).toBe(201);
    const data = JSON.parse(res.body).data;
    expect(data.modality).toBe('CT');
    expect(data.wadoUrl).toContain('pacs.vitaloop.local');
  }, 30000);

  it('8. consulta de mensagens gravadas no barramento de integração', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/integration/messages',
      headers: { 'x-test-identity': 'full' },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.length).toBeGreaterThanOrEqual(3);
  }, 30000);

  it('9. limpeza dos dados de teste do barramento de integração', async () => {
    const client = await poolAdmin.connect();
    try {
      if (testPatientId) {
        await client.query('delete from app.integration_messages where patient_id = $1', [testPatientId]);
        await client.query('delete from app.dicom_studies where patient_id = $1', [testPatientId]);
        await client.query('delete from app.encounters where patient_id = $1', [testPatientId]);
        await client.query('delete from app.patients where id = $1', [testPatientId]);
      }
    } finally {
      client.release();
    }
  }, 30000);
});
