-- =====================================================================
-- VITALOOP 1.3 — Migration 0018 (Fase 2, Etapa 1/6)
-- Hardening de segurança: search_path fixo nas funções de 0017 + mover a
-- extensão unaccent para fora do schema public (mesmo padrão da migration
-- 0012 na Fase 0 — advisor `function_search_path_mutable` /
-- `extension_in_public`). Aditivo; não altera 0001-0017.
-- =====================================================================

create schema if not exists extensions;
alter extension unaccent set schema extensions;

create or replace function app.normalize_text(p_text text) returns text
language sql immutable set search_path = '' as $$
  select nullif(trim(regexp_replace(lower(extensions.unaccent(coalesce(p_text, ''))), '\s+', ' ', 'g')), '');
$$;

alter function app.forbid_allergy_content_update() set search_path = '';
