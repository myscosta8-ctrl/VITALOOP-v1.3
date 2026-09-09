-- Migration 0069: Renomeia setores de leito de Observação (Pediátrico -> Observação Pediátrica, Observação -> Observação Adulto)
-- Migration estritamente aditiva. Não altera 0001 a 0068.
--
-- Decisão do usuário (2026-09-09), parte do desenho de "Prontuário de
-- Internação": os 4 setores com leito físico passam a ser Sala Vermelha,
-- Internação Adulto, Observação Pediátrica, Observação Adulto — nomes mais
-- fiéis ao fluxo real de internação. Só renomeia (name/code/description);
-- não mexe em capacidade, nos leitos já existentes (app.beds.bed_number
-- mantém o prefixo histórico, ex. 'PEDIATRICO-01') nem em alocações ativas.

update app.bed_sectors
  set name = 'Observação Pediátrica',
      code = 'OBSERVACAO_PEDIATRICA',
      description = 'Observação de pacientes pediátricos com necessidade de monitorização.'
  where code = 'PEDIATRICO';

update app.bed_sectors
  set name = 'Observação Adulto',
      code = 'OBSERVACAO_ADULTO',
      description = 'Observação de pacientes adultos com necessidade de monitorização.'
  where code = 'OBSERVACAO';

update app.bed_sectors
  set description = coalesce(description, 'Sala de estabilização de pacientes críticos/emergenciais.')
  where code = 'SALA_VERMELHA';

update app.bed_sectors
  set description = coalesce(description, 'Internação de pacientes adultos.')
  where code = 'INTERNACAO_ADULTO';
