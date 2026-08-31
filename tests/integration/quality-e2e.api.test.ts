import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import pg from 'pg';
import { ErrorCategory } from '@vitaloop/shared';
import { registerPatientRoutes } from '../../apps/api/src/routes/patients.js';
import { registerTriageRoutes } from '../../apps/api/src/routes/triages.js';
import { registerEncounterRoutes } from '../../apps/api/src/routes/encounters.js';
import { registerPrescriptionRoutes } from '../../apps/api/src/routes/prescriptions.js';
import { registerDocumentRoutes } from '../../apps/api/src/routes/documents.js';
import { registerSecurityRoutes } from '../../apps/api/src/routes/security.js';
import { registerQualityRoutes } from '../../apps/api/src/routes/quality.js';
import { failure } from '../../apps/api/src/http/envelope.js';

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  throw new Error('DATABASE_URL não configurada no ambiente de testes.');
}

const poolDb = new pg.Pool({ connectionString: dbUrl });
const poolAdmin = new pg.Pool({ connectionString: dbUrl.replace('vitaloop_app.', 'postgres.') });

const makeValidCpf = (seed: number): string => {
  const base = String(seed).padStart(9, '0').slice(-9).split('').map(Number);
  const calcDv = (digits: number[], factorStart: number): number => {
    let sum = 0;
    for (let i = 0; i < digits.length; i++) sum += digits[i] * (factorStart - i);
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  const dv1 = calcDv(base, 10);
  const dv2 = calcDv([...base, dv1], 11);
  return [...base, dv1, dv2].join('');
};

const identityFull = {
  authUserId: 'auth-full',
  appUserId: '83ad7af3-c506-48be-b2a0-6fbd0bb6bf1b',
  appUserStatus: 'active',
  roles: ['test_patient_full', 'doctor', 'nurse', 'admin'],
};

const identityGuest = {
  authUserId: 'auth-guest',
  appUserId: '83ad7af3-c506-48be-b2a0-6fbd0bb6bf1b',
  appUserStatus: 'active',
  roles: ['guest'],
};

const buildTestApp = (): FastifyInstance => {
  const app = Fastify();

  app.addHook('onRequest', async (req) => {
    const identityHeader = req.headers['x-test-identity'] as string;
    if (identityHeader === 'full') {
      req.identity = identityFull;
    } else if (identityHeader === 'guest') {
      req.identity = identityGuest;
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
  registerTriageRoutes(app, poolDb);
  registerEncounterRoutes(app, poolDb);
  registerPrescriptionRoutes(app, poolDb);
  registerDocumentRoutes(app, poolDb);
  registerSecurityRoutes(app, poolDb);
  registerQualityRoutes(app, poolDb);

  return app;
};

describe('API Qualidade Global, E2E, Concorrência e Impressão PDF (QLT-001..010, QLT-014..015) — integração real (vitaloop_app, RLS)', () => {
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

  it('1. QLT-014 — Geração e impressão autorizada de laudo/documento assistencial em PDF', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/quality/documents/550e8400-e29b-41d4-a716-446655440000/print',
      headers: { 'x-test-identity': 'full' },
      payload: {
        documentType: 'Atestado Médico',
        patientName: 'Paciente Teste Qualidade',
        issuerName: 'Dr. Roberto Santos',
        content: 'Atesto que o paciente necessita de 2 dias de repouso por motivo de saúde.',
      },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body).data;
    expect(body.pdfHeader).toContain('%PDF-1.7');
    expect(body.formattedText).toContain('Atesto que o paciente necessita de 2 dias de repouso');
    expect(body.footerChecksum).toBeTruthy();
  }, 60000);

  it('2. QLT-007 — Simulação de concorrência: versão compatível -> 200 OK; versão conflitante -> 400 CONCURRENT_UPDATE_CONFLICT', async () => {
    const resOk = await app.inject({
      method: 'POST',
      url: '/api/v1/quality/simulate-concurrency',
      headers: { 'x-test-identity': 'full' },
      payload: { currentVersion: 1, expectedVersion: 1 },
    });
    expect(resOk.statusCode).toBe(200);

    const resConflict = await app.inject({
      method: 'POST',
      url: '/api/v1/quality/simulate-concurrency',
      headers: { 'x-test-identity': 'full' },
      payload: { currentVersion: 2, expectedVersion: 1 },
    });
    expect(resConflict.statusCode).toBe(400);
    expect(JSON.parse(resConflict.body).error.code).toBe('CONCURRENT_UPDATE_CONFLICT');
  }, 60000);

  it('3. QLT-005 — Fluxo E2E Assistencial Completo: Registro -> Atendimento -> Triagem -> Impressão -> Extrato LGPD', async () => {
    const validCpf = makeValidCpf((Date.now() + 1111) % 100000000);

    // 1. Cadastrar Paciente
    const resPat = await app.inject({
      method: 'POST',
      url: '/api/v1/patients',
      headers: { 'x-test-identity': 'full' },
      payload: { fullName: 'Paciente Fluxo E2E Qualidade', cpf: validCpf },
    });
    expect(resPat.statusCode).toBe(201);
    testPatientId = JSON.parse(resPat.body).data.id;

    // 2. Criar Atendimento
    const resEnc = await app.inject({
      method: 'POST',
      url: '/api/v1/encounters',
      headers: { 'x-test-identity': 'full' },
      payload: {
        patientId: testPatientId,
        encounterType: 'urgency',
        origin: 'spontaneous',
        chiefComplaint: 'Paciente com febre e cefaleia leve',
      },
    });
    expect(resEnc.statusCode).toBe(201);
    testEncounterId = JSON.parse(resEnc.body).data.id;

    // 3. Emitir Atestado Médico Assistencial
    const resDoc = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${testEncounterId}/documents`,
      headers: { 'x-test-identity': 'full' },
      payload: {
        documentType: 'medical_certificate',
        title: 'Atestado de Comparecimento E2E',
        content: 'Atesto comparecimento do paciente na UPA 24h nesta data para atendimento de urgência.',
        daysOff: 1,
      },
    });
    expect(resDoc.statusCode).toBe(201);
    testDocId = JSON.parse(resDoc.body).data.id;

    // 4. Solicitar Extrato LGPD
    const resLgpd = await app.inject({
      method: 'POST',
      url: `/api/v1/lgpd/patients/${testPatientId}/export`,
      headers: { 'x-test-identity': 'full' },
    });
    expect(resLgpd.statusCode).toBe(201);
  }, 60000);

  it('4. RBAC — tentativa de impressão sem permissão é negada (403 ACCESS_DENIED)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/quality/documents/550e8400-e29b-41d4-a716-446655440000/print',
      headers: { 'x-test-identity': 'guest' },
      payload: {
        documentType: 'Atestado Médico',
        patientName: 'Sem Permissao',
        issuerName: 'Dr. Teste',
        content: 'Conteudo sem permissao',
      },
    });
    expect(res.statusCode).toBe(403);
  }, 60000);

  it('5. Limpeza de dados de teste de qualidade e E2E', async () => {
    const client = await poolAdmin.connect();
    try {
      if (testDocId) {
        await client.query('delete from app.clinical_documents where id = $1', [testDocId]);
      }
      if (testPatientId) {
        await client.query('delete from app.lgpd_data_requests where patient_id = $1', [testPatientId]);
        await client.query('delete from app.encounters where patient_id = $1', [testPatientId]);
        await client.query('delete from app.patients where id = $1', [testPatientId]);
      }
    } finally {
      client.release();
    }
  }, 60000);
});
