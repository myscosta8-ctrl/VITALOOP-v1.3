-- =====================================================================
-- VITALOOP 1.3 — Migration 0002
-- Identidade e hierarquia institucional (Doc 1 §5/§6; Doc 2 §9.1)
-- Instituição → unidade → setor → usuário → perfil profissional.
-- =====================================================================

-- Enums de status (Doc 2 §11).
create type app.entity_status as enum ('active', 'inactive', 'suspended');
create type app.user_status  as enum ('active', 'inactive', 'suspended', 'locked');

-- --- Instituições ---
create table app.institutions (
  id          uuid primary key default gen_random_uuid(),
  code        text not null,
  name        text not null,
  cnpj        text,
  status      app.entity_status not null default 'active',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint institutions_code_uk unique (code)
);

-- --- Unidades ---
create table app.units (
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid not null references app.institutions(id) on delete restrict,
  code            text not null,
  name            text not null,
  type            text,
  status          app.entity_status not null default 'active',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint units_institution_code_uk unique (institution_id, code)
);
create index units_institution_idx on app.units(institution_id);

-- --- Setores ---
create table app.sectors (
  id           uuid primary key default gen_random_uuid(),
  unit_id      uuid not null references app.units(id) on delete restrict,
  code         text not null,
  name         text not null,
  sector_type  text,
  status       app.entity_status not null default 'active',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint sectors_unit_code_uk unique (unit_id, code)
);
create index sectors_unit_idx on app.sectors(unit_id);

-- --- Usuários (identidade real; Doc 4 §15) ---
-- auth_subject: elo com o provedor de autenticação (ex.: Supabase auth.users.id).
-- PENDENTE: mapeamento definitivo depende da decisão de Auth (NÃO DEFINIDO — NECESSITA DECISÃO).
create table app.users (
  id             uuid primary key default gen_random_uuid(),
  auth_subject   text,
  username       text not null,
  name           text not null,
  email          text,
  cpf            text,
  status         app.user_status not null default 'active',
  last_login_at  timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint users_username_uk unique (username),
  constraint users_auth_subject_uk unique (auth_subject)
);
create unique index users_email_uk on app.users(lower(email)) where email is not null;
create unique index users_cpf_uk on app.users(cpf) where cpf is not null;

-- --- Perfis profissionais (conselho/registro) ---
create table app.professional_profiles (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references app.users(id) on delete cascade,
  professional_type    text not null,
  registration_type    text,
  registration_number  text,
  registration_uf      text,
  status               app.entity_status not null default 'active',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index professional_profiles_user_idx on app.professional_profiles(user_id);
