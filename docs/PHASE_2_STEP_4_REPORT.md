# VITALOOP 1.3 — Relatório Técnico — Fase 2 / Etapa 4 de 6

**Integração Clínica e Consolidação do Paciente**
**Data:** 2026-08-20

---

## 1. Arquivos criados/alterados

**Banco:**
- Novo: [`db/migrations/0022_grant_patient_timeline.sql`](../db/migrations/0022_grant_patient_timeline.sql) — grant de `SELECT` em `app.timeline`/`app.patient_timeline` para `vitaloop_app` (ver §3 e §8 — divergência encontrada e corrigida).

**API:**
- Alterado: [`apps/api/src/routes/patients.ts`](../apps/api/src/routes/patients.ts) — novo endpoint `GET /api/v1/patients/:id/timeline`; novo endpoint `PATCH /api/v1/patients/:id/inactivate`; auditoria + evento de domínio conectados a `POST /duplicates/detect` e `PATCH /duplicates/:candidateId/review` (antes gravavam no banco mas não auditavam nem emitiam evento).

**Domínio:** nenhum arquivo alterado — os dois "gaps" fechados nesta etapa (`createPatientDuplicateDetectedEvent`, `createPatientInactivatedEvent`) já existiam em `packages/domain/src/patient/events.ts` desde a Etapa 1/6 e nunca haviam sido conectados à API.

**Frontend:**
- Alterado: [`apps/web/src/lib/patients-api.ts`](../apps/web/src/lib/patients-api.ts) — `getTimeline()`, `inactivate()`.
- Alterado: [`apps/web/src/pages/PatientDetailPage.tsx`](../apps/web/src/pages/PatientDetailPage.tsx) — seção "Histórico" (timeline) e ação "Inativar cadastro".
- Alterado: `apps/web/src/pages/PatientDetailPage.test.tsx` — +2 testes.

**Testes de integração real:**
- Alterado: [`tests/integration/patients.api.test.ts`](../tests/integration/patients.api.test.ts) — +3 testes reais (timeline, inativação, auditoria de duplicidade).

**Nenhum Documento oficial (1–4) foi alterado.**

## 2. Funcionalidades implementadas

O objetivo desta etapa era **consolidação**, não funcionalidade nova. Investigação do estado real do projeto (domínio, API, banco) antes de qualquer código revelou 3 gaps de integração — peças já construídas em etapas anteriores mas nunca conectadas entre si:

1. **Timeline do paciente (PAT-014)** — a view `app.patient_timeline` existia desde a migration 0017 (Etapa 2/6), e a API já gravava eventos de domínio reais desde então (`PatientRegistered`, `PatientContactAdded` etc.), mas **nenhuma rota expunha a leitura da timeline**, e a própria view **nunca recebeu `GRANT`** para `vitaloop_app` — mesmo se uma rota existisse, a query falharia com `permission denied`. Fechado: migration 0022 (grant) + `GET /api/v1/patients/:id/timeline` + seção no frontend.
2. **Auditoria de duplicidade** — `POST /duplicates/detect` e `PATCH /duplicates/:candidateId/review` já persistiam corretamente no banco desde a Etapa 2/6, mas não gravavam `app.audit_events` nem emitiam o evento de domínio `PatientDuplicateDetected` (que já existia em `@vitaloop/domain` desde a Etapa 1/6, nunca importado). Fechado: ambas as rotas agora auditam; a detecção emite um evento por candidato encontrado.
3. **Inativação de paciente** — `createPatientInactivatedEvent` existia no domínio desde a Etapa 1/6 e a coluna `status` (enum `entity_status`, herdado da Fase 0) já suportava `inactive`, mas nenhuma rota expunha a operação, apesar de ter sido listada como requisito desde o comando original da Etapa 2/6 ("criar, ler, buscar, atualizar, **inativar**"). Fechado: `PATCH /api/v1/patients/:id/inactivate` (exige motivo, rejeita segunda tentativa com `409 PATIENT_ALREADY_INACTIVE`) + ação no frontend.

Nenhuma permissão nova foi criada — as três funcionalidades reaproveitam `patient.read`/`patient.write`/`patient.duplicate.review`, já existentes.

## 3. Migrations criadas/alteradas

**Uma migration nova, puramente aditiva:** [`0022_grant_patient_timeline.sql`](../db/migrations/0022_grant_patient_timeline.sql) — apenas dois `GRANT SELECT`, sem alteração de policy, schema ou dado. Necessidade técnica comprovada: sem o grant, a funcionalidade de timeline (PAT-014, explicitamente listada como objetivo desta etapa) é estruturalmente impossível — `vitaloop_app` não tem privilégio nem para tentar a consulta. Nenhuma migration existente (`0001`–`0021`) foi editada.

