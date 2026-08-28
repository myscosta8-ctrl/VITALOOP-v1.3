-- =====================================================================
-- VITALOOP 1.3 — Migration 0029 (Fase 3, Etapa 4/6)
-- Prescrição Médica Estruturada e Alertas de Alergia (MEDC-001..019)
-- Estritamente ADITIVA; não altera 0001-0028.
-- =====================================================================

-- 1. Enums para Prescrição e Alertas
create type app.prescription_status as enum ('draft', 'active', 'suspended', 'canceled', 'completed');
create type app.route_of_administration as enum ('VO', 'EV', 'IM', 'SC', 'SL', 'Inalatoria', 'Topica', 'Outra');
create type app.allergy_alert_severity as enum ('warning', 'critical');

-- 2. Tabela de Catálogo de Medicamentos
create table app.medication_catalog (
  id                  uuid primary key default gen_random_uuid(),
  code                text unique not null,
  name                text not null,
  active_substance    text not null,
  pharmaceutical_form text,
  default_route       app.route_of_administration default 'VO',
  is_active           boolean not null default true,
  created_at          timestamptz not null default now()
);

comment on table app.medication_catalog is 'Catálogo de medicamentos padronizados da UPA (MEDC-001..005).';

create index medication_catalog_name_idx on app.medication_catalog(name text_pattern_ops);
create index medication_catalog_substance_idx on app.medication_catalog(active_substance text_pattern_ops);

-- Carga aditiva inicial de medicamentos frequentes de UPA 24h
insert into app.medication_catalog (code, name, active_substance, pharmaceutical_form, default_route) values
  ('MED-001', 'Dipirona Sódica 500mg/ml', 'dipirona', 'Solução Injetável 2ml', 'EV'),
  ('MED-002', 'Dipirona Sódica 500mg', 'dipirona', 'Comprimido', 'VO'),
  ('MED-003', 'Paracetamol 750mg', 'paracetamol', 'Comprimido', 'VO'),
  ('MED-004', 'Amoxicilina 500mg', 'amoxicilina', 'Cápsula', 'VO'),
  ('MED-005', 'Ceftriaxona 1g', 'ceftriaxona', 'Pó para solução injetável', 'EV'),
  ('MED-006', 'Buscopan Composto (Escopolamina + Dipirona)', 'dipirona', 'Solução Injetável', 'EV'),
  ('MED-007', 'Dexametasona 4mg/ml', 'dexametasona', 'Solução Injetável 2ml', 'EV'),
  ('MED-008', 'Salbutamol 100mcg/dose', 'salbutamol', 'Spray Inalatório', 'Inalatoria'),
  ('MED-009', 'Cloridrato de Tramadol 50mg/ml', 'tramadol', 'Solução Injetável 2ml', 'EV'),
  ('MED-010', 'Ondansetrona 4mg', 'ondansetrona', 'Comprimido / Solução Injetável', 'EV'),
  ('MED-011', 'Omeprazol 40mg', 'omeprazol', 'Pó para solução injetável', 'EV'),
  ('MED-012', 'Ciprofloxacino 500mg', 'ciprofloxacino', 'Comprimido', 'VO'),
  ('MED-013', 'Penicilina G Benzatina 1.200.000 UI', 'penicilina', 'Suspensão Injetável', 'IM'),
  ('MED-014', 'Ketoprofeno 100mg', 'ketoprofeno', 'Pó para solução injetável', 'EV')
on conflict (code) do nothing;

