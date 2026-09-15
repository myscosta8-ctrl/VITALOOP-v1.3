-- =====================================================================
-- VITALOOP 1.3 — Migration 0092
-- Triagem — Bloco 2.2 (fechamento do Bloco 2): resolução segura do nome
-- do profissional no histórico de classificação, sem abrir a RLS de
-- app.users para leitura geral entre usuários.
-- =====================================================================

-- Função SECURITY DEFINER — expõe SOMENTE o nome de exibição de um
-- profissional (nada de email/telefone/status/dados administrativos), e
-- somente para quem já tem `triage.read` (mesma permissão que já governa
-- todo o módulo de Triagem — não criei uma nova). O owner desta função
-- (role de migração, com `bypassrls`) permite que o SELECT interno enxergue
-- qualquer usuário, mas o `case` abaixo é o portão de autorização real: sem
-- `triage.read`, a função sempre retorna NULL, nunca vaza o nome.
create or replace function app.resolve_professional_display_name(p_professional_id uuid)
returns text
language sql
stable
security definer
set search_path = app, pg_temp
as $$
  select case when app.has_permission('triage.read') then u.name else null end
  from app.users u
  where u.id = p_professional_id;
$$;

comment on function app.resolve_professional_display_name(uuid) is 'Resolve o nome de exibição de um profissional para quem tem triage.read, sem expor a tabela app.users inteira nem outros campos além do nome (Bloco 2.2).';

-- Função de aplicação, não uma tabela — não precisa/deve ser executável por
-- qualquer role do Postgres, só pela role da API.
revoke all on function app.resolve_professional_display_name(uuid) from public;
grant execute on function app.resolve_professional_display_name(uuid) to vitaloop_app;
