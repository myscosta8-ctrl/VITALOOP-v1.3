-- Migration 0083: Ficha de Atendimento de Enfermagem (admissão estruturada)
-- Migration estritamente aditiva. Não altera 0001 a 0082.
--
-- Fase 1 do plano de reconstrução do módulo assistencial (avaliação de
-- 12/09/2026 contra o projeto de referência "Emergency Care"): a Enfermagem
-- do Vitaloop era só uma textarea + 3 radios. Este módulo é um formulário
-- clínico estruturado próprio, reaproveitando o padrão genérico de
-- clinical-forms (form_fields JSONB) já usado por nutrition/social-work/
-- SINAN — ver packages/domain/src/nursing-admission/schema.ts.
--
-- Reaproveita as permissões nursing.read/nursing.write já existentes
-- (ver apps/api/src/routes/nursing.ts) em vez de criar permissões novas —
-- é o mesmo domínio funcional (enfermagem), só um tipo de registro novo.

create table if not exists app.nursing_admission_forms (
  id uuid primary key default gen_random_uuid(),
  encounter_id uuid not null references app.encounters(id) on delete cascade,
  patient_id uuid not null references app.patients(id) on delete cascade,
  requested_by uuid not null references app.users(id) on delete restrict,
  form_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists nursing_admission_forms_encounter_idx on app.nursing_admission_forms(encounter_id);
create index if not exists nursing_admission_forms_patient_idx on app.nursing_admission_forms(patient_id);

alter table app.nursing_admission_forms enable row level security;

drop policy if exists nursing_admission_forms_select on app.nursing_admission_forms;
drop policy if exists nursing_admission_forms_insert on app.nursing_admission_forms;
create policy nursing_admission_forms_select on app.nursing_admission_forms for select to vitaloop_app using (app.has_permission('nursing.read'));
create policy nursing_admission_forms_insert on app.nursing_admission_forms for insert to vitaloop_app with check (app.has_permission('nursing.write'));

grant select, insert on app.nursing_admission_forms to vitaloop_app;
