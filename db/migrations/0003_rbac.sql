-- =====================================================================
-- VITALOOP 1.3 — Migration 0003
-- RBAC: papéis, permissões, vínculos com escopo/contexto (Doc 1 §7; Doc 2 §9.1/§20)
-- A MATRIZ DEFINITIVA de perfis/permissões é institucional:
--   NÃO DEFINIDO — NECESSITA DECISÃO. Aqui está apenas a ESTRUTURA extensível.
-- =====================================================================

create table app.roles (
  id           uuid primary key default gen_random_uuid(),
  code         text not null,
  name         text not null,
  description  text,
  status       app.entity_status not null default 'active',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint roles_code_uk unique (code)
);

create table app.permissions (
  id           uuid primary key default gen_random_uuid(),
  code         text not null,
  name         text not null,
  description  text,
  resource     text not null,
  action       text not null,
  created_at   timestamptz not null default now(),
  constraint permissions_code_uk unique (code),
  constraint permissions_resource_action_uk unique (resource, action)
);

-- Vínculo usuário↔papel COM ESCOPO institucional e validade temporal
-- (necessidade de saber, Doc 1 §8; contexto, Doc 2 §20).
create table app.user_roles (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references app.users(id) on delete cascade,
  role_id         uuid not null references app.roles(id) on delete restrict,
  institution_id  uuid references app.institutions(id) on delete cascade,
  unit_id         uuid references app.units(id) on delete cascade,
  sector_id       uuid references app.sectors(id) on delete cascade,
  valid_from      timestamptz not null default now(),
  valid_until     timestamptz,
  status          app.entity_status not null default 'active',
  created_at      timestamptz not null default now(),
  constraint user_roles_period_ck check (valid_until is null or valid_until > valid_from)
);
create index user_roles_user_idx on app.user_roles(user_id);
create index user_roles_scope_idx on app.user_roles(institution_id, unit_id, sector_id);
-- Evita duplicar o mesmo papel no mesmo escopo exato.
create unique index user_roles_unique_scope
  on app.user_roles(user_id, role_id,
                    coalesce(institution_id, '00000000-0000-0000-0000-000000000000'::uuid),
                    coalesce(unit_id, '00000000-0000-0000-0000-000000000000'::uuid),
                    coalesce(sector_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where status = 'active';

create table app.role_permissions (
  role_id        uuid not null references app.roles(id) on delete cascade,
  permission_id  uuid not null references app.permissions(id) on delete cascade,
  scope          text not null default 'context',
  primary key (role_id, permission_id)
);

-- Políticas de acesso parametrizáveis (Doc 2 §9.1 access_policies).
-- condition_definition (jsonb) permite parametrizar regras sem recompilar.
create table app.access_policies (
  id                    uuid primary key default gen_random_uuid(),
  code                  text not null,
  resource              text not null,
  action                text not null,
  scope_type            text not null,
  condition_definition  jsonb not null default '{}'::jsonb,
  status                app.entity_status not null default 'active',
  created_at            timestamptz not null default now(),
  constraint access_policies_code_uk unique (code)
);
