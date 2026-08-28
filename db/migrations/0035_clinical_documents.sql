-- Migration 0035: Documentos Clínicos Complementares, Atestados e Declarações (DOC-001..010)
-- Migration estritamente aditiva. Não altera 0001 a 0034.

do $$ begin
  create type app.clinical_document_type as enum (
    'medical_certificate', 'attendance_declaration', 'companion_certificate', 
    'medical_report', 'procedure_request'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type app.clinical_document_status as enum ('issued', 'revoked', 'rectified');
exception when duplicate_object then null; end $$;

-- 1. Gerenciador de Templates (DOC-005)
create table if not exists app.document_templates (
  id uuid primary key default gen_random_uuid(),
  document_type app.clinical_document_type not null,
  title text not null,
  body_template text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Documentos Clínicos Emitidos (DOC-001..004, DOC-006, DOC-007)
create table if not exists app.clinical_documents (
  id uuid primary key default gen_random_uuid(),
  encounter_id uuid not null references app.encounters(id) on delete cascade,
  patient_id uuid not null references app.patients(id) on delete cascade,
  issuer_id uuid not null references app.users(id) on delete restrict,
  document_type app.clinical_document_type not null,
  status app.clinical_document_status not null default 'issued',
  title text not null,
  content text not null,
  days_off integer,
  days_off_text text,
  include_cid boolean not null default false,
  cid_code text,
  companion_name text,
  integrity_hash text not null,
  revocation_reason text,
  revoked_at timestamptz,
  revoked_by uuid references app.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Histórico de Versões e Retificações (DOC-008)
create table if not exists app.document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references app.clinical_documents(id) on delete cascade,
  version_number integer not null,
  content text not null,
  integrity_hash text not null,
  modified_by uuid not null references app.users(id) on delete restrict,
  change_reason text not null,
  created_at timestamptz not null default now()
);

-- 4. Habilitar RLS
alter table app.document_templates enable row level security;
alter table app.clinical_documents enable row level security;
alter table app.document_versions enable row level security;

-- 5. Políticas RLS
drop policy if exists document_templates_select on app.document_templates;
create policy document_templates_select on app.document_templates for select to vitaloop_app using (app.has_permission('document.read'));

drop policy if exists clinical_documents_select on app.clinical_documents;
drop policy if exists clinical_documents_insert on app.clinical_documents;
drop policy if exists clinical_documents_update on app.clinical_documents;
create policy clinical_documents_select on app.clinical_documents for select to vitaloop_app using (app.has_permission('document.read'));
create policy clinical_documents_insert on app.clinical_documents for insert to vitaloop_app with check (app.has_permission('document.issue'));
create policy clinical_documents_update on app.clinical_documents for update to vitaloop_app using (app.has_permission('document.revoke'));

drop policy if exists document_versions_select on app.document_versions;
create policy document_versions_select on app.document_versions for select to vitaloop_app using (app.has_permission('document.read'));

-- 6. Concessão de Permissões à role vitaloop_app
grant select, insert, update, delete on app.document_templates to vitaloop_app;
grant select, insert, update, delete on app.clinical_documents to vitaloop_app;
grant select, insert, update, delete on app.document_versions to vitaloop_app;

-- 7. Permissões RBAC
insert into app.permissions (code, name, resource, action) values
  ('document.read',  'Consultar documentos clínicos emitidos', 'document', 'read'),
  ('document.issue', 'Emitir atestados, declarações e relatórios clínicos', 'document', 'issue'),
  ('document.revoke','Retificar ou cancelar documentos clínicos', 'document', 'revoke')
on conflict (code) do nothing;

insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code in ('doctor', 'nurse', 'receptionist', 'admin', 'test_patient_full')
  and p.code in ('document.read', 'document.issue', 'document.revoke')
on conflict do nothing;

-- 8. Templates Padrão Iniciais
insert into app.document_templates (document_type, title, body_template) values
  ('medical_certificate', 'Atestado Médico de Afastamento', 'Atesto para os devidos fins que o(a) paciente esteve sob cuidados médicos nesta UPA 24h e necessita de repouso por {{days_off}} ({{days_off_text}}) dia(s).'),
  ('attendance_declaration', 'Declaração de Comparecimento', 'Declaro que o(a) paciente compareceu a esta UPA 24h para atendimento médico no dia {{date}}.'),
  ('companion_certificate', 'Atestado de Acompanhamento', 'Atesto que o(a) Sr(a) {{companion_name}} permaneceu como acompanhante responsável pelo paciente nesta UPA 24h.')
on conflict do nothing;
