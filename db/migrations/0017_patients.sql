-- =====================================================================
-- VITALOOP 1.3 — Migration 0017 (Fase 2, Etapa 1/6)
-- Domínio PACIENTE: cadastro, identidade, contatos, alergias, antecedentes,
-- medicamentos de uso contínuo, problemas ativos, detecção de duplicidade,
-- estrutura de merge (sem execução automática).
--
-- Fonte: Doc 1 §11/§12/§73; Doc 2 §64 (patients/patient_contacts/
-- patient_allergies já catalogadas — as demais tabelas clínicas de paciente
-- não estavam explicitamente catalogadas no Doc 2 e foram desenhadas aqui
-- seguindo o MESMO padrão arquitetural já estabelecido: autor, timestamp,
-- vínculo ao paciente, auditoria — Doc 2 §64 permite refinamento do catálogo
-- "durante a revisão do esquema", desde que nenhuma tabela necessária ao
-- Doc 1 fique sem representação).
--
-- NÃO ALTERA migrations 0001-0016. Aditiva.
-- =====================================================================

-- unaccent é necessário para normalização de nomes (detecção de duplicidade).
create extension if not exists unaccent;

-- ---------- Enums ----------
create type app.patient_sex as enum ('female','male','undetermined');
create type app.allergy_severity as enum ('mild','moderate','severe','unknown');
create type app.allergy_status as enum ('active','resolved','entered_in_error');
create type app.problem_status as enum ('active','resolved','inactive');
create type app.duplicate_match_strength as enum ('strong','weak','conflict');
create type app.duplicate_review_status as enum ('open','confirmed_duplicate','confirmed_distinct','dismissed');
create type app.merge_request_status as enum ('requested','approved','rejected','executed');

-- ---------- app.patients (Doc 1 §11; Doc 2 §64) ----------
create table app.patients (
  id                     uuid primary key default gen_random_uuid(),
  medical_record_number  text not null,
  full_name              text not null,
  social_name            text,
  mother_name            text,
  birth_date             date,
  sex                    app.patient_sex,
  cpf                    text,
  cns                    text,
  rg                     text,
  phone                  text,
  address                text,
  city                   text,
  state                  text,
  institution_id         uuid references app.institutions(id) on delete restrict,
  status                 app.entity_status not null default 'active',
  created_by             uuid references app.users(id) on delete set null,
  updated_by             uuid references app.users(id) on delete set null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint patients_birth_date_not_future_ck check (birth_date is null or birth_date <= current_date),
  constraint patients_cpf_format_ck check (cpf is null or cpf ~ '^[0-9]{11}$'),
  constraint patients_cns_format_ck check (cns is null or cns ~ '^[0-9]{15}$')
);

comment on table app.patients is 'Cadastro base do paciente (PAT-001..008). Identidade institucional, não clínica de atendimento.';
comment on column app.patients.cpf is 'Armazenado normalizado (somente dígitos). Ausência é permitida — Doc 1 §11 (nenhuma informação inventada por default).';
comment on column app.patients.cns is 'Armazenado normalizado (somente dígitos, 15 dígitos — Cartão Nacional de Saúde).';
comment on column app.patients.medical_record_number is 'Número de prontuário único institucional (PAT-005). Gerado por app.generate_medical_record_number().';

-- Unicidade institucional do prontuário (Doc 1 §11: "prevenção de duplicidade").
create unique index patients_mrn_institution_uk on app.patients(institution_id, medical_record_number);

-- CPF/CNS únicos quando presentes (não usar UNIQUE simples — permite múltiplos NULL).
create unique index patients_cpf_uk on app.patients(cpf) where cpf is not null and status <> 'inactive';
create unique index patients_cns_uk on app.patients(cns) where cns is not null and status <> 'inactive';

create index patients_full_name_idx on app.patients(lower(full_name));
create index patients_birth_date_idx on app.patients(birth_date);
create index patients_institution_idx on app.patients(institution_id);

create trigger patients_touch_updated before update on app.patients
  for each row execute function app.touch_updated_at();

