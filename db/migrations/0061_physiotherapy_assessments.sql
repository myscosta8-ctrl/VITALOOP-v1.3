-- Migration 0061: Avaliação Fisioterapêutica
-- Migration estritamente aditiva. Não altera 0001 a 0060.
--
-- Sem modelo real de impresso da UPA em mãos (diferente de AIH/Sangue/ATM/
-- TFD/SER, que tinham PDF real) — campos desenhados a partir da praxe de
-- avaliação fisioterapêutica hospitalar, a pedido explícito do usuário (ver
-- packages/domain/src/physiotherapy/schema.ts). Sem coluna relacional
-- extra — todo campo cabe em form_fields JSONB, mesmo padrão de
-- app.tfd_requests/app.ser_updates.

create table if not exists app.physiotherapy_assessments (
  id uuid primary key default gen_random_uuid(),
  encounter_id uuid not null references app.encounters(id) on delete cascade,
  patient_id uuid not null references app.patients(id) on delete cascade,
  requested_by uuid not null references app.users(id) on delete restrict,
  form_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists physiotherapy_assessments_encounter_idx on app.physiotherapy_assessments(encounter_id);
create index if not exists physiotherapy_assessments_patient_idx on app.physiotherapy_assessments(patient_id);

alter table app.physiotherapy_assessments enable row level security;

drop policy if exists physiotherapy_assessments_select on app.physiotherapy_assessments;
drop policy if exists physiotherapy_assessments_insert on app.physiotherapy_assessments;
create policy physiotherapy_assessments_select on app.physiotherapy_assessments for select to vitaloop_app using (app.has_permission('physiotherapy.read'));
create policy physiotherapy_assessments_insert on app.physiotherapy_assessments for insert to vitaloop_app with check (app.has_permission('physiotherapy.write'));

grant select, insert on app.physiotherapy_assessments to vitaloop_app;

insert into app.permissions (code, name, resource, action) values
  ('physiotherapy.read',  'Visualizar avaliações fisioterapêuticas', 'physiotherapy', 'read'),
  ('physiotherapy.write', 'Registrar avaliação fisioterapêutica', 'physiotherapy', 'write')
on conflict (code) do nothing;

insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code in ('nurse', 'doctor', 'manager', 'direcao', 'admin', 'system_admin')
  and p.code in ('physiotherapy.read', 'physiotherapy.write')
on conflict do nothing;
