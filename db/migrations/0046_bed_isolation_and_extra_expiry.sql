-- Migration 0046: Isolamento e expiração automática de leito extra (BED-014/BED-015)
-- Migration estritamente aditiva. Não altera 0001 a 0045.

alter table app.beds add column if not exists is_isolation boolean not null default false;
alter table app.beds add column if not exists expires_at timestamptz;

comment on column app.beds.is_isolation is
  'Leito de isolamento (precaução de contato/respiratória) — informativo, não altera fluxo de alocação.';
comment on column app.beds.expires_at is
  'Prazo de exclusão automática para leito extra aberto por lotação máxima/excedida e nunca alocado. '
  'Definido na criação (ex.: agora + 30 min), limpo quando o leito é alocado a um paciente. '
  'Null para leitos permanentes ou já alocados — nunca expiram sozinhos.';

-- A migration 0033 nunca criou política de DELETE para app.beds (só
-- select/insert/update) — sem isso, o RLS bloqueia silenciosamente
-- qualquer DELETE, inclusive a limpeza automática de leito extra vencido
-- feita em GET /api/v1/beds/map. Mesma permissão que já governa criar
-- leito extra (bed.write).
drop policy if exists beds_delete on app.beds;
create policy beds_delete on app.beds for delete to vitaloop_app using (app.has_permission('bed.write'));