-- ---------- app.patient_contacts (Doc 1 §11; Doc 2 §64) ----------
create table app.patient_contacts (
  id            uuid primary key default gen_random_uuid(),
  patient_id    uuid not null references app.patients(id) on delete cascade,
  name          text not null,
  relationship  text,
  phone         text not null,
  is_emergency  boolean not null default false,
  created_by    uuid references app.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
comment on table app.patient_contacts is 'Contatos do paciente, incluindo contato de emergência (PAT-007/008).';
create index patient_contacts_patient_idx on app.patient_contacts(patient_id);
create index patient_contacts_emergency_idx on app.patient_contacts(patient_id) where is_emergency;

create trigger patient_contacts_touch_updated before update on app.patient_contacts
  for each row execute function app.touch_updated_at();

-- ---------- app.patient_allergies (Doc 1 §11; Doc 2 §64) ----------
create table app.patient_allergies (
  id            uuid primary key default gen_random_uuid(),
  patient_id    uuid not null references app.patients(id) on delete cascade,
  substance     text not null,
  reaction      text,
  severity      app.allergy_severity not null default 'unknown',
  status        app.allergy_status not null default 'active',
  recorded_by   uuid references app.users(id) on delete set null,
  recorded_at   timestamptz not null default now()
);
comment on table app.patient_allergies is 'Alergias e reações adversas (PAT-009/010). Nunca assumir "nega" sem registro explícito (Doc 1 §11).';
create index patient_allergies_patient_idx on app.patient_allergies(patient_id);

-- Alergias são histórico clínico: correção é aditiva (novo registro / status),
-- não sobrescrita silenciosa. Bloqueia UPDATE de substance/reaction/severity
-- após criado; apenas `status` pode transicionar (ex.: active -> resolved).
create or replace function app.forbid_allergy_content_update() returns trigger
language plpgsql as $$
begin
  if new.substance is distinct from old.substance
     or new.reaction is distinct from old.reaction
     or new.severity is distinct from old.severity
     or new.patient_id is distinct from old.patient_id then
    raise exception 'patient_allergies: conteúdo clínico é imutável após criado (%); registre um novo evento em vez de alterar', tg_op
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;
create trigger patient_allergies_no_content_update
  before update on app.patient_allergies
  for each row execute function app.forbid_allergy_content_update();

-- ---------- app.patient_antecedents (PAT-011) ----------
create table app.patient_antecedents (
  id            uuid primary key default gen_random_uuid(),
  patient_id    uuid not null references app.patients(id) on delete cascade,
  description   text not null,
  category      text,
  status        app.entity_status not null default 'active',
  recorded_by   uuid references app.users(id) on delete set null,
  recorded_at   timestamptz not null default now()
);
comment on table app.patient_antecedents is 'Antecedentes clínicos/pessoais/familiares do paciente (PAT-011). Longitudinal — não é campo de um atendimento específico.';
create index patient_antecedents_patient_idx on app.patient_antecedents(patient_id);

-- ---------- app.patient_continuous_medications (PAT-012) ----------
create table app.patient_continuous_medications (
  id             uuid primary key default gen_random_uuid(),
  patient_id     uuid not null references app.patients(id) on delete cascade,
  medication     text not null,
  dose           text,
  frequency      text,
  status         app.entity_status not null default 'active',
  recorded_by    uuid references app.users(id) on delete set null,
  recorded_at    timestamptz not null default now()
);
comment on table app.patient_continuous_medications is 'Medicamentos de uso contínuo declarados (PAT-012). Não é prescrição — catálogo de medicamentos/prescrição pertence a fases futuras.';
create index patient_continuous_medications_patient_idx on app.patient_continuous_medications(patient_id);

-- ---------- app.patient_active_problems (PAT-013) ----------
create table app.patient_active_problems (
  id            uuid primary key default gen_random_uuid(),
  patient_id    uuid not null references app.patients(id) on delete cascade,
  description   text not null,
  cid_code      text,
  status        app.problem_status not null default 'active',
  recorded_by   uuid references app.users(id) on delete set null,
  recorded_at   timestamptz not null default now(),
  resolved_at   timestamptz
);
comment on table app.patient_active_problems is 'Problemas/condições ativas do paciente (PAT-013).';
create index patient_active_problems_patient_idx on app.patient_active_problems(patient_id);

-- PAT-014 (histórico clínico): NÃO cria tabela própria — é a agregação de
-- app.domain_events por patient_id (já existente desde a Fase 0), evitando
-- uma segunda fonte de verdade (Doc 2 §38/Doc 4 §20). Ver view app.patient_timeline abaixo.

-- ---------- Detecção de duplicidade (PAT-015) ----------
create table app.patient_duplicate_candidates (
  id               uuid primary key default gen_random_uuid(),
  patient_a_id     uuid not null references app.patients(id) on delete cascade,
  patient_b_id     uuid not null references app.patients(id) on delete cascade,
  match_strength   app.duplicate_match_strength not null,
  match_reason     text not null,
  review_status    app.duplicate_review_status not null default 'open',
  detected_at      timestamptz not null default now(),
  reviewed_by      uuid references app.users(id) on delete set null,
  reviewed_at      timestamptz,
  constraint patient_duplicate_distinct_ck check (patient_a_id <> patient_b_id),
  constraint patient_duplicate_pair_uk unique (patient_a_id, patient_b_id)
);
comment on table app.patient_duplicate_candidates is 'Candidatos a duplicidade (PAT-015). "Possível duplicidade" != "mesmo paciente" — exige revisão humana.';
create index patient_duplicate_candidates_a_idx on app.patient_duplicate_candidates(patient_a_id);
create index patient_duplicate_candidates_b_idx on app.patient_duplicate_candidates(patient_b_id);

-- ---------- Estrutura de merge (PAT-016) — SOMENTE workflow, sem execução automática ----------
-- Doc 1/2/3/4 não especificam suficientemente as regras de merge (o que fazer
-- com dados clínicos conflitantes). Por isso: apenas a estrutura de
-- solicitação/aprovação é criada agora. A EXECUÇÃO do merge (reatribuição de
-- dados clínicos) permanece NÃO DEFINIDO — NECESSITA DECISÃO INSTITUCIONAL.
create table app.patient_merge_requests (
  id                 uuid primary key default gen_random_uuid(),
  source_patient_id  uuid not null references app.patients(id) on delete restrict,
  target_patient_id  uuid not null references app.patients(id) on delete restrict,
  reason             text not null,
  status             app.merge_request_status not null default 'requested',
  requested_by       uuid references app.users(id) on delete set null,
  requested_at       timestamptz not null default now(),
  reviewed_by        uuid references app.users(id) on delete set null,
  reviewed_at        timestamptz,
  review_notes       text,
  constraint patient_merge_distinct_ck check (source_patient_id <> target_patient_id)
);
comment on table app.patient_merge_requests is 'Solicitação/aprovação de merge de pacientes (PAT-016). EXECUÇÃO do merge: NÃO DEFINIDO — NECESSITA DECISÃO INSTITUCIONAL. Esta tabela impede perda de dados por registrar a intenção sem apagar a origem.';
create index patient_merge_requests_source_idx on app.patient_merge_requests(source_patient_id);
create index patient_merge_requests_target_idx on app.patient_merge_requests(target_patient_id);

-- ---------- Permissões novas (RBAC — Doc 4 §10: não reaproveitar as técnicas da Fase 1) ----------
insert into app.permissions(code, name, resource, action) values
 ('patient.read',          'Ler paciente',                    'patient', 'read'),
 ('patient.write',         'Cadastrar/editar paciente',       'patient', 'write'),
 ('patient.inactivate',    'Inativar paciente',                'patient', 'inactivate'),
 ('patient.duplicate.review','Revisar duplicidade de paciente','patient', 'duplicate_review'),
 ('patient.merge.request', 'Solicitar merge de paciente',      'patient', 'merge_request'),
 ('patient.merge.approve', 'Aprovar merge de paciente',        'patient', 'merge_approve')
on conflict (code) do nothing;

-- ---------- Auditoria: garantir que 'patient_id' já suportado (Fase 0/audit_events já possui a coluna) ----------
-- (app.audit_events.patient_id já existe desde 0005_audit — nenhuma alteração necessária)

-- ---------- Timeline do paciente (PAT-014) — view, não tabela nova ----------
create view app.patient_timeline as
select * from app.timeline where patient_id is not null;
comment on view app.patient_timeline is 'Histórico clínico do paciente (PAT-014) — subconjunto de app.timeline filtrado por patient_id. Sem segunda fonte de verdade.';

-- ---------- RLS: negar por padrão em todas as tabelas novas ----------
alter table app.patients                       enable row level security;
alter table app.patient_contacts                enable row level security;
alter table app.patient_allergies               enable row level security;
alter table app.patient_antecedents             enable row level security;
alter table app.patient_continuous_medications  enable row level security;
alter table app.patient_active_problems         enable row level security;
alter table app.patient_duplicate_candidates    enable row level security;
alter table app.patient_merge_requests          enable row level security;

-- Baseline desta etapa (Cadastro): RBAC (patient.read/patient.write) é o
-- gate principal — cadastro/busca de paciente precisa ser acessível a quem
-- tem a permissão, sem exigir vínculo prévio (Doc 1 §14: Recepção deve poder
-- localizar/cadastrar qualquer paciente). Need-to-Know por paciente
-- (app.access_assignments scope_type='patient') fica preparado em
-- app.can_access(), mas sua aplicação OBRIGATÓRIA a leituras de paciente
-- depende de fases futuras (atendimento/vínculo assistencial) — registrado
-- como ESCOPO CLÍNICO PENDENTE, consistente com SEC-018 da Fase 1.

create policy patients_read on app.patients for select to vitaloop_app
  using (app.has_permission('patient.read'));
create policy patients_write on app.patients for insert to vitaloop_app
  with check (app.has_permission('patient.write'));
create policy patients_update on app.patients for update to vitaloop_app
  using (app.has_permission('patient.write'))
  with check (app.has_permission('patient.write'));
grant select, insert, update on app.patients to vitaloop_app;

create policy patient_contacts_read on app.patient_contacts for select to vitaloop_app
  using (app.has_permission('patient.read'));
create policy patient_contacts_write on app.patient_contacts for all to vitaloop_app
  using (app.has_permission('patient.write'))
  with check (app.has_permission('patient.write'));
grant select, insert, update, delete on app.patient_contacts to vitaloop_app;

create policy patient_allergies_read on app.patient_allergies for select to vitaloop_app
  using (app.has_permission('patient.read'));
create policy patient_allergies_insert on app.patient_allergies for insert to vitaloop_app
  with check (app.has_permission('patient.write'));
create policy patient_allergies_update_status on app.patient_allergies for update to vitaloop_app
  using (app.has_permission('patient.write'))
  with check (app.has_permission('patient.write'));
grant select, insert, update on app.patient_allergies to vitaloop_app;

create policy patient_antecedents_read on app.patient_antecedents for select to vitaloop_app
  using (app.has_permission('patient.read'));
create policy patient_antecedents_write on app.patient_antecedents for insert to vitaloop_app
  with check (app.has_permission('patient.write'));
grant select, insert on app.patient_antecedents to vitaloop_app;

create policy patient_continuous_medications_read on app.patient_continuous_medications for select to vitaloop_app
  using (app.has_permission('patient.read'));
create policy patient_continuous_medications_write on app.patient_continuous_medications for insert to vitaloop_app
  with check (app.has_permission('patient.write'));
grant select, insert on app.patient_continuous_medications to vitaloop_app;

create policy patient_active_problems_read on app.patient_active_problems for select to vitaloop_app
  using (app.has_permission('patient.read'));
create policy patient_active_problems_write on app.patient_active_problems for all to vitaloop_app
  using (app.has_permission('patient.write'))
  with check (app.has_permission('patient.write'));
grant select, insert, update on app.patient_active_problems to vitaloop_app;

create policy patient_duplicate_candidates_read on app.patient_duplicate_candidates for select to vitaloop_app
  using (app.has_permission('patient.duplicate.review') or app.has_permission('patient.read'));
create policy patient_duplicate_candidates_write on app.patient_duplicate_candidates for all to vitaloop_app
  using (app.has_permission('patient.duplicate.review'))
  with check (app.has_permission('patient.duplicate.review'));
grant select, insert, update on app.patient_duplicate_candidates to vitaloop_app;

create policy patient_merge_requests_read on app.patient_merge_requests for select to vitaloop_app
  using (app.has_permission('patient.merge.request') or app.has_permission('patient.merge.approve'));
create policy patient_merge_requests_insert on app.patient_merge_requests for insert to vitaloop_app
  with check (app.has_permission('patient.merge.request'));
create policy patient_merge_requests_update on app.patient_merge_requests for update to vitaloop_app
  using (app.has_permission('patient.merge.approve'))
  with check (app.has_permission('patient.merge.approve'));
grant select, insert, update on app.patient_merge_requests to vitaloop_app;

-- ---------- Funções de domínio (SECURITY DEFINER, search_path fixo) ----------

-- Gera número de prontuário único institucional (sequencial por instituição).
-- Formato: <ano><sequencial 6 dígitos> — simples e determinístico; formato
-- institucional definitivo (se houver) é decisão pendente (Doc 1 §73).
create sequence if not exists app.medical_record_number_seq;

create or replace function app.generate_medical_record_number(p_institution_id uuid)
returns text language sql security definer set search_path = '' as $$
  select to_char(now(), 'YYYY') || lpad(nextval('app.medical_record_number_seq')::text, 6, '0');
$$;
grant execute on function app.generate_medical_record_number(uuid) to vitaloop_app;

-- Normaliza texto para comparação de duplicidade (minúsculas, sem acentos, trim, espaços colapsados).
create or replace function app.normalize_text(p_text text) returns text
language sql immutable as $$
  select nullif(trim(regexp_replace(lower(public.unaccent(coalesce(p_text, ''))), '\s+', ' ', 'g')), '');
$$;

-- Detecta candidatos a duplicidade para um paciente recém-criado/atualizado
-- e grava em patient_duplicate_candidates (idempotente via UNIQUE do par).
-- Regras determinísticas (não inventa limiar de similaridade fuzzy):
--   forte  : mesmo CPF ou mesmo CNS já existente em outro paciente ATIVO;
--   fraco  : mesmo nome normalizado + mesma data de nascimento;
--   conflito: mesmo CPF/CNS só que com nome normalizado DIFERENTE (indício de erro de digitação/fraude).
create or replace function app.detect_patient_duplicates(p_patient_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_count integer := 0;
  v_patient app.patients%rowtype;
  v_other record;
begin
  select * into v_patient from app.patients where id = p_patient_id;
  if not found then
    return 0;
  end if;

  for v_other in
    select p.id, p.full_name, p.cpf, p.cns, p.birth_date
    from app.patients p
    where p.id <> p_patient_id
      and p.status = 'active'
      and (
        (v_patient.cpf is not null and p.cpf = v_patient.cpf)
        or (v_patient.cns is not null and p.cns = v_patient.cns)
        or (
          v_patient.birth_date is not null and p.birth_date = v_patient.birth_date
          and app.normalize_text(p.full_name) = app.normalize_text(v_patient.full_name)
        )
      )
  loop
    declare
      v_strength app.duplicate_match_strength;
      v_reason text;
      v_a uuid; v_b uuid;
    begin
      if (v_patient.cpf is not null and v_other.cpf = v_patient.cpf and app.normalize_text(v_other.full_name) <> app.normalize_text(v_patient.full_name))
         or (v_patient.cns is not null and v_other.cns = v_patient.cns and app.normalize_text(v_other.full_name) <> app.normalize_text(v_patient.full_name)) then
        v_strength := 'conflict';
        v_reason := 'Mesmo CPF/CNS com nome diferente — possível erro de cadastro ou identidade indevida.';
      elsif (v_patient.cpf is not null and v_other.cpf = v_patient.cpf)
         or (v_patient.cns is not null and v_other.cns = v_patient.cns) then
        v_strength := 'strong';
        v_reason := 'Mesmo CPF ou CNS.';
      else
        v_strength := 'weak';
        v_reason := 'Mesmo nome (normalizado) e data de nascimento.';
      end if;

      if p_patient_id < v_other.id then
        v_a := p_patient_id; v_b := v_other.id;
      else
        v_a := v_other.id; v_b := p_patient_id;
      end if;

      insert into app.patient_duplicate_candidates(patient_a_id, patient_b_id, match_strength, match_reason)
      values (v_a, v_b, v_strength, v_reason)
      on conflict (patient_a_id, patient_b_id) do update
        set match_strength = excluded.match_strength, match_reason = excluded.match_reason
        where app.patient_duplicate_candidates.review_status = 'open';

      v_count := v_count + 1;
    end;
  end loop;

  return v_count;
end;
$$;
grant execute on function app.detect_patient_duplicates(uuid) to vitaloop_app;
