-- Migration 0039: Regulação Médica de Vagas Externas, Transferência e Fechamento de AIH (SUS-007..010)
-- Migration estritamente aditiva. Não altera 0001 a 0038.

-- 1. Alteração aditiva em app.aih_requests para fechamento final (SUS-010)
alter table app.aih_requests add column if not exists closed_at timestamptz;
alter table app.aih_requests add column if not exists closed_by uuid references app.users(id) on delete set null;

drop policy if exists aih_requests_update on app.aih_requests;
create policy aih_requests_update on app.aih_requests for update to vitaloop_app using (app.has_permission('sus.issue_aih'));

-- 2. Tabela de Solicitacoes de Regulacao Externa e Transferencias (SUS-007, SUS-008)
create table if not exists app.external_regulations (
  id uuid primary key default gen_random_uuid(),
  encounter_id uuid not null references app.encounters(id) on delete cascade,
  patient_id uuid not null references app.patients(id) on delete cascade,
  requester_id uuid not null references app.users(id) on delete restrict,
  aih_request_id uuid references app.aih_requests(id) on delete set null,
  destination_facility text not null,
  specialty text not null,
  priority text not null default 'high', -- 'low', 'medium', 'high', 'emergency'
  transport_type text not null default 'basic_ambulance', -- 'basic_ambulance', 'uti_mobile', 'samu', 'own_means'
  status text not null default 'requested', -- 'requested', 'in_regulation', 'accepted', 'transferred', 'canceled'
  cancellation_reason text,
  confirmed_at timestamptz,
  confirmed_by uuid references app.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Tabela de Documentos Vinculados à Regulação (SUS-009)
create table if not exists app.regulation_documents (
  id uuid primary key default gen_random_uuid(),
  regulation_id uuid not null references app.external_regulations(id) on delete cascade,
  document_type text not null, -- 'clinical_report', 'exam_result', 'aih_form'
  document_id uuid,
  notes text,
  attached_by uuid not null references app.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

-- 4. Habilitar RLS
alter table app.external_regulations enable row level security;
alter table app.regulation_documents enable row level security;

-- 5. Políticas RLS
drop policy if exists external_regulations_select on app.external_regulations;
drop policy if exists external_regulations_insert on app.external_regulations;
drop policy if exists external_regulations_update on app.external_regulations;
create policy external_regulations_select on app.external_regulations for select to vitaloop_app using (app.has_permission('regulation.read'));
create policy external_regulations_insert on app.external_regulations for insert to vitaloop_app with check (app.has_permission('regulation.manage'));
create policy external_regulations_update on app.external_regulations for update to vitaloop_app using (app.has_permission('regulation.manage'));

drop policy if exists regulation_documents_select on app.regulation_documents;
drop policy if exists regulation_documents_insert on app.regulation_documents;
create policy regulation_documents_select on app.regulation_documents for select to vitaloop_app using (app.has_permission('regulation.read'));
create policy regulation_documents_insert on app.regulation_documents for insert to vitaloop_app with check (app.has_permission('regulation.manage'));

-- 6. Concessões de Permissões à role vitaloop_app
grant select, insert, update, delete on app.external_regulations to vitaloop_app;
grant select, insert, update, delete on app.regulation_documents to vitaloop_app;

-- 7. Permissões RBAC
insert into app.permissions (code, name, resource, action) values
  ('regulation.read',   'Consultar solicitações de regulação e transferências externas', 'regulation', 'read'),
  ('regulation.manage', 'Solicitar e gerenciar regulação médica e transferências', 'regulation', 'manage')
on conflict (code) do nothing;

insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code in ('admin', 'doctor', 'nurse', 'receptionist', 'test_patient_full')
  and p.code in ('regulation.read', 'regulation.manage')
on conflict do nothing;
