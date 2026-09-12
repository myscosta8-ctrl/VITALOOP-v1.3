-- Migration 0082: Registro clínico de Internação (ADM-001..008, proposto)
-- Migration estritamente aditiva. Não altera 0001 a 0081.
--
-- Cobre o achado de auditoria de 2026-09-12: "internação não é estado de
-- primeira classe" + "encounter pode ir para completed com leito ainda
-- ocupado, sem aviso". Reaproveita app.encounter_outcomes/encounter_summaries
-- (migration 0031) para o fechamento final (alta hospitalar) — não duplica
-- sumário de alta; app.admissions cobre só o PERÍODO ativo de internação.

do $$ begin
  create type app.admission_status as enum ('active', 'discharged', 'transferred_out', 'deceased');
exception when duplicate_object then null; end $$;

create table app.admissions (
  id                          uuid primary key default gen_random_uuid(),
  encounter_id                uuid unique not null references app.encounters(id) on delete cascade,
  patient_id                  uuid not null references app.patients(id) on delete cascade,
  admitting_doctor_id         uuid not null references app.users(id) on delete restrict,
  admission_diagnosis_code    text,
  admission_diagnosis_description text not null,
  admission_justification     text not null,
  status                      app.admission_status not null default 'active',
  admitted_at                 timestamptz not null default now(),
  ended_at                    timestamptz,
  end_reason                  text,
  created_by                  uuid references app.users(id) on delete set null,
  updated_by                  uuid references app.users(id) on delete set null,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

comment on table app.admissions is
  'Registro clínico do período ATIVO de internação (diagnóstico/justificativa de admissão, médico responsável, status). O fechamento final (alta/óbito/transferência externa) continua em app.encounter_outcomes + app.encounter_summaries (migration 0031) — esta tabela não duplica sumário de alta.';

create index admissions_patient_idx on app.admissions(patient_id);
create index admissions_status_idx on app.admissions(status) where status = 'active';

alter table app.admissions enable row level security;

insert into app.permissions (code, name, resource, action) values
  ('admission.read',  'Visualizar internações e seu histórico clínico', 'admission', 'read'),
  ('admission.write', 'Registrar, evoluir (diagnóstico/justificativa) e encerrar internação', 'admission', 'write')
on conflict (code) do nothing;

create policy admissions_select on app.admissions
  for select to vitaloop_app using (app.has_permission('admission.read'));
create policy admissions_insert on app.admissions
  for insert to vitaloop_app with check (app.has_permission('admission.write'));
create policy admissions_update on app.admissions
  for update to vitaloop_app using (app.has_permission('admission.write')) with check (app.has_permission('admission.write'));

grant select, insert, update, delete on app.admissions to vitaloop_app;

create trigger admissions_touch_updated
  before update on app.admissions
  for each row execute function app.touch_updated_at();

-- Leitura ampla (mesmo padrão de outcome.read/bed.read): toda a equipe real
-- precisa ver se um paciente está internado.
insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code in ('doctor', 'nurse', 'nursing_technician', 'receptionist', 'manager', 'direcao', 'admin', 'system_admin')
  and p.code = 'admission.read'
on conflict do nothing;

-- Escrita restrita a ato médico (mesmo padrão de outcome.write/medical.write):
-- decisão de internar/encerrar internação é médica, não de enfermagem.
insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code in ('doctor', 'admin', 'system_admin')
  and p.code = 'admission.write'
on conflict do nothing;

-- =====================================================================
-- GUARDA DE INTEGRIDADE (corrige diretamente o achado: "encounter pode ir
-- para completed com leito/internação ainda ativa, sem aviso")
-- =====================================================================
create or replace function app.guard_encounter_admission_transition()
returns trigger
language plpgsql
security definer
set search_path = app, pg_temp
as $$
begin
  -- Não permite concluir o atendimento com leito ainda ocupado.
  if new.status = 'completed' and old.status is distinct from 'completed' then
    if exists (
      select 1 from app.bed_allocations
      where encounter_id = new.id and status = 'active'
    ) then
      raise exception 'Não é possível concluir o atendimento: há leito ainda ocupado (bed_allocations ativo). Dê alta do leito primeiro.'
        using errcode = '23514';
    end if;

    if exists (
      select 1 from app.admissions
      where encounter_id = new.id and status = 'active'
    ) then
      raise exception 'Não é possível concluir o atendimento: há internação ainda ativa. Encerre a internação (alta hospitalar) primeiro.'
        using errcode = '23514';
    end if;
  end if;

  -- Não permite marcar como internado sem leito alocado.
  if new.status = 'admitted' and old.status is distinct from new.status then
    if not exists (
      select 1 from app.bed_allocations
      where encounter_id = new.id and status = 'active'
    ) then
      raise exception 'Não é possível internar: nenhum leito ativo alocado para este atendimento. Aloque um leito antes de mudar o status para internado.'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists encounters_guard_admission on app.encounters;
create trigger encounters_guard_admission
  before update on app.encounters
  for each row execute function app.guard_encounter_admission_transition();

comment on function app.guard_encounter_admission_transition() is
  'Defesa em profundidade (Doc 2 princípio de integridade transacional): impede no BANCO — não só na API — que um atendimento seja concluído com leito/internação ainda ativos, ou marcado internado sem leito alocado.';
