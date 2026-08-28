-- =====================================================================
-- VITALOOP 1.3 — Migration 0024 (Fase 2, Etapa 5/6)
-- Domínio ATENDIMENTO (Encounters): abertura, acompanhamento, transições de estado,
-- cancelamento e encerramento assistencial.
--
-- Requisitos: ENC-001 a ENC-013 (Doc 1 §13/§14; Doc 2 §64; Doc 3 §10).
-- Aditiva; não edita migrations 0001-0023.
-- =====================================================================

-- ---------- Enums ----------
create type app.encounter_type as enum ('urgency', 'emergency', 'elective', 'return');
create type app.encounter_origin as enum ('spontaneous', 'samu', 'transfer', 'rescue_other');
create type app.encounter_status as enum (
  'created',
  'triage_pending',
  'triaged',
  'consultation_pending',
  'in_consultation',
  'completed',
  'canceled'
);

-- ---------- Permissões novas (RBAC) ----------
insert into app.permissions(code, name, resource, action) values
 ('encounter.read',  'Ler atendimentos',          'encounter', 'read'),
 ('encounter.write', 'Criar/editar atendimento',  'encounter', 'write')
on conflict (code) do nothing;

-- ---------- Tabela app.encounters ----------
create table app.encounters (
  id                uuid primary key default gen_random_uuid(),
  patient_id        uuid not null references app.patients(id) on delete restrict,
  institution_id    uuid not null references app.institutions(id) on delete restrict,
  unit_id           uuid references app.units(id) on delete restrict,
  sector_id         uuid references app.sectors(id) on delete restrict,
  encounter_type    app.encounter_type not null,
  origin            app.encounter_origin not null,
  chief_complaint   text not null,
  status            app.encounter_status not null default 'created',
  cancel_reason     text,
  assigned_user_id  uuid references app.users(id) on delete set null,
  created_by        uuid references app.users(id) on delete set null,
  updated_by        uuid references app.users(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table app.encounters is 'Atendimentos assistenciais da UPA 24h (ENC-001..013). Ciclo de vida assistencial e vinculo com o paciente.';

-- Constraint: Apenas 1 atendimento ativo por paciente por instituição
create unique index encounters_single_active_patient_uk
  on app.encounters(institution_id, patient_id)
  where status not in ('completed', 'canceled');

-- Índices de consulta rápida
create index encounters_patient_idx on app.encounters(patient_id);
create index encounters_institution_status_idx on app.encounters(institution_id, status);
create index encounters_sector_idx on app.encounters(sector_id);

-- Trigger de updated_at
create trigger encounters_touch_updated before update on app.encounters
  for each row execute function app.touch_updated_at();

-- ---------- RLS: negar por padrão, permitir explicitamente a vitaloop_app ----------
alter table app.encounters enable row level security;

create policy encounters_read on app.encounters for select to vitaloop_app
  using (app.has_permission('encounter.read'));

create policy encounters_insert on app.encounters for insert to vitaloop_app
  with check (app.has_permission('encounter.write'));

create policy encounters_update on app.encounters for update to vitaloop_app
  using (app.has_permission('encounter.write'))
  with check (app.has_permission('encounter.write'));

grant select, insert, update on app.encounters to vitaloop_app;
