-- Migration 0059: Avaliação de Serviço Social
-- Migration estritamente aditiva. Não altera 0001 a 0058.
--
-- Sem modelo real de impresso da UPA em mãos (diferente de AIH/Sangue/ATM/
-- TFD/SER, que tinham PDF real) — campos desenhados a partir da praxe de
-- avaliação social hospitalar, a pedido explícito do usuário (ver
-- packages/domain/src/social-work/schema.ts). Sem coluna relacional extra
-- — todo campo cabe em form_fields JSONB, mesmo padrão de app.tfd_requests/
-- app.ser_updates.

create table if not exists app.social_work_assessments (
  id uuid primary key default gen_random_uuid(),
  encounter_id uuid not null references app.encounters(id) on delete cascade,
  patient_id uuid not null references app.patients(id) on delete cascade,
  requested_by uuid not null references app.users(id) on delete restrict,
  form_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists social_work_assessments_encounter_idx on app.social_work_assessments(encounter_id);
create index if not exists social_work_assessments_patient_idx on app.social_work_assessments(patient_id);

alter table app.social_work_assessments enable row level security;

drop policy if exists social_work_assessments_select on app.social_work_assessments;
drop policy if exists social_work_assessments_insert on app.social_work_assessments;
create policy social_work_assessments_select on app.social_work_assessments for select to vitaloop_app using (app.has_permission('social_work.read'));
create policy social_work_assessments_insert on app.social_work_assessments for insert to vitaloop_app with check (app.has_permission('social_work.write'));

grant select, insert on app.social_work_assessments to vitaloop_app;

insert into app.permissions (code, name, resource, action) values
  ('social_work.read',  'Visualizar avaliações de Serviço Social', 'social_work', 'read'),
  ('social_work.write', 'Registrar avaliação de Serviço Social', 'social_work', 'write')
on conflict (code) do nothing;

insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code in ('nurse', 'doctor', 'manager', 'direcao', 'admin', 'system_admin')
  and p.code in ('social_work.read', 'social_work.write')
on conflict do nothing;
