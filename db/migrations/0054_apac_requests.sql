-- Migration 0054: Laudo para Solicitação/Autorização de Procedimento Ambulatorial (APAC)
-- Migration estritamente aditiva. Não altera 0001 a 0053.
--
-- APAC é o irmão do AIH (migration 0038) para procedimento ambulatorial em
-- vez de internação — mesma lógica "quem solicita / quem autoriza / quem
-- executa" e mesmo catálogo SIGTAP (app.sigtap_procedures, já existente,
-- reutilizado aqui sem alteração). Campos administrativos/descritivos que
-- não têm coluna própria (descrição do diagnóstico, dados do solicitante,
-- bloco de autorização, estabelecimento executante) ficam em form_fields
-- jsonb, mesmo padrão de app.aih_requests/app.blood_product_requests/
-- app.antimicrobial_requests — schema completo em @vitaloop/domain
-- (packages/domain/src/sus/apac-clinical-schema.ts), não no banco.

create table if not exists app.apac_requests (
  id uuid primary key default gen_random_uuid(),
  encounter_id uuid not null references app.encounters(id) on delete cascade,
  patient_id uuid not null references app.patients(id) on delete cascade,
  requester_id uuid not null references app.users(id) on delete restrict,
  main_procedure_code text not null references app.sigtap_procedures(code) on delete restrict,
  secondary_procedure_code text references app.sigtap_procedures(code) on delete set null,
  main_cid10 text not null,
  secondary_cid10 text,
  clinical_justification text not null,
  form_fields jsonb not null default '{}'::jsonb,
  status text not null default 'validated', -- 'draft', 'submitted', 'validated', 'rejected'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column app.apac_requests.form_fields is
  'Campos administrativos/descritivos do laudo de APAC que não têm coluna própria (descrição do diagnóstico, CID de causas associadas, dados do profissional solicitante, bloco de autorização preenchido depois pela regulação/auditoria, estabelecimento executante). Schema em @vitaloop/domain (sus/apac-clinical-schema.ts), validado na API antes de gravar.';

alter table app.apac_requests enable row level security;

drop policy if exists apac_requests_select on app.apac_requests;
drop policy if exists apac_requests_insert on app.apac_requests;
create policy apac_requests_select on app.apac_requests for select to vitaloop_app using (app.has_permission('sus.read'));
create policy apac_requests_insert on app.apac_requests for insert to vitaloop_app with check (app.has_permission('sus.issue_apac'));

grant select, insert, update, delete on app.apac_requests to vitaloop_app;

insert into app.permissions (code, name, resource, action) values
  ('sus.issue_apac', 'Emitir e validar laudo de solicitação de APAC', 'sus', 'issue_apac')
on conflict (code) do nothing;

insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code in ('admin', 'doctor', 'nurse', 'receptionist', 'test_patient_full')
  and p.code = 'sus.issue_apac'
on conflict do nothing;
