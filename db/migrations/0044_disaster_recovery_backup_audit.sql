-- Migration 0044: Registro e Auditoria de Jobs de Backup, Restore e Disaster Recovery (QLT-011..013)
-- Migration estritamente aditiva. Não altera 0001 a 0043.

-- 1. Tabela de Registros de Execução de Backup, Restore e Disaster Recovery (QLT-011..013)
create table if not exists app.backup_restore_jobs (
  id uuid primary key default gen_random_uuid(),
  job_type text not null, -- 'backup_logical', 'restore_validation', 'dr_failover'
  status text not null default 'completed', -- 'in_progress', 'completed', 'failed'
  snapshot_hash text not null,
  rpo_minutes int not null default 15, -- RPO institucional: 15 minutos
  rto_minutes int not null default 60, -- RTO institucional: 60 minutos
  executed_by uuid not null references app.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

-- 2. Habilitar RLS
alter table app.backup_restore_jobs enable row level security;

-- 3. Políticas RLS
drop policy if exists backup_restore_jobs_select on app.backup_restore_jobs;
drop policy if exists backup_restore_jobs_insert on app.backup_restore_jobs;
create policy backup_restore_jobs_select on app.backup_restore_jobs for select to vitaloop_app using (app.has_permission('backup.manage') or app.has_permission('security.read'));
create policy backup_restore_jobs_insert on app.backup_restore_jobs for insert to vitaloop_app with check (app.has_permission('backup.manage') or app.has_permission('security.manage'));

-- 4. Concessões à role vitaloop_app
grant select, insert, update, delete on app.backup_restore_jobs to vitaloop_app;

-- 5. Permissões RBAC
insert into app.permissions (code, name, resource, action) values
  ('backup.manage', 'Gerenciar e executar jobs de backup, restore e Disaster Recovery', 'backup', 'manage')
on conflict (code) do nothing;

insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code in ('admin', 'doctor', 'nurse', 'receptionist', 'test_patient_full')
  and p.code in ('backup.manage')
on conflict do nothing;
