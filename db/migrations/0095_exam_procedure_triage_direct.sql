-- =====================================================================
-- VITALOOP 1.3 — Migration 0095 (Bloco 7.2, Triagem — Encaminhamento direto
-- para exame/procedimento sem consulta médica prévia)
-- Estritamente ADITIVA; não altera dados existentes.
--
-- Achado de auditoria: app.exam_requests.consultation_id e
-- app.procedure_requests.consultation_id (migration 0030) são NOT NULL,
-- o que impede estruturalmente o fluxo explicitamente permitido pelo
-- Bloco 7 "TRIAGEM → EXAME/PROCEDIMENTO → EXECUÇÃO" sem exigir avaliação
-- médica prévia (exceção expressa: só para os casos em que a própria
-- Triagem — Bloco 3/4 — já registrou destination.type = 'exam'/'procedure').
-- Tornar a coluna NULLABLE não afeta nenhuma linha existente (todas já têm
-- consultation_id preenchido) nem o fluxo médico normal, que continua
-- sempre preenchendo a coluna.
-- =====================================================================

alter table app.exam_requests alter column consultation_id drop not null;
alter table app.procedure_requests alter column consultation_id drop not null;

comment on column app.exam_requests.consultation_id is
  'Consulta médica de origem, quando a solicitação nasce durante uma consulta. NULL quando a solicitação vem diretamente do encaminhamento da Triagem (destination.type=''exam'', Bloco 7) sem avaliação médica prévia.';

comment on column app.procedure_requests.consultation_id is
  'Consulta médica de origem, quando a solicitação nasce durante uma consulta. NULL quando a solicitação vem diretamente do encaminhamento da Triagem (destination.type=''procedure'', Bloco 7) sem avaliação médica prévia.';
