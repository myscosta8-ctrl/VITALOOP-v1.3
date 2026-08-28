-- Migration 0034: SAE, Escalas Assistenciais, Balanço Hídrico, Dispositivos Invasivos e Riscos (NUR-004..012)
-- Migration estritamente aditiva. Não altera migrations 0001 a 0033.

do $$ begin
  create type app.invasive_device_type as enum (
    'peripheral_venous_access', 'central_venous_access', 'urinary_catheter', 
    'nasogastric_tube', 'nasoenteric_tube', 'chest_drain', 'endotracheal_tube', 'tracheostomy'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type app.device_status as enum ('active', 'removed', 'replaced', 'accidental_withdrawal');
exception when duplicate_object then null; end $$;

do $$ begin
  create type app.fluid_type as enum ('oral', 'intravenous', 'enteral', 'blood_products', 'urine', 'emesis', 'drainage', 'feces');
exception when duplicate_object then null; end $$;

do $$ begin
  create type app.fluid_direction as enum ('intake', 'output');
exception when duplicate_object then null; end $$;

-- 1. Diagnósticos de Enfermagem (NANDA/CIPA - NUR-005)
create table if not exists app.nursing_diagnoses (
  id uuid primary key default gen_random_uuid(),
  encounter_id uuid not null references app.encounters(id) on delete cascade,
  patient_id uuid not null references app.patients(id) on delete cascade,
  nurse_id uuid not null references app.users(id) on delete restrict,
  code text not null,
  title text not null,
  domain_name text,
  related_factors text,
  defining_characteristics text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Prescrição e Intervenções de Enfermagem (NUR-006)
create table if not exists app.nursing_prescriptions (
  id uuid primary key default gen_random_uuid(),
  encounter_id uuid not null references app.encounters(id) on delete cascade,
  patient_id uuid not null references app.patients(id) on delete cascade,
  nurse_id uuid not null references app.users(id) on delete restrict,
  care_description text not null,
  frequency_hours integer,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

-- 3. Registro de Procedimentos e Intervenções de Enfermagem (NUR-007)
create table if not exists app.nursing_procedures (
  id uuid primary key default gen_random_uuid(),
  encounter_id uuid not null references app.encounters(id) on delete cascade,
  patient_id uuid not null references app.patients(id) on delete cascade,
  professional_id uuid not null references app.users(id) on delete restrict,
  procedure_name text not null,
  category text not null,
  notes text,
  performed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- 4. Escalas Assistenciais (Braden, Morse, Glasgow, MEWS - NUR-010)
create table if not exists app.nursing_scale_evaluations (
  id uuid primary key default gen_random_uuid(),
  encounter_id uuid not null references app.encounters(id) on delete cascade,
  patient_id uuid not null references app.patients(id) on delete cascade,
  evaluator_id uuid not null references app.users(id) on delete restrict,
  scale_type text not null,
  total_score integer not null,
  risk_level text not null,
  score_details jsonb not null,
  evaluated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- 5. Balanço Hídrico (NUR-009)
create table if not exists app.fluid_balance_records (
  id uuid primary key default gen_random_uuid(),
  encounter_id uuid not null references app.encounters(id) on delete cascade,
  patient_id uuid not null references app.patients(id) on delete cascade,
  recorder_id uuid not null references app.users(id) on delete restrict,
  direction app.fluid_direction not null,
  fluid_type app.fluid_type not null,
  volume_ml integer not null check (volume_ml > 0),
  description text,
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- 6. Controle de Dispositivos Invasivos (NUR-011)
create table if not exists app.invasive_devices (
  id uuid primary key default gen_random_uuid(),
  encounter_id uuid not null references app.encounters(id) on delete cascade,
  patient_id uuid not null references app.patients(id) on delete cascade,
  inserter_id uuid not null references app.users(id) on delete restrict,
  device_type app.invasive_device_type not null,
  anatomical_site text not null,
  status app.device_status not null default 'active',
  inserted_at timestamptz not null default now(),
  expected_replacement_at timestamptz,
  removed_at timestamptz,
  remover_id uuid references app.users(id) on delete restrict,
  removal_reason text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 7. Riscos Assistenciais do Paciente (NUR-012)
create table if not exists app.patient_risk_assessments (
  id uuid primary key default gen_random_uuid(),
  encounter_id uuid not null references app.encounters(id) on delete cascade,
  patient_id uuid not null references app.patients(id) on delete cascade,
  evaluator_id uuid not null references app.users(id) on delete restrict,
  risk_type text not null,
  is_active boolean not null default true,
  risk_level text not null,
  identified_at timestamptz not null default now(),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

-- 8. Habilitar RLS
alter table app.nursing_diagnoses enable row level security;
alter table app.nursing_prescriptions enable row level security;
alter table app.nursing_procedures enable row level security;
alter table app.nursing_scale_evaluations enable row level security;
alter table app.fluid_balance_records enable row level security;
alter table app.invasive_devices enable row level security;
alter table app.patient_risk_assessments enable row level security;

-- 9. Políticas RLS
drop policy if exists nursing_diagnoses_select on app.nursing_diagnoses;
drop policy if exists nursing_diagnoses_insert on app.nursing_diagnoses;
create policy nursing_diagnoses_select on app.nursing_diagnoses for select to vitaloop_app using (app.has_permission('nursing.read'));
create policy nursing_diagnoses_insert on app.nursing_diagnoses for insert to vitaloop_app with check (app.has_permission('nursing.sae'));

drop policy if exists nursing_prescriptions_select on app.nursing_prescriptions;
drop policy if exists nursing_prescriptions_insert on app.nursing_prescriptions;
create policy nursing_prescriptions_select on app.nursing_prescriptions for select to vitaloop_app using (app.has_permission('nursing.read'));
create policy nursing_prescriptions_insert on app.nursing_prescriptions for insert to vitaloop_app with check (app.has_permission('nursing.sae'));

drop policy if exists nursing_procedures_select on app.nursing_procedures;
drop policy if exists nursing_procedures_insert on app.nursing_procedures;
create policy nursing_procedures_select on app.nursing_procedures for select to vitaloop_app using (app.has_permission('nursing.read'));
create policy nursing_procedures_insert on app.nursing_procedures for insert to vitaloop_app with check (app.has_permission('nursing.procedure'));

drop policy if exists nursing_scale_evaluations_select on app.nursing_scale_evaluations;
drop policy if exists nursing_scale_evaluations_insert on app.nursing_scale_evaluations;
create policy nursing_scale_evaluations_select on app.nursing_scale_evaluations for select to vitaloop_app using (app.has_permission('nursing.read'));
create policy nursing_scale_evaluations_insert on app.nursing_scale_evaluations for insert to vitaloop_app with check (app.has_permission('nursing.scales'));

drop policy if exists fluid_balance_records_select on app.fluid_balance_records;
drop policy if exists fluid_balance_records_insert on app.fluid_balance_records;
create policy fluid_balance_records_select on app.fluid_balance_records for select to vitaloop_app using (app.has_permission('nursing.read'));
create policy fluid_balance_records_insert on app.fluid_balance_records for insert to vitaloop_app with check (app.has_permission('nursing.balance'));

drop policy if exists invasive_devices_select on app.invasive_devices;
drop policy if exists invasive_devices_insert on app.invasive_devices;
drop policy if exists invasive_devices_update on app.invasive_devices;
create policy invasive_devices_select on app.invasive_devices for select to vitaloop_app using (app.has_permission('nursing.read'));
create policy invasive_devices_insert on app.invasive_devices for insert to vitaloop_app with check (app.has_permission('nursing.device'));
create policy invasive_devices_update on app.invasive_devices for update to vitaloop_app using (app.has_permission('nursing.device'));

drop policy if exists patient_risk_assessments_select on app.patient_risk_assessments;
drop policy if exists patient_risk_assessments_insert on app.patient_risk_assessments;
create policy patient_risk_assessments_select on app.patient_risk_assessments for select to vitaloop_app using (app.has_permission('nursing.read'));
create policy patient_risk_assessments_insert on app.patient_risk_assessments for insert to vitaloop_app with check (app.has_permission('nursing.sae') or app.has_permission('nursing.scales'));

-- 10. Concessão de Permissões à role vitaloop_app
grant select, insert, update, delete on app.nursing_diagnoses to vitaloop_app;
grant select, insert, update, delete on app.nursing_prescriptions to vitaloop_app;
grant select, insert, update, delete on app.nursing_procedures to vitaloop_app;
grant select, insert, update, delete on app.nursing_scale_evaluations to vitaloop_app;
grant select, insert, update, delete on app.fluid_balance_records to vitaloop_app;
grant select, insert, update, delete on app.invasive_devices to vitaloop_app;
grant select, insert, update, delete on app.patient_risk_assessments to vitaloop_app;

-- 11. Permissões RBAC
insert into app.permissions (code, name, resource, action) values
  ('nursing.sae',       'Elaborar SAE e prescrever cuidados de enfermagem', 'nursing', 'sae'),
  ('nursing.procedure', 'Registrar procedimentos e intervenções técnicas', 'nursing', 'procedure'),
  ('nursing.scales',    'Aplicar escalas assistenciais (Braden, Morse, etc)', 'nursing', 'scales'),
  ('nursing.balance',   'Registrar balanço hídrico',                        'nursing', 'balance'),
  ('nursing.device',    'Inserir, monitorar e remover dispositivos invasivos', 'nursing', 'device')
on conflict (code) do nothing;

insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code in ('nurse', 'nursing_technician', 'doctor', 'admin', 'test_patient_full')
  and p.code in ('nursing.sae', 'nursing.procedure', 'nursing.scales', 'nursing.balance', 'nursing.device')
on conflict do nothing;
