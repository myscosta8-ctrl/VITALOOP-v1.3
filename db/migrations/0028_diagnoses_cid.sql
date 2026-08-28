-- =====================================================================
-- VITALOOP 1.3 — Migration 0028 (Fase 3, Etapa 3/6)
-- Diagnósticos Clínicos e Catálogo CID-10 (MED-005, MED-006)
-- Estritamente ADITIVA; não altera 0001-0027.
-- =====================================================================

-- 1. Enums para Diagnósticos
create type app.diagnosis_type as enum ('principal', 'secondary');
create type app.diagnosis_status as enum ('active', 'resolved', 'refuted');

-- 2. Tabela de Catálogo CID-10
create table app.cid_catalog (
  code        text primary key,
  description text not null,
  chapter     text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

comment on table app.cid_catalog is 'Catálogo de referência da Classificação Internacional de Doenças (CID-10) — MED-006.';

create index cid_catalog_code_prefix_idx on app.cid_catalog(code text_pattern_ops);
create index cid_catalog_description_idx on app.cid_catalog(description text_pattern_ops);

-- Carga aditiva inicial de CIDs mais frequentes de UPA 24h
insert into app.cid_catalog (code, description, chapter) values
  ('J18.9', 'Pneumonia não especificada', 'Capítulo X - Doenças do aparelho respiratório'),
  ('J06.9', 'Infecção aguda das vias aéreas superiores não especificada', 'Capítulo X - Doenças do aparelho respiratório'),
  ('J45.9', 'Asma não especificada', 'Capítulo X - Doenças do aparelho respiratório'),
  ('J20.9', 'Bronquite aguda não especificada', 'Capítulo X - Doenças do aparelho respiratório'),
  ('I10',   'Hipertensão essencial (primária)', 'Capítulo IX - Doenças do aparelho circulatório'),
  ('I20.9', 'Angina pectoris não especificada', 'Capítulo IX - Doenças do aparelho circulatório'),
  ('I21.9', 'Infarto agudo do miocárdio não especificado', 'Capítulo IX - Doenças do aparelho circulatório'),
  ('E11.9', 'Diabetes mellitus não-insulino-dependente - sem complicações', 'Capítulo IV - Doenças endócrinas, nutricionais e metabólicas'),
  ('R51',   'Cefaleia', 'Capítulo XVIII - Sintomas, sinais e achados anormais'),
  ('R50.9', 'Febre não especificada', 'Capítulo XVIII - Sintomas, sinais e achados anormais'),
  ('R10.4', 'Outras dores abdominais e as não especificadas', 'Capítulo XVIII - Sintomas, sinais e achados anormais'),
  ('R07.4', 'Dor no peito não especificada', 'Capítulo XVIII - Sintomas, sinais e achados anormais'),
  ('M54.5', 'Lumbago com ciática / Dor lombar baixa', 'Capítulo XIII - Doenças do sistema osteomuscular'),
  ('A09',   'Gastroenterite e colite de origem não especificada', 'Capítulo I - Algumas doenças infecciosas e parasitárias'),
  ('K29.7', 'Gastrite não especificada', 'Capítulo XI - Doenças do aparelho digestivo'),
  ('N39.0', 'Infecção do trato urinário de localização não especificada', 'Capítulo XIV - Doenças do aparelho geniturinário')
on conflict (code) do nothing;

-- 3. Tabela de Diagnósticos do Atendimento
create table app.encounter_diagnoses (
  id              uuid primary key default gen_random_uuid(),
  consultation_id uuid not null references app.medical_consultations(id) on delete cascade,
  encounter_id    uuid not null references app.encounters(id) on delete cascade,
  patient_id      uuid not null references app.patients(id) on delete cascade,
  doctor_id       uuid not null references app.users(id) on delete restrict,
  cid_code        text not null references app.cid_catalog(code) on delete restrict,
  diagnosis_type  app.diagnosis_type not null default 'secondary',
  status          app.diagnosis_status not null default 'active',
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table app.encounter_diagnoses is 'Diagnósticos clínicos (principais e secundários) vinculados ao atendimento UPA (MED-005).';

-- Constraint de unicidade: Apenas 1 diagnóstico PRINCIPAL ativo por atendimento
create unique index encounter_diagnoses_single_principal_uk
  on app.encounter_diagnoses(encounter_id)
  where diagnosis_type = 'principal' and status = 'active';

-- Constraint de unicidade: Apenas 1 CID do mesmo código ativo por atendimento
create unique index encounter_diagnoses_unique_cid_uk
  on app.encounter_diagnoses(encounter_id, cid_code)
  where status = 'active';

create index encounter_diagnoses_consultation_idx on app.encounter_diagnoses(consultation_id);
create index encounter_diagnoses_patient_idx on app.encounter_diagnoses(patient_id);
create index encounter_diagnoses_doctor_idx on app.encounter_diagnoses(doctor_id);

-- 4. Row Level Security (RLS)
alter table app.cid_catalog enable row level security;
alter table app.encounter_diagnoses enable row level security;

create policy cid_catalog_read on app.cid_catalog
  for select to vitaloop_app
  using (true);

create policy encounter_diagnoses_read on app.encounter_diagnoses
  for select to vitaloop_app
  using (app.has_permission('diagnosis.read'));

create policy encounter_diagnoses_insert on app.encounter_diagnoses
  for insert to vitaloop_app
  with check (app.has_permission('diagnosis.write'));

create policy encounter_diagnoses_update on app.encounter_diagnoses
  for update to vitaloop_app
  using (app.has_permission('diagnosis.write'))
  with check (app.has_permission('diagnosis.write'));

-- 5. Permissões RBAC
insert into app.permissions (code, name, resource, action) values
  ('diagnosis.read',  'Pesquisar catálogo CID-10 e visualizar diagnósticos', 'diagnosis', 'read'),
  ('diagnosis.write', 'Registrar e atualizar diagnósticos clínicos', 'diagnosis', 'write')
on conflict (code) do nothing;

-- Grants para roles de teste
insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code = 'test_patient_full' and p.code in ('diagnosis.read', 'diagnosis.write')
on conflict do nothing;

insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code = 'test_patient_readonly' and p.code = 'diagnosis.read'
on conflict do nothing;

-- Grants de tabela para role vitaloop_app
grant select on app.cid_catalog to vitaloop_app;
grant select, insert, update, delete on app.encounter_diagnoses to vitaloop_app;

-- 6. Trigger de updated_at
create trigger encounter_diagnoses_touch_updated
  before update on app.encounter_diagnoses
  for each row execute function app.touch_updated_at();
