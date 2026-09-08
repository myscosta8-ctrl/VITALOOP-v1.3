-- Migration 0058: Transferência Interna de Pacientes — formato SBAR
-- Migration estritamente aditiva. Não altera 0001 a 0057.
--
-- Campos extraídos do impresso real usado hoje na UPA 24h Breves (ver
-- docs/REFERENCIA_CAMPOS_IMPRESSOS_HOSPITALARES.md, item 16). Sem coluna
-- relacional extra — todo campo cabe em form_fields JSONB, mesmo padrão de
-- app.tfd_requests/app.ser_updates/app.therapeutic_plans. Schema completo em
-- @vitaloop/domain (módulo `sbar`), não no banco.

create table if not exists app.sbar_transfers (
  id uuid primary key default gen_random_uuid(),
  encounter_id uuid not null references app.encounters(id) on delete cascade,
  patient_id uuid not null references app.patients(id) on delete cascade,
  requested_by uuid not null references app.users(id) on delete restrict,
  form_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists sbar_transfers_encounter_idx on app.sbar_transfers(encounter_id);
create index if not exists sbar_transfers_patient_idx on app.sbar_transfers(patient_id);

alter table app.sbar_transfers enable row level security;

drop policy if exists sbar_transfers_select on app.sbar_transfers;
drop policy if exists sbar_transfers_insert on app.sbar_transfers;
create policy sbar_transfers_select on app.sbar_transfers for select to vitaloop_app using (app.has_permission('sbar.read'));
create policy sbar_transfers_insert on app.sbar_transfers for insert to vitaloop_app with check (app.has_permission('sbar.write'));

grant select, insert on app.sbar_transfers to vitaloop_app;

insert into app.permissions (code, name, resource, action) values
  ('sbar.read',  'Visualizar transferências internas (SBAR)', 'sbar', 'read'),
  ('sbar.write', 'Registrar transferência interna (SBAR)', 'sbar', 'write')
on conflict (code) do nothing;

insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code in ('nurse', 'doctor', 'manager', 'direcao', 'admin', 'system_admin')
  and p.code in ('sbar.read', 'sbar.write')
on conflict do nothing;
