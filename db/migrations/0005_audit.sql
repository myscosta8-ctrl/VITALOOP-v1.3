-- =====================================================================
-- VITALOOP 1.3 — Migration 0005
-- Auditoria (Doc 1 §10; Doc 2 §39; Doc 4 §16) + break-glass (Doc 1 §9; Doc 2 §23)
-- audit_events é APPEND-ONLY: proteção contra UPDATE/DELETE (trigger + RLS/revoke).
-- =====================================================================

create type app.audit_action as enum (
  'login', 'logout', 'login_failed',
  'access_granted', 'access_denied',
  'view', 'create', 'update', 'sign', 'print', 'download',
  'cancel', 'correct',
  'break_glass', 'permission_change',
  'state_transition'
);

create type app.audit_severity as enum ('info', 'notice', 'warning', 'critical');

create table app.audit_events (
  id             uuid primary key default gen_random_uuid(),
  actor_user_id  uuid references app.users(id) on delete set null,
  session_id     uuid references app.sessions(id) on delete set null,
  action         app.audit_action not null,
  resource_type  text,
  resource_id    uuid,
  -- patient_id/encounter_id ficam sem FK nesta fase (tabelas clínicas ainda não existem).
  -- FKs serão adicionadas quando os módulos clínicos forem criados (fases 2+).
  patient_id     uuid,
  encounter_id   uuid,
  occurred_at    timestamptz not null default now(),
  request_id     text,
  ip_hash        text,
  before_data    jsonb,
  after_data     jsonb,
  reason         text,
  severity       app.audit_severity not null default 'info'
);
create index audit_events_actor_idx on app.audit_events(actor_user_id);
create index audit_events_occurred_idx on app.audit_events(occurred_at);
create index audit_events_resource_idx on app.audit_events(resource_type, resource_id);
create index audit_events_patient_idx on app.audit_events(patient_id) where patient_id is not null;

comment on table app.audit_events is 'Trilha de auditoria append-only (Doc 2 §39). Sem UPDATE/DELETE por operação comum.';

-- Proteção append-only: bloqueia UPDATE/DELETE mesmo para o dono do schema.
create or replace function app.forbid_mutation() returns trigger
language plpgsql as $$
begin
  raise exception 'audit_events é append-only: % não permitido', tg_op
    using errcode = 'insufficient_privilege';
end;
$$;

create trigger audit_events_no_update
  before update on app.audit_events
  for each row execute function app.forbid_mutation();

create trigger audit_events_no_delete
  before delete on app.audit_events
  for each row execute function app.forbid_mutation();

-- --- Break-glass (acesso excepcional) — estrutura extensível (Doc 2 §23) ---
create type app.break_glass_status as enum ('active', 'expired', 'revoked');

create table app.break_glass_access (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references app.users(id) on delete cascade,
  patient_id     uuid,      -- sem FK nesta fase (tabela de pacientes é fase 2)
  encounter_id   uuid,
  reason         text not null,
  justification  text not null,
  granted_at     timestamptz not null default now(),
  expires_at     timestamptz,
  revoked_at     timestamptz,
  status         app.break_glass_status not null default 'active',
  audit_id       uuid references app.audit_events(id) on delete set null,
  constraint break_glass_expiry_ck check (expires_at is null or expires_at > granted_at)
);
create index break_glass_user_idx on app.break_glass_access(user_id);
create index break_glass_patient_idx on app.break_glass_access(patient_id) where patient_id is not null;

comment on table app.break_glass_access is 'Acesso excepcional. Parâmetros de política (duração, quem pode): NÃO DEFINIDO — NECESSITA DECISÃO.';
