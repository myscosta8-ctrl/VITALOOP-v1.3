-- Migration 0074: Concede permissões clínicas nucleares às roles reais
-- Migration estritamente aditiva. Não altera 0001 a 0073.
--
-- ACHADO DE AUDITORIA (2026-09-10): as migrations 0017-0031 (Fase 2 —
-- paciente, atendimento, triagem, fila, consulta médica, diagnóstico,
-- prescrição, exame, desfecho) criaram as permissões e as políticas de RLS,
-- mas NUNCA concederam essas permissões a nenhuma role real — só às roles
-- de teste (test_patient_full/readonly), que existiam desde a Fase 1. A
-- migration 0065 (provisionamento das roles reais) não cobriu esse gap
-- porque seu escopo foi as migrations 0032-0064 (varredura por `r.code in
-- (...)` nos inserts de role_permissions) — 0017-0031 não seguem esse
-- padrão, então passaram despercebidas.
--
-- Resultado prático até esta migration: nenhum médico, enfermeiro, técnico
-- de enfermagem, recepcionista, gestor, direção ou admin conseguia ler ou
-- escrever um único paciente, atendimento, triagem, fila, consulta,
-- diagnóstico, prescrição, exame ou desfecho — o núcleo inteiro do fluxo
-- assistencial estava inacessível pra qualquer profissional real.

-- Leitura ampla: todo profissional real precisa enxergar o quadro geral
-- (mesmo padrão já usado em bed.read/document.read — quase todas as roles).
insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code in ('doctor', 'nurse', 'nursing_technician', 'receptionist', 'manager', 'direcao', 'admin', 'system_admin')
  and p.code in (
    'patient.read', 'encounter.read', 'triage.read', 'queue.read',
    'medical.read', 'diagnosis.read', 'prescription.read', 'exam.read', 'outcome.read'
  )
on conflict do nothing;

-- Cadastro/edição de paciente e abertura/mudança de atendimento: quem
-- efetivamente registra (recepção) e a equipe clínica que abre o cuidado.
insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code in ('receptionist', 'doctor', 'nurse', 'admin', 'system_admin')
  and p.code in ('patient.write', 'encounter.write')
on conflict do nothing;

-- Triagem e fila: enfermagem (quem triagem) + recepção/enfermagem (fila) + retaguarda.
insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code in ('nurse', 'nursing_technician', 'doctor', 'admin', 'system_admin')
  and p.code = 'triage.write'
on conflict do nothing;

insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code in ('receptionist', 'nurse', 'nursing_technician', 'doctor', 'admin', 'system_admin')
  and p.code = 'queue.write'
on conflict do nothing;

-- Consulta médica, diagnóstico, prescrição, exame, desfecho: ato médico.
insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code in ('doctor', 'admin', 'system_admin')
  and p.code in ('medical.write', 'diagnosis.write', 'prescription.write', 'exam.write', 'outcome.write')
on conflict do nothing;

-- Administrativo de cadastro de paciente (duplicidade/merge/inativação):
-- recepção identifica e solicita; aprovação de merge e inativação ficam
-- mais restritas (admin/direção), por serem operações que reatribuem ou
-- desativam dado de paciente.
insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code in ('receptionist', 'admin', 'system_admin')
  and p.code in ('patient.duplicate.review', 'patient.merge.request')
on conflict do nothing;

insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code in ('admin', 'direcao', 'system_admin')
  and p.code in ('patient.merge.approve', 'patient.inactivate')
on conflict do nothing;
