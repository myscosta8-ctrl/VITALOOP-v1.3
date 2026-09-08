-- Migration 0062: Projeto Terapêutico Multidisciplinar (Enfermagem)
-- Migration estritamente aditiva. Não altera 0001 a 0061.
--
-- Documento real e distinto do "Plano Terapêutico" médico
-- (app.therapeutic_plans, migration 0057) — este é assinado pela
-- enfermagem (COREN), aquele pelo médico (CRM); são dois impressos
-- diferentes nesta UPA, não um substituindo o outro. Campos extraídos do
-- impresso real "PROJETO TERAPEUTICO MULTIDISCIPLINAR - ENFERMAGEM" do
-- Hospital Regional Público do Marajó (fornecido pelo usuário, extraído e
-- apagado — continha dado de paciente real). Sem coluna relacional extra
-- — todo campo cabe em form_fields JSONB, mesmo padrão de
-- app.therapeutic_plans/app.tfd_requests. Schema completo em
-- @vitaloop/domain (módulo `nursing-therapeutic-plan`), não no banco.

create table if not exists app.nursing_therapeutic_plans (
  id uuid primary key default gen_random_uuid(),
  encounter_id uuid not null references app.encounters(id) on delete cascade,
  patient_id uuid not null references app.patients(id) on delete cascade,
  requested_by uuid not null references app.users(id) on delete restrict,
  form_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists nursing_therapeutic_plans_encounter_idx on app.nursing_therapeutic_plans(encounter_id);
create index if not exists nursing_therapeutic_plans_patient_idx on app.nursing_therapeutic_plans(patient_id);

alter table app.nursing_therapeutic_plans enable row level security;

drop policy if exists nursing_therapeutic_plans_select on app.nursing_therapeutic_plans;
drop policy if exists nursing_therapeutic_plans_insert on app.nursing_therapeutic_plans;
create policy nursing_therapeutic_plans_select on app.nursing_therapeutic_plans for select to vitaloop_app using (app.has_permission('nursing_therapeutic_plan.read'));
create policy nursing_therapeutic_plans_insert on app.nursing_therapeutic_plans for insert to vitaloop_app with check (app.has_permission('nursing_therapeutic_plan.write'));

grant select, insert on app.nursing_therapeutic_plans to vitaloop_app;

insert into app.permissions (code, name, resource, action) values
  ('nursing_therapeutic_plan.read',  'Visualizar projetos terapêuticos multidisciplinares (enfermagem)', 'nursing_therapeutic_plan', 'read'),
  ('nursing_therapeutic_plan.write', 'Registrar projeto terapêutico multidisciplinar (enfermagem)', 'nursing_therapeutic_plan', 'write')
on conflict (code) do nothing;

insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code in ('nurse', 'doctor', 'manager', 'direcao', 'admin', 'system_admin')
  and p.code in ('nursing_therapeutic_plan.read', 'nursing_therapeutic_plan.write')
on conflict do nothing;
