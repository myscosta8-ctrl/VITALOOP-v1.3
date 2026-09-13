-- Migration 0086: Inventário de Pertences, Medicamentos Controlados, Ficha de Referência
-- Migration estritamente aditiva. Não altera 0001 a 0085.
--
-- Fase 5 do plano de reconstrução do módulo assistencial (12/09/2026) — 3
-- lacunas administrativas/operacionais encontradas contra o projeto de
-- referência Emergency Care:
-- 1. Inventário de Pertences do Paciente — não existia nenhum registro.
-- 2. Medicamentos Controlados — hoje são só mais um item de prescrição
--    comum, sem o rastreio que a Portaria SVS/MS 344/98 exige.
-- 3. Ficha de Referência — a transferência sai só com a solicitação de vaga
--    (app.external_regulations), sem o resumo clínico formal que acompanha
--    o paciente até a unidade de destino.

-- 1. Inventário de Pertences (form_fields jsonb, mesmo padrão de
--    app.nutrition_assessments) — reaproveita nursing.read/nursing.write.
create table if not exists app.patient_belongings_inventories (
  id uuid primary key default gen_random_uuid(),
  encounter_id uuid not null references app.encounters(id) on delete cascade,
  patient_id uuid not null references app.patients(id) on delete cascade,
  requested_by uuid not null references app.users(id) on delete restrict,
  form_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists patient_belongings_inventories_encounter_idx on app.patient_belongings_inventories(encounter_id);

alter table app.patient_belongings_inventories enable row level security;
drop policy if exists patient_belongings_inventories_select on app.patient_belongings_inventories;
drop policy if exists patient_belongings_inventories_insert on app.patient_belongings_inventories;
create policy patient_belongings_inventories_select on app.patient_belongings_inventories for select to vitaloop_app using (app.has_permission('nursing.read'));
create policy patient_belongings_inventories_insert on app.patient_belongings_inventories for insert to vitaloop_app with check (app.has_permission('nursing.write'));
grant select, insert on app.patient_belongings_inventories to vitaloop_app;

-- 2. Ficha de Referência (form_fields jsonb) — reaproveita regulation.read/
--    regulation.manage, mesmo domínio funcional de app.external_regulations.
create table if not exists app.referral_forms (
  id uuid primary key default gen_random_uuid(),
  encounter_id uuid not null references app.encounters(id) on delete cascade,
  patient_id uuid not null references app.patients(id) on delete cascade,
  requested_by uuid not null references app.users(id) on delete restrict,
  form_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists referral_forms_encounter_idx on app.referral_forms(encounter_id);

alter table app.referral_forms enable row level security;
drop policy if exists referral_forms_select on app.referral_forms;
drop policy if exists referral_forms_insert on app.referral_forms;
create policy referral_forms_select on app.referral_forms for select to vitaloop_app using (app.has_permission('regulation.read'));
create policy referral_forms_insert on app.referral_forms for insert to vitaloop_app with check (app.has_permission('regulation.manage'));
grant select, insert on app.referral_forms to vitaloop_app;

-- 3. Medicamentos Controlados: classe de controle no catálogo (Portaria
--    SVS/MS 344/98) + tabela de rastreio de dispensação, com colunas
--    relacionais de verdade (não form_fields) porque tem regra própria de
--    validação (número de notificação obrigatório pras listas A/B) e
--    referência direta ao item de prescrição — reaproveita
--    medication.administer/nursing.read (mesmo domínio de
--    app.medication_administrations).
alter table app.medication_catalog add column if not exists controlled_class text
  check (controlled_class is null or controlled_class in ('A1','A2','A3','B1','B2','C1','C2','C3','C4','C5'));

-- Tramadol (MED-009) é Lista A1 — único item já cadastrado no catálogo
-- seed (migration 0029) sujeito a controle especial.
update app.medication_catalog set controlled_class = 'A1' where code = 'MED-009' and controlled_class is null;

create table if not exists app.controlled_medication_dispensations (
  id uuid primary key default gen_random_uuid(),
  prescription_item_id uuid not null references app.prescription_items(id) on delete restrict,
  encounter_id uuid not null references app.encounters(id) on delete cascade,
  patient_id uuid not null references app.patients(id) on delete cascade,
  controlled_class text not null check (controlled_class in ('A1','A2','A3','B1','B2','C1','C2','C3','C4','C5')),
  quantity_dispensed numeric not null check (quantity_dispensed > 0),
  unit text not null,
  prescription_notification_number text,
  dispensed_by uuid not null references app.users(id) on delete restrict,
  witness_name text,
  notes text,
  dispensed_at timestamptz not null default now()
);
create index if not exists controlled_medication_dispensations_encounter_idx on app.controlled_medication_dispensations(encounter_id);

alter table app.controlled_medication_dispensations enable row level security;
drop policy if exists controlled_medication_dispensations_select on app.controlled_medication_dispensations;
drop policy if exists controlled_medication_dispensations_insert on app.controlled_medication_dispensations;
create policy controlled_medication_dispensations_select on app.controlled_medication_dispensations for select to vitaloop_app using (app.has_permission('nursing.read'));
create policy controlled_medication_dispensations_insert on app.controlled_medication_dispensations for insert to vitaloop_app with check (app.has_permission('medication.administer'));
grant select, insert on app.controlled_medication_dispensations to vitaloop_app;
