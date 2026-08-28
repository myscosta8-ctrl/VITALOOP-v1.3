-- =====================================================================
-- VITALOOP 1.3 — Migration 0004
-- Sessões (Doc 2 §24). Revogação/expiração explícitas.
-- Armazena apenas hash do token de sessão, nunca o token em claro.
-- =====================================================================

create table app.sessions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references app.users(id) on delete cascade,
  token_hash     text not null,
  created_at     timestamptz not null default now(),
  last_used_at   timestamptz,
  expires_at     timestamptz not null,
  revoked_at     timestamptz,
  ip_hash        text,
  user_agent     text,
  constraint sessions_token_hash_uk unique (token_hash),
  constraint sessions_expiry_ck check (expires_at > created_at)
);
create index sessions_user_idx on app.sessions(user_id);
create index sessions_active_idx on app.sessions(user_id) where revoked_at is null;

comment on column app.sessions.token_hash is 'Hash do token de sessão. NUNCA armazenar o token em claro (Doc 2 §25).';
comment on column app.sessions.ip_hash is 'IP em hash por padrão (minimização LGPD, Doc 2 §52). Política definitiva: NÃO DEFINIDO — NECESSITA DECISÃO.';
