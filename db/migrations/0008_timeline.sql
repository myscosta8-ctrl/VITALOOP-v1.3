-- =====================================================================
-- VITALOOP 1.3 — Migration 0008
-- Timeline como VIEW derivada de eventos (Doc 1 §54; Doc 2 §38; Doc 4 §20)
-- Sem segunda fonte de verdade: a timeline LÊ de app.domain_events.
-- =====================================================================

create view app.timeline as
select
  e.id             as event_id,
  e.event_type     as type,
  e.aggregate_type,
  e.aggregate_id,
  e.actor_user_id,
  e.patient_id,
  e.encounter_id,
  e.occurred_at,
  e.recorded_at,
  e.correlation_id,
  e.payload
from app.domain_events e;

comment on view app.timeline is 'Timeline cronológica derivada de domain_events (não destrutiva, incremental).';
