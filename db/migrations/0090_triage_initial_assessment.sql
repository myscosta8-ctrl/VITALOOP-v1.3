-- =====================================================================
-- VITALOOP 1.3 — Migration 0090
-- Triagem — Bloco 1: Avaliação inicial estruturada, gestação, início/
-- evolução da queixa e avaliação detalhada da dor.
-- Estritamente ADITIVA a app.triages (migration 0025) — nenhuma coluna
-- existente é removida/renomeada; todas as colunas novas são NULLABLE, então
-- triagens já registradas continuam abrindo sem exigir os novos dados.
-- =====================================================================

-- 1. Enums de avaliação inicial (conjunto fechado — regra 3 do bloco: não
--    usar texto livre quando o campo tem opções fechadas).
create type app.triage_general_condition as enum ('good', 'regular', 'severe');
create type app.triage_consciousness as enum ('oriented', 'confused', 'drowsy', 'obtunded', 'unconscious');
create type app.triage_airway as enum ('patent', 'altered', 'obstructed');
create type app.triage_breathing as enum ('normal', 'altered', 'respiratory_distress');
create type app.triage_circulation as enum ('preserved', 'altered');
create type app.triage_skin_finding as enum ('normal_color', 'pale', 'cyanotic', 'diaphoretic', 'jaundiced', 'other');

-- Reaproveitado tanto pela evolução da queixa quanto pela evolução da dor
-- (mesma semântica, ver regra 9 do bloco — não duplicar o mesmo conceito).
create type app.triage_evolution as enum ('sudden', 'gradual', 'progressive', 'recurrent', 'stable', 'worsening', 'improving');

-- 'unknown' é uma resposta EXPLÍCITA de "não informado" (distinta de NULL,
-- que significa "triagem antiga, este campo nem existia") — regra 6 do
-- bloco: o profissional deve poder escolher "não informado" sem que isso
-- vire uma presunção automática.
create type app.triage_pregnancy_status as enum ('yes', 'no', 'unknown');

-- 2. Colunas novas em app.triages — dados do ATENDIMENTO/TRIAGEM, nunca do
--    Patient (regra 2/5 do bloco): um novo atendimento não herda nem
--    sobrescreve a avaliação de um atendimento anterior.
alter table app.triages
  add column general_condition   app.triage_general_condition,
  add column consciousness       app.triage_consciousness,
  add column airway              app.triage_airway,
  add column breathing           app.triage_breathing,
  add column circulation         app.triage_circulation,
  add column skin_findings       app.triage_skin_finding[] not null default '{}'::app.triage_skin_finding[],
  add column skin_findings_other text,

  add column pregnancy_status    app.triage_pregnancy_status,
  add column pregnancy_weeks     integer check (pregnancy_weeks is null or (pregnancy_weeks >= 0 and pregnancy_weeks <= 45)),
  add column obstetric_notes     text,

  -- Início/evolução da queixa (distintos de `symptoms_duration`, que já
  -- existia como texto livre tipo "2 horas" — os novos campos são
  -- estruturados: data/hora real + evolução de um conjunto fechado).
  add column complaint_onset_at  timestamptz,
  add column complaint_evolution app.triage_evolution,
  add column complaint_notes     text,

  -- Avaliação detalhada da dor — `pain_score` (0-10) já existia e continua
  -- sendo o único campo de intensidade; os novos são complementares.
  add column pain_location       text,
  add column pain_irradiation    text,
  add column pain_character      text,
  add column pain_onset_at       timestamptz,
  add column pain_evolution      app.triage_evolution;

comment on column app.triages.general_condition is 'Avaliação inicial — estado geral do paciente neste atendimento (não é atributo permanente do paciente).';
comment on column app.triages.skin_findings is 'Avaliação inicial — características de pele observadas (múltipla escolha), específicas deste atendimento.';
comment on column app.triages.pregnancy_status is 'Gestação informada/avaliada NESTE atendimento. NULL = triagem anterior à migration 0090 (campo não existia). ''unknown'' = profissional selecionou explicitamente "não informado".';
comment on column app.triages.complaint_onset_at is 'Data/hora estruturada de início da queixa principal deste atendimento.';
comment on column app.triages.pain_onset_at is 'Data/hora estruturada de início da dor — pode coincidir com complaint_onset_at quando a dor É a queixa principal, mas são campos independentes (o profissional pode ajustar).';
