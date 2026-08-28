-- =====================================================================
-- VITALOOP 1.3 — Migration 0013 (Fase 1)
-- Autorização (RBAC com escopo), Need-to-Know, brute-force e helpers de auditoria.
-- (Doc 1 §7/§8/§9/§10; Doc 2 §20/§21/§22/§28; Doc 4 §12/§13/§14/§16)
--
-- Princípios: deny-by-default; identidade ≠ autorização ≠ need-to-know;
-- políticas institucionais NÃO são inventadas (marcadas como pendentes/parametrizáveis).
-- =====================================================================

-- ---------- Configuração de segurança parametrizável ----------
-- Valores institucionais definitivos: NÃO DEFINIDO — NECESSITA DECISÃO.
-- Os números abaixo são BASELINE TÉCNICO de segurança (override institucional pendente).
create table app.security_settings (
  id                          boolean primary key default true,
  password_min_length         integer,        -- null => delegado ao Supabase Auth / pendente
  session_ttl_minutes         integer not null default 720,   -- baseline técnico (12h)
  session_idle_minutes        integer,        -- pendente
  max_login_attempts          integer not null default 5,     -- baseline técnico
  lockout_minutes             integer not null default 15,    -- baseline técnico
  break_glass_default_minutes integer not null default 60,    -- baseline técnico
  mfa_required_roles          text[] not null default '{}',   -- pendente institucional
  updated_at                  timestamptz not null default now(),
  constraint security_settings_singleton check (id = true)
);
insert into app.security_settings(id) values (true);
comment on table app.security_settings is 'Config de segurança parametrizável. Numéricos = baseline técnico; override institucional PENDENTE.';

-- ---------- Need-to-Know: infraestrutura de vínculo/atribuição ----------
create type app.ntk_scope_type as enum (
  'institution','unit','sector','team','encounter','patient','resource'
);

create table app.access_assignments (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references app.users(id) on delete cascade,
  scope_type        app.ntk_scope_type not null,
  scope_id          uuid,                       -- sem FK: escopos clínicos (patient/encounter) são fases 2+
  relationship_type text not null,              -- ex.: 'lotacao','responsavel','equipe' (institucional)
  valid_from        timestamptz not null default now(),
  valid_until       timestamptz,
  status            app.entity_status not null default 'active',
  granted_by        uuid references app.users(id) on delete set null,
  created_at        timestamptz not null default now(),
  constraint access_assignments_period_ck check (valid_until is null or valid_until > valid_from)
);
create index access_assignments_user_idx on app.access_assignments(user_id);
create index access_assignments_scope_idx on app.access_assignments(scope_type, scope_id);
comment on table app.access_assignments is 'Need-to-Know: vínculo do usuário a um escopo. Escopos clínicos (patient/encounter): PENDENTE DE ESCOPAMENTO CLÍNICO.';

-- ---------- Brute-force / rate-limit (registro de tentativas) ----------
create table app.login_attempts (
  id           uuid primary key default gen_random_uuid(),
  identifier   text not null,          -- username/e-mail informado (para contagem e lockout)
  success      boolean not null,
  ip_hash      text,
  reason       text,
  occurred_at  timestamptz not null default now()
);
create index login_attempts_identifier_idx on app.login_attempts(identifier, occurred_at);
comment on table app.login_attempts is 'Tentativas de login para proteção brute-force. Não armazenar senha/token.';

-- ---------- Catálogo de permissões (escopo da FASE 1 apenas) ----------
-- Permissões clínicas (patient.*, prescription.*...) pertencem às fases 2+ e NÃO são criadas aqui.
insert into app.permissions(code, name, resource, action) values
 ('user.read',                'Ler usuários',            'user',            'read'),
 ('user.manage',              'Gerenciar usuários',      'user',            'manage'),
 ('role.manage',              'Gerenciar papéis',        'role',            'manage'),
 ('permission.manage',        'Gerenciar permissões',    'permission',      'manage'),
 ('assignment.manage',        'Gerenciar vínculos NTK',  'assignment',      'manage'),
 ('audit.read',               'Ler auditoria',           'audit',           'read'),
 ('session.manage',           'Gerenciar sessões',       'session',         'manage'),
 ('break_glass.use',          'Usar acesso excepcional', 'break_glass',     'use'),
 ('break_glass.review',       'Revisar acesso excepcional','break_glass',   'review'),
 ('security.settings.manage', 'Gerenciar config seg.',   'security_settings','manage')
on conflict (code) do nothing;

