import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from './server.js';
import { loadConfig } from '@vitaloop/config';

let app: FastifyInstance;

beforeAll(async () => {
  // Sem DATABASE_URL => banco não configurado (estado esperado na Fase 0).
  const config = loadConfig({ NODE_ENV: 'test', LOG_LEVEL: 'error' });
  app = buildServer(config).app;
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe('health/readiness + transversais', () => {
  it('GET /health returns ok and echoes a request id', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.status).toBe('ok');
    expect(body.requestId).toBeTruthy();
    expect(res.headers['x-request-id']).toBeTruthy();
  });

  it('GET /ready reports db and auth not_configured when no env is set', async () => {
    const res = await app.inject({ method: 'GET', url: '/ready' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.ready).toBe(true);
    expect(body.data.db).toBe('not_configured');
    expect(body.data.auth).toBe('not_configured');
  });

  it('applies security headers on every response', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['content-security-policy']).toContain("default-src 'none'");
  });

  it('does not emit CORS headers for a non-allowlisted origin', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { origin: 'https://evil.test' },
    });
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('returns a standardized 404 envelope for unknown routes', async () => {
    const res = await app.inject({ method: 'GET', url: '/nope' });
    expect(res.statusCode).toBe(404);
    const body = res.json();
    expect(body.error.code).toBe('NOT_FOUND_ROUTE');
    expect(body.error.requestId).toBeTruthy();
  });

  it('honors an incoming x-request-id for correlation', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { 'x-request-id': 'corr-123' },
    });
    expect(res.headers['x-request-id']).toBe('corr-123');
    expect(res.json().requestId).toBe('corr-123');
  });
});
