-- Migration 0081: Estado "internado" de primeira classe para Atendimentos
-- Migration estritamente aditiva. Não altera 0001 a 0080.
--
-- ACHADO DE AUDITORIA (2026-09-12): app.encounter_status não tinha nenhum
-- estado representando "paciente formalmente internado" — de
-- 'post_consultation'/'in_consultation' só dava para ir direto para
-- 'completed'. Internação era tratada apenas como um outcome_type
-- ('admission_bed' em app.encounter_outcomes, migration 0031), ou seja,
-- o próprio ato de internar já fechava o atendimento (encounter). Isso é
-- clinicamente incorreto: internação é um período de cuidado ATIVO (pode
-- durar dias, com evolução de enfermagem, reavaliação médica, transferência
-- de leito), não um desfecho terminal instantâneo.
--
-- Esta migration SÓ adiciona o valor ao enum (mesmo padrão seguro já usado
-- na migration 0071 para 'post_consultation'): o novo valor não pode ser
-- usado em comparação/cast dentro da MESMA transação em que foi criado.
-- A tabela app.admissions, os gatilhos de proteção e as políticas de RLS
-- que efetivamente USAM 'admitted' ficam na migration 0082, em separado.

alter type app.encounter_status add value if not exists 'admitted' after 'post_consultation';

comment on type app.encounter_status is
  'Ciclo de vida do atendimento. ''admitted'' (internado) é um estado ATIVO de cuidado contínuo — não fecha o atendimento; ver app.admissions (migration 0082) para o registro clínico da internação.';
