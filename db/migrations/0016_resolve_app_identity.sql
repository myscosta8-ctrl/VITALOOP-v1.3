-- =====================================================================
-- VITALOOP 1.3 — Migration 0016 (Fase 1)
-- Resolve a identidade institucional (app.users) e papéis ativos a partir do
-- auth_subject (auth.users.id) já verificado pela API via JWT (Doc 4 §15).
--
-- SECURITY DEFINER: necessário porque, antes de o contexto RLS ser aplicado
-- (vitaloop.user_id ainda não setado), a policy users_self_read não liberaria
-- a leitura. A função só retorna a linha correspondente ao auth_subject
-- informado pelo chamador — não há vazamento de outros usuários.
-- =====================================================================

create or replace function app.resolve_app_identity(p_auth_subject uuid)
returns table(user_id uuid, status app.user_status, roles text[])
language sql stable security definer set search_path = '' as $$
  select
    u.id,
    u.status,
    coalesce((
      select array_agg(distinct r.code)
      from app.user_roles ur
      join app.roles r on r.id = ur.role_id
      where ur.user_id = u.id
        and ur.status = 'active'
        and r.status = 'active'
        and (ur.valid_until is null or ur.valid_until > now())
    ), array[]::text[])
  from app.users u
  where u.auth_subject = p_auth_subject;
$$;

grant execute on function app.resolve_app_identity(uuid) to vitaloop_app;

comment on function app.resolve_app_identity(uuid) is
  'Mapeia auth.users.id (JWT verificado) -> identidade institucional + papéis ativos. Usado pela API para montar o contexto de segurança por requisição.';
