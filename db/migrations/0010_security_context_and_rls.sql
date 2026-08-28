-- =====================================================================
-- VITALOOP 1.3 — Migration 0010
-- Contexto de segurança + RLS base (Doc 1 §6/§7/§8; Doc 2 §19/§20/§51; Doc 4 §12)
--
-- Princípios:
--   * negar por padrão; permitir por contexto;
--   * o frontend NUNCA é a única camada de autorização;
--   * políticas CLÍNICAS específicas (necessidade de saber por paciente) dependem
--     de decisão institucional e das tabelas clínicas (fases 2+):
--       NÃO DEFINIDO — NECESSITA DECISÃO. Aqui há apenas a BASE parametrizável.
--
-- A aplicação deve conectar como papel de MENOR privilégio (Doc 3 PRD-002),
-- para que a RLS efetivamente se aplique (owner/superuser a ignora).
-- =====================================================================

-- ---------- Funções de contexto (lêem GUCs setadas por transação) ----------
create or replace function app.ctx_user_id() returns uuid
language sql stable as $$
  select nullif(current_setting('vitaloop.user_id', true), '')::uuid;
$$;

create or replace function app.ctx_institution_id() returns uuid
language sql stable as $$
  select nullif(current_setting('vitaloop.institution_id', true), '')::uuid;
$$;

create or replace function app.ctx_roles() returns text[]
language sql stable as $$
  select case
    when coalesce(current_setting('vitaloop.roles', true), '') = '' then array[]::text[]
    else string_to_array(current_setting('vitaloop.roles', true), ',')
  end;
$$;

create or replace function app.ctx_has_role(role_code text) returns boolean
language sql stable as $$
  select role_code = any(app.ctx_roles());
$$;

create or replace function app.ctx_break_glass() returns boolean
language sql stable as $$
  select coalesce(current_setting('vitaloop.break_glass', true), 'off') = 'on';
$$;

create or replace function app.is_authenticated() returns boolean
language sql stable as $$
  select app.ctx_user_id() is not null;
$$;

-- ---------- Papel de aplicação de menor privilégio ----------
-- Guardado: em ambientes gerenciados (ex.: Supabase) o mapeamento de papéis é
-- PENDENTE; ajustar na etapa de configuração do Supabase.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'vitaloop_app') then
    create role vitaloop_app nologin;
  end if;
end$$;

grant usage on schema app to vitaloop_app;

-- ---------- Habilita RLS em todas as tabelas de app ----------
alter table app.institutions          enable row level security;
alter table app.units                 enable row level security;
alter table app.sectors               enable row level security;
alter table app.users                 enable row level security;
alter table app.professional_profiles enable row level security;
alter table app.roles                 enable row level security;
alter table app.permissions           enable row level security;
alter table app.user_roles            enable row level security;
alter table app.role_permissions      enable row level security;
alter table app.access_policies        enable row level security;
alter table app.sessions              enable row level security;
alter table app.audit_events          enable row level security;
alter table app.break_glass_access    enable row level security;
alter table app.domain_events         enable row level security;
alter table app.state_transitions     enable row level security;
alter table app.idempotency_keys      enable row level security;

-- ---------- Políticas base ----------

-- Catálogos institucionais/RBAC: leitura para autenticado; escrita administrativa
-- exige papel de administração do sistema (código de papel: NÃO DEFINIDO — parametrizável).
do $$
declare t text;
begin
  foreach t in array array[
    'institutions','units','sectors','roles','permissions',
    'user_roles','role_permissions','access_policies','professional_profiles'
  ] loop
    execute format(
      'create policy %I_read on app.%I for select to vitaloop_app using (app.is_authenticated());',
      t, t);
    execute format(
      'create policy %I_admin_write on app.%I for all to vitaloop_app '
      || 'using (app.ctx_has_role(''system_admin'')) with check (app.ctx_has_role(''system_admin''));',
      t, t);
    execute format('grant select, insert, update, delete on app.%I to vitaloop_app;', t);
  end loop;
end$$;

-- Usuários: cada um enxerga o próprio registro; administração enxerga/gerencia todos.
create policy users_self_read on app.users for select to vitaloop_app
  using (id = app.ctx_user_id() or app.ctx_has_role('system_admin'));
create policy users_admin_write on app.users for all to vitaloop_app
  using (app.ctx_has_role('system_admin'))
  with check (app.ctx_has_role('system_admin'));
grant select, insert, update, delete on app.users to vitaloop_app;

-- Sessões: o dono enxerga e encerra as próprias.
create policy sessions_owner on app.sessions for select to vitaloop_app
  using (user_id = app.ctx_user_id());
create policy sessions_owner_write on app.sessions for all to vitaloop_app
  using (user_id = app.ctx_user_id())
  with check (user_id = app.ctx_user_id());
grant select, insert, update, delete on app.sessions to vitaloop_app;

-- Auditoria: qualquer autenticado INSERE o registro da própria ação;
-- leitura restrita a papéis de auditoria/direção (baseline institucional PENDENTE).
-- UPDATE/DELETE já bloqueados por trigger; nenhuma policy os habilita.
create policy audit_insert on app.audit_events for insert to vitaloop_app
  with check (app.is_authenticated());
create policy audit_read on app.audit_events for select to vitaloop_app
  using (app.ctx_has_role('auditoria') or app.ctx_has_role('direcao'));
grant select, insert on app.audit_events to vitaloop_app;

-- Break-glass: autenticado registra; leitura pelo próprio ou auditoria.
create policy break_glass_insert on app.break_glass_access for insert to vitaloop_app
  with check (app.is_authenticated() and user_id = app.ctx_user_id());
create policy break_glass_read on app.break_glass_access for select to vitaloop_app
  using (user_id = app.ctx_user_id() or app.ctx_has_role('auditoria'));
grant select, insert, update on app.break_glass_access to vitaloop_app;

-- Eventos de domínio / transições: leitura para autenticado (BASE); a necessidade
-- de saber por paciente será ESTREITADA quando as tabelas clínicas existirem.
-- Inserção por autenticado (a autoria é validada no domínio/aplicação).
create policy domain_events_read on app.domain_events for select to vitaloop_app
  using (app.is_authenticated());
create policy domain_events_insert on app.domain_events for insert to vitaloop_app
  with check (app.is_authenticated());
grant select, insert on app.domain_events to vitaloop_app;

create policy state_transitions_read on app.state_transitions for select to vitaloop_app
  using (app.is_authenticated());
create policy state_transitions_insert on app.state_transitions for insert to vitaloop_app
  with check (app.is_authenticated());
grant select, insert on app.state_transitions to vitaloop_app;

-- Idempotência: cada ator enxerga/usa as próprias chaves.
create policy idempotency_owner on app.idempotency_keys for all to vitaloop_app
  using (actor_user_id = app.ctx_user_id())
  with check (actor_user_id = app.ctx_user_id());
grant select, insert, update on app.idempotency_keys to vitaloop_app;
