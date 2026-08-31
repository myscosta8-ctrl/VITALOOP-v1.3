-- Migration 0042: Hardening de Segurança Técnica e Auditoria (SEC-T-001..011)
-- Migration estritamente aditiva. Não altera 0001 a 0041.

-- 1. Tabela de Registros de Eventos e Alertas de Segurança Técnica (SEC-T-001..011)
create table if not exists app.security_event_logs (
  id uuid primary key default gen_random_uuid(),
  event_type text not null, -- 'IDOR_ATTEMPT', 'RBAC_BYPASS_ATTEMPT', 'SQLI_PATTERN_DETECTED', 'XSS_PATTERN_DETECTED', 'INVALID_ORIGIN_CORS'
  severity text not null default 'WARNING', -- 'INFO', 'WARNING', 'CRITICAL'
  actor_user_id uuid references app.users(id) on delete set null,
  ip_hash text not null,
  request_id text,
  endpoint text not null,
  payload_summary text,
  created_at timestamptz not null default now()
);

-- 2. Habilitar RLS
alter table app.security_event_logs enable row level security;

-- 3. Políticas RLS
drop policy if exists security_event_logs_select on app.security_event_logs;
drop policy if exists security_event_logs_insert on app.security_event_logs;
create policy security_event_logs_select on app.security_event_logs for select to vitaloop_app using (app.has_permission('security.read'));
create policy security_event_logs_insert on app.security_event_logs for insert to vitaloop_app with check (app.has_permission('security.write'));

-- 4. Concessões de Permissões à role vitaloop_app
grant select, insert, update, delete on app.security_event_logs to vitaloop_app;

-- 5. Permissões RBAC
insert into app.permissions (code, name, resource, action) values
  ('security.read',  'Consultar logs e eventos de segurança técnica', 'security', 'read'),
  ('security.write', 'Registrar e gerenciar alertas de segurança técnica', 'security', 'write')
on conflict (code) do nothing;

insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code in ('admin', 'doctor', 'nurse', 'receptionist', 'test_patient_full')
  and p.code in ('security.read', 'security.write')
on conflict do nothing;
