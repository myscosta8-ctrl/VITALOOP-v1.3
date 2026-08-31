/**
 * Carregamento e validação de ambiente (Doc 2 §59/§60).
 *
 * - Segredos NUNCA no código; vêm do ambiente.
 * - Supabase é opcional/PENDENTE nesta fase: variáveis ausentes não quebram a
 *   fundação; a ausência é reportada, nunca preenchida automaticamente.
 */

import { z } from 'zod';

export const NodeEnv = z.enum(['development', 'test', 'staging', 'production']);
export type NodeEnv = z.infer<typeof NodeEnv>;

const csvOrigins = z
  .string()
  .optional()
  .transform((v) =>
    (v ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0),
  );

export const EnvSchema = z.object({
  NODE_ENV: NodeEnv.default('development'),
  PORT: z.coerce.number().int().positive().max(65535).default(3000),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .default('info'),
  CORS_ALLOWED_ORIGINS: csvOrigins,
  // Vazio => banco não configurado (readiness reporta not_configured).
  DATABASE_URL: z
    .string()
    .url()
    .optional()
    .or(z.literal('').transform(() => undefined)),
  // URL pública do projeto Supabase (não é segredo — necessária para JWKS de auth).
  SUPABASE_URL: z
    .string()
    .url()
    .optional()
    .or(z.literal('').transform(() => undefined)),
  // Chave anon/publishable (pública por design — Doc 2 §2.2). NUNCA service_role aqui.
  SUPABASE_ANON_KEY: z
    .string()
    .optional()
    .or(z.literal('').transform(() => undefined)),
});

export type Env = z.infer<typeof EnvSchema>;

export interface LoadedConfig {
  readonly env: Env;
  readonly databaseConfigured: boolean;
  /** Verificação de JWT (JWKS) disponível — não implica banco/Storage/Realtime configurados. */
  readonly supabaseAuthConfigured: boolean;
}

/**
 * Valida `source` (default process.env) e retorna configuração tipada.
 * Lança com mensagem agregada em caso de configuração inválida (falha rápida).
 */
export const loadConfig = (
  source: Record<string, string | undefined> = process.env,
): LoadedConfig => {
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    throw new Error(`Configuração de ambiente inválida: ${issues}`);
  }
  return {
    env: parsed.data,
    databaseConfigured: parsed.data.DATABASE_URL !== undefined,
    supabaseAuthConfigured: parsed.data.SUPABASE_URL !== undefined,
  };
};

export const validateProductionEnv = (
  source: Record<string, string | undefined> = process.env,
): LoadedConfig => {
  const config = loadConfig(source);
  if (config.env.NODE_ENV === 'production') {
    if (!config.env.DATABASE_URL) {
      throw new Error('Configuração de produção inválida: DATABASE_URL é obrigatória em produção.');
    }
    if (!config.env.CORS_ALLOWED_ORIGINS || config.env.CORS_ALLOWED_ORIGINS.length === 0) {
      throw new Error('Configuração de produção inválida: CORS_ALLOWED_ORIGINS é obrigatória em produção.');
    }
  }
  return config;
};
