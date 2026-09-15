-- =====================================================================
-- VITALOOP 1.3 — Migration 0094 (Bloco 5, Triagem — Fluxo pós-triagem e filas)
-- Roteamento operacional do encaminhamento (Bloco 3/4) para a fila
-- assistencial (app.queue_tickets, migration 0026). Estritamente ADITIVA.
--
-- Contexto: cada atendimento já ganha 1 ticket de fila automaticamente na
-- abertura (Recepção, ver queue-enqueue.ts), sempre na fila 'medical' —
-- antes da Triagem existir ainda não há destino. Esta migration acrescenta
-- o necessário para, após a Triagem, esse MESMO ticket (não um novo — a
-- constraint `queue_tickets_single_active_uk` de 0026 já impede 2 tickets
-- ativos por atendimento) ser roteado para a fila certa (medical ou
-- red_room) e, quando aplicável, ficar vinculado ao consultório escolhido.
-- =====================================================================

-- 1. Novo tipo de fila para Sala Vermelha — decisão de FLUXO operacional
-- (Bloco 5, regra 7), nunca derivada da cor Manchester. Não remove nem
-- renomeia os valores existentes ('reception','triage','medical',
-- 'reevaluation') — só adiciona.
alter type app.queue_type add value if not exists 'red_room';

-- 2. Vínculo opcional do ticket com o consultório escolhido no
-- encaminhamento (Bloco 5, regra 6). Nullable — tickets antigos e
-- tickets de filas que não são de consultório (red_room/reception/
-- triage/reevaluation) continuam válidos sem preenchê-la.
alter table app.queue_tickets
  add column if not exists consultation_room_id uuid references app.consultation_rooms(id) on delete set null;

comment on column app.queue_tickets.consultation_room_id is
  'Consultório vinculado ao ticket quando o encaminhamento da Triagem (Bloco 3/4) for "medical_consultation" (Bloco 5). NULL para os demais destinos/filas.';

create index if not exists queue_tickets_consultation_room_idx
  on app.queue_tickets(consultation_room_id)
  where consultation_room_id is not null;

-- Nenhuma alteração de RLS/policies/grants é necessária: a coluna nova
-- pertence a uma tabela já coberta pelas policies de 0026
-- (queue_tickets_read/insert/update, permissões queue.read/queue.write),
-- e queue_type é um enum já coberto pelas mesmas policies de app.queues.
