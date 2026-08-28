import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import pg from 'pg';
import { ErrorCategory } from '@vitaloop/shared';
import { registerPatientRoutes } from '../../apps/api/src/routes/patients.js';
import { registerEncounterRoutes } from '../../apps/api/src/routes/encounters.js';
import { registerDocumentRoutes } from '../../apps/api/src/routes/documents.js';
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
  roles: ['test_patient_full', 'doctor', 'nurse', 'receptionist', 'admin'],
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
  registerDocumentRoutes(app, poolDb);

  return app;
};

describe('API de Documentos Clínicos Complementares e Atestados — integração real (vitaloop_app, RLS efetiva)', () => {
  let app: FastifyInstance;

  let testPatientId: string;
  let testEncounterId: string;
  let testDocId: string;

  beforeAll(async () => {
    app = buildTestApp();
    await app.ready();
  });

  afterAll(async () => {
    if (app) await app.close();
    if (poolDb) await poolDb.end();
    if (poolAdmin) await poolAdmin.end();
  });

  it('1. RLS — SELECT direto nas tabelas de documentos sem contexto de sessão retorna 0 linhas', async () => {
    const client = await poolDb.connect();
    try {
      const { rows } = await client.query('select * from app.clinical_documents');
      expect(rows.length).toBe(0);
    } finally {
      client.release();
    }
  });

  it('2. criação autorizada de paciente e atendimento de teste para documentos', async () => {
    const createPat = await app.inject({
      method: 'POST',
      url: '/api/v1/patients',
      headers: { 'x-test-identity': 'full' },
      payload: {
        fullName: 'Paciente Teste Documentos',
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
        chiefComplaint: 'Paciente necessita de atestado médico por astenia',
      },
    });
    expect(createEnc.statusCode).toBe(201);
    testEncounterId = JSON.parse(createEnc.body).data.id;
  }, 30000);

  it('3. consulta de templates padrão de documentos (DOC-005)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/document-templates',
      headers: { 'x-test-identity': 'full' },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
  }, 30000);

  it('4. emissão autorizada de Atestado Médico de Afastamento com dias por extenso (DOC-001/007/009)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${testEncounterId}/documents`,
      headers: { 'x-test-identity': 'full' },
      payload: {
        documentType: 'medical_certificate',
        title: 'Atestado Médico de Afastamento',
        content: 'Atesto para os devidos fins que o paciente necessita de 3 dias de repouso por quadro infeccioso agudo.',
        daysOff: 3,
        includeCid: true,
        cidCode: 'J06.9',
      },
    });
    expect(res.statusCode).toBe(201);
    const data = JSON.parse(res.body).data;
    testDocId = data.id;

    expect(data.documentType).toBe('medical_certificate');
    expect(data.daysOff).toBe(3);
    expect(data.daysOffText).toBe('três');
    expect(data.includeCid).toBe(true);
    expect(data.cidCode).toBe('J06.9');
    expect(data.integrityHash.length).toBe(64); // SHA-256 hex string
  }, 30000);

  it('5. emissão de Declaração de Comparecimento (DOC-002)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${testEncounterId}/documents`,
      headers: { 'x-test-identity': 'full' },
      payload: {
        documentType: 'attendance_declaration',
        title: 'Declaração de Comparecimento',
        content: 'Declaro que o paciente permaneceu nesta UPA para atendimento médico no horário das 08h às 12h.',
      },
    });
    expect(res.statusCode).toBe(201);
  }, 30000);

  it('6. emissão de Atestado de Acompanhante (DOC-003)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${testEncounterId}/documents`,
      headers: { 'x-test-identity': 'full' },
      payload: {
        documentType: 'companion_certificate',
        title: 'Atestado de Acompanhante',
        content: 'Atesto que a Sra. Maria Silva permaneceu como acompanhante responsável pelo paciente.',
        companionName: 'Maria Silva',
      },
    });
    expect(res.statusCode).toBe(201);
  }, 30000);

  it('7. listagem dos documentos do atendimento (DOC-010)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/encounters/${testEncounterId}/documents`,
      headers: { 'x-test-identity': 'full' },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.length).toBe(3);
  }, 30000);

  it('8. revogação/cancelamento sem justificativa válida (< 10 chars) -> BLOQUEIO 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/documents/${testDocId}/revoke`,
      headers: { 'x-test-identity': 'full' },
      payload: {
        revocationReason: 'Curto',
      },
    });
    expect(res.statusCode).toBe(400);
  }, 30000);

  it('9. revogação autorizada do atestado médico com justificativa (DOC-008)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/documents/${testDocId}/revoke`,
      headers: { 'x-test-identity': 'full' },
      payload: {
        revocationReason: 'Cancelamento efetuado devido a erro de digitação no número de dias de afastamento.',
      },
    });
    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res.body).data;
    expect(data.status).toBe('revoked');
    expect(data.revocationReason).toContain('erro de digitação');
  }, 30000);

  it('10. eventos de documentos clínicos surgem na app.patient_timeline', async () => {
    const client = await poolDb.connect();
    try {
      await client.query("select set_config('vitaloop.user_id', $1, false)", ['11111111-1111-1111-1111-111111111111']);
      await client.query("select set_config('vitaloop.roles', $1, false)", ['doctor']);

      const { rows } = await client.query(
        'select * from app.patient_timeline where patient_id = $1 order by occurred_at asc',
        [testPatientId],
      );

      expect(rows.length).toBeGreaterThan(0);
      const eventTypes = rows.map((r) => r.type);
      expect(eventTypes).toContain('ClinicalDocumentIssued');
      expect(eventTypes).toContain('ClinicalDocumentRevoked');
    } finally {
      client.release();
    }
  }, 30000);

  it('11. limpeza de dados de teste de documentos clínicos', async () => {
    const client = await poolAdmin.connect();
    try {
      if (testPatientId) {
        await client.query('delete from app.clinical_documents where patient_id = $1', [testPatientId]);
        await client.query('delete from app.encounters where patient_id = $1', [testPatientId]);
        await client.query('delete from app.patients where id = $1', [testPatientId]);
      }
    } finally {
      client.release();
    }
  }, 30000);
});
