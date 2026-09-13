-- Migration 0084: Reavaliação de sinais vitais fora da Triagem
-- Migration estritamente aditiva. Não altera 0001 a 0083.
--
-- Fase 2 do plano de reconstrução do módulo assistencial (auditoria contra
-- o projeto de referência Emergency Care, 12/09/2026): hoje só a Triagem
-- grava sinais vitais (app.triages.vitals) — Consulta Médica e Enfermagem
-- não tinham como registrar uma nova aferição durante o atendimento. Esta
-- tabela é só a lista cronológica de reaferições feitas depois da Triagem;
-- a aferição inicial continua em app.triages, não duplicada aqui.
--
-- Permissões próprias (vital_signs.read/write) em vez de reaproveitar
-- nursing.*/triage.* porque tanto enfermagem quanto medicina reavaliam
-- sinais vitais — não é uma ação exclusiva de um tipo de profissional.

create table if not exists app.vital_sign_readings (
  id uuid primary key default gen_random_uuid(),
  encounter_id uuid not null references app.encounters(id) on delete cascade,
  patient_id uuid not null references app.patients(id) on delete cascade,
  source text not null check (source in ('triagem', 'consulta', 'enfermagem')),
  vitals jsonb not null default '{}'::jsonb,
  notes text,
  recorded_by uuid not null references app.users(id) on delete restrict,
  created_at timestamptz not null default now()
);
create index if not exists vital_sign_readings_encounter_idx on app.vital_sign_readings(encounter_id, created_at desc);

alter table app.vital_sign_readings enable row level security;

drop policy if exists vital_sign_readings_select on app.vital_sign_readings;
drop policy if exists vital_sign_readings_insert on app.vital_sign_readings;
create policy vital_sign_readings_select on app.vital_sign_readings for select to vitaloop_app using (app.has_permission('vital_signs.read'));
create policy vital_sign_readings_insert on app.vital_sign_readings for insert to vitaloop_app with check (app.has_permission('vital_signs.write'));

grant select, insert on app.vital_sign_readings to vitaloop_app;

insert into app.permissions (code, name, resource, action) values
  ('vital_signs.read',  'Visualizar reavaliações de sinais vitais', 'vital_signs', 'read'),
  ('vital_signs.write', 'Registrar reavaliação de sinais vitais', 'vital_signs', 'write')
on conflict (code) do nothing;

insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code in ('nurse', 'doctor', 'manager', 'direcao', 'admin', 'system_admin')
  and p.code in ('vital_signs.read', 'vital_signs.write')
on conflict do nothing;
