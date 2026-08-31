-- Migration 0045: Observabilidade Avançada, Métricas de Produção e Alertas (PRD-015, PRD-016, PRD-019)
-- Migration estritamente aditiva. Não altera 0001 a 0044.

-- 1. Tabela de Métricas e Telemetria Operacional (PRD-015, PRD-019)
create table if not exists app.system_metrics (
  id uuid primary key default gen_random_uuid(),
  metric_name text not null, -- 'http_requests_total', 'http_request_duration_ms', 'db_query_duration_ms', 'error_count'
  metric_value numeric not null,
  tags jsonb default '{}'::jsonb,
  recorded_at timestamptz not null default now()
);

-- 2. Habilitar RLS
alter table app.system_metrics enable row level security;

-- 3. Políticas RLS
drop policy if exists system_metrics_select on app.system_metrics;
drop policy if exists system_metrics_insert on app.system_metrics;
create policy system_metrics_select on app.system_metrics for select to vitaloop_app using (app.has_permission('observability.read') or app.has_permission('security.read'));
create policy system_metrics_insert on app.system_metrics for insert to vitaloop_app with check (app.has_permission('observability.manage') or app.has_permission('security.manage'));

-- 4. Concessões à role vitaloop_app
grant select, insert on app.system_metrics to vitaloop_app;

-- 5. Permissões RBAC
insert into app.permissions (code, name, resource, action) values
  ('observability.read', 'Visualizar dashboards de observabilidade e métricas', 'observability', 'read'),
  ('observability.manage', 'Gerenciar e emitir telemetria de produção e alertas', 'observability', 'manage')
on conflict (code) do nothing;

insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code in ('admin', 'doctor', 'nurse', 'receptionist', 'test_patient_full')
  and p.code in ('observability.read', 'observability.manage')
on conflict do nothing;
