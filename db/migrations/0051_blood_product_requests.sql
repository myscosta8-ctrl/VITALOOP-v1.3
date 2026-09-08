-- Migration 0051: Solicitação de Sangue, Componentes e Derivados (hemoterapia)
-- Migration estritamente aditiva. Não altera 0001 a 0050.
--
-- Campos extraídos do impresso real usado hoje na UPA 24h Breves (ver
-- docs/REFERENCIA_CAMPOS_IMPRESSOS_HOSPITALARES.md, item 2) — layout do
-- papel não replicado (decisão do usuário: só a informação importa), mas
-- todos os campos preservados. Mesmo padrão de app.compulsory_notifications
-- e app.nursing_care_scales: colunas relacionais pro que tem valor de
-- consulta/relatório (paciente, quem solicitou, indicação clínica), JSONB
-- pro resto — o schema completo dos campos vive em @vitaloop/domain
-- (módulo `hemotherapy`), não no banco.
--
-- Fora de escopo de propósito: a seção "uso exclusivo da Fundação Hemopa"
-- do impresso original (resultado laboratorial, pesquisa de anticorpos
-- irregulares) — é preenchida pelo banco de sangue depois que a
-- solicitação chega lá, não pelo profissional da UPA.

create table if not exists app.blood_product_requests (
  id uuid primary key default gen_random_uuid(),
  encounter_id uuid not null references app.encounters(id) on delete cascade,
  patient_id uuid not null references app.patients(id) on delete cascade,
  requested_by uuid not null references app.users(id) on delete restrict,
  clinical_indication text not null,
  form_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists blood_product_requests_encounter_idx on app.blood_product_requests(encounter_id);
create index if not exists blood_product_requests_patient_idx on app.blood_product_requests(patient_id);

alter table app.blood_product_requests enable row level security;

drop policy if exists blood_product_requests_select on app.blood_product_requests;
drop policy if exists blood_product_requests_insert on app.blood_product_requests;
create policy blood_product_requests_select on app.blood_product_requests for select to vitaloop_app using (app.has_permission('hemotherapy.read'));
create policy blood_product_requests_insert on app.blood_product_requests for insert to vitaloop_app with check (app.has_permission('hemotherapy.write'));

grant select, insert on app.blood_product_requests to vitaloop_app;

insert into app.permissions (code, name, resource, action) values
  ('hemotherapy.read',  'Visualizar solicitações de sangue/hemoderivados', 'hemotherapy', 'read'),
  ('hemotherapy.write', 'Registrar solicitação de sangue/hemoderivados', 'hemotherapy', 'write')
on conflict (code) do nothing;

insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code in ('nurse', 'doctor', 'manager', 'direcao', 'admin', 'system_admin')
  and p.code in ('hemotherapy.read', 'hemotherapy.write')
on conflict do nothing;
