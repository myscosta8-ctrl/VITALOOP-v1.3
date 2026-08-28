-- =====================================================================
-- VITALOOP 1.3 — SEED (APENAS DESENVOLVIMENTO/TESTE) — Doc 2 §66
-- Dados NÃO reais, determinísticos, identificados como teste.
-- NÃO habilita bypass de segurança. NÃO usar em produção.
--
-- Perfis/permissões DEFINITIVOS são institucionais: NÃO DEFINIDO — NECESSITA DECISÃO.
-- Estes papéis são apenas ANDAIMES técnicos para exercitar RBAC/RLS em dev.
-- =====================================================================

insert into app.institutions (id, code, name, status) values
  ('00000000-0000-4000-8000-000000000001', 'TEST-INST', 'Instituição de Teste (DEV)', 'active')
on conflict (code) do nothing;

insert into app.units (id, institution_id, code, name, status) values
  ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000001', 'UPA-DEV', 'UPA de Teste (DEV)', 'active')
on conflict (institution_id, code) do nothing;

insert into app.sectors (id, unit_id, code, name, status) values
  ('00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000101', 'SEC-DEV', 'Setor de Teste (DEV)', 'active')
on conflict (unit_id, code) do nothing;

-- Papéis-andaime (códigos técnicos usados pelas políticas base da 0010).
insert into app.roles (code, name, description) values
  ('system_admin', 'Administrador do sistema (DEV)', 'Andaime técnico — não é papel clínico'),
  ('auditoria',    'Auditoria (DEV)',                'Leitura de auditoria — baseline'),
  ('direcao',      'Direção (DEV)',                  'Leitura ampliada — baseline')
on conflict (code) do nothing;

-- Usuário de teste com permissões mínimas.
insert into app.users (id, username, name, status) values
  ('00000000-0000-4000-8000-000000000301', 'dev.tester', 'Usuário de Teste (DEV)', 'active')
on conflict (username) do nothing;
