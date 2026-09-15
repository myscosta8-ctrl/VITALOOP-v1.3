-- =====================================================================
-- VITALOOP 1.3 — Migration 0091
-- Triagem — Bloco 2: histórico completo, imutável e rastreável de
-- classificações/reclassificações de risco.
-- Estritamente ADITIVA — não altera app.triages, não remove
-- reclassification_reason/reclassified_from (mantidos por compatibilidade).
-- =====================================================================

-- 1. Tipo do evento — distingue classificação inicial de reclassificação
--    (regra 13 do bloco), sem inventar um conceito paralelo: é só o rótulo
--    de origem do mesmo evento de classificação.
create type app.triage_classification_type as enum ('initial', 'reclassification');

-- 2. Tabela de histórico — um registro por classificação/reclassificação já
--    realizada. Nunca atualizado nem apagado após inserido (regra 5/27:
--    trilha de auditoria clínica imutável) — reforçado abaixo por RLS sem
--    policy de update/delete e sem GRANT de update/delete pra vitaloop_app.
create table app.triage_classification_history (
  id                  uuid primary key default gen_random_uuid(),
  triage_id           uuid not null references app.triages(id) on delete cascade,
  risk_color          app.triage_risk_color not null,
  priority            app.triage_priority not null,
  target_time_minutes integer not null,
  classification_type app.triage_classification_type not null,
  reason              text,
  professional_id     uuid not null references app.users(id),
  classified_at       timestamptz not null default now(),
  created_at          timestamptz not null default now(),

  -- Reclassificação sempre exige motivo (regra 12/20) — classificação
  -- inicial não (regra 6/20: "classificação inicial sem necessidade de
  -- motivo de reclassificação"). Mesma regra já aplicada em
  -- validateTriageReclassifyInput, reforçada aqui no banco.
  constraint triage_classification_history_reason_ck
    check (classification_type = 'initial' or (reason is not null and length(trim(reason)) > 0))
);

create index triage_classification_history_triage_idx
  on app.triage_classification_history(triage_id, classified_at desc);

comment on table app.triage_classification_history is 'Histórico imutável de classificações/reclassificações de risco (Manchester) de uma triagem — cada linha é um evento, nunca atualizado ou removido após inserido.';

-- 3. RLS — mesmo padrão de app.triages: leitura segue triage.read, escrita
--    (só INSERT — nunca UPDATE/DELETE) segue triage.write.
alter table app.triage_classification_history enable row level security;

create policy triage_classification_history_read on app.triage_classification_history
  for select to vitaloop_app
  using (app.has_permission('triage.read'));

create policy triage_classification_history_insert on app.triage_classification_history
  for insert to vitaloop_app
  with check (app.has_permission('triage.write'));

-- Sem GRANT de update/delete — nem com uma policy futura displicente seria
-- possível alterar/apagar um evento já gravado (regra 27/28).
grant select, insert on app.triage_classification_history to vitaloop_app;
