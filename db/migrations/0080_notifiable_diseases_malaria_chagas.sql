-- Migration 0080: Adiciona Malária e Chagas à lista de agravos notificáveis
-- Migration estritamente aditiva. Não altera 0001 a 0079.
--
-- As duas já tinham cabeçalho de PDF SINAN calibrado (`apps/api/src/pdf/sinan-forms.ts`,
-- FORM_TEMPLATES.MALARIA/CHAGAS) mas nunca tinham sido cadastradas como doença
-- notificável — não apareciam no modal de Notificação Compulsória. Schema de
-- campos clínicos do corpo em
-- `packages/domain/src/notification/schemas/{malaria,chagas}.ts`.

insert into app.notifiable_diseases (code, name) values
  ('MALARIA', 'Malária'),
  ('CHAGAS', 'Doença de Chagas')
on conflict (code) do nothing;
