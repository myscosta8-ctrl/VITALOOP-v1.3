-- Migration 0036: Segurança do Paciente, Eventos Adversos e Isolamento (SAF-001..011)
-- Migration estritamente aditiva. Não altera 0001 a 0035.

do $$ begin
  create type app.incident_severity as enum ('near_miss', 'no_harm', 'mild', 'moderate', 'severe', 'death');
exception when duplicate_object then null; end $$;

do $$ begin
  create type app.isolation_type as enum ('standard', 'contact', 'droplet', 'airborne', 'protective');
exception when duplicate_object then null; end $$;

-- 1. Notificações de Eventos Adversos e Quase Falhas (SAF-001, SAF-006, SAF-010)
create table if not exists app.adverse_events (
  id uuid primary key default gen_random_uuid(),
  encounter_id uuid references app.encounters(id) on delete set null,
  patient_id uuid references app.patients(id) on delete set null,
  reporter_id uuid references app.users(id) on delete set null,
  is_anonymous boolean not null default false,
  event_category text not null,
  severity app.incident_severity not null,
  event_date timestamptz not null default now(),
  description text not null,
  immediate_action text,
  is_epidemiological_notification boolean not null default false,
  sinan_code text,
  status text not null default 'reported',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Registros de Isolamento e Precauções do Paciente (SAF-007, SAF-008)
create table if not exists app.patient_isolations (
  id uuid primary key default gen_random_uuid(),
  encounter_id uuid not null references app.encounters(id) on delete cascade,
  patient_id uuid not null references app.patients(id) on delete cascade,
  isolation_type app.isolation_type not null,
  reason text not null,
  pathogen_suspected text,
  prescribed_by uuid not null references app.users(id) on delete restrict,
  start_at timestamptz not null default now(),
  end_at timestamptz,
  ended_by uuid references app.users(id) on delete restrict,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 3. Análise de Causa Raiz pelo NSP (SAF-011)
create table if not exists app.adverse_event_investigations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references app.adverse_events(id) on delete cascade,
  investigator_id uuid not null references app.users(id) on delete restrict,
  root_cause_analysis text not null,
  action_plan text not null,
  preventive_measures text,
  closed_at timestamptz,
  created_at timestamptz not null default now()
);

-- 4. Habilitar RLS
alter table app.adverse_events enable row level security;
alter table app.patient_isolations enable row level security;
alter table app.adverse_event_investigations enable row level security;

-- 5. Políticas RLS
drop policy if exists adverse_events_select on app.adverse_events;
drop policy if exists adverse_events_insert on app.adverse_events;
create policy adverse_events_select on app.adverse_events for select to vitaloop_app using (app.has_permission('safety.read'));
create policy adverse_events_insert on app.adverse_events for insert to vitaloop_app with check (app.has_permission('safety.report'));

drop policy if exists patient_isolations_select on app.patient_isolations;
drop policy if exists patient_isolations_insert on app.patient_isolations;
drop policy if exists patient_isolations_update on app.patient_isolations;
create policy patient_isolations_select on app.patient_isolations for select to vitaloop_app using (app.has_permission('safety.read'));
create policy patient_isolations_insert on app.patient_isolations for insert to vitaloop_app with check (app.has_permission('safety.manage'));
create policy patient_isolations_update on app.patient_isolations for update to vitaloop_app using (app.has_permission('safety.manage'));

drop policy if exists adverse_event_investigations_select on app.adverse_event_investigations;
drop policy if exists adverse_event_investigations_insert on app.adverse_event_investigations;
create policy adverse_event_investigations_select on app.adverse_event_investigations for select to vitaloop_app using (app.has_permission('safety.investigate'));
create policy adverse_event_investigations_insert on app.adverse_event_investigations for insert to vitaloop_app with check (app.has_permission('safety.investigate'));

-- 6. Concessões de Permissões à role vitaloop_app
grant select, insert, update, delete on app.adverse_events to vitaloop_app;
grant select, insert, update, delete on app.patient_isolations to vitaloop_app;
grant select, insert, update, delete on app.adverse_event_investigations to vitaloop_app;

-- 7. Permissões RBAC
insert into app.permissions (code, name, resource, action) values
  ('safety.read',        'Consultar painel de segurança do paciente e isolamentos', 'safety', 'read'),
  ('safety.report',      'Notificar eventos adversos e quase falhas', 'safety', 'report'),
  ('safety.manage',      'Prescrever e gerenciar isolamentos e precauções', 'safety', 'manage'),
  ('safety.investigate', 'Investigar causa raiz e fechar análises do NSP', 'safety', 'investigate')
on conflict (code) do nothing;

insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code in ('doctor', 'nurse', 'receptionist', 'admin', 'test_patient_full')
  and p.code in ('safety.read', 'safety.report', 'safety.manage', 'safety.investigate')
on conflict do nothing;
