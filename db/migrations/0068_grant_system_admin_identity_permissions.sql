-- Migration 0068: Concede a system_admin as permissões de identidade da Fase 1
-- Migration estritamente aditiva. Não altera 0001 a 0067.
--
-- A migration 0013 criou user.manage, role.manage, assignment.manage,
-- audit.read, session.manage e security.settings.manage, mas — mesmo
-- estilo do gap corrigido na migration 0065 — nunca concedeu nenhuma a
-- role real (só existiam roles de teste na época). A migration 0065
-- provisionou as roles reais mas cobriu só as permissões clínicas/
-- operacionais das migrations 0032-0064, deixando este segundo grupo
-- órfão também.
--
-- Necessário agora para app.users/app.user_roles (RLS exige literalmente
-- app.ctx_has_role('system_admin'), não has_permission) e para
-- app.access_assignments (RLS exige has_permission('assignment.manage')) —
-- ambos usados pela nova tela de cadastro de profissionais.

insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code = 'system_admin'
  and p.code in ('user.manage', 'role.manage', 'assignment.manage', 'audit.read', 'session.manage', 'security.settings.manage')
on conflict do nothing;
