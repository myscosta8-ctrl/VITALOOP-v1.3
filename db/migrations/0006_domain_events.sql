-- =====================================================================
-- VITALOOP 1.3 — Migration 0006
-- Eventos de domínio (Doc 2 §37/§38). Fonte única para Timeline/auditoria/etc.
-- Padrão outbox: eventos persistidos transacionalmente com a mudança de estado.
-- =====================================================================

create table app.domain_events (
  id               uuid primary key default gen_random_uuid(),
  event_type       text not null,
  aggregate_type   text not null,
  aggregate_id     uuid not null,
  actor_user_id    uuid references app.users(id) on delete set null,
  patient_id       uuid,   -- sem FK nesta fase
  encounter_id     uuid,   -- sem FK nesta fase
  payload          jsonb not null default '{}'::jsonb,
  schema_version   integer not null default 1,
  correlation_id   uuid,
  causation_id     uuid references app.domain_events(id) on delete set null,
  idempotency_key  text,
  occurred_at      timestamptz not null default now(),
  recorded_at      timestamptz not null default now()
);
create index domain_events_aggregate_idx on app.domain_events(aggregate_type, aggregate_id);
create index domain_events_type_idx on app.domain_events(event_type);
create index domain_events_occurred_idx on app.domain_events(occurred_at);
create index domain_events_patient_idx on app.domain_events(patient_id) where patient_id is not null;
create index domain_events_encounter_idx on app.domain_events(encounter_id) where encounter_id is not null;
-- Idempotência de eventos por tipo+chave quando informada (Doc 2 §48).
create unique index domain_events_idem_uk
  on app.domain_events(event_type, idempotency_key)
  where idempotency_key is not null;

comment on table app.domain_events is 'Log de eventos de domínio (outbox). Imutável por convenção; correções são novos eventos.';

-- Distinção temporal obrigatória (Doc 1 §67; Doc 3 §41): occurred_at (fato) vs recorded_at (registro).
comment on column app.domain_events.occurred_at is 'Momento do fato clínico/negócio.';
comment on column app.domain_events.recorded_at is 'Momento do registro no sistema.';
