-- =====================================================================
-- VITALOOP 1.3 — Migration 0021 (Fase 2, Etapa 1/6)
-- Correção de rota sobre o achado da migration 0020.
--
-- Investigação mais profunda revelou que a migration 0010 (Fase 0,
-- linhas 52-58) JÁ criava um papel dedicado `vitaloop_app` — `NOLOGIN`
-- de propósito, com o comentário explícito "PENDENTE; ajustar na etapa
-- de configuração do Supabase" — e TODAS as políticas de RLS de todo o
-- schema `app` (Fase 0 a 0017, inclusive pacientes) já usam
-- `to vitaloop_app`, não um papel genérico. Esse ajuste pendente nunca
-- foi concluído, inclusive após a homologação formal da Fase 1 declarar
-- RLS "testada e efetiva" — o que estava correto apenas no nível lógico
-- (policies bem escritas), não no nível de conexão real (nenhuma conexão
-- jamais autenticou como `vitaloop_app`).
--
-- A migration 0020 (criação de `app_api`) partiu da premissa incorreta
-- de que nenhum papel dedicado existia. Como as políticas de RLS nunca
-- referenciam `app_api`, uma conexão como esse papel não tinha NENHUMA
-- policy aplicável — daí o resultado observado de 0 linhas em TODOS os
-- cenários de teste, inclusive o autorizado.
--
-- Correção:
--   1. Habilita LOGIN em `vitaloop_app` (sem senha embutida aqui — ver
--      nota de segurança abaixo, mesmo padrão da migration 0020).
--   2. Concede USAGE em `extensions` (necessário para
--      app.normalize_text() via unaccent, usada por
--      detect_patient_duplicates()).
--   3. Aposenta `app_api`: revoga grants e remove o papel — foi um
--      desvio de rota, não deve conviver com `vitaloop_app` para não
--      confundir qual é o papel real de conexão da API.
--
-- Aditiva; não edita 0001-0020.
-- =====================================================================

alter role vitaloop_app with login noinherit;
alter role vitaloop_app set search_path = app, public, extensions;

grant usage on schema extensions to vitaloop_app;

-- Aposentadoria do desvio de rota (migration 0020).
revoke all privileges on all tables in schema app from app_api;
revoke all privileges on all sequences in schema app from app_api;
revoke all privileges on all functions in schema app from app_api;
revoke usage on schema app, public, extensions from app_api;
alter default privileges for role postgres in schema app revoke select, insert, update, delete on tables from app_api;
alter default privileges for role postgres in schema app revoke usage, select on sequences from app_api;
alter default privileges for role postgres in schema app revoke execute on functions from app_api;
drop role if exists app_api;

comment on role vitaloop_app is 'Papel de conexão real da API (Doc 2 §19), ativo desde Fase 0 nas políticas de RLS, LOGIN habilitado nesta migration. Senha definida fora do controle de versão via ALTER ROLE separado.';
