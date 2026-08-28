-- =====================================================================
-- VITALOOP 1.3 — Migration 0030 (Fase 3, Etapa 5/6)
-- Solicitação de Exames, Procedimentos e Interconsultas (EXM-001..009)
-- Estritamente ADITIVA; não altera 0001-0029.
-- =====================================================================

-- 1. Enums para Exames, Procedimentos e Interconsultas
create type app.exam_type as enum ('laboratory', 'imaging', 'other');
create type app.exam_status as enum ('requested', 'collected', 'in_analysis', 'completed', 'canceled');
create type app.procedure_status as enum ('requested', 'in_progress', 'completed', 'canceled');
create type app.interconsultation_status as enum ('requested', 'in_review', 'answered', 'canceled');
create type app.interconsultation_priority as enum ('routine', 'urgent', 'emergency');

-- 2. Tabela de Catálogo de Exames
create table app.exam_catalog (
  id          uuid primary key default gen_random_uuid(),
  code        text unique not null,
  name        text not null,
  type        app.exam_type not null default 'laboratory',
  category    text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

comment on table app.exam_catalog is 'Catálogo padronizado de exames laboratoriais e de imagem da UPA (EXM-001).';

create index exam_catalog_name_idx on app.exam_catalog(name text_pattern_ops);
create index exam_catalog_type_idx on app.exam_catalog(type);

-- Carga aditiva inicial de exames frequentes de UPA 24h
insert into app.exam_catalog (code, name, type, category) values
  ('EXA-001', 'Hemograma Completo', 'laboratory', 'Hematologia'),
  ('EXA-002', 'Glicemia de Jejum / Capilar', 'laboratory', 'Bioquímica'),
  ('EXA-003', 'Ureia Sérica', 'laboratory', 'Bioquímica'),
  ('EXA-004', 'Creatinina Sérica', 'laboratory', 'Bioquímica'),
  ('EXA-005', 'Eletrólitos (Sódio e Potássio)', 'laboratory', 'Bioquímica'),
  ('EXA-006', 'Troponina I / T Cardíaca', 'laboratory', 'Marcadores Cardíacos'),
  ('EXA-007', 'Proteína C-Reativa (PCR)', 'laboratory', 'Imunologia'),
  ('EXA-008', 'EAS / Urina Tipo 1', 'laboratory', 'Uroanálise'),
  ('EXA-009', 'Gasometria Arterial', 'laboratory', 'Gasometria'),
  ('EXA-010', 'Raio-X de Tórax (AP/Perfil)', 'imaging', 'Radiologia'),
  ('EXA-011', 'Raio-X de Membro / Osso', 'imaging', 'Radiologia'),
  ('EXA-012', 'Eletrocardiograma (ECG 12 Derivações)', 'imaging', 'Cardiologia'),
  ('EXA-013', 'Ultrassonografia de Abdômen Total', 'imaging', 'Ultrassonografia')
on conflict (code) do nothing;

-- 3. Tabela de Catálogo de Procedimentos
create table app.procedure_catalog (
  id          uuid primary key default gen_random_uuid(),
  code        text unique not null,
  name        text not null,
  category    text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

comment on table app.procedure_catalog is 'Catálogo padronizado de procedimentos ambulatoriais de UPA (EXM-007).';

create index procedure_catalog_name_idx on app.procedure_catalog(name text_pattern_ops);

-- Carga aditiva inicial de procedimentos frequentes de UPA 24h
insert into app.procedure_catalog (code, name, category) values
  ('PRO-001', 'Sutura de Ferimento Superficial', 'Cirúrgico Limpo'),
  ('PRO-002', 'Curativo Especial (Grau I/II)', 'Enfermagem'),
  ('PRO-003', 'Nebulização / Inalação Contínua', 'Respiratório'),
  ('PRO-004', 'Cateterismo Vesical de Alívio / Demora', 'Enfermagem'),
  ('PRO-005', 'Lavagem Otológica', 'Ambulatorial'),
  ('PRO-006', 'Imobilização Provisória / Enfaixamento', 'Ortopedia'),
  ('PRO-007', 'Drenagem de Abscesso Superficial', 'Cirúrgico Limpo'),
  ('PRO-008', 'Instalação de Venóclise / Medicação Rápida', 'Enfermagem')
on conflict (code) do nothing;

-- 4. Tabela de Solicitações de Exames
create table app.exam_requests (
  id                  uuid primary key default gen_random_uuid(),
  consultation_id     uuid not null references app.medical_consultations(id) on delete cascade,
  encounter_id        uuid not null references app.encounters(id) on delete cascade,
  patient_id          uuid not null references app.patients(id) on delete cascade,
  requested_by        uuid not null references app.users(id) on delete restrict,
  exam_id             uuid references app.exam_catalog(id) on delete restrict,
  exam_name           text not null,
  exam_type           app.exam_type not null default 'laboratory',
  clinical_indication text not null,
  status              app.exam_status not null default 'requested',
  result_summary      text,
  result_notes        text,
  performed_at        timestamptz,
  performed_by        uuid references app.users(id),
  canceled_at         timestamptz,
  canceled_by         uuid references app.users(id),
  cancel_reason       text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table app.exam_requests is 'Registro de solicitações de exames laboratoriais e de imagem (EXM-001..006).';

create index exam_requests_encounter_idx on app.exam_requests(encounter_id);
create index exam_requests_patient_idx on app.exam_requests(patient_id);
create index exam_requests_status_idx on app.exam_requests(status);

-- 5. Tabela de Solicitações e Execução de Procedimentos
create table app.procedure_requests (
  id            uuid primary key default gen_random_uuid(),
  consultation_id uuid not null references app.medical_consultations(id) on delete cascade,
  encounter_id  uuid not null references app.encounters(id) on delete cascade,
  patient_id    uuid not null references app.patients(id) on delete cascade,
  requested_by  uuid not null references app.users(id) on delete restrict,
  procedure_id  uuid references app.procedure_catalog(id) on delete restrict,
  procedure_name text not null,
  instructions  text,
  status        app.procedure_status not null default 'requested',
  notes         text,
  performed_at  timestamptz,
  performed_by  uuid references app.users(id),
  canceled_at   timestamptz,
  canceled_by   uuid references app.users(id),
  cancel_reason text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table app.procedure_requests is 'Registro de solicitações e execuções de procedimentos ambulatoriais (EXM-007..008).';

create index procedure_requests_encounter_idx on app.procedure_requests(encounter_id);
create index procedure_requests_patient_idx on app.procedure_requests(patient_id);

-- 6. Tabela de Interconsultas Médicas
create table app.interconsultations (
  id               uuid primary key default gen_random_uuid(),
  consultation_id  uuid not null references app.medical_consultations(id) on delete cascade,
  encounter_id     uuid not null references app.encounters(id) on delete cascade,
  patient_id       uuid not null references app.patients(id) on delete cascade,
  requested_by     uuid not null references app.users(id) on delete restrict,
  specialty        text not null,
  priority         app.interconsultation_priority not null default 'routine',
  clinical_summary text not null,
  question         text not null,
  status           app.interconsultation_status not null default 'requested',
  response_notes   text,
  responded_by     uuid references app.users(id),
  responded_at     timestamptz,
  canceled_at      timestamptz,
  canceled_by      uuid references app.users(id),
  cancel_reason    text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on table app.interconsultations is 'Registro de solicitações e pareceres de interconsulta médica especializada (INT-001..002).';

create index interconsultations_encounter_idx on app.interconsultations(encounter_id);
create index interconsultations_patient_idx on app.interconsultations(patient_id);

-- 7. Row Level Security (RLS)
alter table app.exam_catalog enable row level security;
alter table app.procedure_catalog enable row level security;
alter table app.exam_requests enable row level security;
alter table app.procedure_requests enable row level security;
alter table app.interconsultations enable row level security;

create policy exam_catalog_read on app.exam_catalog
  for select to vitaloop_app using (true);

create policy procedure_catalog_read on app.procedure_catalog
  for select to vitaloop_app using (true);

create policy exam_requests_read on app.exam_requests
  for select to vitaloop_app using (app.has_permission('exam.read'));

create policy exam_requests_insert on app.exam_requests
  for insert to vitaloop_app with check (app.has_permission('exam.write'));

create policy exam_requests_update on app.exam_requests
  for update to vitaloop_app using (app.has_permission('exam.write')) with check (app.has_permission('exam.write'));

create policy procedure_requests_read on app.procedure_requests
  for select to vitaloop_app using (app.has_permission('exam.read'));

create policy procedure_requests_insert on app.procedure_requests
  for insert to vitaloop_app with check (app.has_permission('exam.write'));

create policy procedure_requests_update on app.procedure_requests
  for update to vitaloop_app using (app.has_permission('exam.write')) with check (app.has_permission('exam.write'));

create policy interconsultations_read on app.interconsultations
  for select to vitaloop_app using (app.has_permission('exam.read'));

create policy interconsultations_insert on app.interconsultations
  for insert to vitaloop_app with check (app.has_permission('exam.write'));

create policy interconsultations_update on app.interconsultations
  for update to vitaloop_app using (app.has_permission('exam.write')) with check (app.has_permission('exam.write'));

-- 8. Permissões RBAC
insert into app.permissions (code, name, resource, action) values
  ('exam.read',  'Visualizar exames, procedimentos e interconsultas', 'exam', 'read'),
  ('exam.write', 'Solicitar exames, registrar laudos, executar procedimentos e responder interconsultas', 'exam', 'write')
on conflict (code) do nothing;

-- Grants para roles de teste
insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code = 'test_patient_full' and p.code in ('exam.read', 'exam.write')
on conflict do nothing;

insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code = 'test_patient_readonly' and p.code = 'exam.read'
on conflict do nothing;

-- Grants de tabela para role vitaloop_app
grant select on app.exam_catalog to vitaloop_app;
grant select on app.procedure_catalog to vitaloop_app;
grant select, insert, update, delete on app.exam_requests to vitaloop_app;
grant select, insert, update, delete on app.procedure_requests to vitaloop_app;
grant select, insert, update, delete on app.interconsultations to vitaloop_app;

-- 9. Triggers de updated_at
create trigger exam_requests_touch_updated
  before update on app.exam_requests
  for each row execute function app.touch_updated_at();

create trigger procedure_requests_touch_updated
  before update on app.procedure_requests
  for each row execute function app.touch_updated_at();

create trigger interconsultations_touch_updated
  before update on app.interconsultations
  for each row execute function app.touch_updated_at();
