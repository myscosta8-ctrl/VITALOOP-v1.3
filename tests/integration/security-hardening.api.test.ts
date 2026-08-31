import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import pg from 'pg';
import { ErrorCategory } from '@vitaloop/shared';
import { securityHeaders } from '../../apps/api/src/http/security-headers.js';
import { makeCorsHook } from '../../apps/api/src/http/cors.js';
import { registerPatientRoutes } from '../../apps/api/src/routes/patients.js';
import { registerSecurityRoutes } from '../../apps/api/src/routes/security.js';
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

const identityNoPermissions = {
  authUserId: 'auth-none',
  appUserId: '83ad7af3-c506-48be-b2a0-6fbd0bb6bf1b',
  appUserStatus: 'active',
  roles: ['guest'],
};

const buildTestApp = (): FastifyInstance => {
  const app = Fastify();

  app.addHook('onRequest', securityHeaders);
  app.addHook('onRequest', makeCorsHook(['https://app.vitaloop.com.br']));

  app.addHook('onRequest', async (req) => {
    const identityHeader = req.headers['x-test-identity'] as string;
    if (identityHeader === 'full') {
      req.identity = identityFull;
    } else if (identityHeader === 'guest') {
      req.identity = identityNoPermissions;
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
  registerSecurityRoutes(app, poolDb);

  return app;
};

describe('API Suíte de PenTest & Hardening de Segurança (SEC-T-001..011) — integração real (vitaloop_app, RLS)', () => {
  let app: FastifyInstance;

  let testPatientId: string;
  let testLogId: string;

  beforeAll(async () => {
    app = buildTestApp();
    await app.ready();
  });

  afterAll(async () => {
    if (app) await app.close();
    if (poolDb) await poolDb.end();
    if (poolAdmin) await poolAdmin.end();
  });

  it('1. SEC-T-009 — Cabeçalhos HTTP de segurança obrigatórios estão presentes nas respostas (HSTS, CSP, X-Content-Type-Options)', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/security/hardening-status', headers: { 'x-test-identity': 'full' } });
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['strict-transport-security']).toContain('max-age=31536000');
    expect(res.headers['content-security-policy']).toBeTruthy();
  }, 30000);

  it('2. SEC-T-008 — CORS Restritivo emite Access-Control-Allow-Origin apenas para origens configuradas', async () => {
    const resValid = await app.inject({
      method: 'GET',
      url: '/api/v1/security/hardening-status',
      headers: { Origin: 'https://app.vitaloop.com.br', 'x-test-identity': 'full' },
    });
    expect(resValid.headers['access-control-allow-origin']).toBe('https://app.vitaloop.com.br');

    const resInvalid = await app.inject({
      method: 'GET',
      url: '/api/v1/security/hardening-status',
      headers: { Origin: 'https://malicious-attacker-domain.com', 'x-test-identity': 'full' },
    });
    expect(resInvalid.headers['access-control-allow-origin']).toBeUndefined();
  }, 30000);

  it('3. SEC-T-004 — Bloqueio estrito de Bypass de RBAC sem permissão necessária (403 ACCESS_DENIED)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/patients',
      headers: { 'x-test-identity': 'guest' },
      payload: { fullName: 'Tentativa de Injeção de Paciente Sem Permissão' },
    });
    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.body);
    expect(body.error.code).toBe('ACCESS_DENIED');
  }, 30000);

  it('4. SEC-T-003 / SEC-T-001 — Inviolabilidade de RLS — SELECT direto sem GUC de sessão retorna 0 linhas', async () => {
    const client = await poolDb.connect();
    try {
      const { rows } = await client.query('select * from app.security_event_logs');
      expect(rows.length).toBe(0);
    } finally {
      client.release();
    }
  }, 30000);

  it('5. SEC-T-005 — Tentativa de SQL Injection via parâmetro de entrada é detectada e bloqueada (400 SQLI_PATTERN_DETECTED)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/security/events',
      headers: { 'x-test-identity': 'full' },
      payload: {
        eventType: 'PEN_TEST',
        severity: 'WARNING',
        endpoint: '/api/v1/patients/1\' OR \'1\'=\'1',
        payloadSummary: 'UNION SELECT username, password FROM app.users--',
      },
    });
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error.code).toBe('SQLI_PATTERN_DETECTED');
  }, 30000);

  it('6. SEC-T-006 — Tentativa de XSS em campos de texto é sanitizada com escape de entidades HTML no banco', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/security/events',
      headers: { 'x-test-identity': 'full' },
      payload: {
        eventType: 'XSS_TEST',
        severity: 'INFO',
        endpoint: '/api/v1/security/logs',
        payloadSummary: '<script>alert("XSS")</script>',
      },
    });
    expect(res.statusCode).toBe(201);
    const data = JSON.parse(res.body).data;
    testLogId = data.id;

    // Verificar via client admin que o payload foi sanitizado no banco
    const clientAdmin = await poolAdmin.connect();
    try {
      const { rows } = await clientAdmin.query('select payload_summary from app.security_event_logs where id = $1', [testLogId]);
      expect(rows[0].payload_summary).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');
    } finally {
      clientAdmin.release();
    }
  }, 30000);

  it('7. SEC-T-010 / SEC-T-011 — Redação de secrets e mascaramento de logs em respostas e auditoria', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/security/hardening-status', headers: { 'x-test-identity': 'full' } });
    expect(res.statusCode).toBe(200);
    const bodyText = res.body;
    expect(bodyText).not.toContain('DATABASE_URL');
    expect(bodyText).not.toContain('SUPABASE_SERVICE_ROLE');
  }, 30000);

  it('8. Limpeza de dados de teste de segurança', async () => {
    const clientAdmin = await poolAdmin.connect();
    try {
      if (testLogId) {
        await clientAdmin.query('delete from app.security_event_logs where id = $1', [testLogId]);
      }
      if (testPatientId) {
        await clientAdmin.query('delete from app.patients where id = $1', [testPatientId]);
      }
    } finally {
      clientAdmin.release();
    }
  }, 30000);
});
