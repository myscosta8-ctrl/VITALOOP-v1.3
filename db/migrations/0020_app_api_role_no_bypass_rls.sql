-- =====================================================================
-- VITALOOP 1.3 — Migration 0020 (Fase 2, Etapa 1/6)
-- Achado crítico encontrado via teste real: a API conecta ao Postgres
-- usando o papel `postgres` (via connection pooler), que tem
-- `rolbypassrls = true`. Isso significa que TODA política de RLS do
-- schema `app` — inclusive as já homologadas na Fase 1 — é ignorada pela
-- própria conexão da API, que nunca executa `SET ROLE`. A proteção real
-- hoje está inteiramente na camada HTTP (`requireAuth`/`requirePermission`),
-- não no banco, contrariando o modelo "negar por padrão em múltiplas
-- camadas" descrito nos Blueprints e nos relatórios de homologação da
-- Fase 1.
--
-- Correção: cria um papel de aplicação dedicado (`app_api`), SEM
-- BYPASSRLS, com os GRANTs mínimos necessários nas tabelas/funções do
-- schema `app`. A API deve passar a conectar usando este papel (nova
-- DATABASE_URL), não mais `postgres`. RLS volta a ser a autoridade real
-- de linha, com `has_permission()`/`can_access()`/`authorize()` avaliados
-- de fato pelo Postgres — HTTP e banco tornam-se camadas independentes.
--
-- Aditiva; não edita 0001-0019.
-- =====================================================================

-- A senha do papel NÃO é definida por esta migration (não deve haver
-- segredo em texto num arquivo versionado). Definir separadamente via
-- `alter role app_api with password '...';` fora do controle de versão.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'app_api') then
    create role app_api with login noinherit;
  end if;
end $$;

alter role app_api set search_path = app, public, extensions;

grant usage on schema app to app_api;
grant usage on schema public to app_api;
grant usage on schema extensions to app_api;

grant select, insert, update, delete on all tables in schema app to app_api;
grant usage, select on all sequences in schema app to app_api;
grant execute on all functions in schema app to app_api;

alter default privileges for role postgres in schema app
  grant select, insert, update, delete on tables to app_api;
alter default privileges for role postgres in schema app
  grant usage, select on sequences to app_api;
alter default privileges for role postgres in schema app
  grant execute on functions to app_api;

comment on role app_api is 'Papel de conexão da API (Doc 2 §19). SEM BYPASSRLS — RLS é a autoridade real de linha; requireAuth/requirePermission (HTTP) e RLS (banco) são camadas independentes. Nunca usar o papel postgres para tráfego de aplicação.';
