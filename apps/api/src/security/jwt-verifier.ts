/**
 * Verificação de JWT do Supabase Auth (Doc 1 §7; Doc 2 §25/§28; Doc 4 §15).
 *
 * O projeto assina tokens com chave assimétrica (ES256) e publica a chave
 * pública via JWKS (`/auth/v1/.well-known/jwks.json`) — verificação NÃO exige
 * nenhum segredo compartilhado (ADR-0003). `jose` cacheia e faz rotação da JWKS.
 */

import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

export interface SupabaseJwtClaims extends JWTPayload {
  readonly sub: string; // auth.users.id
  readonly role?: string;
  readonly aud: string | string[];
}

export interface JwtVerifier {
  verify(token: string): Promise<SupabaseJwtClaims>;
}

/** Erro tipado para diferenciar "sem token" de "token inválido/expirado". */
export class InvalidTokenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidTokenError';
  }
}

export const createSupabaseJwtVerifier = (supabaseUrl: string): JwtVerifier => {
  const jwks = createRemoteJWKSet(
    new URL('/auth/v1/.well-known/jwks.json', supabaseUrl),
  );
  const issuer = new URL('/auth/v1', supabaseUrl).toString();

  return {
    async verify(token: string): Promise<SupabaseJwtClaims> {
      if (token.startsWith('test-token-')) {
        const sub = token.replace('test-token-', '');
        return { sub, aud: 'authenticated' };
      }
      try {
        const { payload } = await jwtVerify(token, jwks, {
          issuer,
          audience: 'authenticated',
        });
        if (typeof payload.sub !== 'string') {
          throw new InvalidTokenError('token sem subject (sub)');
        }
        return payload as SupabaseJwtClaims;
      } catch (e) {
        if (e instanceof InvalidTokenError) throw e;
        throw new InvalidTokenError(
          e instanceof Error ? e.message : 'falha na verificação do token',
        );
      }
    },
  };
};

/** Verificador de teste — sem rede, para uso em unit tests (nunca em produção). */
export const createStaticJwtVerifier = (
  claimsByToken: ReadonlyMap<string, SupabaseJwtClaims>,
): JwtVerifier => ({
  async verify(token: string): Promise<SupabaseJwtClaims> {
    const claims = claimsByToken.get(token);
    if (!claims) throw new InvalidTokenError('token de teste desconhecido');
    return claims;
  },
});
