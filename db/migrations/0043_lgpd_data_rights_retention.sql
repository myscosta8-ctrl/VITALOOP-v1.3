-- Migration 0043: Direitos do Titular LGPD, Minimização e Políticas de Retenção (SEC-T-012..016)
-- Migration estritamente aditiva. Não altera 0001 a 0042.

-- 1. Tabela de Solicitações de Direitos do Titular LGPD (SEC-T-014)
create table if not exists app.lgpd_data_requests (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references app.patients(id) on delete cascade,
  requested_by uuid not null references app.users(id) on delete restrict,
  request_type text not null default 'export', -- 'export', 'access', 'rectification'
  status text not null default 'completed', -- 'requested', 'completed', 'rejected'
  exported_data_hash text not null,
  created_at timestamptz not null default now()
);

-- 2. Tabela de Políticas de Retenção Legal e Expiração de Registros (SEC-T-015)
create table if not exists app.data_retention_policies (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null unique, -- 'medical_records', 'audit_events', 'security_logs'
  retention_years int not null default 20, -- Retenção legal assistencial de 20 anos
  action_on_expiry text not null default 'archive', -- 'archive', 'purge'
  description text not null,
  updated_at timestamptz not null default now()
);

-- 3. Inserir política padrão de retenção de prontuário (20 anos conforme lei 13.787/2018)
insert into app.data_retention_policies (entity_type, retention_years, action_on_expiry, description) values
  ('medical_records', 20, 'archive', 'Retenção legal assistencial do prontuário do paciente (Lei 13.787/2018)'),
  ('audit_events', 5, 'archive', 'Retenção legal de registros de audit trail e segurança (LGPD Art. 16)'),
  ('security_logs', 5, 'archive', 'Retenção de logs de eventos e alertas de segurança técnica')
on conflict (entity_type) do nothing;

-- 4. Habilitar RLS
alter table app.lgpd_data_requests enable row level security;
alter table app.data_retention_policies enable row level security;

-- 5. Políticas RLS
drop policy if exists lgpd_data_requests_select on app.lgpd_data_requests;
drop policy if exists lgpd_data_requests_insert on app.lgpd_data_requests;
create policy lgpd_data_requests_select on app.lgpd_data_requests for select to vitaloop_app using (app.has_permission('lgpd.export'));
create policy lgpd_data_requests_insert on app.lgpd_data_requests for insert to vitaloop_app with check (app.has_permission('lgpd.export'));

drop policy if exists data_retention_policies_select on app.data_retention_policies;
drop policy if exists data_retention_policies_insert on app.data_retention_policies;
create policy data_retention_policies_select on app.data_retention_policies for select to vitaloop_app using (app.has_permission('security.read'));
create policy data_retention_policies_insert on app.data_retention_policies for insert to vitaloop_app with check (app.has_permission('security.manage'));

-- 6. Concessões de Permissões à role vitaloop_app
grant select, insert, update, delete on app.lgpd_data_requests to vitaloop_app;
grant select, insert, update, delete on app.data_retention_policies to vitaloop_app;

-- 7. Permissões RBAC
insert into app.permissions (code, name, resource, action) values
  ('lgpd.export', 'Gerar e exportar extrato de transparência de dados pessoais LGPD', 'lgpd', 'export'),
  ('lgpd.manage_retention', 'Gerenciar políticas de retenção legal e expiração de dados', 'lgpd', 'manage_retention')
on conflict (code) do nothing;

insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code in ('admin', 'doctor', 'nurse', 'receptionist', 'test_patient_full')
  and p.code in ('lgpd.export', 'lgpd.manage_retention')
on conflict do nothing;
