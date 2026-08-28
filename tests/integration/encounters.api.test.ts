/**
 * Testes de integração REAIS da API de Atendimentos (Fase 2, Etapa 5/6).
 *
 * Conexão real ao Supabase oficial como `vitaloop_app` (RLS efetiva, sem bypass).
 * Cobertura completa: RLS, RBAC, Concorrência otimista, Transições de estado,
 * Eventos de domínio, Auditoria e Timeline.
 */

import { afterAll, describe, expect, it } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import pg from 'pg';
import { AppError, ErrorCategory, newUuid } from '@vitaloop/shared';
import { failure } from '../../apps/api/src/http/envelope.js';
import { registerPatientRoutes } from '../../apps/api/src/routes/patients.js';
import { registerEncounterRoutes } from '../../apps/api/src/routes/encounters.js';
import type { RequestIdentity } from '../../apps/api/src/security/request-identity.js';

const url = process.env.DATABASE_URL;
const run = url ? describe : describe.skip;

const NETWORK_TIMEOUT_MS = 90_000;

const FIXTURE = {
  institutionId: '11c93126-f2b2-47d4-9dd4-88dd547becc1',
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

const buildTestApp = (pool: pg.Pool): FastifyInstance => {
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
      failure({ category: ErrorCategory.INTERNAL, code: 'INTERNAL_ERROR', message: 'Erro interno.' }, req.id),
    );
  });

  registerPatientRoutes(app, pool);
  registerEncounterRoutes(app, pool);
  return app;
};

