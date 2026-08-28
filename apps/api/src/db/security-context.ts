/**
 * Contexto de segurança para RLS (Doc 1 §6/§7/§8; Doc 2 §19/§22; Doc 4 §12/§13).
 *
 * Aplica o contexto do ator como GUC settings (`vitaloop.*`) DENTRO de uma
 * transação, para que as políticas RLS (migration 0010) decidam o acesso no
 * banco — nunca confiando apenas no frontend.
 *
 * Compatível com Postgres puro e com Supabase (quando configurado, o mapeamento
 * auth.uid() -> vitaloop.user_id será definido na etapa de Supabase: PENDENTE).
 */

import type pg from 'pg';

export interface SecurityContext {
  readonly userId: string;
  readonly institutionId?: string;
  readonly unitId?: string;
  readonly sectorId?: string;
  /** Papéis efetivos do ator no contexto (lista). */
  readonly roles?: readonly string[];
  /** Acesso excepcional ativo (break-glass) — auditado à parte. */
  readonly breakGlass?: boolean;
}

/**
 * Executa `fn` dentro de uma transação com o contexto de segurança aplicado via
 * set_config(..., true) (escopo de transação). Faz COMMIT em sucesso e ROLLBACK
 * em erro — garantindo atomicidade (Doc 2 §35).
 */
export const withSecurityContext = async <T>(
  pool: pg.Pool,
  ctx: SecurityContext,
  fn: (client: pg.PoolClient) => Promise<T>,
): Promise<T> => {
  const client = await pool.connect();
  try {
    await client.query('begin');
    await client.query('select set_config($1, $2, true)', [
      'vitaloop.user_id',
      ctx.userId,
    ]);
    await client.query('select set_config($1, $2, true)', [
      'vitaloop.institution_id',
      ctx.institutionId ?? '',
    ]);
    await client.query('select set_config($1, $2, true)', [
      'vitaloop.unit_id',
      ctx.unitId ?? '',
    ]);
    await client.query('select set_config($1, $2, true)', [
      'vitaloop.sector_id',
      ctx.sectorId ?? '',
    ]);
    await client.query('select set_config($1, $2, true)', [
      'vitaloop.roles',
      (ctx.roles ?? []).join(','),
    ]);
    await client.query('select set_config($1, $2, true)', [
      'vitaloop.break_glass',
      ctx.breakGlass ? 'on' : 'off',
    ]);
    const out = await fn(client);
    await client.query('commit');
    return out;
  } catch (e) {
    await client.query('rollback');
    throw e;
  } finally {
    client.release();
  }
};
