/**
 * Testes de integração da fundação de banco (Doc 2 §70; Doc 3 §34 DB/RLS).
 *
 * Auto-skip quando DATABASE_URL não está definido — na Fase 0 o banco pode não
 * existir (SUPABASE — PENDENTE). Quando um Postgres LOCAL estiver disponível e
 * migrado, estes testes validam COMPORTAMENTO (não apenas existência):
 *   - append-only de audit_events;
 *   - unicidade de idempotência;
 *   - timeline derivada de domain_events;
 *   - contexto RLS (ctx_user_id via GUC).
 */

import { describe, it, expect } from 'vitest';
import pg from 'pg';

const url = process.env.DATABASE_URL;
const run = url ? describe : describe.skip;

// Testes de integração real fazem múltiplos round-trips de rede até o Supabase
// (4-8s observados neste ambiente); o timeout padrão de 5s do Vitest causa
// falsos negativos por timeout, não por defeito funcional. Ampliado apenas
// para esta suíte (infraestrutura de teste, não regra de produção).
const NETWORK_TIMEOUT_MS = 20_000;

run('db foundation (requires local DATABASE_URL migrated)', () => {
  const pool = new pg.Pool({ connectionString: url });

  it('audit_events blocks UPDATE (append-only)', async () => {
    const c = await pool.connect();
    try {
      await c.query('begin');
      const ins = await c.query(
        `insert into app.audit_events(action) values ('view') returning id`,
      );
      const id = ins.rows[0].id;
      await expect(
        c.query(`update app.audit_events set reason = 'x' where id = $1`, [id]),
      ).rejects.toThrow();
      await c.query('rollback');
    } finally {
      c.release();
    }
  }, NETWORK_TIMEOUT_MS);

  it('idempotency scope+actor+key is unique', async () => {
    const c = await pool.connect();
    try {
      await c.query('begin');
      // A constraint é (scope, actor_user_id, key). No Postgres, NULL nunca é
      // igual a NULL em UNIQUE — sem vincular um ator real, duas inserções com
      // actor_user_id implícito NULL NUNCA colidem e o teste anterior passava
      // por engano (falso positivo). Criamos um usuário descartável na MESMA
      // transação (desfeito pelo rollback) para exercitar a constraint de
      // verdade, no cenário real de uso (idempotência sempre ligada a um ator).
      const actor = await c.query(
        `insert into app.users(username, name) values ('idem-test-actor', 'Idem Test') returning id`,
      );
      const actorId = actor.rows[0].id;
      await c.query(
        `insert into app.idempotency_keys(key, scope, actor_user_id, request_hash) values ('k','s',$1,'h')`,
        [actorId],
      );
      await expect(
        c.query(
          `insert into app.idempotency_keys(key, scope, actor_user_id, request_hash) values ('k','s',$1,'h2')`,
          [actorId],
        ),
      ).rejects.toThrow();
      await c.query('rollback');
    } finally {
      c.release();
    }
  }, NETWORK_TIMEOUT_MS);

  it('timeline reflects a domain_event', async () => {
    const c = await pool.connect();
    try {
      await c.query('begin');
      const ev = await c.query(
        `insert into app.domain_events(event_type, aggregate_type, aggregate_id)
         values ('X', 'test', gen_random_uuid()) returning id`,
      );
      const found = await c.query(
        `select 1 from app.timeline where event_id = $1`,
        [ev.rows[0].id],
      );
      expect(found.rowCount).toBe(1);
      await c.query('rollback');
    } finally {
      c.release();
    }
  }, NETWORK_TIMEOUT_MS);

  it('security context GUC is readable via app.ctx_user_id()', async () => {
    const c = await pool.connect();
    try {
      await c.query('begin');
      const uid = '00000000-0000-4000-8000-0000000003ff';
      await c.query('select set_config($1,$2,true)', ['vitaloop.user_id', uid]);
      const r = await c.query('select app.ctx_user_id()::text as uid');
      expect(r.rows[0].uid).toBe(uid);
      await c.query('rollback');
    } finally {
      c.release();
    }
  }, NETWORK_TIMEOUT_MS);
});
