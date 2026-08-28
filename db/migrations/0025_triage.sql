-- =====================================================================
-- VITALOOP 1.3 — Migration 0025 (Fase 2, Etapa 6/6)
-- Módulo Assistencial: Triagem, Acolhimento e Classificação de Risco de Manchester
-- Estritamente ADITIVA; não altera 0001-0024.
-- =====================================================================

-- 1. Enums de Triagem e Classificação de Risco de Manchester
create type app.triage_risk_color as enum ('red', 'orange', 'yellow', 'green', 'blue');
create type app.triage_priority as enum ('emergency', 'very_urgent', 'urgent', 'standard', 'non_urgent');

-- 2. Tabela Principal de Triagens
create table app.triages (
  id                      uuid primary key default gen_random_uuid(),
  encounter_id            uuid not null references app.encounters(id) on delete cascade,
  patient_id              uuid not null references app.patients(id) on delete cascade,
  institution_id          uuid not null references app.institutions(id) on delete cascade,
  unit_id                 uuid references app.units(id) on delete set null,
  sector_id               uuid references app.sectors(id) on delete set null,

  -- Dados Assistenciais da Triagem / Acolhimento
  chief_complaint         text not null,
  symptoms_duration       text,
  history                 text,

  -- Sinais Vitais (PA sistólica/diastólica, FC, FR, Temp, SatO2)
  vitals                  jsonb not null default '{}'::jsonb,
  pain_score              integer check (pain_score is null or (pain_score >= 0 and pain_score <= 10)),
  glasgow_score           integer check (glasgow_score is null or (glasgow_score >= 3 and glasgow_score <= 15)),
  capillary_glucose       integer check (capillary_glucose is null or capillary_glucose >= 0),

  -- Protocolo de Manchester
  flowchart               text,
  discriminator           text,
  risk_color              app.triage_risk_color not null,
  priority                app.triage_priority not null,
  target_time_minutes     integer not null,
  protocol_version        text not null default 'Manchester v1',

  -- Rastreabilidade de Reclassificação
  reclassification_reason text,
  reclassified_from       text,

  notes                   text,
  performed_by            uuid not null references app.users(id),
  performed_at            timestamptz not null default now(),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),

  constraint triages_target_time_ck check (target_time_minutes >= 0)
);

-- Índices de consulta e busca
create index triages_encounter_idx on app.triages(encounter_id);
create index triages_patient_idx on app.triages(patient_id);
create index triages_risk_color_idx on app.triages(risk_color);
create index triages_performed_at_idx on app.triages(performed_at);

comment on table app.triages is 'Registros de triagem clínica, sinais vitais e classificação de risco (Doc 1 §16/17; Doc 3 §12).';

-- 3. Row Level Security (RLS)
alter table app.triages enable row level security;

create policy triages_read on app.triages
  for select to vitaloop_app
  using (app.has_permission('triage.read'));

create policy triages_insert on app.triages
  for insert to vitaloop_app
  with check (app.has_permission('triage.write'));

create policy triages_update on app.triages
  for update to vitaloop_app
  using (app.has_permission('triage.write'))
  with check (app.has_permission('triage.write'));

-- 4. Permissões RBAC
insert into app.permissions (code, name, resource, action) values
  ('triage.read',  'Ler triagens e classificações de risco', 'triage', 'read'),
  ('triage.write', 'Registrar e reclassificar triagens',    'triage', 'write')
on conflict (code) do nothing;

-- Grants para roles de teste
insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code = 'test_patient_full' and p.code in ('triage.read', 'triage.write')
on conflict do nothing;

insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code = 'test_patient_readonly' and p.code = 'triage.read'
on conflict do nothing;

-- Grants de tabela para role vitaloop_app
grant select, insert, update on app.triages to vitaloop_app;

-- 5. Trigger de atualização de updated_at
create trigger triages_touch_updated
  before update on app.triages
  for each row execute function app.touch_updated_at();