-- 3. Tabela de Prescrições Médicas
create table app.prescriptions (
  id              uuid primary key default gen_random_uuid(),
  consultation_id uuid not null references app.medical_consultations(id) on delete cascade,
  encounter_id    uuid not null references app.encounters(id) on delete cascade,
  patient_id      uuid not null references app.patients(id) on delete cascade,
  doctor_id       uuid not null references app.users(id) on delete restrict,
  status          app.prescription_status not null default 'active',
  notes           text,
  canceled_at     timestamptz,
  canceled_by     uuid references app.users(id),
  cancel_reason   text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table app.prescriptions is 'Registro principal da prescrição médica (MEDC-001..010).';

create index prescriptions_encounter_idx on app.prescriptions(encounter_id);
create index prescriptions_patient_idx on app.prescriptions(patient_id);
create index prescriptions_doctor_idx on app.prescriptions(doctor_id);

-- 4. Tabela de Itens da Prescrição
create table app.prescription_items (
  id              uuid primary key default gen_random_uuid(),
  prescription_id uuid not null references app.prescriptions(id) on delete cascade,
  medication_id   uuid references app.medication_catalog(id) on delete restrict,
  medication_name text not null,
  dose            numeric not null check (dose > 0),
  dose_unit       text not null,
  route           app.route_of_administration not null,
  frequency       text not null,
  duration        text,
  instructions    text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table app.prescription_items is 'Itens medicamentosos e recomendações da prescrição (MEDC-006..010).';

create index prescription_items_prescription_idx on app.prescription_items(prescription_id);

-- 5. Tabela de Alertas de Alergia Sobrepostos
create table app.allergy_alerts (
  id                   uuid primary key default gen_random_uuid(),
  prescription_id      uuid not null references app.prescriptions(id) on delete cascade,
  prescription_item_id uuid references app.prescription_items(id) on delete cascade,
  allergen             text not null,
  severity             app.allergy_alert_severity not null default 'critical',
  overridden           boolean not null default true,
  override_reason      text not null,
  overridden_by        uuid not null references app.users(id) on delete restrict,
  overridden_at        timestamptz not null default now(),
  created_at           timestamptz not null default now()
);

comment on table app.allergy_alerts is 'Registro auditável de alertas de alergia detectados e sobrepostos pelo médico (MEDC-011..019).';

create index allergy_alerts_prescription_idx on app.allergy_alerts(prescription_id);

-- 6. Row Level Security (RLS)
alter table app.medication_catalog enable row level security;
alter table app.prescriptions enable row level security;
alter table app.prescription_items enable row level security;
alter table app.allergy_alerts enable row level security;

create policy medication_catalog_read on app.medication_catalog
  for select to vitaloop_app
  using (true);

create policy prescriptions_read on app.prescriptions
  for select to vitaloop_app
  using (app.has_permission('prescription.read'));

create policy prescriptions_insert on app.prescriptions
  for insert to vitaloop_app
  with check (app.has_permission('prescription.write'));

create policy prescriptions_update on app.prescriptions
  for update to vitaloop_app
  using (app.has_permission('prescription.write'))
  with check (app.has_permission('prescription.write'));

create policy prescription_items_read on app.prescription_items
  for select to vitaloop_app
  using (app.has_permission('prescription.read'));

create policy prescription_items_insert on app.prescription_items
  for insert to vitaloop_app
  with check (app.has_permission('prescription.write'));

create policy prescription_items_update on app.prescription_items
  for update to vitaloop_app
  using (app.has_permission('prescription.write'))
  with check (app.has_permission('prescription.write'));

create policy allergy_alerts_read on app.allergy_alerts
  for select to vitaloop_app
  using (app.has_permission('prescription.read'));

create policy allergy_alerts_insert on app.allergy_alerts
  for insert to vitaloop_app
  with check (app.has_permission('prescription.write'));

-- 7. Permissões RBAC
insert into app.permissions (code, name, resource, action) values
  ('prescription.read',  'Visualizar prescrições e alertas de alergia', 'prescription', 'read'),
  ('prescription.write', 'Criar, alterar, cancelar prescrições e sobrepor alertas', 'prescription', 'write')
on conflict (code) do nothing;

-- Grants para roles de teste
insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code = 'test_patient_full' and p.code in ('prescription.read', 'prescription.write')
on conflict do nothing;

insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code = 'test_patient_readonly' and p.code = 'prescription.read'
on conflict do nothing;

-- Grants de tabela para role vitaloop_app
grant select on app.medication_catalog to vitaloop_app;
grant select, insert, update, delete on app.prescriptions to vitaloop_app;
grant select, insert, update, delete on app.prescription_items to vitaloop_app;
grant select, insert, update, delete on app.allergy_alerts to vitaloop_app;

-- 8. Triggers de updated_at
create trigger prescriptions_touch_updated
  before update on app.prescriptions
  for each row execute function app.touch_updated_at();

create trigger prescription_items_touch_updated
  before update on app.prescription_items
  for each row execute function app.touch_updated_at();
