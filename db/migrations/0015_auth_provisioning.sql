-- =====================================================================
-- VITALOOP 1.3 — Migration 0015 (Fase 1)
-- Provisionamento técnico: ao criar uma credencial no Supabase Auth,
-- cria automaticamente a identidade institucional correspondente em app.users
-- com status 'active' e SEM papéis (RBAC deny-by-default — Doc 4 §19/§34).
--
-- Isto é infraestrutura técnica (padrão Supabase "handle_new_user"), não uma
-- política institucional: nenhum papel, permissão ou vínculo é atribuído aqui.
-- =====================================================================

create or replace function app.resolve_current_app_user_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select id from app.users where auth_subject = auth.uid();
$$;

grant execute on function app.resolve_current_app_user_id() to vitaloop_app, authenticated;

create or replace function app.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into app.users (auth_subject, username, name, email, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    'active'
  )
  on conflict (auth_subject) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function app.handle_new_auth_user();

comment on function app.handle_new_auth_user() is
  'Provisionamento técnico: cria app.users sem papéis/permissões (deny-by-default). Atribuição de papéis é ato administrativo separado e auditável.';
