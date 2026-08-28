-- =====================================================================
-- VITALOOP 1.3 — Migration 0012
-- Hardening de segurança: fixa search_path das funções (Doc 2 §51)
--
-- Motivo: advisor `function_search_path_mutable` (Supabase database linter).
-- Funções com search_path mutável podem ser alvo de sequestro de resolução de
-- nomes. Todas as funções desta fundação já qualificam suas chamadas internas
-- (`app.*`) e usam apenas builtins de `pg_catalog`, logo `search_path = ''` é seguro.
-- Aditivo (não altera migrations anteriores).
-- =====================================================================

alter function app.ctx_user_id()          set search_path = '';
alter function app.ctx_institution_id()   set search_path = '';
alter function app.ctx_roles()            set search_path = '';
alter function app.ctx_has_role(text)     set search_path = '';
alter function app.ctx_break_glass()      set search_path = '';
alter function app.is_authenticated()     set search_path = '';
alter function app.forbid_mutation()      set search_path = '';
alter function app.touch_updated_at()     set search_path = '';
