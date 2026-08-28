import { describe, it, expect } from 'vitest';
import { extractBearerToken, resolveRequestIdentity } from './request-identity.js';
import { createStaticJwtVerifier, InvalidTokenError } from './jwt-verifier.js';
import type { SupabaseJwtClaims } from './jwt-verifier.js';
import type pg from 'pg';

describe('extractBearerToken', () => {
  it('extracts a valid Bearer token', () => {
    expect(extractBearerToken('Bearer abc.def.ghi')).toBe('abc.def.ghi');
    expect(extractBearerToken('bearer abc')).toBe('abc');
  });
  it('returns null for missing/malformed header', () => {
    expect(extractBearerToken(undefined)).toBeNull();
    expect(extractBearerToken('Basic xyz')).toBeNull();
    expect(extractBearerToken('')).toBeNull();
  });
});

const claims: SupabaseJwtClaims = { sub: 'auth-1', aud: 'authenticated' };

describe('resolveRequestIdentity', () => {
  it('returns null without an Authorization header', async () => {
    const verifier = createStaticJwtVerifier(new Map([['t', claims]]));
    const identity = await resolveRequestIdentity(undefined, verifier, null);
    expect(identity).toBeNull();
  });

  it('throws InvalidTokenError for an unknown/invalid token', async () => {
    const verifier = createStaticJwtVerifier(new Map());
    await expect(
      resolveRequestIdentity('Bearer bogus', verifier, null),
    ).rejects.toBeInstanceOf(InvalidTokenError);
  });

  it('returns credential-only identity when db is not configured', async () => {
    const verifier = createStaticJwtVerifier(new Map([['t', claims]]));
    const identity = await resolveRequestIdentity('Bearer t', verifier, null);
    expect(identity).toEqual({
      authUserId: 'auth-1',
      appUserId: null,
      appUserStatus: null,
      roles: [],
    });
  });

  it('resolves institutional identity and roles via db.resolve_app_identity', async () => {
    const verifier = createStaticJwtVerifier(new Map([['t', claims]]));
    const fakeDb = {
      query: async () => ({
        rows: [{ user_id: 'app-1', status: 'active', roles: ['enfermeiro'] }],
      }),
    } as unknown as pg.Pool;
    const identity = await resolveRequestIdentity('Bearer t', verifier, fakeDb);
    expect(identity).toEqual({
      authUserId: 'auth-1',
      appUserId: 'app-1',
      appUserStatus: 'active',
      roles: ['enfermeiro'],
    });
  });

  it('returns credential-only identity when no institutional row exists (deny-by-default)', async () => {
    const verifier = createStaticJwtVerifier(new Map([['t', claims]]));
    const fakeDb = {
      query: async () => ({ rows: [] }),
    } as unknown as pg.Pool;
    const identity = await resolveRequestIdentity('Bearer t', verifier, fakeDb);
    expect(identity?.appUserId).toBeNull();
    expect(identity?.roles).toEqual([]);
  });
});
