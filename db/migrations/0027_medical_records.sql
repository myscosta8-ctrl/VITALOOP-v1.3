-- =====================================================================
-- VITALOOP 1.3 — Migration 0027 (Fase 3, Etapa 2/6)
-- Atendimento Médico: Consulta, Anamnese, Exame Físico e Evoluções (MED-001..004)
-- Estritamente ADITIVA; não altera 0001-0026.
-- =====================================================================

-- 1. Tabela de Consultas Médicas
create table app.medical_consultations (
  id                      uuid primary key default gen_random_uuid(),
  encounter_id            uuid not null references app.encounters(id) on delete cascade,
  patient_id              uuid not null references app.patients(id) on delete cascade,
  doctor_id               uuid not null references app.users(id) on delete restrict,
  chief_complaint         text not null,
  history_present_illness text not null,
  past_medical_history    text,
  system_review           text,
  general_exam            text not null,
  segmental_exam          jsonb not null default '{}'::jsonb,
  diagnostic_hypothesis   text not null,
  initial_conduct         text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

comment on table app.medical_consultations is 'Registro da consulta médica principal do atendimento UPA (MED-001..004).';

-- Unique constraint: Apenas 1 consulta médica principal por atendimento UPA
create unique index medical_consultations_single_per_encounter_uk
  on app.medical_consultations(encounter_id);

create index medical_consultations_patient_idx on app.medical_consultations(patient_id);
create index medical_consultations_doctor_idx on app.medical_consultations(doctor_id);

-- 2. Tabela de Evoluções e Reavaliações Médicas
create table app.medical_evolutions (
  id              uuid primary key default gen_random_uuid(),
  consultation_id uuid not null references app.medical_consultations(id) on delete cascade,
  encounter_id    uuid not null references app.encounters(id) on delete cascade,
  patient_id      uuid not null references app.patients(id) on delete cascade,
  doctor_id       uuid not null references app.users(id) on delete restrict,
  evolution_text  text not null,
  clinical_status text,
  created_at      timestamptz not null default now()
);

comment on table app.medical_evolutions is 'Evoluções e reavaliações médicas sequenciais do atendimento (MED-013, MED-014).';

create index medical_evolutions_consultation_idx on app.medical_evolutions(consultation_id);
create index medical_evolutions_encounter_idx on app.medical_evolutions(encounter_id);
create index medical_evolutions_patient_idx on app.medical_evolutions(patient_id);

-- 3. Row Level Security (RLS)
alter table app.medical_consultations enable row level security;
alter table app.medical_evolutions enable row level security;

create policy medical_consultations_read on app.medical_consultations
  for select to vitaloop_app
  using (app.has_permission('medical.read'));

create policy medical_consultations_insert on app.medical_consultations
  for insert to vitaloop_app
  with check (app.has_permission('medical.write'));

create policy medical_consultations_update on app.medical_consultations
  for update to vitaloop_app
  using (app.has_permission('medical.write'))
  with check (app.has_permission('medical.write'));

create policy medical_evolutions_read on app.medical_evolutions
  for select to vitaloop_app
  using (app.has_permission('medical.read'));

create policy medical_evolutions_insert on app.medical_evolutions
  for insert to vitaloop_app
  with check (app.has_permission('medical.write'));

-- 4. Permissões RBAC
insert into app.permissions (code, name, resource, action) values
  ('medical.read',  'Visualizar prontuário médico e evoluções', 'medical', 'read'),
  ('medical.write', 'Registrar consulta médica, anamnese e evoluções', 'medical', 'write')
on conflict (code) do nothing;

-- Grants para roles de teste
insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code = 'test_patient_full' and p.code in ('medical.read', 'medical.write')
on conflict do nothing;

insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code = 'test_patient_readonly' and p.code = 'medical.read'
on conflict do nothing;

-- Grants de tabela para role vitaloop_app
grant select, insert, update, delete on app.medical_consultations to vitaloop_app;
grant select, insert, update, delete on app.medical_evolutions to vitaloop_app;

-- 5. Triggers de updated_at
create trigger medical_consultations_touch_updated
  before update on app.medical_consultations
  for each row execute function app.touch_updated_at();
