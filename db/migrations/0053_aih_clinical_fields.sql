-- Migration 0053: Campos clínicos/administrativos do Laudo de AIH que faltavam
-- Migration estritamente aditiva. Não altera 0001 a 0052.
--
-- app.aih_requests (migration 0038) só tinha procedimento/CID/justificativa
-- — faltavam história da doença atual, estado geral na admissão, clínica/
-- especialidade, caráter da internação, médico solicitante/CRM e data da
-- solicitação (ver docs/REFERENCIA_CAMPOS_IMPRESSOS_HOSPITALARES.md, item
-- 1). Mesmo padrão de app.blood_product_requests/app.antimicrobial_requests:
-- JSONB pros campos descritivos, schema completo em @vitaloop/domain
-- (packages/domain/src/sus/aih-clinical-schema.ts), não no banco.

alter table app.aih_requests
  add column if not exists form_fields jsonb not null default '{}'::jsonb;

comment on column app.aih_requests.form_fields is
  'Campos clínicos/administrativos do laudo de AIH que não têm coluna própria (história da doença atual, estado geral, clínica/especialidade, caráter da internação, médico solicitante/CRM, data da solicitação, número de autorização quando já emitido). Schema em @vitaloop/domain (sus/aih-clinical-schema.ts), validado na API antes de gravar.';