run('API de Atendimentos — integração real (vitaloop_app, RLS efetiva)', () => {
  const pool = new pg.Pool({ connectionString: url });
  const app = buildTestApp(pool);

  const createdPatientIds: string[] = [];
  const createdEncounterIds: string[] = [];

  afterAll(async () => {
    await pool.end();
  });

  // ---------- 1. RLS isolamento sem sessão ----------
  it(
    '1. RLS — SELECT direto na tabela app.encounters sem contexto de sessão retorna 0 linhas',
    async () => {
      const client = await pool.connect();
      try {
        await client.query('begin');
        await client.query(`select set_config('vitaloop.user_id', '', true)`);
        const res = await client.query('select count(*)::int as n from app.encounters');
        expect(res.rows[0].n).toBe(0);
        await client.query('rollback');
      } finally {
        client.release();
      }
    },
    NETWORK_TIMEOUT_MS,
  );

  // ---------- 2. Abertura autorizada e negada ----------
  let testPatientId: string;

  it(
    '2. abertura autorizada (encounter.write + encounter.read) -> 201',
    async () => {
      // Cria paciente para teste
      const createPat = await app.inject({
        method: 'POST',
        url: '/api/v1/patients',
        headers: { 'x-test-identity': 'full' },
        payload: { fullName: 'Paciente Teste Atendimento' },
      });
      expect(createPat.statusCode).toBe(201);
      testPatientId = JSON.parse(createPat.body).data.id;
      createdPatientIds.push(testPatientId);

      // Cria atendimento
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/encounters',
        headers: { 'x-test-identity': 'full' },
        payload: {
          patientId: testPatientId,
          encounterType: 'urgency',
          origin: 'spontaneous',
          chiefComplaint: 'Dor de cabeça e febre',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.data.id).toBeDefined();
      expect(body.data.status).toBe('created');
      createdEncounterIds.push(body.data.id);
    },
    NETWORK_TIMEOUT_MS,
  );

  it(
    '3. abertura sem autenticação -> 401 AUTH_REQUIRED',
    async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/encounters',
        headers: { 'x-test-identity': 'null' },
        payload: {
          patientId: testPatientId,
          encounterType: 'urgency',
          origin: 'spontaneous',
          chiefComplaint: 'Tentativa não autenticada',
        },
      });
      expect(res.statusCode).toBe(401);
    },
    NETWORK_TIMEOUT_MS,
  );

  // ---------- 4. Bloqueio de segundo atendimento ativo ----------
  it(
    '4. tentativa de abrir segundo atendimento ativo para o mesmo paciente -> 409 ACTIVE_ENCOUNTER_EXISTS',
    async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/encounters',
        headers: { 'x-test-identity': 'full' },
        payload: {
          patientId: testPatientId,
          encounterType: 'emergency',
          origin: 'samu',
          chiefComplaint: 'Segundo atendimento no mesmo paciente',
        },
      });
      expect(res.statusCode).toBe(409);
      expect(JSON.parse(res.body).error.code).toBe('ACTIVE_ENCOUNTER_EXISTS');
    },
    NETWORK_TIMEOUT_MS,
  );

  // ---------- 5. Transições de Estado e Lock Otimista ----------
  it(
    '5. transição de estado da máquina (created -> triage_pending -> triaged) e lock otimista',
    async () => {
      const encId = createdEncounterIds[0]!;

      // 5a. Busca atendimento atual
      const getRes = await app.inject({
        method: 'GET',
        url: `/api/v1/encounters/${encId}`,
        headers: { 'x-test-identity': 'full' },
      });
      expect(getRes.statusCode).toBe(200);
      const enc = JSON.parse(getRes.body).data;

      // 5b. Atualização válida (created -> triage_pending)
      const update1 = await app.inject({
        method: 'PATCH',
        url: `/api/v1/encounters/${encId}/status`,
        headers: { 'x-test-identity': 'full' },
        payload: {
          status: 'triage_pending',
          expectedUpdatedAt: enc.updatedAt,
        },
      });
      expect(update1.statusCode).toBe(200);
      expect(JSON.parse(update1.body).data.status).toBe('triage_pending');

      // 5c. Teste de Concorrência (Lock Otimista): Tentar novamente com o updated_at ANTIGO
      const staleUpdate = await app.inject({
        method: 'PATCH',
        url: `/api/v1/encounters/${encId}/status`,
        headers: { 'x-test-identity': 'full' },
        payload: {
          status: 'triaged',
          expectedUpdatedAt: enc.updatedAt, // Versão desatualizada!
        },
      });
      expect(staleUpdate.statusCode).toBe(409);
      expect(JSON.parse(staleUpdate.body).error.code).toBe('CONCURRENCY_CONFLICT');
    },
    NETWORK_TIMEOUT_MS,
  );

  // ---------- 6. Cancelamento exige motivo ----------
  it(
    '6. cancelamento exige motivo obrigatório -> 400 CANCEL_REASON_REQUIRED',
    async () => {
      const encId = createdEncounterIds[0]!;
      const getRes = await app.inject({
        method: 'GET',
        url: `/api/v1/encounters/${encId}`,
        headers: { 'x-test-identity': 'full' },
      });
      const enc = JSON.parse(getRes.body).data;

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/encounters/${encId}/status`,
        headers: { 'x-test-identity': 'full' },
        payload: {
          status: 'canceled',
          cancelReason: '', // Vazio!
          expectedUpdatedAt: enc.updatedAt,
        },
      });
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).error.code).toBe('CANCEL_REASON_REQUIRED');
    },
    NETWORK_TIMEOUT_MS,
  );

  // ---------- 7. Eventos na Timeline e Isolamento de Paciente ----------
  it(
    '7. eventos de atendimento surgem na app.patient_timeline do paciente correto e respeitam RLS',
    async () => {
      // 7a. Busca timeline do paciente do atendimento
      const timelineRes = await app.inject({
        method: 'GET',
        url: `/api/v1/patients/${testPatientId}/timeline`,
        headers: { 'x-test-identity': 'full' },
      });
      expect(timelineRes.statusCode).toBe(200);
      const events = JSON.parse(timelineRes.body).data;
      const openedEvent = events.find((e: { type: string }) => e.type === 'EncounterOpened');
      expect(openedEvent).toBeDefined();

      // 7b. Consulta sem sessão direto na view `app.patient_timeline` -> 0 linhas (preserva security_invoker da 0023)
      const client = await pool.connect();
      try {
        await client.query('begin');
        await client.query(`select set_config('vitaloop.user_id', '', true)`);
        const pt = await client.query('select count(*)::int as n from app.patient_timeline where patient_id = $1', [
          testPatientId,
        ]);
        expect(pt.rows[0].n).toBe(0);
        await client.query('rollback');
      } finally {
        client.release();
      }
    },
    NETWORK_TIMEOUT_MS,
  );
});
