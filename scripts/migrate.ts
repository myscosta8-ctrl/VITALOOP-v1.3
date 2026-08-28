/**
 * Runner de migrations LOCAL (Doc 2 §65).
 *
 * - Aplica os arquivos db/migrations/*.sql em ordem, de forma idempotente,
 *   registrando cada versão em app.schema_migrations.
 * - Usa exclusivamente DATABASE_URL (Postgres LOCAL). NÃO conecta a Supabase remoto.
 * - `--status` apenas lista o que está aplicado/pendente, sem executar.
 *
 * Uso:
 *   DATABASE_URL=postgres://user:pass@localhost:5432/vitaloop node --experimental-strip-types scripts/migrate.ts
 *   node --experimental-strip-types scripts/migrate.ts --status
 */

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, '..', 'db', 'migrations');

const statusOnly = process.argv.includes('--status');

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error(
    'DATABASE_URL ausente. Configure um Postgres LOCAL. ' +
      'SUPABASE — PENDENTE DE CONFIGURAÇÃO: não usar remoto nesta fase.',
  );
  process.exit(1);
}

const listMigrations = (): { version: string; path: string; sql: string }[] =>
  readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => ({
      version: f.replace(/\.sql$/, ''),
      path: join(MIGRATIONS_DIR, f),
      sql: readFileSync(join(MIGRATIONS_DIR, f), 'utf8'),
    }));

const checksum = (sql: string): string =>
  createHash('sha256').update(sql).digest('hex').slice(0, 16);

const main = async (): Promise<void> => {
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    // Garante a tabela de controle (0001 também a cria; aqui é defensivo).
    await client.query('create schema if not exists app');
    await client.query(
      `create table if not exists app.schema_migrations (
         version text primary key,
         applied_at timestamptz not null default now(),
         checksum text)`,
    );

    const applied = new Set(
      (await client.query('select version from app.schema_migrations')).rows.map(
        (r: { version: string }) => r.version,
      ),
    );
    const all = listMigrations();

    if (statusOnly) {
      for (const m of all) {
        console.log(`${applied.has(m.version) ? '[applied]' : '[pending]'} ${m.version}`);
      }
      return;
    }

    for (const m of all) {
      if (applied.has(m.version)) continue;
      console.log(`applying ${m.version} ...`);
      await client.query('begin');
      try {
        await client.query(m.sql);
        await client.query(
          'insert into app.schema_migrations(version, checksum) values ($1, $2)',
          [m.version, checksum(m.sql)],
        );
        await client.query('commit');
        console.log(`  ok ${m.version}`);
      } catch (e) {
        await client.query('rollback');
        console.error(`  FAILED ${m.version}:`, (e as Error).message);
        throw e;
      }
    }
    console.log('migrations up to date.');
  } finally {
    await client.end();
  }
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
