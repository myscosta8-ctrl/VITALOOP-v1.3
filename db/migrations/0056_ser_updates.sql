-- Migration 0056: Atualização de Quadro Clínico de Paciente Regulado (SER)
-- Migration estritamente aditiva. Não altera 0001 a 0055.
--
-- Campos extraídos do impresso real usado hoje na UPA 24h Breves (ver
-- docs/REFERENCIA_CAMPOS_IMPRESSOS_HOSPITALARES.md, item 5). Conceito
-- distinto de app.external_regulations (migration de regulação já
-- existente) — SER é a evolução clínica periódica de quem já está
-- regulado, não a solicitação/acompanhamento da regulação em si. Podem
-- existir vários registros SER por atendimento (uma "evolução diária" por
-- vez), por isso é uma tabela de log, sem coluna de status "aberto/fechado".
-- Sem coluna relacional extra — todo campo cabe em form_fields JSONB, mesmo
-- padrão de app.tfd_requests. Schema completo em @vitaloop/domain (módulo
-- `ser`), não no banco.

create table if not exists app.ser_updates (
  id uuid primary key default gen_random_uuid(),
  encounter_id uuid not null references app.encounters(id) on delete cascade,
  patient_id uuid not null references app.patients(id) on delete cascade,
  requested_by uuid not null references app.users(id) on delete restrict,
  form_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ser_updates_encounter_idx on app.ser_updates(encounter_id);
create index if not exists ser_updates_patient_idx on app.ser_updates(patient_id);

alter table app.ser_updates enable row level security;

drop policy if exists ser_updates_select on app.ser_updates;
drop policy if exists ser_updates_insert on app.ser_updates;
create policy ser_updates_select on app.ser_updates for select to vitaloop_app using (app.has_permission('ser.read'));
create policy ser_updates_insert on app.ser_updates for insert to vitaloop_app with check (app.has_permission('ser.write'));

grant select, insert on app.ser_updates to vitaloop_app;

insert into app.permissions (code, name, resource, action) values
  ('ser.read',  'Visualizar atualizações de quadro clínico de paciente regulado (SER)', 'ser', 'read'),
  ('ser.write', 'Registrar atualização de quadro clínico de paciente regulado (SER)', 'ser', 'write')
on conflict (code) do nothing;

insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code in ('nurse', 'doctor', 'manager', 'direcao', 'admin', 'system_admin')
  and p.code in ('ser.read', 'ser.write')
on conflict do nothing;
