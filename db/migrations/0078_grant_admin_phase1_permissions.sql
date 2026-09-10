-- Migration 0078: Concede permissões administrativas da Fase 1 à role admin
-- Migration estritamente aditiva. Não altera 0001 a 0077.
--
-- Achado de auditoria (2026-09-10): as 6 permissões administrativas criadas
-- na migration 0013 (user.manage, role.manage, assignment.manage,
-- audit.read, session.manage, security.settings.manage) só foram
-- concedidas a `system_admin` (role de scaffolding técnico, existente desde
-- o seed de dev). Quando `admin` foi criada como role operacional real
-- (migration 0065), essas 6 nunca foram revisitadas — só as permissões dos
-- módulos clínicos (0032-0064) e depois as nucleares (0074) foram
-- concedidas a ela.
--
-- Consequência prática: o menu "Sistema" trata `admin` e `system_admin`
-- como equivalentes (mesmo grupo de papel `ti`), mas a tela de cadastro de
-- profissionais (`#/profissionais`, exige `user.manage`) ficava
-- inteiramente inutilizável pra quem só tem a role `admin` — via 403 em
-- toda chamada, apesar do menu liberar o acesso à tela.

insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code = 'admin'
  and p.code in (
    'user.manage', 'role.manage', 'assignment.manage',
    'audit.read', 'session.manage', 'security.settings.manage'
  )
on conflict do nothing;
