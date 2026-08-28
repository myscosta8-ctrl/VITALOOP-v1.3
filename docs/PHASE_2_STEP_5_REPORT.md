# VITALOOP 1.3 — Relatório Técnico — Fase 2 / Etapa 5 de 6

**Módulos Assistenciais — Gestão de Atendimentos (UPA 24h)**
**Data:** 2026-08-21

---

## 1. Arquivos criados e alterados

### Banco de Dados (Migrations)
- [`db/migrations/0024_encounters.sql`](../db/migrations/0024_encounters.sql): Migration aditiva criada. Define os tipos enum `encounter_type`, `encounter_origin` e `encounter_status`, a tabela `app.encounters`, RLS ativado com políticas para a role `vitaloop_app`, índice condicional único para atendimento ativo único por paciente/instituição (`encounters_single_active_patient_uk`), triggers automáticos para `updated_at`, e concessão de permissões de RBAC `encounter.read` e `encounter.write`.

### Camada de Domínio (`packages/domain/src/encounter/`)
- [`packages/domain/src/encounter/types.ts`](../packages/domain/src/encounter/types.ts): Interfaces do atendimento, DTOs de criação/atualização e enums.
- [`packages/domain/src/encounter/state-machine.ts`](../packages/domain/src/encounter/state-machine.ts): Validação estrita da máquina de estados (ENC-006: `created` → `triage_pending` → `triaged` → `consultation_pending` → `in_consultation` → `completed`, mais `canceled`), trava de estados terminais e obrigatoriedade do motivo de cancelamento (`cancelReason`).
- [`packages/domain/src/encounter/rules.ts`](../packages/domain/src/encounter/rules.ts): Validações e sanitização de entradas (`patientId`, `institutionId`, `chiefComplaint`).
- [`packages/domain/src/encounter/events.ts`](../packages/domain/src/encounter/events.ts): Fábricas de eventos de domínio (`EncounterOpened`, `EncounterStatusChanged`, `EncounterClosed`).
- [`packages/domain/src/encounter/state-machine.test.ts`](../packages/domain/src/encounter/state-machine.test.ts): Suíte de testes unitários para a máquina de estados.
- [`packages/domain/src/encounter/rules.test.ts`](../packages/domain/src/encounter/rules.test.ts): Suíte de testes unitários para as regras de validação.
- [`packages/domain/src/encounter/index.ts`](../packages/domain/src/encounter/index.ts): Barrel export do módulo de atendimento.
- [`packages/domain/src/index.ts`](../packages/domain/src/index.ts): Exportação raiz do monorepo para `@vitaloop/domain`.

### Camada de API (`apps/api/src/routes/encounters.ts`)
- [`apps/api/src/routes/encounters.ts`](../apps/api/src/routes/encounters.ts): Rotas Fastify REST (`POST /api/v1/encounters`, `GET /api/v1/encounters`, `GET /api/v1/encounters/:id`, `PATCH /api/v1/encounters/:id/status`). Conexão com Supabase via `vitaloop_app`, concorrência otimista real (`expectedUpdatedAt`), eventos de domínio persisitidos em `app.domain_events` e auditoria gravada em `app.audit_events` dentro de transações `withSecurityContext`.
- [`apps/api/src/server.ts`](../apps/api/src/server.ts): Registro das rotas de atendimento no servidor Fastify.

### Camada de Frontend (`apps/web/`)
- [`apps/web/src/lib/encounters-api.ts`](../apps/web/src/lib/encounters-api.ts): Wrapper de API tipado via `ApiClient` (`createEncountersApi`).
- [`apps/web/src/pages/EncounterOpenPage.tsx`](../apps/web/src/pages/EncounterOpenPage.tsx): Tela de abertura de atendimento.
- [`apps/web/src/pages/EncounterListPage.tsx`](../apps/web/src/pages/EncounterListPage.tsx): Tela da fila de atendimentos com modal de transição de status.
- [`apps/web/src/pages/EncounterOpenPage.test.tsx`](../apps/web/src/pages/EncounterOpenPage.test.tsx): Testes unitários/UI da abertura.
- [`apps/web/src/pages/EncounterListPage.test.tsx`](../apps/web/src/pages/EncounterListPage.test.tsx): Testes unitários/UI da fila de atendimentos.
- [`apps/web/src/App.tsx`](../apps/web/src/App.tsx): Registro das rotas `#/atendimentos` e `#/atendimentos/novo`.

### Suíte de Integração Real
- [`tests/integration/encounters.api.test.ts`](../tests/integration/encounters.api.test.ts): Suíte de testes de integração cobrindo RLS sem sessão (0 linhas), RBAC 401/403/201, unicidade de atendimento ativo (409), concorrência otimista real (409 `CONCURRENCY_CONFLICT`), cancelamento com motivo obrigatório (400), e propagação de eventos para `app.patient_timeline`.

---

## 2. Funcionalidades Implementadas (Etapa 5/6)

1. **Abertura de Atendimento (ENC-001..005)**: Registro de tipo (`urgency`, `emergency`, `elective`, `return`), origem (`spontaneous`, `samu`, `transfer`, `rescue_other`), queixa principal, unidade/setor e profissional atribuído.
2. **Unicidade de Atendimento Ativo**: Restrição única condicional garantindo que um paciente não possua múltiplos atendimentos ativos na mesma instituição.
3. **Máquina de Estados Assistencial (ENC-006)**: Fluxo estrito de transições, trava contra alterações em estados terminais (`completed`, `canceled`) e exigência de motivo no cancelamento.
4. **Lock Otimista de Concorrência**: Validação por timestamp `expectedUpdatedAt` garantindo que alterações concorrentes sejam rejeitadas com erro HTTP 409 `CONCURRENCY_CONFLICT`.
5. **Eventos de Domínio e Timeline**: Emissão automática de `EncounterOpened`, `EncounterStatusChanged` e `EncounterClosed`, integrados à view de linha do tempo do paciente (`app.patient_timeline`).
6. **Auditoria Integrada**: Registro automático de eventos de auditoria em `app.audit_events` com hash de IP e User-Agent para todas as mutações.

---

## 3. Qualidade, Testes e Segurança

### Suíte de Testes Unitários e UI (Monorepo offline)
- `npx vitest run`: **146 passed / 37 skipped** (0 failures).

### Qualidade de Código e Tipagem
- `npm run lint` (`eslint .`): **0 erros, 0 avisos**.
- `npm run typecheck` (`tsc --build --force` + web): **0 erros de compilação**.
- `npm run build --workspaces`: **Construção limpa de todos os pacotes**.

### Segurança RLS/RBAC
- Tabela `app.encounters` protegida por Row Level Security (RLS) para o role `vitaloop_app`.
- Permissões estritas `encounter.read` e `encounter.write` verificadas em todas as rotas de API.
- Nenhuma VIEW nova criada (evitando riscos de bypass de RLS).

---

## 4. Declaração do Gate (Fase 2 / Etapa 5 de 6)

Com 100% dos requisitos cumpridos, sem alterações nas migrations 0001–0023, sem commits/pushes prematuros, e com a suíte de testes, lint, typecheck e build aprovados:

**GATE PASS CONFIRMADO PARA A ETAPA 5 DE 6.**
