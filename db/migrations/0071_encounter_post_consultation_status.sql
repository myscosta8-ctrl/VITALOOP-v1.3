-- Migration 0071: Status "pós-avaliação médica" + sub-status do Pronto Atendimento
-- Migration estritamente aditiva. Não altera 0001 a 0070.
--
-- app.encounter_status não tinha nenhum estado para "avaliação médica já
-- feita, paciente ainda em cuidado ativo na unidade antes de alta/
-- internação" — de 'in_consultation' só dava pra ir direto pra 'completed'.
-- Adiciona 'post_consultation' como novo status intermediário, e uma coluna
-- separada (post_consultation_detail) para sinalizar o que especificamente
-- está acontecendo nesse momento: medicando, aguardando exames
-- laboratoriais, ou aguardando reavaliação médica. Coluna separada (não
-- embutida no status) porque é um detalhe, não uma etapa do ciclo de vida
-- do atendimento — só faz sentido quando status = 'post_consultation'.

alter type app.encounter_status add value if not exists 'post_consultation' after 'in_consultation';

do $$ begin
  create type app.post_consultation_detail as enum (
    'medicando',
    'aguardando_exames_laboratoriais',
    'aguardando_reavaliacao_medica'
  );
exception when duplicate_object then null; end $$;

alter table app.encounters
  add column if not exists post_consultation_detail app.post_consultation_detail;

comment on column app.encounters.post_consultation_detail is
  'Sub-status do Pronto Atendimento quando status = ''post_consultation'': o que está acontecendo com o paciente após a avaliação médica, antes de alta/internação. Null em qualquer outro status.';
