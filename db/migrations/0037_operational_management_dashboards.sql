-- Migration 0037: Gestão Operacional, Dashboards e Alertas de Lotação (MGT-001..010)
-- Migration estritamente aditiva. Não altera 0001 a 0036.

-- 1. Tabela de Alertas Gerenciais de Sobrecarga (MGT-009)
create table if not exists app.management_alerts (
  id uuid primary key default gen_random_uuid(),
  alert_type text not null,
  severity text not null default 'warning',
  message text not null,
  metric_value numeric,
  threshold_value numeric,
  is_acknowledged boolean not null default false,
  acknowledged_by uuid references app.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- 2. View Analítica de Resumo Operacional em Tempo Real (MGT-001..005)
create or replace view app.v_operational_summary as
select
  (select count(*)::int from app.encounters where status not in ('completed', 'canceled')) as active_encounters_count,
  (select count(*)::int from app.encounters where status = 'triage_pending') as triage_pending_count,
  (select count(*)::int from app.encounters where status = 'consultation_pending') as consultation_pending_count,
  (select count(*)::int from app.beds where status = 'occupied') as occupied_beds_count,
  (select count(*)::int from app.beds) as total_beds_count,
  case 
    when (select count(*) from app.beds) > 0 
    then round(((select count(*)::numeric from app.beds where status = 'occupied') / (select count(*)::numeric from app.beds)) * 100, 2)
    else 0 
  end as bed_occupancy_rate;

-- 3. Habilitar RLS
alter table app.management_alerts enable row level security;
alter view app.v_operational_summary set (security_invoker = true);

-- 4. Políticas RLS
drop policy if exists management_alerts_select on app.management_alerts;
drop policy if exists management_alerts_update on app.management_alerts;
drop policy if exists management_alerts_insert on app.management_alerts;
create policy management_alerts_select on app.management_alerts for select to vitaloop_app using (app.has_permission('management.read'));
create policy management_alerts_insert on app.management_alerts for insert to vitaloop_app with check (app.has_permission('management.alerts'));
create policy management_alerts_update on app.management_alerts for update to vitaloop_app using (app.has_permission('management.alerts'));

-- 5. Concessões de Permissões à role vitaloop_app
grant select, insert, update, delete on app.management_alerts to vitaloop_app;
grant select on app.v_operational_summary to vitaloop_app;

-- 6. Permissões RBAC
insert into app.permissions (code, name, resource, action) values
  ('management.read',   'Consultar dashboard gerencial e indicadores operacionais', 'management', 'read'),
  ('management.export', 'Exportar relatórios gerenciais e estatísticos', 'management', 'export'),
  ('management.alerts', 'Gerenciar e reconhecer alertas de sobrecarga', 'management', 'alerts')
on conflict (code) do nothing;

insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code in ('admin', 'doctor', 'nurse', 'receptionist', 'test_patient_full')
  and p.code in ('management.read', 'management.export', 'management.alerts')
on conflict do nothing;
