-- Migration 0063: Balanço Hídrico v2 (períodos + lançamentos)
-- Migration estritamente aditiva. Não altera 0001 a 0062.
--
-- Substitui a implementação anterior (NUR-009, `app.fluid_balance_records`,
-- migration 0034) a partir do modelo real do Hospital Regional Público do
-- Marajó (PDF + telas do sistema SALUTEM fornecidos pelo usuário, extraídos
-- e depois apagados — continham dado de paciente real). A tabela antiga
-- `app.fluid_balance_records` é MANTIDA (nunca dropar/alterar migrations
-- anteriores) por compatibilidade histórica de dados já gravados, mas a
-- aplicação para de escrever nela a partir desta migration — todo código
-- novo usa as duas tabelas abaixo.
--
-- Diferenças confirmadas contra o modelo real que a v1 não tinha: cada
-- balanço é um PERÍODO numerado (`balance_number`, sequencial por
-- atendimento) com status (aberto/fechado parcial/fechado) e data de
-- referência — não um lançamento solto. Cada lançamento tem item por nome
-- LIVRE (não uma lista fechada de tipos de fluido), horário (hora+minuto),
-- e região/lateralidade opcionais (relevantes pra débito de dreno/ferida).

create table if not exists app.fluid_balance_periods (
  id uuid primary key default gen_random_uuid(),
  encounter_id uuid not null references app.encounters(id) on delete cascade,
  patient_id uuid not null references app.patients(id) on delete cascade,
  balance_number int not null,
  status text not null default 'open', -- 'open', 'partially_closed', 'closed'
  reference_date date not null,
  period_start timestamptz not null default now(),
  period_end timestamptz,
  created_by uuid not null references app.users(id) on delete restrict,
  closed_by uuid references app.users(id) on delete set null,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (encounter_id, balance_number)
);
create index if not exists fluid_balance_periods_encounter_idx on app.fluid_balance_periods(encounter_id);

create table if not exists app.fluid_balance_entries (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references app.fluid_balance_periods(id) on delete cascade,
  direction text not null, -- 'gain', 'loss'
  item_name text not null,
  volume_ml numeric(10, 2) not null check (volume_ml > 0),
  entry_date date not null,
  entry_hour smallint not null check (entry_hour between 0 and 23),
  entry_minute smallint not null default 0 check (entry_minute between 0 and 59),
  region text,
  laterality text, -- 'left', 'right', 'bilateral'
  recorded_by uuid not null references app.users(id) on delete restrict,
  created_at timestamptz not null default now()
);
create index if not exists fluid_balance_entries_period_idx on app.fluid_balance_entries(period_id);

alter table app.fluid_balance_periods enable row level security;
alter table app.fluid_balance_entries enable row level security;

drop policy if exists fluid_balance_periods_select on app.fluid_balance_periods;
drop policy if exists fluid_balance_periods_insert on app.fluid_balance_periods;
drop policy if exists fluid_balance_periods_update on app.fluid_balance_periods;
create policy fluid_balance_periods_select on app.fluid_balance_periods for select to vitaloop_app using (app.has_permission('nursing.read'));
create policy fluid_balance_periods_insert on app.fluid_balance_periods for insert to vitaloop_app with check (app.has_permission('nursing.balance'));
create policy fluid_balance_periods_update on app.fluid_balance_periods for update to vitaloop_app using (app.has_permission('nursing.balance'));

drop policy if exists fluid_balance_entries_select on app.fluid_balance_entries;
drop policy if exists fluid_balance_entries_insert on app.fluid_balance_entries;
create policy fluid_balance_entries_select on app.fluid_balance_entries for select to vitaloop_app using (app.has_permission('nursing.read'));
create policy fluid_balance_entries_insert on app.fluid_balance_entries for insert to vitaloop_app with check (app.has_permission('nursing.balance'));

grant select, insert, update on app.fluid_balance_periods to vitaloop_app;
grant select, insert on app.fluid_balance_entries to vitaloop_app;
