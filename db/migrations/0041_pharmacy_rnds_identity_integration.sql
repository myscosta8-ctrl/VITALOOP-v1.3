-- Migration 0041: Barramento de Farmácia, RNDS, Lote AIH e Identidade Institucional (INT-004..008)
-- Migration estritamente aditiva. Não altera 0001 a 0040.

-- 1. Tabela de Dispensação de Farmácia Central (INT-004)
create table if not exists app.pharmacy_dispensations (
  id uuid primary key default gen_random_uuid(),
  encounter_id uuid not null references app.encounters(id) on delete cascade,
  patient_id uuid not null references app.patients(id) on delete cascade,
  prescription_id uuid references app.prescriptions(id) on delete set null,
  dispenser_user_id uuid not null references app.users(id) on delete restrict,
  status text not null default 'dispensed', -- 'requested', 'dispensed', 'canceled'
  items_json jsonb not null,
  created_at timestamptz not null default now()
);

-- 2. Tabela de Lotes de Exportação de AIHs (INT-007)
create table if not exists app.aih_export_batches (
  id uuid primary key default gen_random_uuid(),
  batch_number text not null unique,
  created_by uuid not null references app.users(id) on delete restrict,
  total_items int not null default 0,
  total_value numeric(12, 2) not null default 0.00,
  status text not null default 'generated', -- 'generated', 'exported', 'failed'
  aih_ids jsonb not null,
  created_at timestamptz not null default now()
);

-- 3. Tabela de Configurações de Identidade Federada Institucional (INT-008)
create table if not exists app.identity_providers (
  id uuid primary key default gen_random_uuid(),
  provider_type text not null, -- 'oidc', 'oauth2', 'saml2'
  provider_name text not null,
  client_id text not null,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. Habilitar RLS
alter table app.pharmacy_dispensations enable row level security;
alter table app.aih_export_batches enable row level security;
alter table app.identity_providers enable row level security;

-- 5. Políticas RLS
drop policy if exists pharmacy_dispensations_select on app.pharmacy_dispensations;
drop policy if exists pharmacy_dispensations_insert on app.pharmacy_dispensations;
create policy pharmacy_dispensations_select on app.pharmacy_dispensations for select to vitaloop_app using (app.has_permission('integration.read'));
create policy pharmacy_dispensations_insert on app.pharmacy_dispensations for insert to vitaloop_app with check (app.has_permission('integration.write'));

drop policy if exists aih_export_batches_select on app.aih_export_batches;
drop policy if exists aih_export_batches_insert on app.aih_export_batches;
create policy aih_export_batches_select on app.aih_export_batches for select to vitaloop_app using (app.has_permission('sus.read'));
create policy aih_export_batches_insert on app.aih_export_batches for insert to vitaloop_app with check (app.has_permission('sus.issue_aih'));

drop policy if exists identity_providers_select on app.identity_providers;
drop policy if exists identity_providers_insert on app.identity_providers;
create policy identity_providers_select on app.identity_providers for select to vitaloop_app using (app.has_permission('integration.read'));
create policy identity_providers_insert on app.identity_providers for insert to vitaloop_app with check (app.has_permission('integration.write'));

-- 6. Concessões de Permissões à role vitaloop_app
grant select, insert, update, delete on app.pharmacy_dispensations to vitaloop_app;
grant select, insert, update, delete on app.aih_export_batches to vitaloop_app;
grant select, insert, update, delete on app.identity_providers to vitaloop_app;
