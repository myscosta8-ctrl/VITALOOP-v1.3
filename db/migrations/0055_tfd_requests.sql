-- Migration 0055: Laudo Médico LM/TFD (Tratamento Fora de Domicílio)
-- Migration estritamente aditiva. Não altera 0001 a 0054.
--
-- Campos extraídos do impresso real usado hoje na UPA 24h Breves (ver
-- docs/REFERENCIA_CAMPOS_IMPRESSOS_HOSPITALARES.md, item 9). Sem coluna
-- relacional extra (ao contrário de app.blood_product_requests/
-- app.antimicrobial_requests) — nenhum campo do TFD tem valor de
-- consulta/relatório que justifique sair do JSONB. Schema completo dos
-- campos vive em @vitaloop/domain (módulo `tfd`), não no banco.

create table if not exists app.tfd_requests (
  id uuid primary key default gen_random_uuid(),
  encounter_id uuid not null references app.encounters(id) on delete cascade,
  patient_id uuid not null references app.patients(id) on delete cascade,
  requested_by uuid not null references app.users(id) on delete restrict,
  form_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tfd_requests_encounter_idx on app.tfd_requests(encounter_id);
create index if not exists tfd_requests_patient_idx on app.tfd_requests(patient_id);

alter table app.tfd_requests enable row level security;

drop policy if exists tfd_requests_select on app.tfd_requests;
drop policy if exists tfd_requests_insert on app.tfd_requests;
create policy tfd_requests_select on app.tfd_requests for select to vitaloop_app using (app.has_permission('tfd.read'));
create policy tfd_requests_insert on app.tfd_requests for insert to vitaloop_app with check (app.has_permission('tfd.write'));

grant select, insert on app.tfd_requests to vitaloop_app;

insert into app.permissions (code, name, resource, action) values
  ('tfd.read',  'Visualizar laudos de Tratamento Fora de Domicílio (TFD)', 'tfd', 'read'),
  ('tfd.write', 'Emitir laudo de Tratamento Fora de Domicílio (TFD)', 'tfd', 'write')
on conflict (code) do nothing;

insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code in ('nurse', 'doctor', 'manager', 'direcao', 'admin', 'system_admin')
  and p.code in ('tfd.read', 'tfd.write')
on conflict do nothing;