## 4. Testes executados e resultados

### Reais (Supabase oficial, `vitaloop_app`, sem bypass de RLS)

`tests/integration/patients.api.test.ts`: **25/25 PASS** (22 pré-existentes da Etapa 2/6, revalidados sem regressão, + 3 novos desta etapa):

| # | Cenário | Resultado |
|---|---|---|
| 23 | Timeline reflete evento real (`PatientRegistered`); leitura autorizada (200) e negada sem `patient.read` (403) | PASS |
| 24 | Inativação autorizada (200, `status='inactive'`); negada sem `patient.write` (403); segunda tentativa rejeitada (`409 PATIENT_ALREADY_INACTIVE`) | PASS |
| 25 | Detecção e revisão de duplicidade retornam sucesso; auditoria confirmada administrativamente (ver §5) | PASS |

Duas execuções completas da suíte tiveram 1 teste isolado com timeout de rede (`16` na primeira rodada, `17` na segunda — nenhum dos dois alterado nesta etapa) — consistente com a variância de latência de rede deste ambiente já documentada nas Etapas 2/3 (não uma regressão). Uma terceira execução completa, limpa, resultou em **25/25 PASS** sem nenhum timeout.

### Unitários/domínio/frontend (mockados, sem rede)
`npx vitest run` (monorepo completo, sem `DATABASE_URL`): **134 passed / 29 skipped** (skips = testes que exigem banco real). Nenhuma regressão.

### Lint / typecheck / build
`eslint .`, `tsc --build` (monorepo), `tsc --noEmit -p apps/web`, `npm run build --workspaces`: **todos limpos**, incluindo o novo endpoint e a nova UI.

## 5. RLS / RBAC / Need-to-Know

- **Timeline:** `GET /timeline` exige `patient.read` (RBAC, camada HTTP) — testado real: negado sem permissão (403), permitido com permissão (200, dados reais). A RLS de `app.domain_events`/`app.timeline`/`app.patient_timeline` permanece no baseline "autenticado" (`app.is_authenticated()`), **não estreitada por paciente** — limitação já registrada desde a homologação da Fase 1 (`PHASE_1_BASELINE.md`), **não alterada nem mascarada nesta etapa**, apenas herdada tal como está pelas views passthrough.
- **Inativação:** reaproveita a policy `patients_update` (RBAC via `patient.write` + `patient.read` para o `RETURNING`, mesmo padrão já testado desde a Etapa 2/6) — nenhuma policy nova.
- **Duplicidade (auditoria):** nenhuma mudança de RLS/RBAC — a auditoria é gravada dentro da mesma transação já autorizada por `patient.duplicate.review`.
- **Nenhum teste usou `postgres`, service role, ou qualquer mecanismo de bypass para validar autorização da aplicação.** Todos os testes de RLS/RBAC desta etapa usaram `vitaloop_app` via conexão de rede real, idêntico ao padrão estabelecido na Etapa 2/6.

## 6. Auditoria

`app.audit_events` confirmado administrativamente (Supabase MCP, papel `postgres` — apenas para leitura de verificação, nunca para validar autorização da aplicação) para os dois eventos antes não auditados:

```
action=create  resource_type=patient_duplicate_candidate  resource_id=<patientId>
action=update  resource_type=patient_duplicate_candidate  resource_id=<candidateId>
```

Evento de domínio `PatientDuplicateDetected` confirmado real, com `matchStrength` correto (`strong`/`conflict` observados nos dois pares de teste).

## 7. Pendências

- RLS de `domain_events`/`timeline` continua no baseline "autenticado" — estreitar por Need-to-Know real por paciente é uma decisão institucional pendente desde a Fase 1, não resolvida aqui (fora do escopo desta etapa — mudar policy de RLS não estava autorizado).
- Nenhuma UI de solicitação/aprovação de merge (PAT-016) — permanece fora do escopo, como já registrado na Etapa 3/6.
- Nenhuma UI de revisão administrativa de candidatos de duplicidade (listagem/aprovação em tela própria) — a API existe e foi auditada nesta etapa, mas a tela não foi construída (não estava entre os objetivos explícitos da Etapa 4).
- Validação de dígito verificador de CPF/CNS (hoje só formato) — pendência técnica já registrada desde a Etapa 1/6, não resolvida.

## 8. Divergências encontradas

Todas as três descritas no §2 são divergências entre "o que o domínio/banco já modelava" e "o que a API realmente expunha" — nenhuma delas envolveu Documentos 1–4 nem exigiu inventar regra institucional. Registradas, corrigidas com evidência real, sem mascarar: a migration 0022 e as duas conexões de evento/auditoria são exatamente os fechamentos dessas divergências, nada além delas.

