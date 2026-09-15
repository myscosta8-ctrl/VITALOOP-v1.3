-- =====================================================================
-- VITALOOP 1.3 — Migration 0093
-- Triagem — Bloco 3: Encaminhamento após Triagem (regra operacional da UPA).
-- Estritamente ADITIVA. Não altera app.triages/app.triage_classification_history
-- (Bloco 2/2.1/2.2), nem app.bed_sectors/app.beds (gestão de leitos).
-- =====================================================================

-- 1. Consultórios disponíveis da unidade — NÃO existia estrutura equivalente
--    (investigado: app.bed_sectors é leito/ocupação, não ambiente de
--    consulta ambulatorial). Menor estrutura necessária: nome + ativo/inativo,
--    configurável pela unidade (sem UI de administração nesta etapa — CRUD
--    mínimo via API, seed inicial de 3 consultórios como ponto de partida).
create table app.consultation_rooms (
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid not null references app.institutions(id) on delete cascade,
  name            text not null,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (institution_id, name)
);

comment on table app.consultation_rooms is 'Consultórios disponíveis da unidade para encaminhamento pós-triagem (Bloco 3). Não é leito — não tem ocupação/status, só disponibilidade (is_active).';

create trigger consultation_rooms_touch_updated
  before update on app.consultation_rooms
  for each row execute function app.touch_updated_at();

alter table app.consultation_rooms enable row level security;

-- Leitura ampla (qualquer usuário autenticado com permissão de triagem OU de
-- consulta médica precisa listar consultórios pra escolher/atender) —
-- escrita restrita a quem administra a unidade (gestão), reaproveitando a
-- permissão já existente de configuração de leitos (mesma natureza:
-- "configuração de ambientes físicos da unidade").
create policy consultation_rooms_read on app.consultation_rooms
  for select to vitaloop_app
  using (app.has_permission('triage.read') or app.has_permission('medical.read'));

create policy consultation_rooms_write on app.consultation_rooms
  for all to vitaloop_app
  using (app.has_permission('bed.write'))
  with check (app.has_permission('bed.write'));

grant select, insert, update on app.consultation_rooms to vitaloop_app;

insert into app.permissions (code, name, resource, action) values
  ('consultation_rooms.read',  'Ler consultórios disponíveis', 'consultation_rooms', 'read')
on conflict (code) do nothing;

-- Mesmas roles de teste que já têm triage.* recebem a leitura de consultórios.
insert into app.role_permissions (role_id, permission_id)
select r.id, p.id from app.roles r, app.permissions p
where r.code in ('test_patient_full', 'test_patient_readonly') and p.code = 'consultation_rooms.read'
on conflict do nothing;

-- 2. Enums do encaminhamento — só os 4 tipos definidos na regra operacional.
--    "leito comum"/"internação" propositalmente NÃO existem como opção aqui
--    (regra 2/9 do Bloco 3: a Triagem nunca encaminha direto pra leito).
create type app.triage_destination_type as enum ('medical_consultation', 'red_room', 'exam', 'procedure');
create type app.triage_exam_category as enum ('laboratory', 'imaging');
create type app.triage_procedure_kind as enum ('dressing_change', 'urinary_catheter_change', 'other');

-- 3. Colunas de encaminhamento ATUAL em app.triages — dado do atendimento,
--    nunca do paciente (mesmo princípio já usado na avaliação inicial/
--    gestação do Bloco 1). Todas NULLABLE: triagens antigas continuam
--    abrindo sem destino definido ("Destino não definido"), sem backfill
--    artificial (regra 21).
alter table app.triages
  add column destination_type                app.triage_destination_type,
  add column destination_room_id             uuid references app.consultation_rooms(id) on delete set null,
  add column destination_exam_category       app.triage_exam_category,
  add column destination_procedure_kind      app.triage_procedure_kind,
  add column destination_procedure_other     text,
  add column destination_notes               text,
  add column destination_set_by              uuid references app.users(id),
  add column destination_set_at              timestamptz;

comment on column app.triages.destination_type is 'Encaminhamento operacional pós-triagem (Bloco 3) — NUNCA uma decisão clínica de leito/internação/observação, que pertence à avaliação médica posterior.';

-- 4. Histórico imutável de encaminhamentos — mesmo padrão arquitetural já
--    validado em app.triage_classification_history (Bloco 2): um registro
--    por evento, nunca UPDATE/DELETE, motivo obrigatório quando há um
--    encaminhamento anterior sendo alterado.
create table app.triage_destination_history (
  id                      uuid primary key default gen_random_uuid(),
  triage_id               uuid not null references app.triages(id) on delete cascade,
  destination_type        app.triage_destination_type not null,
  room_id                 uuid references app.consultation_rooms(id) on delete set null,
  exam_category           app.triage_exam_category,
  procedure_kind          app.triage_procedure_kind,
  procedure_other         text,
  notes                   text,
  reason                  text,
  professional_id         uuid not null references app.users(id),
  set_at                  timestamptz not null default now(),
  created_at              timestamptz not null default now()
);

create index triage_destination_history_triage_idx
  on app.triage_destination_history(triage_id, set_at desc);

comment on table app.triage_destination_history is 'Histórico imutável de encaminhamentos pós-triagem (Bloco 3) — cada linha é um evento (definição inicial ou alteração), nunca atualizado/removido.';

alter table app.triage_destination_history enable row level security;

create policy triage_destination_history_read on app.triage_destination_history
  for select to vitaloop_app
  using (app.has_permission('triage.read'));

create policy triage_destination_history_insert on app.triage_destination_history
  for insert to vitaloop_app
  with check (app.has_permission('triage.write'));

-- Sem policy/GRANT de update/delete — mesma garantia estrutural do Bloco 2.
grant select, insert on app.triage_destination_history to vitaloop_app;

-- 5. Seed inicial de consultórios — só para a Triagem não abrir com a lista
--    vazia; a unidade pode renomear/desativar depois pela API de escrita já
--    criada acima. Vinculado à instituição já existente no ambiente.
insert into app.consultation_rooms (institution_id, name)
select id, room_name
from app.institutions, (values ('Consultório 1'), ('Consultório 2'), ('Consultório 3')) as r(room_name)
where not exists (select 1 from app.consultation_rooms cr where cr.institution_id = app.institutions.id)
on conflict (institution_id, name) do nothing;