-- ---------- Funções de autorização (SECURITY DEFINER, search_path fixo) ----------
-- has_permission: o ator (via papéis do contexto) possui a permissão?
create or replace function app.has_permission(perm_code text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(
    select 1
    from app.roles r
    join app.role_permissions rp on rp.role_id = r.id
    join app.permissions p on p.id = rp.permission_id
    where r.code = any(app.ctx_roles())
      and r.status = 'active'
      and p.code = perm_code
  );
$$;

-- can_access: need-to-know sobre um escopo. Baseline: vínculo ativo OU break-glass ativo.
-- Escopos clínicos dependerão das tabelas de fases 2+ (PENDENTE DE ESCOPAMENTO CLÍNICO).
create or replace function app.can_access(p_scope_type text, p_scope_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select
    app.ctx_break_glass()
    or exists(
      select 1 from app.access_assignments a
      where a.user_id = app.ctx_user_id()
        and a.status = 'active'
        and a.scope_type = p_scope_type::app.ntk_scope_type
        and (a.scope_id is not distinct from p_scope_id or p_scope_id is null)
        and (a.valid_until is null or a.valid_until > now())
    );
$$;

-- authorize: decisão combinada (RBAC + need-to-know). Deny-by-default.
create or replace function app.authorize(perm_code text, p_scope_type text default null, p_scope_id uuid default null)
returns boolean language sql stable security definer set search_path = '' as $$
  select app.ctx_user_id() is not null
     and app.has_permission(perm_code)
     and (p_scope_type is null or app.can_access(p_scope_type, p_scope_id));
$$;

-- is_locked_out: excedeu o limite de falhas na janela? (baseline técnico configurável)
create or replace function app.is_locked_out(p_identifier text)
returns boolean language sql stable security definer set search_path = '' as $$
  select (
    select count(*) from app.login_attempts la, app.security_settings s
    where la.identifier = p_identifier
      and la.success = false
      and la.occurred_at > now() - make_interval(mins => s.lockout_minutes)
  ) >= (select max_login_attempts from app.security_settings);
$$;

-- ---------- Funções de escrita auditável (SECURITY DEFINER) ----------
create or replace function app.record_login_attempt(p_identifier text, p_success boolean, p_ip_hash text, p_reason text default null)
returns void language sql security definer set search_path = '' as $$
  insert into app.login_attempts(identifier, success, ip_hash, reason)
  values (p_identifier, p_success, p_ip_hash, p_reason);
$$;

-- log_authz: registra decisão de autorização na auditoria (append-only).
create or replace function app.log_authz(
  p_actor uuid, p_granted boolean, p_resource_type text, p_resource_id uuid,
  p_reason text, p_request_id text default null
) returns uuid language sql security definer set search_path = '' as $$
  insert into app.audit_events(actor_user_id, action, resource_type, resource_id, reason, request_id, severity)
  values (
    p_actor,
    (case when p_granted then 'access_granted' else 'access_denied' end)::app.audit_action,
    p_resource_type, p_resource_id, p_reason, p_request_id,
    (case when p_granted then 'info' else 'notice' end)::app.audit_severity
  ) returning id;
$$;

-- activate_break_glass: registra acesso excepcional + auditoria. Duração institucional PENDENTE.
create or replace function app.activate_break_glass(
  p_user uuid, p_patient uuid, p_encounter uuid, p_reason text, p_justification text, p_minutes integer default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_minutes integer; v_id uuid; v_audit uuid;
begin
  select coalesce(p_minutes, break_glass_default_minutes) into v_minutes from app.security_settings;
  insert into app.break_glass_access(user_id, patient_id, encounter_id, reason, justification, expires_at, status)
  values (p_user, p_patient, p_encounter, p_reason, p_justification, now() + make_interval(mins => v_minutes), 'active')
  returning id into v_id;
  insert into app.audit_events(actor_user_id, action, resource_type, resource_id, patient_id, encounter_id, reason, severity)
  values (p_user, 'break_glass', 'break_glass_access', v_id, p_patient, p_encounter, p_reason, 'warning')
  returning id into v_audit;
  update app.break_glass_access set audit_id = v_audit where id = v_id;
  return v_id;
end;
$$;

-- ---------- Grants + RLS das novas tabelas ----------
grant execute on function
  app.has_permission(text), app.can_access(text,uuid), app.authorize(text,text,uuid),
  app.is_locked_out(text), app.record_login_attempt(text,boolean,text,text),
  app.log_authz(uuid,boolean,text,uuid,text,text),
  app.activate_break_glass(uuid,uuid,uuid,text,text,integer)
to vitaloop_app;

alter table app.security_settings  enable row level security;
alter table app.access_assignments enable row level security;
alter table app.login_attempts     enable row level security;

-- security_settings: leitura para autenticado; escrita exige permissão específica.
create policy security_settings_read on app.security_settings for select to vitaloop_app
  using (app.is_authenticated());
create policy security_settings_write on app.security_settings for update to vitaloop_app
  using (app.has_permission('security.settings.manage'))
  with check (app.has_permission('security.settings.manage'));
grant select, update on app.security_settings to vitaloop_app;

-- access_assignments: o próprio usuário lê seus vínculos; gestão exige permissão.
create policy assignments_self_read on app.access_assignments for select to vitaloop_app
  using (user_id = app.ctx_user_id() or app.has_permission('assignment.manage'));
create policy assignments_manage on app.access_assignments for all to vitaloop_app
  using (app.has_permission('assignment.manage'))
  with check (app.has_permission('assignment.manage'));
grant select, insert, update, delete on app.access_assignments to vitaloop_app;

-- login_attempts: sem acesso direto do app; escrita/leitura via funções SECURITY DEFINER.
-- Leitura direta apenas para papel de auditoria.
create policy login_attempts_audit_read on app.login_attempts for select to vitaloop_app
  using (app.has_permission('audit.read'));
grant select on app.login_attempts to vitaloop_app;
