-- Migration 0076: Restringe o escopo da role receptionist
-- Migration estritamente aditiva a partir do estado atual (revoga apenas
-- concessões de role_permissions; não altera 0001 a 0075).
--
-- Achado de auditoria (2026-09-10): receptionist acumulou permissões de
-- vários módulos via grupos genéricos `(admin, doctor, nurse,
-- receptionist)` repetidos em migrations anteriores (0036, 0038, 0040,
-- 0042-0045, 0074), sem checar se cada uma fazia sentido pra recepção.
-- Decisão do usuário (2026-09-10): revoga o grupo claramente fora do
-- escopo de "cadastro, edição e movimentação de paciente entre setores" —
-- prontuário clínico, segurança do paciente, faturamento/autorização SUS,
-- segurança técnica, observabilidade, backup, LGPD, integração e
-- indicadores gerenciais. Mantém o que é diretamente operacional
-- (paciente, atendimento, leito, fila) e o grupo intermediário (triagem,
-- desfecho, regulação, documentos) fica para decisão separada.

delete from app.role_permissions
where role_id = (select id from app.roles where code = 'receptionist')
  and permission_id in (
    select id from app.permissions where code in (
      'medical.read',
      'diagnosis.read',
      'prescription.read',
      'exam.read',
      'safety.read', 'safety.report', 'safety.manage', 'safety.investigate',
      'sus.read', 'sus.issue_aih', 'sus.issue_apac', 'sus.authorize_aih', 'sus.authorize_apac',
      'security.read', 'security.write',
      'observability.read', 'observability.manage',
      'backup.manage',
      'lgpd.export', 'lgpd.manage_retention',
      'integration.read', 'integration.write',
      'management.read', 'management.export', 'management.alerts'
    )
  );
