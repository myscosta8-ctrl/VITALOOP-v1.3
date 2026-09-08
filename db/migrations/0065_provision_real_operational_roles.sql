-- Migration 0065: Provisionamento das roles operacionais reais
-- Migration estritamente aditiva. Não altera 0001 a 0064.
--
-- A migration 0003 (RBAC) criou apenas a ESTRUTURA de roles/permissões,
-- deixando explícito que "a MATRIZ DEFINITIVA de perfis/permissões é
-- institucional: NÃO DEFINIDO — NECESSITA DECISÃO". Nenhuma migration
-- posterior chegou a criar de fato as roles operacionais (nurse, doctor,
-- manager, direcao, admin, receptionist, system_admin, nursing_technician)
-- — elas só apareciam como alvo de "se essa role existir, conceda essa
-- permissão a ela" em vários `insert into app.role_permissions ... where
-- r.code in (...)` (migrations 0032 a 0064), que silenciosamente não
-- inseriam nada por falta da role.
--
-- Decisão institucional confirmada pelo usuário: usar exatamente os
-- códigos de role já referenciados nas migrations, e reaplicar as
-- concessões de permissão que ficaram órfãs.

insert into app.roles (code, name, description) values
  ('doctor', 'Médico(a)', 'Papel clínico médico — prescrição, diagnóstico, laudos SUS, planos terapêuticos'),
  ('nurse', 'Enfermeiro(a)', 'Papel clínico de enfermagem — SAE, administração de medicamentos, balanço hídrico, escalas'),
  ('nursing_technician', 'Técnico(a) de Enfermagem', 'Apoio à enfermagem — administração de medicamentos sob supervisão'),
  ('receptionist', 'Recepção', 'Fluxo administrativo de recepção — leitos, documentos, regulação'),
  ('manager', 'Gestor(a)', 'Gestão operacional — indicadores, escala de equipe'),
  ('direcao', 'Direção', 'Direção da unidade — leitura ampliada e gestão'),
  ('admin', 'Administrador', 'Administração geral do sistema'),
  ('system_admin', 'Administrador do Sistema', 'Andaime técnico — não é papel clínico')
on conflict (code) do nothing;

-- Reaplica (idempotente) as concessões de permissão programadas nas
-- migrations 0032-0064 para esses papéis.

insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code in ('nurse', 'nursing_technician', 'doctor')
  and p.code in ('nursing.read', 'nursing.write', 'medication.schedule', 'medication.administer')
on conflict do nothing;

insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code in ('nurse', 'nursing_technician', 'doctor', 'receptionist', 'admin')
  and p.code in ('bed.read', 'bed.write', 'bed.transfer', 'bed.discharge')
on conflict do nothing;

insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code in ('nurse', 'nursing_technician', 'doctor', 'admin')
  and p.code in ('nursing.sae', 'nursing.procedure', 'nursing.scales', 'nursing.balance', 'nursing.device')
on conflict do nothing;

insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code in ('doctor', 'nurse', 'receptionist', 'admin')
  and p.code in ('document.read', 'document.issue', 'document.revoke')
on conflict do nothing;

insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code in ('doctor', 'nurse', 'receptionist', 'admin')
  and p.code in ('safety.read', 'safety.report', 'safety.manage', 'safety.investigate')
on conflict do nothing;

insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code in ('admin', 'doctor', 'nurse', 'receptionist')
  and p.code in ('management.read', 'management.export', 'management.alerts')
on conflict do nothing;

insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code in ('admin', 'doctor', 'nurse', 'receptionist')
  and p.code in ('sus.read', 'sus.issue_aih')
on conflict do nothing;

insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code in ('admin', 'doctor', 'nurse', 'receptionist')
  and p.code in ('regulation.read', 'regulation.manage')
on conflict do nothing;

insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code in ('admin', 'doctor', 'nurse', 'receptionist')
  and p.code in ('integration.read', 'integration.write')
on conflict do nothing;

insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code in ('admin', 'doctor', 'nurse', 'receptionist')
  and p.code in ('security.read', 'security.write')
on conflict do nothing;

insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code in ('admin', 'doctor', 'nurse', 'receptionist')
  and p.code in ('lgpd.export', 'lgpd.manage_retention')
on conflict do nothing;

insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code in ('admin', 'doctor', 'nurse', 'receptionist')
  and p.code = 'backup.manage'
on conflict do nothing;

insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code in ('admin', 'doctor', 'nurse', 'receptionist')
  and p.code in ('observability.read', 'observability.manage')
on conflict do nothing;

insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code in ('manager', 'direcao', 'admin', 'system_admin')
  and p.code in ('staff_schedule.read', 'staff_schedule.write')
on conflict do nothing;

insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code in ('nurse', 'doctor', 'manager', 'direcao', 'admin', 'system_admin')
  and p.code in ('notification.read', 'notification.write')
on conflict do nothing;

insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code in ('nurse', 'doctor', 'manager', 'direcao', 'admin', 'system_admin')
  and p.code in ('hemotherapy.read', 'hemotherapy.write')
on conflict do nothing;

insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code in ('nurse', 'doctor', 'manager', 'direcao', 'admin', 'system_admin')
  and p.code in ('pharmacy_atm.read', 'pharmacy_atm.write')
on conflict do nothing;

insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code in ('admin', 'doctor', 'nurse', 'receptionist')
  and p.code = 'sus.issue_apac'
on conflict do nothing;

insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code in ('nurse', 'doctor', 'manager', 'direcao', 'admin', 'system_admin')
  and p.code in ('tfd.read', 'tfd.write')
on conflict do nothing;

insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code in ('nurse', 'doctor', 'manager', 'direcao', 'admin', 'system_admin')
  and p.code in ('ser.read', 'ser.write')
on conflict do nothing;

insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code in ('nurse', 'doctor', 'manager', 'direcao', 'admin', 'system_admin')
  and p.code in ('therapeutic_plan.read', 'therapeutic_plan.write')
on conflict do nothing;

insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code in ('nurse', 'doctor', 'manager', 'direcao', 'admin', 'system_admin')
  and p.code in ('sbar.read', 'sbar.write')
on conflict do nothing;

insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code in ('nurse', 'doctor', 'manager', 'direcao', 'admin', 'system_admin')
  and p.code in ('social_work.read', 'social_work.write')
on conflict do nothing;

insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code in ('nurse', 'doctor', 'manager', 'direcao', 'admin', 'system_admin')
  and p.code in ('nutrition.read', 'nutrition.write')
on conflict do nothing;

insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code in ('nurse', 'doctor', 'manager', 'direcao', 'admin', 'system_admin')
  and p.code in ('physiotherapy.read', 'physiotherapy.write')
on conflict do nothing;

insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code in ('nurse', 'doctor', 'manager', 'direcao', 'admin', 'system_admin')
  and p.code in ('nursing_therapeutic_plan.read', 'nursing_therapeutic_plan.write')
on conflict do nothing;

insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code in ('admin', 'doctor', 'nurse', 'receptionist')
  and p.code in ('sus.authorize_aih', 'sus.authorize_apac')
on conflict do nothing;
