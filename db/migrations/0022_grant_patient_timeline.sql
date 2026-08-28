-- =====================================================================
-- VITALOOP 1.3 — Migration 0022 (Fase 2, Etapa 4/6)
-- Achado de integração: a view `app.patient_timeline` (PAT-014) foi criada
-- na migration 0017 especificamente para expor a timeline do paciente, na
-- MESMA migration que concedeu SELECT/INSERT/UPDATE a `vitaloop_app` em 8
-- tabelas irmãs (`patient_contacts`, `patient_allergies` etc.) — mas o
-- GRANT da própria view (e de `app.timeline`, da qual ela deriva) foi
-- omitido. Resultado: nenhuma rota da API jamais conseguiria ler a
-- timeline (a conexão real, `vitaloop_app`, não tem privilégio nem para
-- tentar). Gap de integração fechado nesta migration — mesmo padrão de
-- acesso (RBAC-only via `patient.read`, gate na API) já usado pelas 8
-- tabelas irmãs, não uma política nova.
--
-- NÃO resolve, e não tenta resolver, a limitação já registrada desde a
-- Fase 0/1 (`docs/PHASE_1_BASELINE.md` / relatório de homologação): a RLS
-- de `app.domain_events` (migration 0010) continua no baseline
-- "autenticado" (`app.is_authenticated()`), não estreitada por
-- Need-to-Know por paciente — essas views são um passthrough direto de
-- `domain_events` e herdam exatamente essa mesma limitação, já
-- documentada como PENDENTE DE DECISÃO INSTITUCIONAL, não uma regressão
-- introduzida aqui.
--
-- Aditiva; não edita 0001-0021.
-- =====================================================================

grant select on app.timeline to vitaloop_app;
grant select on app.patient_timeline to vitaloop_app;
