-- =====================================================================
-- VITALOOP 1.3 — Migration 0031 (Fase 3, Etapa 6/6)
-- Desfechos Assistenciais, Sumário de Alta e Fechamento (OUT-001..014)
-- Estritamente ADITIVA; não altera 0001-0030.
-- =====================================================================

-- 1. Enum para Tipos de Desfecho Assistencial
do $$ begin
  create type app.outcome_type as enum (
    'medical_discharge',
    'administrative_discharge',
    'discharge_against_medical_advice',
    'evasion',
    'transfer',
    'admission_bed',
    'death'
  );
exception when duplicate_object then null;
end $$;

-- 2. Tabela de Desfechos Assistenciais
create table app.encounter_outcomes (
  id                     uuid primary key default gen_random_uuid(),
  encounter_id           uuid unique not null references app.encounters(id) on delete cascade,
  patient_id             uuid not null references app.patients(id) on delete cascade,
  consultation_id        uuid references app.medical_consultations(id) on delete cascade,
  doctor_id              uuid not null references app.users(id) on delete restrict,
  outcome_type           app.outcome_type not null,
  notes                  text,
  destination_unit       text,
  regulation_code        text,
  death_timestamp        timestamptz,
  death_certificate_info text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

comment on table app.encounter_outcomes is 'Registro único de desfecho assistencial e encerramento do atendimento (OUT-001..008).';

create index encounter_outcomes_patient_idx on app.encounter_outcomes(patient_id);
create index encounter_outcomes_type_idx on app.encounter_outcomes(outcome_type);

-- 3. Tabela de Sumário de Alta Estruturado
create table app.encounter_summaries (
  id                            uuid primary key default gen_random_uuid(),
  outcome_id                    uuid unique not null references app.encounter_outcomes(id) on delete cascade,
  encounter_id                  uuid unique not null references app.encounters(id) on delete cascade,
  patient_id                    uuid not null references app.patients(id) on delete cascade,
  doctor_id                     uuid not null references app.users(id) on delete restrict,
  chief_complaint               text,
  primary_diagnosis_code        text,
  primary_diagnosis_description text,
  summary_notes                 text,
  discharge_instructions        text,
  discharge_prescription        jsonb,
  issued_at                     timestamptz not null default now(),
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now()
);

comment on table app.encounter_summaries is 'Documento consolidado de Sumário de Alta da UPA 24h (OUT-009..011).';

create index encounter_summaries_patient_idx on app.encounter_summaries(patient_id);

-- 4. Row Level Security (RLS)
alter table app.encounter_outcomes enable row level security;
alter table app.encounter_summaries enable row level security;

create policy encounter_outcomes_read on app.encounter_outcomes
  for select to vitaloop_app using (app.has_permission('outcome.read') or app.has_permission('medical.read'));

create policy encounter_outcomes_insert on app.encounter_outcomes
  for insert to vitaloop_app with check (app.has_permission('outcome.write'));

create policy encounter_outcomes_update on app.encounter_outcomes
  for update to vitaloop_app using (app.has_permission('outcome.write')) with check (app.has_permission('outcome.write'));

create policy encounter_summaries_read on app.encounter_summaries
  for select to vitaloop_app using (app.has_permission('outcome.read') or app.has_permission('medical.read'));

create policy encounter_summaries_insert on app.encounter_summaries
  for insert to vitaloop_app with check (app.has_permission('outcome.write'));

create policy encounter_summaries_update on app.encounter_summaries
  for update to vitaloop_app using (app.has_permission('outcome.write')) with check (app.has_permission('outcome.write'));

-- Permitir que desfecho assistencial (outcome.write) atualize estado do atendimento e bilhetes de fila
create policy encounters_update_outcome on app.encounters
  for update to vitaloop_app using (app.has_permission('outcome.write')) with check (app.has_permission('outcome.write'));

create policy queue_tickets_update_outcome on app.queue_tickets
  for update to vitaloop_app using (app.has_permission('outcome.write')) with check (app.has_permission('outcome.write'));

-- 5. Permissões RBAC
insert into app.permissions (code, name, resource, action) values
  ('outcome.read',  'Visualizar desfechos assistenciais e sumários de alta', 'outcome', 'read'),
  ('outcome.write', 'Encerrar atendimento assistencial e emitir sumário de alta', 'outcome', 'write')
on conflict (code) do nothing;

-- Grants para roles de teste
insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code = 'test_patient_full' and p.code in ('outcome.read', 'outcome.write')
on conflict do nothing;

insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code = 'test_patient_readonly' and p.code = 'outcome.read'
on conflict do nothing;

-- Inserção de usuários de teste em app.users para integridade referencial de doctor_id
insert into app.users (id, auth_subject, username, name, email, status) values
  ('83ad7af3-c506-48be-b2a0-6fbd0bb6bf1b', '00000000-0000-0000-0000-000000000001', 'test_user_full', 'Médico Teste Full', 'testfull@vitaloop.local', 'active'),
  ('10243fdf-2cc4-4f35-8544-1f1d2e338472', '00000000-0000-0000-0000-000000000002', 'test_user_readonly', 'Médico Teste Readonly', 'testreadonly@vitaloop.local', 'active'),
  ('464ef92a-6d14-446e-9a9b-95801b515c6d', '00000000-0000-0000-0000-000000000003', 'test_user_noperm', 'Médico Teste NoPerm', 'testnoperm@vitaloop.local', 'active')
on conflict (id) do nothing;

-- Grants de tabela para role vitaloop_app
grant select, insert, update, delete on app.encounter_outcomes to vitaloop_app;
grant select, insert, update, delete on app.encounter_summaries to vitaloop_app;

-- 6. Triggers de updated_at
create trigger encounter_outcomes_touch_updated
  before update on app.encounter_outcomes
  for each row execute function app.touch_updated_at();

create trigger encounter_summaries_touch_updated
  before update on app.encounter_summaries
  for each row execute function app.touch_updated_at();
