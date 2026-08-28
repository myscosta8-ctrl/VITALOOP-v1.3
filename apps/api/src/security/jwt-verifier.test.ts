import { describe, it, expect } from 'vitest';
import { SignJWT, generateKeyPair, exportJWK } from 'jose';
import { createLocalJWKSet, jwtVerify } from 'jose';
import { createStaticJwtVerifier, InvalidTokenError } from './jwt-verifier.js';
import type { SupabaseJwtClaims } from './jwt-verifier.js';

describe('createStaticJwtVerifier (test double)', () => {
  it('resolves claims for a known token', async () => {
    const claims: SupabaseJwtClaims = { sub: 'user-1', aud: 'authenticated', role: 'authenticated' };
    const verifier = createStaticJwtVerifier(new Map([['tok-1', claims]]));
    const result = await verifier.verify('tok-1');
    expect(result.sub).toBe('user-1');
  });

  it('rejects an unknown token', async () => {
    const verifier = createStaticJwtVerifier(new Map());
    await expect(verifier.verify('bogus')).rejects.toBeInstanceOf(InvalidTokenError);
  });
});

// Prova a LÓGICA de verificação (issuer/audience/assinatura ES256) contra um par de
// chaves de teste gerado localmente — não usa a chave real do Supabase (só pública,
// mas ainda assim geramos uma própria para não depender de rede neste teste unitário).
describe('ES256 JWT verification logic (isolated key pair)', () => {
  it('accepts a validly signed token with matching issuer/audience', async () => {
    const { privateKey, publicKey } = await generateKeyPair('ES256');
    const jwk = await exportJWK(publicKey);
    jwk.kid = 'test-key';
    jwk.alg = 'ES256';
    jwk.use = 'sig';

    const token = await new SignJWT({ role: 'authenticated' })
      .setProtectedHeader({ alg: 'ES256', kid: 'test-key' })
      .setSubject('11111111-1111-4111-8111-000000000001')
      .setIssuer('https://example.supabase.co/auth/v1')
      .setAudience('authenticated')
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(privateKey);

    // JWKS local (sem rede) — mesma verificação criptográfica que createSupabaseJwtVerifier
    // faz contra o JWKS público do projeto, só que aqui com chave de teste isolada.
    const jwks = createLocalJWKSet({ keys: [jwk as never] });

    const { payload } = await jwtVerify(token, jwks, {
      issuer: 'https://example.supabase.co/auth/v1',
      audience: 'authenticated',
    });
    expect(payload.sub).toBe('11111111-1111-4111-8111-000000000001');
  });
});
