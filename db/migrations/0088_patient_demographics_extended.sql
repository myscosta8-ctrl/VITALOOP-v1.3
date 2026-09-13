-- Migration 0088: Dados demográficos estendidos do paciente
-- Migration estritamente aditiva. Não altera 0001 a 0087.
--
-- Achado de auditoria (13/09/2026): o formulário "Nova Recepção" do fluxo
-- Pronto Atendimento pedia só ID (UUID) do paciente + queixa principal —
-- nada de cadastro real. Corrigido reconstruindo a recepção com busca/
-- cadastro completo de paciente (ver ReceptionIntakeForm.tsx). Esta migration
-- adiciona os campos de cadastro que a recepção real de uma UPA coleta e que
-- app.patients ainda não tinha: nome do pai, cidade de origem (naturalidade,
-- distinta do município de residência já existente em `city`), cor/raça,
-- religião e escolaridade.

alter table app.patients add column if not exists father_name text;
alter table app.patients add column if not exists birth_city text;
alter table app.patients add column if not exists race_color text
  check (race_color is null or race_color in ('branca','preta','parda','amarela','indigena','nao_informado'));
alter table app.patients add column if not exists religion text;
alter table app.patients add column if not exists education_level text
  check (education_level is null or education_level in (
    'nao_alfabetizado','fundamental_incompleto','fundamental_completo',
    'medio_incompleto','medio_completo','superior_incompleto','superior_completo',
    'pos_graduacao','nao_informado'
  ));
