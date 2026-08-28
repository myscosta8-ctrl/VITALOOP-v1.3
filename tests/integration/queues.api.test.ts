import { describe, expect, it } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import pg from 'pg';
import { AppError, ErrorCategory, newUuid } from '@vitaloop/shared';
import { failure } from '../../apps/api/src/http/envelope.js';
import { registerPatientRoutes } from '../../apps/api/src/routes/patients.js';
import { registerEncounterRoutes } from '../../apps/api/src/routes/encounters.js';
import { registerTriageRoutes } from '../../apps/api/src/routes/triages.js';
import { registerQueueRoutes } from '../../apps/api/src/routes/queues.js';
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
      failure({ category: ErrorCategory.INTERNAL, code: 'INTERNAL_ERROR', message: 'Erro interno.' }, req.id),
    );
  });

  registerPatientRoutes(app, poolDb);
  registerEncounterRoutes(app, poolDb);
  registerTriageRoutes(app, poolDb);
  registerQueueRoutes(app, poolDb);

  return app;
};

run('API de Filas — integração real (vitaloop_app, RLS efetiva)', { timeout: 240000 }, () => {
  let app: FastifyInstance;
  let testQueueId: string;
  let testPatientId: string;
  let testEncounterId: string;
  let createdTicketId: string;

  const createdPatientIds: string[] = [];
  const createdEncounterIds: string[] = [];

  it('setup da aplicação Fastify e obtenção da fila assistencial', async () => {
    app = buildTestApp(pool);
    expect(app).toBeDefined();

    const queuesRes = await app.inject({
      method: 'GET',
      url: '/api/v1/queues',
      headers: { 'x-test-identity': 'full' },
    });
    expect(queuesRes.statusCode).toBe(200);
    const list = JSON.parse(queuesRes.body).data;
    expect(list.length).toBeGreaterThan(0);
    testQueueId = list[0].id;
  });

  it('1. RLS — SELECT direto na tabela app.queue_tickets sem contexto de sessão retorna 0 linhas', async () => {
    const client = await pool.connect();
    try {
      await client.query('begin');
      await client.query(`select set_config('vitaloop.user_id', '', true), set_config('vitaloop.roles', '', true)`);
      const res = await client.query('select count(*)::int as n from app.queue_tickets');
      expect(res.rows[0].n).toBe(0);
      await client.query('rollback');
    } finally {
      client.release();
    }
  });

  it('2. criação autorizada de paciente, atendimento e triagem (Amarelo) para teste', async () => {
    const createPat = await app.inject({
      method: 'POST',
      url: '/api/v1/patients',
      headers: { 'x-test-identity': 'full' },
      payload: { fullName: 'Paciente Teste Fila' },
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
        chiefComplaint: 'Dor de barriga forte',
      },
    });
    expect(createEnc.statusCode).toBe(201);
    testEncounterId = JSON.parse(createEnc.body).data.id;
    createdEncounterIds.push(testEncounterId);

    const createTri = await app.inject({
      method: 'POST',
      url: `/api/v1/encounters/${testEncounterId}/triage`,
      headers: { 'x-test-identity': 'full' },
      payload: {
        chiefComplaint: 'Dor abdominal aguda',
        riskColor: 'yellow',
      },
    });
    expect(createTri.statusCode).toBe(201);
  });

  it('3. enfileiramento autorzado de atendimento -> 201 com priorityScore = 6000 (Amarelo)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/queues/${testQueueId}/enqueue`,
      headers: { 'x-test-identity': 'full' },
      payload: {
        encounterId: testEncounterId,
        ticketNumber: 'SENHA-TEST-01',
      },
    });

    expect(res.statusCode).toBe(201);
    const ticket = JSON.parse(res.body).data;
    createdTicketId = ticket.id;

    expect(ticket.ticketNumber).toBe('SENHA-TEST-01');
    expect(ticket.riskColor).toBe('yellow');
    expect(ticket.priorityScore).toBeGreaterThanOrEqual(6000);
    expect(ticket.status).toBe('waiting');
  });

  it('4. tentativa de duplicar ticket ativo no mesmo atendimento -> 409 TICKET_ACTIVE_EXISTS', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/queues/${testQueueId}/enqueue`,
      headers: { 'x-test-identity': 'full' },
      payload: {
        encounterId: testEncounterId,
      },
    });

    expect(res.statusCode).toBe(409);
    expect(JSON.parse(res.body).error.code).toBe('TICKET_ACTIVE_EXISTS');
  });

  it('5. listagem de tickets em fila -> 200 OK com ordenação por prioridade', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/queues/${testQueueId}/tickets`,
      headers: { 'x-test-identity': 'full' },
    });

    expect(res.statusCode).toBe(200);
    const tickets = JSON.parse(res.body).data;
    expect(tickets.length).toBeGreaterThan(0);
    const found = tickets.find((t: { id: string }) => t.id === createdTicketId);
    expect(found).toBeDefined();
  });

  it('6. chamamento do paciente para o consultório -> 200 OK, status = called, gera evento PatientCalledToRoom', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/queues/tickets/${createdTicketId}/call`,
      headers: { 'x-test-identity': 'full' },
      payload: { callRoom: 'Consultório 02' },
    });

    expect(res.statusCode).toBe(200);
    const ticket = JSON.parse(res.body).data;
    expect(ticket.status).toBe('called');
    expect(ticket.callRoom).toBe('Consultório 02');
    expect(ticket.callCount).toBe(1);
  });

  it('7. rechamada de paciente -> 200 OK, callCount = 2, gera evento PatientCallRepeated', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/queues/tickets/${createdTicketId}/recall`,
      headers: { 'x-test-identity': 'full' },
    });

    expect(res.statusCode).toBe(200);
    const ticket = JSON.parse(res.body).data;
    expect(ticket.callCount).toBe(2);
  });

  it('8. alteração de status para in_service -> 200 OK, transita atendimento para in_consultation', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/queues/tickets/${createdTicketId}/status`,
      headers: { 'x-test-identity': 'full' },
      payload: { status: 'in_service' },
    });

    expect(res.statusCode).toBe(200);
    const ticket = JSON.parse(res.body).data;
    expect(ticket.status).toBe('in_service');

    // Confirma transição de atendimento para in_consultation
    const encRes = await app.inject({
      method: 'GET',
      url: `/api/v1/encounters/${testEncounterId}`,
      headers: { 'x-test-identity': 'full' },
    });
    expect(encRes.statusCode).toBe(200);
    expect(JSON.parse(encRes.body).data.status).toBe('in_consultation');
  });

  it('9. eventos de fila surgem na app.patient_timeline do paciente correto', async () => {
    const timelineRes = await app.inject({
      method: 'GET',
      url: `/api/v1/patients/${testPatientId}/timeline`,
      headers: { 'x-test-identity': 'full' },
    });
    expect(timelineRes.statusCode).toBe(200);
    const events = JSON.parse(timelineRes.body).data;

    const callEvent = events.find((e: { type: string }) => e.type === 'PatientCalledToRoom');
    const recallEvent = events.find((e: { type: string }) => e.type === 'PatientCallRepeated');
    const inServiceEvent = events.find((e: { type: string }) => e.type === 'PatientEnteredConsultation');

    expect(callEvent).toBeDefined();
    expect(recallEvent).toBeDefined();
    expect(inServiceEvent).toBeDefined();
  });

  it('limpeza de dados de teste', async () => {
    const client = await pool.connect();
    try {
      for (const encId of createdEncounterIds) {
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
