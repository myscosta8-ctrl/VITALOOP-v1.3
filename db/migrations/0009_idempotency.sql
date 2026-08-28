-- =====================================================================
-- VITALOOP 1.3 — Migration 0009
-- Idempotência de operações críticas (Doc 2 §48; Doc 3 §39)
-- Uma chave por (scope, actor, key). Guarda resposta para replay seguro.
-- =====================================================================

create table app.idempotency_keys (
  id               uuid primary key default gen_random_uuid(),
  key              text not null,
  scope            text not null,
  actor_user_id    uuid references app.users(id) on delete set null,
  request_hash     text not null,
  response_status  integer,
  response_body    jsonb,
  created_at       timestamptz not null default now(),
  expires_at       timestamptz not null default (now() + interval '24 hours'),
  constraint idempotency_scope_key_uk unique (scope, actor_user_id, key)
);
create index idempotency_expiry_idx on app.idempotency_keys(expires_at);

comment on table app.idempotency_keys is 'Deduplicação de operações repetidas (duplo clique, retry, timeout). Doc 4 §22.';
