-- Migration 0085: Declaração de Óbito estruturada + Checklist de Alta
-- Migration estritamente aditiva. Não altera 0001 a 0084.
--
-- Fase 4 do plano de reconstrução do módulo assistencial (12/09/2026):
-- 1. Óbito era só 2 campos de texto livre (`death_timestamp`,
--    `death_certificate_info`) — adiciona `death_certificate_data` jsonb
--    (causa mortis A/B/C/D, circunstância do óbito, dados de
--    declarante/cartório), mantendo os 2 campos antigos intactos.
-- 2. Checklist de Alta não existia — nova tabela, mesmo padrão de
--    app.nutrition_assessments/app.nursing_admission_forms (form_fields
--    jsonb via engine genérico de clinical-forms), reaproveitando as
--    permissões outcome.read/outcome.write já existentes (é parte do mesmo
--    fluxo de encerramento do atendimento).

alter table app.encounter_outcomes add column if not exists death_certificate_data jsonb;

create table if not exists app.discharge_checklists (
  id uuid primary key default gen_random_uuid(),
  encounter_id uuid not null references app.encounters(id) on delete cascade,
  patient_id uuid not null references app.patients(id) on delete cascade,
  requested_by uuid not null references app.users(id) on delete restrict,
  form_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists discharge_checklists_encounter_idx on app.discharge_checklists(encounter_id);
create index if not exists discharge_checklists_patient_idx on app.discharge_checklists(patient_id);

alter table app.discharge_checklists enable row level security;

drop policy if exists discharge_checklists_select on app.discharge_checklists;
drop policy if exists discharge_checklists_insert on app.discharge_checklists;
create policy discharge_checklists_select on app.discharge_checklists for select to vitaloop_app using (app.has_permission('outcome.read'));
create policy discharge_checklists_insert on app.discharge_checklists for insert to vitaloop_app with check (app.has_permission('outcome.write'));

grant select, insert on app.discharge_checklists to vitaloop_app;
