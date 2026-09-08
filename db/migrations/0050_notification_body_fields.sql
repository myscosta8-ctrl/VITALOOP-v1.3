-- Migration 0050: Campos clínicos/epidemiológicos da notificação compulsória (campos 17+ do SINAN)
-- Migration estritamente aditiva. Não altera 0001 a 0049.
--
-- Mesmo padrão já usado nas escalas de enfermagem (migration 0034,
-- app.nursing_care_scales.score_details): um JSONB pra guardar os campos
-- específicos de cada ficha, já que cada agravo do SINAN tem seu próprio
-- conjunto de campos clínicos, sem forma fixa em comum entre eles — o
-- schema de cada ficha vive no código (@vitaloop/domain, módulo
-- `notification`), não no banco. A validação de forma/opções acontece na
-- API antes de gravar; o banco só guarda o resultado já validado.

alter table app.compulsory_notifications
  add column if not exists body_fields jsonb not null default '{}'::jsonb;

comment on column app.compulsory_notifications.body_fields is
  'Campos clínicos/epidemiológicos específicos da ficha (campos 17+ do SINAN), chave = código do campo, valor = código/texto preenchido. Schema de cada doença definido em @vitaloop/domain (módulo notification/schemas), validado na API antes de gravar.';