## 9. Riscos

- A migration 0022 concede `SELECT` em duas views cuja RLS subjacente é mais permissiva do que o ideal (baseline "autenticado", não Need-to-Know) — risco já existente desde a Fase 0/1, agora **alcançável via HTTP** pela primeira vez (antes, nenhuma rota conseguia sequer consultar). Mitigado na camada RBAC (`patient.read` obrigatório), mas não pelo Need-to-Know real — mesmo risco já sinalizado no relatório de homologação da Fase 1, reafirmado aqui, não introduzido.
- Nenhum outro risco novo identificado.

## 10. Status individual PAT-001–017

| ID | Status após Etapa 4 |
|---|---|
| PAT-001..006 | Sem mudança em relação à Etapa 3 (Frontend TESTADO) |
| PAT-007..013 | Sem mudança em relação à Etapa 3 (Frontend TESTADO) |
| **PAT-014** | **Timeline: API + Frontend TESTADO** (antes: schema pronto, sem exposição alguma) |
| PAT-015 | Sem mudança na cobertura funcional; **auditoria agora completa** (antes: detecção/revisão sem trilha) |
| PAT-016 | Sem mudança (fora do escopo desta etapa) |
| **PAT-017** | **Cobertura ampliada**: agora inclui duplicidade (antes só cadastro/contatos/alergias/antecedentes/medicamentos/problemas) |
| Inativação (parte de PAT-001) | **API + Frontend TESTADO** (gap da Etapa 2/6 fechado) |

## 11. Confirmação — Etapa 5/6 NÃO iniciada

Nenhum módulo clínico (atendimento, triagem, prescrição, leitos, exames) foi tocado. Nenhuma regra institucional foi inventada. Nenhuma funcionalidade além das 3 descritas no §2 foi implementada.

## 12. git status final

```
On branch main
No commits yet
(todos os arquivos como untracked — nenhum commit, nenhum push, conforme instrução)
```

---

## Critério de saída (revisão original — ver §13 para o estado final)

Esta seção documentava, na entrega original desta etapa, um veredito de "CONCLUÍDA".
Uma auditoria cruzada de fechamento (rodada seguinte, somente leitura) encontrou um
achado crítico não coberto pelos testes originais — ver §13 abaixo para a correção
completa (CAUSA → CORREÇÃO → EVIDÊNCIA → TESTES → IMPACTO → RISCOS → GATE). O restante
deste relatório (§1–§12) permanece como registro histórico do que foi entregue na
primeira rodada, sem edição retroativa.

---

## 13. Correção do GATE BLOCKED — bypass de RLS via views de timeline

**Data:** 2026-08-20 (rodada de correção, posterior à entrega original desta etapa)

### CAUSA

Auditoria cruzada de fechamento (somente leitura, sem código alterado) encontrou e
confirmou empiricamente que `app.timeline` e `app.patient_timeline` — views criadas
nas migrations 0008/0017, **não tocadas por esta etapa originalmente** — são de
propriedade de `postgres` (`rolbypassrls=true`) e nunca tiveram `security_invoker`
habilitado. Por semântica padrão do PostgreSQL, uma view sem `security_invoker=true`
executa a consulta à tabela subjacente com o privilégio do **dono da view**, não de
quem a consultou. Resultado: a policy `domain_events_read`
(`using (app.is_authenticated())`, migration 0010) **nunca era avaliada** para leituras
feitas através dessas views — bypass total de RLS, não apenas "sem escopo por
paciente" como o §5 original havia registrado (subestimação corrigida aqui).

Confirmado por teste real antes de qualquer alteração: um `SELECT` direto em
`app.domain_events` sem nenhum contexto de sessão retornava 0 linhas (RLS correta); o
mesmo `SELECT` via `app.timeline`/`app.patient_timeline` retornava a linha. A migration
0022 (desta mesma etapa) foi o que tornou esse caminho alcançável via HTTP pela
primeira vez, ao conceder `SELECT` nas views a `vitaloop_app` — antes dela a rota
falharia por falta de privilégio.

### CORREÇÃO

Antes de qualquer alteração, foram verificadas: (a) dependências de outras
views/objetos sobre `timeline`/`patient_timeline` — nenhuma encontrada via
`pg_depend`; (b) grants atuais de `vitaloop_app` em `app.domain_events` — já possui
`SELECT`+`INSERT` diretos desde a migration 0010 (grant genérico da Fase 0), portanto
nenhum grant novo seria necessário para `security_invoker=true` funcionar.

Migration aditiva e dedicada
[`0023_fix_timeline_view_rls_bypass.sql`](../db/migrations/0023_fix_timeline_view_rls_bypass.sql):

