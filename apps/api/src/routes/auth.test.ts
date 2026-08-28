/**
 * Testes comportamentais das rotas de identidade/autenticação (Doc 4 §23),
 * com dependências injetadas (SupabaseAuthClient fake, sem rede/DB real).
 * Cobre: usuário não autenticado, credenciais inválidas, rate limiting,
 * bloqueio de brute-force, logout, alteração de senha exigindo sessão.
 */

import { describe, it, expect } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { AppError } from '@vitaloop/shared';
import { failure } from '../http/envelope.js';
import { registerAuthRoutes } from './auth.js';
import { registerMeRoutes } from './me.js';
import { createRateLimiter } from '../security/rate-limiter.js';
import type { SupabaseAuthClient, AuthResult, AuthTokenResponse } from '../security/supabase-auth-client.js';

const okToken: AuthTokenResponse = {
  access_token: 'access-token-value',
  refresh_token: 'refresh-token-value',
  expires_in: 3600,
  token_type: 'bearer',
};

const makeFakeAuthClient = (opts: {
  loginResult?: AuthResult<AuthTokenResponse>;
} = {}): SupabaseAuthClient => ({
  signInWithPassword: async () =>
    opts.loginResult ?? { ok: true, data: okToken },
  signOut: async () => ({ ok: true, data: null }),
  requestPasswordRecovery: async () => ({ ok: true, data: null }),
  updatePassword: async () => ({ ok: true, data: null }),
});

const buildApp = (authClient: SupabaseAuthClient): FastifyInstance => {
  const app = Fastify();
  app.addHook('onRequest', (req, _reply, done) => {
    req.identity = null; // sem identity-plugin real neste teste isolado de rotas
    done();
  });
  app.setErrorHandler((error, req, reply) => {
    if (error instanceof AppError) {
      reply.code(error.httpStatus).send(failure(error.toJSON(), req.id));
      return;
    }
    reply.code(500).send({ error: { code: 'INTERNAL_ERROR', message: 'erro', requestId: req.id } });
  });
  registerAuthRoutes(app, {
    authClient,
    db: null,
    loginLimiter: createRateLimiter({ maxAttempts: 3, windowMs: 60_000 }),
    recoveryLimiter: createRateLimiter({ maxAttempts: 2, windowMs: 60_000 }),
  });
  registerMeRoutes(app);
  return app;
};

describe('POST /api/v1/auth/login', () => {
  it('returns tokens on success', async () => {
    const app = buildApp(makeFakeAuthClient());
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'user@example.com', password: 'secret123' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.accessToken).toBe('access-token-value');
  });

  it('rejects invalid credentials with a generic message', async () => {
    const app = buildApp(
      makeFakeAuthClient({
        loginResult: { ok: false, status: 400, errorCode: 'invalid_credentials', message: 'Invalid login credentials' },
      }),
    );
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'user@example.com', password: 'wrong' },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('AUTH_INVALID_CREDENTIALS');
  });

  it('rejects malformed body with validation error', async () => {
    const app = buildApp(makeFakeAuthClient());
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'not-an-email' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('enforces per-key rate limiting after repeated attempts', async () => {
    const app = buildApp(
      makeFakeAuthClient({
        loginResult: { ok: false, status: 400, errorCode: 'invalid_credentials', message: 'x' },
      }),
    );
    const payload = { email: 'rl@example.com', password: 'wrong' };
    let last;
    for (let i = 0; i < 4; i++) {
      last = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload });
    }
    expect(last!.statusCode).toBe(429);
    expect(last!.json().error.code).toBe('RATE_LIMIT_LOGIN');
  });
});

describe('POST /api/v1/auth/logout', () => {
  it('requires authentication (401 without Bearer token)', async () => {
    const app = buildApp(makeFakeAuthClient());
    const res = await app.inject({ method: 'POST', url: '/api/v1/auth/logout' });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('AUTH_REQUIRED');
  });

  it('succeeds (204) with a Bearer token present', async () => {
    const app = buildApp(makeFakeAuthClient());
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      headers: { authorization: 'Bearer any-token' },
    });
    expect(res.statusCode).toBe(204);
  });
});

describe('POST /api/v1/auth/password/recovery', () => {
  it('returns 202 regardless of whether the email exists (no enumeration)', async () => {
    const app = buildApp(makeFakeAuthClient());
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/password/recovery',
      payload: { email: 'whoever@example.com' },
    });
    expect(res.statusCode).toBe(202);
  });

  it('rate limits repeated recovery requests', async () => {
    const app = buildApp(makeFakeAuthClient());
    const payload = { email: 'flood@example.com' };
    let last;
    for (let i = 0; i < 3; i++) {
      last = await app.inject({ method: 'POST', url: '/api/v1/auth/password/recovery', payload });
    }
    expect(last!.statusCode).toBe(429);
  });
});

describe('POST /api/v1/auth/password/change', () => {
  it('requires authentication', async () => {
    const app = buildApp(makeFakeAuthClient());
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/password/change',
      payload: { newPassword: 'a-strong-password' },
    });
    expect(res.statusCode).toBe(401);
  });
});

describe('GET /api/v1/me', () => {
  it('requires authentication', async () => {
    const app = buildApp(makeFakeAuthClient());
    const res = await app.inject({ method: 'GET', url: '/api/v1/me' });
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('AUTH_REQUIRED');
  });
});
