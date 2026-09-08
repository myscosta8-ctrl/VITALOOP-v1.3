-- Migration 0052: Formulário Antimicrobiano (ATM) — solicitação de antibiótico de uso restrito
-- Migration estritamente aditiva. Não altera 0001 a 0051.
--
-- Campos extraídos do impresso real usado hoje na UPA 24h Breves (ver
-- docs/REFERENCIA_CAMPOS_IMPRESSOS_HOSPITALARES.md, item 3). Mesmo padrão
-- de app.blood_product_requests: coluna relacional pro campo com valor de
-- consulta/relatório (`medication` — qual antibiótico restrito foi pedido),
-- JSONB pro resto. Schema completo dos campos vive em @vitaloop/domain
-- (módulo `pharmacy-atm`), não no banco.
--
-- O parecer do farmacêutico é capturado no mesmo registro (dentro de
-- form_fields) nesta primeira versão — não há ainda uma segunda tela de
-- revisão/aprovação separada da farmácia.

create table if not exists app.antimicrobial_requests (
  id uuid primary key default gen_random_uuid(),
  encounter_id uuid not null references app.encounters(id) on delete cascade,
  patient_id uuid not null references app.patients(id) on delete cascade,
  requested_by uuid not null references app.users(id) on delete restrict,
  medication text not null,
  form_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists antimicrobial_requests_encounter_idx on app.antimicrobial_requests(encounter_id);
create index if not exists antimicrobial_requests_patient_idx on app.antimicrobial_requests(patient_id);

alter table app.antimicrobial_requests enable row level security;

drop policy if exists antimicrobial_requests_select on app.antimicrobial_requests;
drop policy if exists antimicrobial_requests_insert on app.antimicrobial_requests;
create policy antimicrobial_requests_select on app.antimicrobial_requests for select to vitaloop_app using (app.has_permission('pharmacy_atm.read'));
create policy antimicrobial_requests_insert on app.antimicrobial_requests for insert to vitaloop_app with check (app.has_permission('pharmacy_atm.write'));

grant select, insert on app.antimicrobial_requests to vitaloop_app;

insert into app.permissions (code, name, resource, action) values
  ('pharmacy_atm.read',  'Visualizar solicitações de antimicrobiano de uso restrito', 'pharmacy_atm', 'read'),
  ('pharmacy_atm.write', 'Registrar solicitação de antimicrobiano de uso restrito', 'pharmacy_atm', 'write')
on conflict (code) do nothing;

insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code in ('nurse', 'doctor', 'manager', 'direcao', 'admin', 'system_admin')
  and p.code in ('pharmacy_atm.read', 'pharmacy_atm.write')
on conflict do nothing;