```sql
alter view app.timeline set (security_invoker = true);
alter view app.patient_timeline set (security_invoker = true);
```

Nenhuma migration anterior (`0001`–`0022`) foi editada. Nenhuma policy de RLS foi
alterada — a correção faz as views **respeitarem** a policy já existente, não cria uma
nova. Não foi implementado Need-to-Know por paciente na RLS de `domain_events` — essa
continua sendo uma decisão institucional pendente desde a Fase 0/1, fora do escopo
desta correção (que resolve exclusivamente o bypass total, não a granularidade).

### EVIDÊNCIA (testes reais, `vitaloop_app`, sem bypass)

| Item do comando de correção | Teste | Resultado |
|---|---|---|
| 4. Bloqueio sem sessão | `SELECT` via ambas as views, conexão nova sem nenhum `set_config`; `is_authenticated()` confirmado `false` | **0 linhas em ambas — PASS** (antes da correção: 1 linha) |
| 6. Comportamento correto com sessão autenticada | Mesmo evento, com `vitaloop.user_id` setado | **1 linha — PASS** (`domain_events_read` agora realmente avaliada) |
| 7. Controle de acesso ao paciente (isolamento) | Dois eventos de pacientes distintos; `patient_timeline` filtrado por `patient_id` de um não contém o do outro | **PASS** — nenhum vazamento cross-paciente |
| 5 + 8. Bloqueio sem `patient.read` / rota HTTP da timeline | Teste de integração real `23. timeline (PAT-014)` — 403 sem permissão, 200 com permissão e dado real | **PASS** (reexecutado após a correção, sem alteração de comportamento esperado) |
| 9. Teste automatizado de regressão contra este bypass específico | Novo teste `26. regressão de segurança` em `tests/integration/patients.api.test.ts` — grava evento autenticado, lê em conexão nova sem sessão, exige 0 linhas nas duas views | **PASS**, passa a rodar em toda execução futura da suíte |

Consultas de verificação e sondas de teste foram feitas em transações com `rollback`
ou explicitamente removidas ao final (ver §11 abaixo) — nenhum dado de sonda
permaneceu no banco.

### TESTES

- `tests/integration/patients.api.test.ts`: **26/26 PASS** (25 pré-existentes,
  revalidados sem regressão, + o novo teste 26).
- `npx vitest run` (monorepo completo): **134 passed / 30 skipped**, sem regressão.
- `eslint .`, `tsc --build`, `tsc --noEmit -p apps/web`, `npm run build --workspaces`:
  **todos limpos**.
- Security Advisors (Supabase): **0 alertas**, antes e depois da correção.
- Resíduo no banco após limpeza final: **0** em todas as tabelas de paciente e nos
  eventos de sonda (`AuditProbeEvent*`, `ProbeIsolation*`, `RegressionProbe*`).

### IMPACTO

- **PAT-014** volta a ser classificado **TESTADO** (banco + API + frontend), agora com
  a ressalva correta: RLS real, bypass eliminado, granularidade ainda no baseline
  "autenticado" (não é regressão desta correção, é limitação pré-existente e já
  documentada desde a Fase 1).
- Nenhuma outra funcionalidade da Etapa 4 foi alterada (inativação, auditoria de
  duplicidade permanecem exatamente como entregues e testadas originalmente).
- Nenhuma migration anterior foi tocada; a cadeia `0001`–`0023` permanece
  estritamente aditiva.

### RISCOS

- Risco residual, já conhecido e não coberto por esta correção: RLS de
  `domain_events`/`timeline`/`patient_timeline` continua no baseline "qualquer
  autenticado vê", sem Need-to-Know por paciente — decisão institucional pendente
  desde a Fase 0/1. A correção desta rodada elimina o bypass total (não autenticado
  não vê nada), mas não implementa segmentação por paciente na camada de banco — essa
  proteção específica continua sendo, hoje, responsabilidade exclusiva do RBAC na
  camada HTTP (`patient.read`), como já era antes da migration 0022 introduzir a
  timeline.
- Nenhum risco novo identificado.

### GATE

**GATE PASS.**

O bypass total de RLS via `app.timeline`/`app.patient_timeline` foi eliminado e
comprovado por teste real de banco (não mockado): bloqueio sem sessão confirmado (0
linhas), comportamento correto com sessão autenticada confirmado (1 linha), isolamento
entre pacientes confirmado, rota HTTP revalidada sem regressão, e um teste automatizado
específico contra este bypass foi adicionado à suíte permanente. Suíte completa,
lint, typecheck, build e Security Advisors — todos limpos. Nenhum resíduo no banco.
Nenhuma migration anterior alterada. Etapa 5/6 não iniciada.

**Aguardando autorização explícita para a Etapa 5/6.**
