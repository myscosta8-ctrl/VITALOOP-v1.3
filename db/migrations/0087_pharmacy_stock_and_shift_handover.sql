-- Migration 0087: Estoque de Farmácia (lote/validade) + Passagem de Plantão Estruturada
-- Migration estritamente aditiva. Não altera 0001 a 0086.
--
-- Últimos 2 gaps administrativos/operacionais restantes da Fase 5 do plano de
-- reconstrução assistencial (12/09/2026) que exigem tabela nova — o terceiro
-- item desta rodada (Painel de TV de chamada pública) reaproveita
-- 100% a estrutura já existente de app.queue_tickets/app.queues, sem
-- migration.
--
-- 1. Estoque de Farmácia: o Vitaloop só tinha catálogo de medicamentos
--    (app.medication_catalog), sem controle de lote/validade/quantidade —
--    dispensava sem nunca baixar estoque real.
create table if not exists app.pharmacy_stock_batches (
  id uuid primary key default gen_random_uuid(),
  medication_id uuid not null references app.medication_catalog(id) on delete restrict,
  batch_number text not null,
  expiry_date date not null,
  quantity_on_hand numeric not null default 0 check (quantity_on_hand >= 0),
  unit text not null,
  received_at timestamptz not null default now(),
  received_by uuid not null references app.users(id) on delete restrict,
  notes text
);
create index if not exists pharmacy_stock_batches_medication_idx on app.pharmacy_stock_batches(medication_id);
create index if not exists pharmacy_stock_batches_expiry_idx on app.pharmacy_stock_batches(expiry_date);

create table if not exists app.pharmacy_stock_movements (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references app.pharmacy_stock_batches(id) on delete cascade,
  movement_type text not null check (movement_type in ('entrada', 'saida', 'ajuste')),
  quantity numeric not null check (quantity > 0),
  reason text,
  performed_by uuid not null references app.users(id) on delete restrict,
  created_at timestamptz not null default now()
);
create index if not exists pharmacy_stock_movements_batch_idx on app.pharmacy_stock_movements(batch_id);

alter table app.pharmacy_stock_batches enable row level security;
alter table app.pharmacy_stock_movements enable row level security;

drop policy if exists pharmacy_stock_batches_select on app.pharmacy_stock_batches;
drop policy if exists pharmacy_stock_batches_insert on app.pharmacy_stock_batches;
drop policy if exists pharmacy_stock_batches_update on app.pharmacy_stock_batches;
create policy pharmacy_stock_batches_select on app.pharmacy_stock_batches for select to vitaloop_app using (app.has_permission('pharmacy.stock_read'));
create policy pharmacy_stock_batches_insert on app.pharmacy_stock_batches for insert to vitaloop_app with check (app.has_permission('pharmacy.stock_write'));
create policy pharmacy_stock_batches_update on app.pharmacy_stock_batches for update to vitaloop_app using (app.has_permission('pharmacy.stock_write')) with check (app.has_permission('pharmacy.stock_write'));

drop policy if exists pharmacy_stock_movements_select on app.pharmacy_stock_movements;
drop policy if exists pharmacy_stock_movements_insert on app.pharmacy_stock_movements;
create policy pharmacy_stock_movements_select on app.pharmacy_stock_movements for select to vitaloop_app using (app.has_permission('pharmacy.stock_read'));
create policy pharmacy_stock_movements_insert on app.pharmacy_stock_movements for insert to vitaloop_app with check (app.has_permission('pharmacy.stock_write'));

grant select, insert, update on app.pharmacy_stock_batches to vitaloop_app;
grant select, insert on app.pharmacy_stock_movements to vitaloop_app;

insert into app.permissions (code, name, resource, action) values
  ('pharmacy.stock_read',  'Consultar estoque de farmácia (lotes/validade)', 'pharmacy_stock', 'read'),
  ('pharmacy.stock_write', 'Registrar entrada/saída de estoque de farmácia', 'pharmacy_stock', 'write')
on conflict (code) do nothing;

insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code in ('nurse', 'manager', 'direcao', 'admin', 'system_admin')
  and p.code in ('pharmacy.stock_read', 'pharmacy.stock_write')
on conflict do nothing;

-- 2. Passagem de Plantão Estruturada: SbarTransferModal cobre transferência
--    clínica de UM paciente; isto aqui é o resumo de SETOR/turno inteiro
--    entre equipes (censo, pendências, alertas críticos) — não existia.
create table if not exists app.shift_handovers (
  id uuid primary key default gen_random_uuid(),
  sector_id uuid references app.bed_sectors(id) on delete set null,
  shift_period text not null check (shift_period in ('manha', 'tarde', 'noite')),
  handover_date date not null default current_date,
  outgoing_professional_id uuid not null references app.users(id) on delete restrict,
  incoming_professional_id uuid references app.users(id) on delete set null,
  patient_census integer,
  critical_alerts text,
  pending_tasks text,
  summary_notes text,
  created_at timestamptz not null default now()
);
create index if not exists shift_handovers_sector_date_idx on app.shift_handovers(sector_id, handover_date desc);

alter table app.shift_handovers enable row level security;
drop policy if exists shift_handovers_select on app.shift_handovers;
drop policy if exists shift_handovers_insert on app.shift_handovers;
create policy shift_handovers_select on app.shift_handovers for select to vitaloop_app using (app.has_permission('shift_handover.read'));
create policy shift_handovers_insert on app.shift_handovers for insert to vitaloop_app with check (app.has_permission('shift_handover.write'));
grant select, insert on app.shift_handovers to vitaloop_app;

insert into app.permissions (code, name, resource, action) values
  ('shift_handover.read',  'Consultar passagens de plantão', 'shift_handover', 'read'),
  ('shift_handover.write', 'Registrar passagem de plantão', 'shift_handover', 'write')
on conflict (code) do nothing;

insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code in ('nurse', 'doctor', 'manager', 'direcao', 'admin', 'system_admin')
  and p.code in ('shift_handover.read', 'shift_handover.write')
on conflict do nothing;
