-- Migration 0038: Faturamento SUS, Catálogo SIGTAP e Laudo de AIH (SUS-001..006)
-- Migration estritamente aditiva. Não altera 0001 a 0037.

-- 1. Tabela de Catálogo Versionável SIGTAP/SUS (SUS-002, SUS-005)
create table if not exists app.sigtap_procedures (
  code text primary key,
  name text not null,
  ambulatory_value numeric(12, 2) not null default 0.00,
  hospital_value numeric(12, 2) not null default 0.00,
  min_age_months int not null default 0,
  max_age_months int not null default 1440,
  allowed_sex text not null default 'BOTH', -- 'M', 'F', 'BOTH'
  require_cid boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 2. Tabela de Laudos de Solicitação de AIH (SUS-001, SUS-003, SUS-004, SUS-006)
create table if not exists app.aih_requests (
  id uuid primary key default gen_random_uuid(),
  encounter_id uuid not null references app.encounters(id) on delete cascade,
  patient_id uuid not null references app.patients(id) on delete cascade,
  requester_id uuid not null references app.users(id) on delete restrict,
  main_procedure_code text not null references app.sigtap_procedures(code) on delete restrict,
  secondary_procedure_code text references app.sigtap_procedures(code) on delete set null,
  main_cid10 text not null,
  secondary_cid10 text,
  clinical_justification text not null,
  status text not null default 'validated', -- 'draft', 'submitted', 'validated', 'rejected'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Habilitar RLS
alter table app.sigtap_procedures enable row level security;
alter table app.aih_requests enable row level security;

-- 4. Políticas RLS
drop policy if exists sigtap_procedures_select on app.sigtap_procedures;
create policy sigtap_procedures_select on app.sigtap_procedures for select to vitaloop_app using (app.has_permission('sus.read'));

drop policy if exists aih_requests_select on app.aih_requests;
drop policy if exists aih_requests_insert on app.aih_requests;
create policy aih_requests_select on app.aih_requests for select to vitaloop_app using (app.has_permission('sus.read'));
create policy aih_requests_insert on app.aih_requests for insert to vitaloop_app with check (app.has_permission('sus.issue_aih'));

-- 5. Concessões de Permissões à role vitaloop_app
grant select, insert, update, delete on app.sigtap_procedures to vitaloop_app;
grant select, insert, update, delete on app.aih_requests to vitaloop_app;

-- 6. Permissões RBAC
insert into app.permissions (code, name, resource, action) values
  ('sus.read',      'Consultar catálogo SIGTAP e laudos de AIH', 'sus', 'read'),
  ('sus.issue_aih', 'Emitir e validar laudo de solicitação de AIH', 'sus', 'issue_aih')
on conflict (code) do nothing;

insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code in ('admin', 'doctor', 'nurse', 'receptionist', 'test_patient_full')
  and p.code in ('sus.read', 'sus.issue_aih')
on conflict do nothing;

-- 7. Inserção de Procedimentos de Referência no Catálogo SIGTAP
insert into app.sigtap_procedures (code, name, ambulatory_value, hospital_value, min_age_months, max_age_months, allowed_sex, require_cid) values
  ('0303010037', 'TRATAMENTO DE INFARTO AGUDO DO MIOCARDIO', 0.00, 1500.00, 216, 1440, 'BOTH', true),
  ('0303060280', 'TRATAMENTO DE PNEUMONIA OU BRONCOPNEUMONIA', 0.00, 650.00, 0, 1440, 'BOTH', true),
  ('0301060061', 'ATENDIMENTO DE URGENCIA EM ATENCAO ESPECIALIZADA', 50.00, 0.00, 0, 1440, 'BOTH', false),
  ('0303140054', 'TRATAMENTO DE COMPLICACOES DO PARTO E PUERPERIO', 0.00, 950.00, 120, 660, 'F', true)
on conflict (code) do nothing;
