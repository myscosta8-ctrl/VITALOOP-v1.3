-- Migration 0064: Fluxo de autorização em duas etapas para AIH/APAC
-- Migration estritamente aditiva. Não altera 0001 a 0063.
--
-- Até aqui, o campo "número de autorização" existia dentro do mesmo
-- formulário de criação da solicitação (form_fields), preenchido por quem
-- solicita — o que não reflete a realidade: a autorização é emitida DEPOIS,
-- pela regulação/auditoria, não pelo médico solicitante (ver
-- docs/REFERENCIA_CAMPOS_IMPRESSOS_HOSPITALARES.md, itens 1 e 6). Esta
-- migration só adiciona as duas novas permissões que separam a etapa de
-- autorizar da etapa de solicitar — os campos do bloco de autorização
-- continuam em `form_fields` (JSONB), agora validados contra
-- `AIH_AUTHORIZATION_FIELDS_SCHEMA`/`APAC_AUTHORIZATION_FIELDS_SCHEMA` (ver
-- packages/domain/src/sus/aih-clinical-schema.ts e apac-clinical-schema.ts)
-- e gravados só quando a nova rota de autorização é chamada, não na
-- criação. Nenhuma coluna nova — `status` (text, sem check constraint)
-- passa a aceitar também o valor 'authorized', além dos já documentados
-- ('draft', 'submitted', 'validated', 'rejected').

insert into app.permissions (code, name, resource, action) values
  ('sus.authorize_aih',  'Autorizar laudo de AIH (regulação/auditoria)',  'sus', 'authorize_aih'),
  ('sus.authorize_apac', 'Autorizar laudo de APAC (regulação/auditoria)', 'sus', 'authorize_apac')
on conflict (code) do nothing;

-- Mesmo conjunto de papéis que já emite/lê AIH/APAC (migrations 0038/0054)
-- — quem cria também pode autorizar, na ausência de um papel dedicado de
-- "regulação/auditoria" no Vitaloop hoje; times que quiserem restringir
-- devem revisar essa concessão depois.
insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code in ('admin', 'doctor', 'nurse', 'receptionist', 'test_patient_full')
  and p.code in ('sus.authorize_aih', 'sus.authorize_apac')
on conflict do nothing;
