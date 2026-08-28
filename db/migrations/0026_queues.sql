-- =====================================================================
-- VITALOOP 1.3 — Migration 0026 (Fase 3, Etapa 1/6)
-- Gestão de Filas, Chamamento e Painel de Espera (QUE-001..012)
-- Estritamente ADITIVA; não altera 0001-0025.
-- =====================================================================

-- 1. Enums de Filas e Tickets
create type app.queue_type as enum ('reception', 'triage', 'medical', 'reevaluation');
create type app.ticket_status as enum ('waiting', 'called', 'in_service', 'absent', 'finished', 'canceled');

-- 2. Tabela de Filas
create table app.queues (
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid not null references app.institutions(id) on delete cascade,
  unit_id         uuid references app.units(id) on delete set null,
  sector_id       uuid references app.sectors(id) on delete set null,
  name            text not null,
  queue_type      app.queue_type not null,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table app.queues is 'Filas assistenciais da UPA 24h (Recepção, Triagem, Consultórios, Reavaliação) (QUE-001..004).';

-- 3. Tabela de Bilhetes / Senhas de Fila
create table app.queue_tickets (
  id                  uuid primary key default gen_random_uuid(),
  queue_id            uuid not null references app.queues(id) on delete cascade,
  encounter_id        uuid not null references app.encounters(id) on delete cascade,
  patient_id          uuid not null references app.patients(id) on delete cascade,
  ticket_number       text not null,
  priority_score      integer not null default 0,
  risk_color          app.triage_risk_color,
  call_room           text,
  status              app.ticket_status not null default 'waiting',
  call_count          integer not null default 0,
  called_at           timestamptz,
  called_by           uuid references app.users(id) on delete set null,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table app.queue_tickets is 'Tickets/senhas de fila ordenados por prioridade Manchester e tempo de espera (QUE-005..010).';

-- Constraint: Apenas 1 ticket ativo por atendimento (concorrência e consistência - QUE-012)
create unique index queue_tickets_single_active_uk
  on app.queue_tickets(encounter_id)
  where status in ('waiting', 'called', 'in_service');

-- Índices para ordenação rápida da fila
create index queue_tickets_queue_status_priority_idx
  on app.queue_tickets(queue_id, status, priority_score desc, created_at asc);

create index queue_tickets_patient_idx on app.queue_tickets(patient_id);

-- 4. Row Level Security (RLS)
alter table app.queues enable row level security;
alter table app.queue_tickets enable row level security;

create policy queues_read on app.queues
  for select to vitaloop_app
  using (app.has_permission('queue.read'));

create policy queues_write on app.queues
  for all to vitaloop_app
  using (app.has_permission('queue.write'))
  with check (app.has_permission('queue.write'));

create policy queue_tickets_read on app.queue_tickets
  for select to vitaloop_app
  using (app.has_permission('queue.read'));

create policy queue_tickets_insert on app.queue_tickets
  for insert to vitaloop_app
  with check (app.has_permission('queue.write'));

create policy queue_tickets_update on app.queue_tickets
  for update to vitaloop_app
  using (app.has_permission('queue.write'))
  with check (app.has_permission('queue.write'));

-- 5. Permissões RBAC
insert into app.permissions (code, name, resource, action) values
  ('queue.read',  'Visualizar filas e painel de espera', 'queue', 'read'),
  ('queue.write', 'Gerenciar filas, chamar e rechamar pacientes', 'queue', 'write')
on conflict (code) do nothing;

-- Grants para roles de teste
insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code = 'test_patient_full' and p.code in ('queue.read', 'queue.write')
on conflict do nothing;

insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code = 'test_patient_readonly' and p.code = 'queue.read'
on conflict do nothing;

-- Grants de tabela para role vitaloop_app
grant select, insert, update, delete on app.queues to vitaloop_app;
grant select, insert, update, delete on app.queue_tickets to vitaloop_app;

-- 6. Triggers de updated_at
create trigger queues_touch_updated
  before update on app.queues
  for each row execute function app.touch_updated_at();

create trigger queue_tickets_touch_updated
  before update on app.queue_tickets
  for each row execute function app.touch_updated_at();
