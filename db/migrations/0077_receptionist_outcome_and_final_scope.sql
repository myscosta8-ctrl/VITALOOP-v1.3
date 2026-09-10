-- Migration 0077: Fecha o escopo da role receptionist (grupo intermediário)
-- Migration estritamente aditiva a partir do estado atual (concede/revoga
-- apenas role_permissions; não altera 0001 a 0076).
--
-- Decisão do usuário (2026-09-10) sobre o grupo intermediário levantado na
-- auditoria (triage.read, outcome.read, document.*, regulation.*):
--   - triage.read: mantém (recepção usa pra priorizar a fila).
--   - outcome.read + outcome.write: mantém e CONCEDE escrita — a intenção é
--     a recepção sinalizar a retirada administrativa do paciente do
--     sistema (fechamento do atendimento); a alta clínica de fato continua
--     sendo ato próprio da equipe assistencial (fora deste mecanismo).
--   - document.read/issue/revoke: fora do escopo — revoga.
--   - regulation.read/manage: fora do escopo — revoga.

insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code = 'receptionist' and p.code = 'outcome.write'
on conflict do nothing;

delete from app.role_permissions
where role_id = (select id from app.roles where code = 'receptionist')
  and permission_id in (
    select id from app.permissions where code in (
      'document.read', 'document.issue', 'document.revoke',
      'regulation.read', 'regulation.manage'
    )
  );
