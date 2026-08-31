-- Migration 0040: Interoperabilidade Barramento FHIR R4, HL7 (LIS/RIS) e PACS DICOM (INT-001, INT-002, INT-003, INT-009)
-- Migration estritamente aditiva. Não altera 0001 a 0039.

-- 1. Tabela de Mensagens do Barramento de Integração (INT-001, INT-002, INT-003, INT-009)
create table if not exists app.integration_messages (
  id uuid primary key default gen_random_uuid(),
  message_type text not null, -- 'HL7_ORU_R01', 'HL7_ORM_O01', 'DICOM_WADO', 'FHIR_REST'
  sender text not null default 'LIS_EXTERNAL',
  raw_payload text not null,
  parsed_json jsonb,
  status text not null default 'received', -- 'received', 'processed', 'failed'
  error_message text,
  encounter_id uuid references app.encounters(id) on delete set null,
  patient_id uuid references app.patients(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Tabela de Cache de Recursos FHIR R4 (INT-009)
create table if not exists app.fhir_resources (
  id uuid primary key default gen_random_uuid(),
  resource_type text not null, -- 'Patient', 'Encounter', 'Observation', 'DiagnosticReport'
  resource_id uuid not null,
  fhir_version text not null default 'R4',
  resource_json jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Tabela de Metadados de Estudos DICOM PACS (INT-003)
create table if not exists app.dicom_studies (
  id uuid primary key default gen_random_uuid(),
  encounter_id uuid not null references app.encounters(id) on delete cascade,
  patient_id uuid not null references app.patients(id) on delete cascade,
  study_instance_uid text not null unique,
  modality text not null, -- 'CT', 'MR', 'XR', 'US'
  description text not null,
  series_count int not null default 1,
  instance_count int not null default 1,
  wado_url text not null,
  created_at timestamptz not null default now()
);

-- 4. Habilitar RLS
alter table app.integration_messages enable row level security;
alter table app.fhir_resources enable row level security;
alter table app.dicom_studies enable row level security;

-- 5. Políticas RLS
drop policy if exists integration_messages_select on app.integration_messages;
drop policy if exists integration_messages_insert on app.integration_messages;
create policy integration_messages_select on app.integration_messages for select to vitaloop_app using (app.has_permission('integration.read'));
create policy integration_messages_insert on app.integration_messages for insert to vitaloop_app with check (app.has_permission('integration.write'));

drop policy if exists fhir_resources_select on app.fhir_resources;
drop policy if exists fhir_resources_insert on app.fhir_resources;
create policy fhir_resources_select on app.fhir_resources for select to vitaloop_app using (app.has_permission('integration.read'));
create policy fhir_resources_insert on app.fhir_resources for insert to vitaloop_app with check (app.has_permission('integration.write'));

drop policy if exists dicom_studies_select on app.dicom_studies;
drop policy if exists dicom_studies_insert on app.dicom_studies;
create policy dicom_studies_select on app.dicom_studies for select to vitaloop_app using (app.has_permission('integration.read'));
create policy dicom_studies_insert on app.dicom_studies for insert to vitaloop_app with check (app.has_permission('integration.write'));

-- 6. Concessões de Permissões à role vitaloop_app
grant select, insert, update, delete on app.integration_messages to vitaloop_app;
grant select, insert, update, delete on app.fhir_resources to vitaloop_app;
grant select, insert, update, delete on app.dicom_studies to vitaloop_app;

-- 7. Permissões RBAC
insert into app.permissions (code, name, resource, action) values
  ('integration.read',  'Consultar barramento de integração FHIR, HL7 e PACS', 'integration', 'read'),
  ('integration.write', 'Enviar e processar mensagens no barramento de integração', 'integration', 'write')
on conflict (code) do nothing;

insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code in ('admin', 'doctor', 'nurse', 'receptionist', 'test_patient_full')
  and p.code in ('integration.read', 'integration.write')
on conflict do nothing;
