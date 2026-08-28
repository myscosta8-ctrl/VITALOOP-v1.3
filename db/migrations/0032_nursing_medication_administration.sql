-- =====================================================================
-- VITALOOP 1.3 — Migration 0032 (Fase 4, Etapa 1/X)
-- Enfermagem, Aprazamento e Administração de Medicamentos (NUR-001..003, MEDC-009..011)
-- Estritamente ADITIVA; não altera 0001-0031.
-- =====================================================================

-- 1. Enums do Módulo de Enfermagem
create type app.nursing_record_type as enum ('admission', 'evolution', 'annotation');
create type app.medication_schedule_status as enum ('pending', 'administered', 'not_administered', 'refused', 'suspended', 'canceled');

-- 2. Tabela de Registros de Enfermagem (Admissão, Evolução e Anotação)
create table app.nursing_records (
  id              uuid primary key default gen_random_uuid(),
  encounter_id    uuid not null references app.encounters(id) on delete cascade,
  patient_id      uuid not null references app.patients(id) on delete cascade,
  professional_id uuid not null references app.users(id) on delete restrict,
  record_type     app.nursing_record_type not null,
  content         text not null,
  vital_signs     jsonb, -- Sinais vitais pontuais registrados na anotação/admissão
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table app.nursing_records is 'Registros assistenciais da equipe de enfermagem (NUR-001..003).';

create index nursing_records_encounter_idx on app.nursing_records(encounter_id);
create index nursing_records_patient_idx on app.nursing_records(patient_id);
create index nursing_records_type_idx on app.nursing_records(record_type);

-- 3. Tabela de Horários Aprazados de Medicamentos
create table app.medication_schedules (
  id                   uuid primary key default gen_random_uuid(),
  prescription_id      uuid not null references app.prescriptions(id) on delete cascade,
  prescription_item_id uuid not null references app.prescription_items(id) on delete cascade,
  encounter_id         uuid not null references app.encounters(id) on delete cascade,
  patient_id           uuid not null references app.patients(id) on delete cascade,
  scheduled_time       timestamptz not null,
  status               app.medication_schedule_status not null default 'pending',
  scheduled_by         uuid not null references app.users(id) on delete restrict,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

comment on table app.medication_schedules is 'Grade de horários aprazados de administração de medicamentos (MEDC-009).';

create index medication_schedules_encounter_idx on app.medication_schedules(encounter_id);
create index medication_schedules_item_idx on app.medication_schedules(prescription_item_id);
create index medication_schedules_time_idx on app.medication_schedules(scheduled_time);

-- 4. Tabela de Registro de Administração e Checagem Beira-Leito
create table app.medication_administrations (
  id                   uuid primary key default gen_random_uuid(),
  schedule_id          uuid not null references app.medication_schedules(id) on delete cascade,
  encounter_id         uuid not null references app.encounters(id) on delete cascade,
  patient_id           uuid not null references app.patients(id) on delete cascade,
  executor_id          uuid not null references app.users(id) on delete restrict,
  status               app.medication_schedule_status not null, -- administered, not_administered, refused, suspended
  administered_at      timestamptz not null default now(),
  notes                text,
  non_admin_reason     text, -- Justificativa obrigatória se not_administered / refused
  bed_side_checked     boolean not null default true, -- Validação dos 5 certos
  batch_number         text, -- Número de lote (opcional)
  created_at           timestamptz not null default now()
);

comment on table app.medication_administrations is 'Checagem e registro de administração de medicamentos beira-leito (MEDC-010..011).';

create index medication_admin_schedule_idx on app.medication_administrations(schedule_id);
create index medication_admin_encounter_idx on app.medication_administrations(encounter_id);

-- 5. Row Level Security (RLS)
alter table app.nursing_records enable row level security;
alter table app.medication_schedules enable row level security;
alter table app.medication_administrations enable row level security;

create policy nursing_records_read on app.nursing_records for select to vitaloop_app using (app.has_permission('nursing.read'));
create policy nursing_records_insert on app.nursing_records for insert to vitaloop_app with check (app.has_permission('nursing.write'));

create policy medication_schedules_read on app.medication_schedules for select to vitaloop_app using (app.has_permission('nursing.read'));
create policy medication_schedules_insert on app.medication_schedules for insert to vitaloop_app with check (app.has_permission('medication.schedule'));
create policy medication_schedules_update on app.medication_schedules for update to vitaloop_app using (app.has_permission('medication.schedule') or app.has_permission('medication.administer')) with check (app.has_permission('medication.schedule') or app.has_permission('medication.administer'));

create policy medication_admin_read on app.medication_administrations for select to vitaloop_app using (app.has_permission('nursing.read'));
create policy medication_admin_insert on app.medication_administrations for insert to vitaloop_app with check (app.has_permission('medication.administer'));

grant select, insert, update, delete on app.nursing_records to vitaloop_app;
grant select, insert, update, delete on app.medication_schedules to vitaloop_app;
grant select, insert, update, delete on app.medication_administrations to vitaloop_app;

-- 6. Permissões RBAC
insert into app.permissions (code, name, resource, action) values
  ('nursing.read',          'Visualizar registros de enfermagem e horários', 'nursing', 'read'),
  ('nursing.write',         'Registrar admissão, evolução e anotações de enfermagem', 'nursing', 'write'),
  ('medication.schedule',   'Aprazar horários de prescrição médica', 'medication', 'schedule'),
  ('medication.administer', 'Realizar checagem e administrar medicamentos beira-leito', 'medication', 'administer')
on conflict (code) do nothing;

insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code in ('nurse', 'nursing_technician', 'doctor', 'test_patient_full')
  and p.code in ('nursing.read', 'nursing.write', 'medication.schedule', 'medication.administer')
on conflict do nothing;
