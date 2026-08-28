/**
 * Pool PostgreSQL opcional (Doc 2 §6).
 *
 * Na Fase 0 o banco pode não estar configurado (SUPABASE — PENDENTE). Quando
 * DATABASE_URL estiver ausente, `db` é null e o readiness reporta not_configured.
 * NUNCA aponta para Supabase remoto nesta fase.
 */

import pg from 'pg';

export type Db = pg.Pool | null;

export const createPool = (databaseUrl: string | undefined): Db => {
  if (!databaseUrl) return null;
  return new pg.Pool({
    connectionString: databaseUrl,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    // Timezone/UTF-8 consistentes são garantidos no servidor Postgres (migration 0001).
  });
};

export const pingDb = async (db: Db): Promise<boolean> => {
  if (!db) return false;
  const res = await db.query('select 1 as ok');
  return res.rows[0]?.ok === 1;
};
