-- Migration 0072: Escolha de setor no login diário (plantão) — só técnicos de enfermagem
-- Migration estritamente aditiva. Não altera 0001 a 0071.
--
-- Decisão do usuário (2026-09-09): profissionais assistenciais (médico,
-- enfermeiro, farmacêutico, nutricionista, serviço social, fisioterapeuta)
-- não são restritos por setor — atendem em toda a unidade. Só o TÉCNICO DE
-- ENFERMAGEM é fixo no setor durante o plantão, mas não é fixo de um setor
-- específico de forma permanente (muda de um dia pro outro). Por isso a
-- escolha é feita a cada login, não é a lotação fixa da migration 0065.
--
-- Tabela em log (não upsert) — mesma lógica de auditoria do resto do
-- sistema: cada escolha vira uma linha nova; "o setor de hoje" é sempre a
-- mais recente ainda não expirada. `bed_sector_id` é null quando a área
-- escolhida é o Pronto Atendimento (não tem leito físico — ver migration
-- 0070, app.encounter_current_sector).

create table if not exists app.shift_sector_selections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app.users(id) on delete cascade,
  area text not null,
  bed_sector_id uuid references app.bed_sectors(id) on delete restrict,
  selected_at timestamptz not null default now(),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint shift_sector_selections_area_ck check (area in ('pronto_atendimento', 'internacao')),
  constraint shift_sector_selections_area_sector_ck check (
    (area = 'pronto_atendimento' and bed_sector_id is null) or
    (area = 'internacao' and bed_sector_id is not null)
  )
);
create index if not exists shift_sector_selections_user_idx on app.shift_sector_selections(user_id, selected_at desc);

alter table app.shift_sector_selections enable row level security;

drop policy if exists shift_sector_selections_self_read on app.shift_sector_selections;
drop policy if exists shift_sector_selections_self_insert on app.shift_sector_selections;
drop policy if exists shift_sector_selections_manage_read on app.shift_sector_selections;
create policy shift_sector_selections_self_read on app.shift_sector_selections for select to vitaloop_app
  using (user_id = app.ctx_user_id());
create policy shift_sector_selections_self_insert on app.shift_sector_selections for insert to vitaloop_app
  with check (user_id = app.ctx_user_id());
create policy shift_sector_selections_manage_read on app.shift_sector_selections for select to vitaloop_app
  using (app.has_permission('assignment.manage'));

grant select, insert on app.shift_sector_selections to vitaloop_app;
