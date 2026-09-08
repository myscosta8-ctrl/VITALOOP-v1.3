-- Migration 0057: Plano Terapêutico
-- Migration estritamente aditiva. Não altera 0001 a 0056.
--
-- Campos extraídos do impresso real usado hoje na UPA 24h Breves (ver
-- docs/REFERENCIA_CAMPOS_IMPRESSOS_HOSPITALARES.md, item 15). Sem coluna
-- relacional extra — todo campo cabe em form_fields JSONB, mesmo padrão de
-- app.tfd_requests/app.ser_updates. Schema completo em @vitaloop/domain
-- (módulo `therapeutic-plan`), não no banco.

create table if not exists app.therapeutic_plans (
  id uuid primary key default gen_random_uuid(),
  encounter_id uuid not null references app.encounters(id) on delete cascade,
  patient_id uuid not null references app.patients(id) on delete cascade,
  requested_by uuid not null references app.users(id) on delete restrict,
  form_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists therapeutic_plans_encounter_idx on app.therapeutic_plans(encounter_id);
create index if not exists therapeutic_plans_patient_idx on app.therapeutic_plans(patient_id);

alter table app.therapeutic_plans enable row level security;

drop policy if exists therapeutic_plans_select on app.therapeutic_plans;
drop policy if exists therapeutic_plans_insert on app.therapeutic_plans;
create policy therapeutic_plans_select on app.therapeutic_plans for select to vitaloop_app using (app.has_permission('therapeutic_plan.read'));
create policy therapeutic_plans_insert on app.therapeutic_plans for insert to vitaloop_app with check (app.has_permission('therapeutic_plan.write'));

grant select, insert on app.therapeutic_plans to vitaloop_app;

insert into app.permissions (code, name, resource, action) values
  ('therapeutic_plan.read',  'Visualizar planos terapêuticos', 'therapeutic_plan', 'read'),
  ('therapeutic_plan.write', 'Emitir plano terapêutico', 'therapeutic_plan', 'write')
on conflict (code) do nothing;

insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code in ('nurse', 'doctor', 'manager', 'direcao', 'admin', 'system_admin')
  and p.code in ('therapeutic_plan.read', 'therapeutic_plan.write')
on conflict do nothing;
