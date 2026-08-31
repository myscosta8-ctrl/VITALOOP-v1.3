import { describe, it, expect } from 'vitest';
import { loadConfig, validateProductionEnv } from './env.js';

describe('loadConfig', () => {
  it('applies safe defaults with empty source', () => {
    const cfg = loadConfig({});
    expect(cfg.env.NODE_ENV).toBe('development');
    expect(cfg.env.PORT).toBe(3000);
    expect(cfg.env.LOG_LEVEL).toBe('info');
    expect(cfg.databaseConfigured).toBe(false);
    expect(cfg.supabaseAuthConfigured).toBe(false);
  });

  it('parses CORS origins as a trimmed list', () => {
    const cfg = loadConfig({ CORS_ALLOWED_ORIGINS: ' https://a.test, https://b.test ' });
    expect(cfg.env.CORS_ALLOWED_ORIGINS).toEqual(['https://a.test', 'https://b.test']);
  });

  it('marks database configured only with a valid URL', () => {
    expect(loadConfig({ DATABASE_URL: '' }).databaseConfigured).toBe(false);
    const cfg = loadConfig({ DATABASE_URL: 'postgres://u:p@localhost:5432/db' });
    expect(cfg.databaseConfigured).toBe(true);
  });

  it('rejects an invalid PORT', () => {
    expect(() => loadConfig({ PORT: 'not-a-number' })).toThrow(/Configuração de ambiente inválida/);
  });

  it('marks supabase auth configured only when SUPABASE_URL is a valid URL', () => {
    expect(loadConfig({}).supabaseAuthConfigured).toBe(false);
    const cfg = loadConfig({ SUPABASE_URL: 'https://x.supabase.co' });
    expect(cfg.supabaseAuthConfigured).toBe(true);
  });

  it('exige DATABASE_URL e CORS_ALLOWED_ORIGINS em produção (PRD-003, PRD-004)', () => {
    expect(() => loadConfig({ NODE_ENV: 'production' })).not.toThrow();
    expect(() => validateProductionEnv({ NODE_ENV: 'production' })).toThrow(/DATABASE_URL é obrigatória em produção/);
    expect(() => validateProductionEnv({ NODE_ENV: 'production', DATABASE_URL: 'postgres://u:p@localhost:5432/db' })).toThrow(/CORS_ALLOWED_ORIGINS é obrigatória em produção/);
    expect(() => validateProductionEnv({ NODE_ENV: 'production', DATABASE_URL: 'postgres://u:p@localhost:5432/db', CORS_ALLOWED_ORIGINS: 'https://app.vitaloop.com.br' })).not.toThrow();
  });
});
