import { describe, it, expect, vi } from 'vitest';
import { makeCorsHook } from './cors.js';

const makeReqRes = (origin: string | undefined) => {
  const headers: Record<string, string> = {};
  const req = { headers: { origin } } as unknown as Parameters<ReturnType<typeof makeCorsHook>>[0];
  const reply = {
    header: vi.fn((name: string, value: string) => {
      headers[name] = value;
    }),
  } as unknown as Parameters<ReturnType<typeof makeCorsHook>>[1];
  return { req, reply, headers };
};

describe('makeCorsHook', () => {
  it('nega por padrão — sem CORS_ALLOWED_ORIGINS, nenhuma origem recebe headers', () => {
    const hook = makeCorsHook([]);
    const { req, reply, headers } = makeReqRes('http://localhost:5173');
    hook(req, reply, () => {});
    expect(headers['Access-Control-Allow-Origin']).toBeUndefined();
  });

  it('não abre exceção automática para localhost/127.0.0.1 fora da allowlist', () => {
    const hook = makeCorsHook(['https://vitaloop.example.com']);
    for (const origin of ['http://localhost:5173', 'http://127.0.0.1:5173']) {
      const { req, reply, headers } = makeReqRes(origin);
      hook(req, reply, () => {});
      expect(headers['Access-Control-Allow-Origin']).toBeUndefined();
    }
  });

  it('libera apenas a origem explicitamente configurada na allowlist', () => {
    const hook = makeCorsHook(['http://localhost:5173']);
    const { req, reply, headers } = makeReqRes('http://localhost:5173');
    hook(req, reply, () => {});
    expect(headers['Access-Control-Allow-Origin']).toBe('http://localhost:5173');
    expect(headers['Access-Control-Allow-Credentials']).toBe('true');
  });
});
