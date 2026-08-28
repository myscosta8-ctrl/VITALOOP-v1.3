-- =====================================================================
-- VITALOOP 1.3 — Migration 0001
-- Extensões, schemas e convenções base (Doc 2 §6/§8)
-- Compatível com PostgreSQL puro e Supabase. NÃO executar remotamente nesta fase.
-- =====================================================================

-- pgcrypto: gen_random_uuid() para PKs uuid (Doc 2 §8 PK id uuid).
create extension if not exists pgcrypto;

-- Schema de aplicação (domínio + segurança + auditoria).
create schema if not exists app;

-- Timezone consistente (Doc 2 §6). Eventos usam timestamptz sempre.
-- (Definição efetiva de timezone do cluster é responsabilidade de infra.)
comment on schema app is 'VITALOOP 1.3 — schema de aplicação (identidade, RBAC, auditoria, eventos, timeline).';

-- Controle de migrations aplicadas (usado pelo runner local scripts/migrate.ts).
create table if not exists app.schema_migrations (
  version      text primary key,
  applied_at   timestamptz not null default now(),
  checksum     text
);

comment on table app.schema_migrations is 'Registro idempotente de migrations aplicadas.';
