-- Migration 0079: Leitura de auditoria passa a checar permissão, não role fixa
-- Migration estritamente aditiva. Não altera 0001 a 0078.
--
-- Achado de auditoria (2026-09-10): app.audit_events tinha uma política de
-- leitura própria, desconectada do sistema de permissões — checava
-- literalmente `ctx_has_role('auditoria') or ctx_has_role('direcao')`
-- (migration 0010). A role `auditoria` nunca foi criada como uma das 8
-- roles operacionais reais (só existe no seed de dev) — na prática, só
-- `direcao` conseguia ler a trilha de auditoria; nem admin nem
-- system_admin conseguiam, apesar de terem a permissão `audit.read`
-- (concedida a ambos na migration 0078).
--
-- Decisão do usuário (2026-09-10): trocar pra checar a permissão
-- `audit.read`, alinhando com o padrão usado no resto do sistema. Concede
-- `audit.read` também a `direcao` para não perder o acesso que já tinha.

insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code = 'direcao' and p.code = 'audit.read'
on conflict do nothing;

drop policy if exists audit_read on app.audit_events;
create policy audit_read on app.audit_events for select to vitaloop_app
  using (app.has_permission('audit.read'));
