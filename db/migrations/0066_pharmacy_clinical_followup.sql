-- Migration 0066: Acompanhamento Farmacêutico (Anamnese + Score na admissão, evolução diária)
-- Migration estritamente aditiva. Não altera 0001 a 0065.
--
-- Campos extraídos de três impressos reais do Hospital Regional Público do
-- Marajó (ver docs/REFERENCIA_CAMPOS_IMPRESSOS_HOSPITALARES.md): "ANAMNESE
-- FARMACEUTICA", "SCORE DE CRITERIOS PARA DEFINICAO DO ACOMPANHAMENTO
-- FARMACOTERAPEUTICO" e "ACOMPANHAMENTO FARMACEUTICO". Distinto de
-- app.antimicrobial_requests (migration 0052, solicitação pontual de ATM de
-- uso restrito) e de app.pharmacy_dispensations (migration 0041, dispensação)
-- — este é o acompanhamento farmacoterapêutico contínuo do paciente. Sem
-- coluna relacional extra — todo campo cabe em form_fields JSONB, mesmo
-- padrão de app.nutrition_assessments/app.physiotherapy_assessments.

create table if not exists app.pharmacy_followups (
  id uuid primary key default gen_random_uuid(),
  encounter_id uuid not null references app.encounters(id) on delete cascade,
  patient_id uuid not null references app.patients(id) on delete cascade,
  requested_by uuid not null references app.users(id) on delete restrict,
  form_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists pharmacy_followups_encounter_idx on app.pharmacy_followups(encounter_id);
create index if not exists pharmacy_followups_patient_idx on app.pharmacy_followups(patient_id);

alter table app.pharmacy_followups enable row level security;

drop policy if exists pharmacy_followups_select on app.pharmacy_followups;
drop policy if exists pharmacy_followups_insert on app.pharmacy_followups;
create policy pharmacy_followups_select on app.pharmacy_followups for select to vitaloop_app using (app.has_permission('pharmacy_followup.read'));
create policy pharmacy_followups_insert on app.pharmacy_followups for insert to vitaloop_app with check (app.has_permission('pharmacy_followup.write'));

grant select, insert on app.pharmacy_followups to vitaloop_app;

insert into app.permissions (code, name, resource, action) values
  ('pharmacy_followup.read',  'Visualizar acompanhamentos farmacêuticos', 'pharmacy_followup', 'read'),
  ('pharmacy_followup.write', 'Registrar acompanhamento farmacêutico', 'pharmacy_followup', 'write')
on conflict (code) do nothing;

insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code in ('nurse', 'doctor', 'manager', 'direcao', 'admin', 'system_admin')
  and p.code in ('pharmacy_followup.read', 'pharmacy_followup.write')
on conflict do nothing;
