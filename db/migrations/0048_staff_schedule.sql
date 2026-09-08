-- Migration 0048: Escala de profissionais — plantões e férias/afastamentos (STAFF-001..004)
-- Migration estritamente aditiva. Não altera 0001 a 0047.
--
-- Substitui o controle por planilha Excel hoje usado pela coordenação:
-- sinalização de férias/afastamento por servidor + escala de plantão
-- dia a dia. Uso restrito a quem já tem papel de gestão (mesma permissão
-- de Indicadores/Configurações de Leitos) — sem tela de autoconsulta pelo
-- profissional nesta etapa.

create table if not exists app.staff_leaves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app.users(id) on delete restrict,
  leave_type text not null, -- 'ferias' | 'atestado' | 'licenca' | 'outro'
  start_date date not null,
  end_date date not null,
  notes text,
  created_by uuid not null references app.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_leaves_dates_ck check (end_date >= start_date)
);
create index if not exists staff_leaves_user_idx on app.staff_leaves(user_id);
create index if not exists staff_leaves_period_idx on app.staff_leaves(start_date, end_date);

create table if not exists app.staff_shifts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app.users(id) on delete restrict,
  shift_date date not null,
  shift_period text not null, -- texto livre: 'Diurno (07h-19h)', 'Noturno (19h-07h)', 'Plantão 24h'...
  role_at_shift text,
  notes text,
  created_by uuid not null references app.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_shifts_user_date_period_uk unique (user_id, shift_date, shift_period)
);
create index if not exists staff_shifts_date_idx on app.staff_shifts(shift_date);

alter table app.staff_leaves enable row level security;
alter table app.staff_shifts enable row level security;

drop policy if exists staff_leaves_select on app.staff_leaves;
drop policy if exists staff_leaves_insert on app.staff_leaves;
drop policy if exists staff_leaves_update on app.staff_leaves;
drop policy if exists staff_leaves_delete on app.staff_leaves;
create policy staff_leaves_select on app.staff_leaves for select to vitaloop_app using (app.has_permission('staff_schedule.read'));
create policy staff_leaves_insert on app.staff_leaves for insert to vitaloop_app with check (app.has_permission('staff_schedule.write'));
create policy staff_leaves_update on app.staff_leaves for update to vitaloop_app using (app.has_permission('staff_schedule.write'));
create policy staff_leaves_delete on app.staff_leaves for delete to vitaloop_app using (app.has_permission('staff_schedule.write'));

drop policy if exists staff_shifts_select on app.staff_shifts;
drop policy if exists staff_shifts_insert on app.staff_shifts;
drop policy if exists staff_shifts_update on app.staff_shifts;
drop policy if exists staff_shifts_delete on app.staff_shifts;
create policy staff_shifts_select on app.staff_shifts for select to vitaloop_app using (app.has_permission('staff_schedule.read'));
create policy staff_shifts_insert on app.staff_shifts for insert to vitaloop_app with check (app.has_permission('staff_schedule.write'));
create policy staff_shifts_update on app.staff_shifts for update to vitaloop_app using (app.has_permission('staff_schedule.write'));
create policy staff_shifts_delete on app.staff_shifts for delete to vitaloop_app using (app.has_permission('staff_schedule.write'));

grant select, insert, update, delete on app.staff_leaves to vitaloop_app;
grant select, insert, update, delete on app.staff_shifts to vitaloop_app;

insert into app.permissions (code, name, resource, action) values
  ('staff_schedule.read',  'Visualizar escala de profissionais e férias', 'staff_schedule', 'read'),
  ('staff_schedule.write', 'Criar/editar escala de profissionais e férias', 'staff_schedule', 'write')
on conflict (code) do nothing;

insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code in ('manager', 'direcao', 'admin', 'system_admin')
  and p.code in ('staff_schedule.read', 'staff_schedule.write')
on conflict do nothing;
