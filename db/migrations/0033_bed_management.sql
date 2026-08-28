-- Migration 0033: Gestão de Leitos UPA, Setores e Acomodação (BED-001..013)
-- Migration estritamente aditiva. Não altera 0001 a 0032.

do $$ begin
  create type app.bed_status as enum ('available', 'occupied', 'reserved', 'cleaning', 'blocked', 'maintenance');
exception when duplicate_object then null; end $$;

do $$ begin
  create type app.bed_allocation_status as enum ('active', 'transferred', 'discharged');
exception when duplicate_object then null; end $$;

create table if not exists app.bed_sectors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  description text,
  capacity integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists app.beds (
  id uuid primary key default gen_random_uuid(),
  sector_id uuid not null references app.bed_sectors(id) on delete restrict,
  bed_number text not null,
  status app.bed_status not null default 'available',
  is_extra boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sector_id, bed_number)
);

create table if not exists app.bed_allocations (
  id uuid primary key default gen_random_uuid(),
  bed_id uuid not null references app.beds(id) on delete restrict,
  encounter_id uuid not null references app.encounters(id) on delete cascade,
  patient_id uuid not null references app.patients(id) on delete cascade,
  status app.bed_allocation_status not null default 'active',
  allocated_by uuid not null references app.users(id) on delete restrict,
  allocated_at timestamptz not null default now(),
  discharged_at timestamptz,
  transfer_reason text,
  regulation_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index e Constraints BED-012: no máximo 1 alocação ativa por atendimento
create unique index if not exists bed_allocations_active_encounter_uk 
  on app.bed_allocations(encounter_id) 
  where status = 'active';

-- Index e Constraints BED-012: no máximo 1 alocação ativa por leito físico
create unique index if not exists bed_allocations_active_bed_uk 
  on app.bed_allocations(bed_id) 
  where status = 'active';

-- Habilitar RLS
alter table app.bed_sectors enable row level security;
alter table app.beds enable row level security;
alter table app.bed_allocations enable row level security;

drop policy if exists bed_sectors_select on app.bed_sectors;
drop policy if exists bed_sectors_insert on app.bed_sectors;
drop policy if exists bed_sectors_update on app.bed_sectors;
create policy bed_sectors_select on app.bed_sectors for select to vitaloop_app using (app.has_permission('bed.read'));
create policy bed_sectors_insert on app.bed_sectors for insert to vitaloop_app with check (app.has_permission('bed.write'));
create policy bed_sectors_update on app.bed_sectors for update to vitaloop_app using (app.has_permission('bed.write'));

drop policy if exists beds_select on app.beds;
drop policy if exists beds_insert on app.beds;
drop policy if exists beds_update on app.beds;
create policy beds_select on app.beds for select to vitaloop_app using (app.has_permission('bed.read'));
create policy beds_insert on app.beds for insert to vitaloop_app with check (app.has_permission('bed.write'));
create policy beds_update on app.beds for update to vitaloop_app using (app.has_permission('bed.write') or app.has_permission('bed.transfer') or app.has_permission('bed.discharge'));

drop policy if exists bed_allocations_select on app.bed_allocations;
drop policy if exists bed_allocations_insert on app.bed_allocations;
drop policy if exists bed_allocations_update on app.bed_allocations;
create policy bed_allocations_select on app.bed_allocations for select to vitaloop_app using (app.has_permission('bed.read'));
create policy bed_allocations_insert on app.bed_allocations for insert to vitaloop_app with check (app.has_permission('bed.write'));
create policy bed_allocations_update on app.bed_allocations for update to vitaloop_app using (app.has_permission('bed.transfer') or app.has_permission('bed.discharge'));

grant select, insert, update, delete on app.bed_sectors to vitaloop_app;
grant select, insert, update, delete on app.beds to vitaloop_app;
grant select, insert, update, delete on app.bed_allocations to vitaloop_app;

-- Inserção de Permissões RBAC
insert into app.permissions (code, name, resource, action) values
  ('bed.read',      'Visualizar leitos e mapa de ocupação', 'bed', 'read'),
  ('bed.write',     'Alocar leitos e criar leito extra',     'bed', 'write'),
  ('bed.transfer',  'Transferir paciente entre leitos',      'bed', 'transfer'),
  ('bed.discharge', 'Dar alta do leito e liberar limpeza',   'bed', 'discharge')
on conflict (code) do nothing;

insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code in ('nurse', 'nursing_technician', 'doctor', 'receptionist', 'admin', 'test_patient_full')
  and p.code in ('bed.read', 'bed.write', 'bed.transfer', 'bed.discharge')
on conflict do nothing;
