-- =====================================================================
-- VITALOOP 1.3 — Migration 0007
-- Persistência genérica de transições de estado (Doc 2 §36; Doc 4 §18)
-- Espelha o TransitionRecord do motor de FSM (@vitaloop/domain).
-- NÃO define estados clínicos concretos (isso é de fases posteriores).
-- =====================================================================

create table app.state_transitions (
  id              uuid primary key default gen_random_uuid(),
  machine         text not null,       -- nome da máquina (ex.: 'encounter' em fases futuras)
  aggregate_type  text not null,
  aggregate_id    uuid not null,
  from_state      text not null,
  to_state        text not null,
  event           text not null,
  actor_user_id   uuid references app.users(id) on delete set null,
  reason          text,
  correlation_id  uuid,
  occurred_at     timestamptz not null default now(),
  recorded_at     timestamptz not null default now()
);
create index state_transitions_aggregate_idx on app.state_transitions(aggregate_type, aggregate_id);
create index state_transitions_machine_idx on app.state_transitions(machine);
create index state_transitions_occurred_idx on app.state_transitions(occurred_at);

comment on table app.state_transitions is 'Histórico auditável de transições de estado (origem→destino, ator, motivo, tempo).';

-- Transições são históricas: não devem ser alteradas/apagadas por operação comum.
create trigger state_transitions_no_update
  before update on app.state_transitions
  for each row execute function app.forbid_mutation();

create trigger state_transitions_no_delete
  before delete on app.state_transitions
  for each row execute function app.forbid_mutation();
