-- Migration 0070: Função app.encounter_current_sector — área atual do atendimento
-- Migration estritamente aditiva. Não altera 0001 a 0069.
--
-- "Pronto Atendimento" não é uma linha em app.bed_sectors (não tem leito
-- físico) — é um estado DERIVADO: um atendimento está no Pronto Atendimento
-- enquanto não tem alocação de leito ativa (fila de triagem, triagem,
-- aguardando/avaliação médica, pós-avaliação com qualquer sub-status). No
-- momento em que ganha uma alocação de leito ativa (app.bed_allocations,
-- status='active'), passa a estar no setor de internação daquele leito.
--
-- Esta função centraliza essa derivação (hoje seria preciso juntar
-- encounters + bed_allocations + beds + bed_sectors toda vez). Retorna o id
-- do setor de leito atual, ou NULL quando o atendimento está no Pronto
-- Atendimento (sem leito). Usada pelos dashboards e, na etapa seguinte, pela
-- regra de acesso por setor dos técnicos de enfermagem.

create or replace function app.encounter_current_sector(p_encounter_id uuid)
returns uuid
language sql stable security definer set search_path = '' as $$
  select b.sector_id
  from app.bed_allocations ba
  join app.beds b on b.id = ba.bed_id
  where ba.encounter_id = p_encounter_id
    and ba.status = 'active';
$$;

comment on function app.encounter_current_sector(uuid) is
  'Setor de leito atual do atendimento (app.bed_sectors.id), ou NULL quando o atendimento está no Pronto Atendimento (sem alocação de leito ativa ainda) — ver comentário da migration 0070.';

grant execute on function app.encounter_current_sector(uuid) to vitaloop_app;
