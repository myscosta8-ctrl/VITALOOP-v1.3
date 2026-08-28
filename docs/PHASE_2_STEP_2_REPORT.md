# VITALOOP 1.3 — Relatório Técnico — Fase 2 / Etapa 2 de 6

**API de Pacientes**
**Data:** 2026-08-20
**Escopo desta rodada:** implementação e teste real da camada de API HTTP para
o domínio de pacientes construído na Etapa 1/6. Nenhum frontend foi
implementado. Nenhuma migration nova foi criada. Nenhum Documento oficial
(1–4) foi alterado.

---

## 1. Arquivos criados/alterados

**Novo:**
- [`apps/api/src/routes/patients.ts`](../apps/api/src/routes/patients.ts) — todas as rotas de paciente.
- [`tests/integration/patients.api.test.ts`](../tests/integration/patients.api.test.ts) — 22 testes reais contra o Supabase oficial.

**Alterado:**
- [`apps/api/src/server.ts`](../apps/api/src/server.ts) — registro de `registerPatientRoutes` (2 linhas).

Nenhuma migration criada ou alterada. Nenhum arquivo de `packages/domain/src/patient/` foi modificado — reaproveitado integralmente.

## 2. Endpoints implementados

| Método | Rota | Autorização | Observação |
|---|---|---|---|
| POST | `/api/v1/patients` | `patient.write` + `patient.read` | criação; idempotência via header `Idempotency-Key`; detecção de duplicidade pré-insert |
| GET | `/api/v1/patients` | `patient.read` | busca por `name`/`cpf`/`cns`/`mrn` |
| GET | `/api/v1/patients/:id` | `patient.read` | consulta |
| PATCH | `/api/v1/patients/:id` | `patient.write` + `patient.read` | atualização; campos imutáveis rejeitados |
| POST | `/api/v1/patients/:id/contacts` | `patient.write` + `patient.read` | PAT-007/008 |
| GET | `/api/v1/patients/:id/contacts` | `patient.read` | |
| POST | `/api/v1/patients/:id/allergies` | `patient.write` + `patient.read` | PAT-009/010 |
| GET | `/api/v1/patients/:id/allergies` | `patient.read` | |
| PATCH | `/api/v1/patients/:id/allergies/:allergyId` | `patient.write` + `patient.read` | somente `status`; conteúdo imutável (trigger + domínio) |
| POST | `/api/v1/patients/:id/antecedents` | `patient.write` + `patient.read` | PAT-011 |
| GET | `/api/v1/patients/:id/antecedents` | `patient.read` | |
| POST | `/api/v1/patients/:id/continuous-medications` | `patient.write` + `patient.read` | PAT-012 |
| GET | `/api/v1/patients/:id/continuous-medications` | `patient.read` | |
| POST | `/api/v1/patients/:id/active-problems` | `patient.write` + `patient.read` | PAT-013 |
| GET | `/api/v1/patients/:id/active-problems` | `patient.read` | |
| POST | `/api/v1/patients/:id/duplicates/detect` | `patient.duplicate.review` | persiste candidatos via `app.detect_patient_duplicates()` |
| GET | `/api/v1/patients/:id/duplicates` | `patient.read` | |
| PATCH | `/api/v1/patients/duplicates/:candidateId/review` | `patient.duplicate.review` | `review_status` |
| POST | `/api/v1/patients/:id/merge-requests` | `patient.merge.request` | PAT-016 — apenas solicitação |
| GET | `/api/v1/patients/merge-requests/:id` | `patient.merge.request` OU `patient.merge.approve` | |
| PATCH | `/api/v1/patients/merge-requests/:id/review` | `patient.merge.approve` | aprova/rejeita via máquina de estados do domínio; `executed` permanece inatingível |

## 3. Regras de autorização aplicadas

- **Nenhuma permissão nova foi criada** — reaproveitadas as 6 já definidas na migration 0017 (`patient.read`, `patient.write`, `patient.inactivate` [não usada nesta etapa — sem endpoint de inativação ainda], `patient.duplicate.review`, `patient.merge.request`, `patient.merge.approve`).
- **Conexão real como `vitaloop_app`** (não `postgres`) em toda operação de banco — RLS efetivamente aplicada, não contornada.
- **`INSERT/UPDATE ... RETURNING` exige também a policy de SELECT** (achado da Etapa 1) — resolvido exigindo `patient.write` **e** `patient.read` juntos em toda rota de criação/edição do recurso `patients` e de todas as tabelas satélite com policies de leitura/escrita separadas. Para `patient_duplicate_candidates` e `patient_merge_requests`, a própria policy de SELECT já inclui a permissão de escrita via `OR` — uma única permissão basta, preservado exatamente como a policy já definia (nenhuma regra de RLS foi alterada).
- **`requireAnyPermission`** (helper local, não exportado, apenas composição de chamadas já existentes a `requirePermission`) usado unicamente onde a RLS já usa `OR` entre duas permissões (`GET /merge-requests/:id`), para não bloquear na HTTP algo que o banco permitiria.
- Nenhuma alteração em `requireAuth`/`requirePermission`/`withSecurityContext` (Fase 0/1, já homologados).

## 4. Testes reais executados

Suíte: [`tests/integration/patients.api.test.ts`](../tests/integration/patients.api.test.ts) — conexão real ao Supabase oficial (`vitaloop_app`, RLS efetiva), identidade injetada diretamente no `FastifyRequest` (mesmo padrão de `apps/api/src/routes/auth.test.ts`), papéis/permissões REAIS gravados em `app.role_permissions` e avaliados por `app.authorize()`/policies reais — não simulados.

**Resultado final (execução limpa, isolada, sem processos concorrentes): 22/22 PASS.**

| # | Cenário | Resultado |
|---|---|---|
| 1 | Criação autorizada | PASS — 201 |
| 2 | Criação sem autenticação | PASS — 401 `AUTH_REQUIRED` |
| 3 | Criação sem permissão | PASS — 403 `ACCESS_DENIED` |
| 4 | Consulta autorizada | PASS — 200 |
| 5 | Consulta sem permissão | PASS — 403 |
| 6 | Isolamento por RLS (SELECT direto sem contexto, paciente real existente) | PASS — 0 linhas |
| 7 | Atualização autorizada | PASS — 200 |
| 8 | Atualização de campo imutável (`medicalRecordNumber`) | PASS — 409 `PATIENT_IMMUTABLE_FIELD` |
| 9 | CPF/CNS inválidos | PASS — 400 `PATIENT_INVALID_CPF`/`PATIENT_INVALID_CNS` |
| 10 | Duplicidade forte | PASS — 409 sem confirmação, 201 com `confirmDuplicate` |
| 11 | Duplicidade fraca | PASS — 201 direto (não bloqueia) |
| 12 | Conflito para revisão humana | PASS — 409/201; `app.detect_patient_duplicates()` classifica `conflict` |
| 13 | Contatos | PASS — 201/200 |
| 14 | Antecedentes | PASS — 201/200 |
| 15 | Medicamentos de uso contínuo | PASS — 201/200 |
| 16 | Problemas ativos + alergia + transição de status | PASS — 201/200; conteúdo de alergia preservado |
| 17 | Idempotência | PASS — replay com mesmo corpo; 409 com corpo diferente |
| 18 | Rollback transacional | PASS — violação de `patient_duplicate_distinct_ck` reverte também o INSERT de paciente na mesma transação |
| 19 | Auditoria | PASS (aplicação) — 201; gravação em `app.audit_events` confirmada administrativamente (ver §5) |
| 20 | Eventos de domínio | PASS — `PatientRegistered` gravado, `patient_id` populado, verificado com contexto autenticado real |
| 21 | Request-id/correlation-id | PASS — eco em header e envelope |
| 22 | Erros HTTP padronizados | PASS — envelope `{error:{code,message,requestId}}` em 400/403/404 |

### Nota sobre o teste 19 (auditoria) — verificação administrativa, não bloqueio

A policy `audit_read` (migration 0010) exige papel `auditoria` ou `direcao` — **nenhum dos dois existe ainda** como `app.roles` (não inventado para este teste, por instrução explícita). A gravação em `app.audit_events` foi confirmada via consulta administrativa (Supabase MCP, papel `postgres`) para o paciente `1c81761f-5067-4295-934f-920db26d7edf`:

```
action=create, resource_type=patient, resource_id=1c81761f-..., actor_user_id=83ad7af3-... (ator de teste real)
```

Isso não é uma falha de RLS — é a RLS funcionando exatamente como desenhada: nem o próprio ator que criou o paciente pode LER a trilha de auditoria sem o papel específico de auditoria/direção.

### Bugs reais encontrados e corrigidos nesta rodada

1. **Zod descartava silenciosamente `medicalRecordNumber` em updates.** `PatientUpdateBody` não declarava esse campo; o comportamento padrão do `zod` (strip de chaves desconhecidas) fazia a tentativa de alteração desaparecer antes de chegar à checagem de imutabilidade do domínio, resultando em 400 genérico em vez do 409 correto. Corrigido com `.passthrough()` no schema — os campos imutáveis agora chegam ao domínio, que os rejeita com o código correto.
2. **Achado de infraestrutura, não de código:** `vitaloop_app` não tem `GRANT DELETE` na maioria das tabelas de paciente (só `patient_contacts` tem) — decisão de retenção de dados já presente na migration 0017 (Doc 1 §72 LGPD). A limpeza de dados de teste feita pela própria aplicação (`afterAll` do teste) tentava `DELETE` e falhava com `permission denied` — corrigido removendo essa tentativa do teste (a limpeza é administrativa, via Supabase MCP, documentada nesta rodada) e não fraquejando a política real.

## 5. Migrations alteradas/criadas

**Nenhuma.** Confirmado — nenhuma migration nova foi necessária para implementar a API; o schema da Etapa 1 já era suficiente.

## 6. Security Advisors

**0 alertas** (confirmado após toda a rodada de testes e limpeza).

## 7. Resíduos de teste

- `app.patients` e todas as tabelas satélite de negócio: **0 linhas residuais** (limpeza administrativa confirmada).
- `app.idempotency_keys` (scope `patient.create`): **0 linhas residuais**.
- `app.audit_events`: registros de teste **permanecem por design** (append-only — mesma garantia comprovada pelos testes 18/T5 da Fase 0/1/2; não é resíduo indevido).
- **Fixtures de RBAC** (`app.roles` código `test_patient_full`/`test_patient_readonly`; `app.users` `test-patient-full`/`test-patient-readonly`/`test-patient-noperm`; `app.institutions` código `TEST-P2E2`) **não puderam ser removidas** — `DELETE`/referência `on delete set null` em `app.users` exigiria um `UPDATE` em `app.audit_events`, bloqueado pelo trigger append-only. Ficam permanentemente no banco, claramente identificadas por prefixo `test-`/`TEST-`, sem risco de colisão com dados reais.
- `.env` local: `DATABASE_URL` removida ao final (mesma disciplina das rodadas anteriores).

## 8. Requisitos PAT-001–PAT-017 afetados

Todos os requisitos PAT-001 a PAT-013, PAT-015 e PAT-016 avançam de "domínio testado, API não iniciada" para **API TESTADA (real, com evidência)** — coluna "API" da matriz passa de "—" para "✓ testado". PAT-014 (timeline) permanece PARCIAL — a API grava `PatientRegistered`, mas nenhum evento de atualização de subseções ainda emite via satélites (contatos/alergias/etc. gravam SEUS PRÓPRIOS eventos, mas a timeline agregada não foi testada end-to-end nesta rodada além do evento de registro). PAT-017 (auditoria) passa de NOT RUN para TESTADO (com a ressalva do §4 sobre verificação administrativa). Frontend continua "—" em todos os itens.

## 9. Pendências restantes da Etapa 1/6 (Cadastro de Paciente)

- **Frontend** — não iniciado (próxima camada).
- Endpoint de **inativação** de paciente (`patient.inactivate`, permissão já existe, sem rota ainda).
- PAT-014: teste end-to-end da timeline agregando múltiplos tipos de evento (hoje só `PatientRegistered` foi exercitado via API real).
- Validação de dígito verificador de CNS definitivo (prefixo 1/2) — limitação técnica já registrada na Etapa 1, não resolvida nesta rodada (fora de escopo — é regra de domínio, não de API).
- Need-to-Know por paciente — ainda não aplicado às policies de `app.patients` (RBAC é o único gate, por decisão já registrada na migration 0017).

## 10. Confirmação explícita

**Frontend NÃO foi iniciado nesta rodada.** Nenhum arquivo em `apps/web/src/` foi criado ou alterado. Nenhuma migration nova. `git status` confirma apenas os arquivos de API/teste/documentação listados na §1, tudo não commitado — nenhuma ação de `add`/`commit`/`push`/`pull`/`fetch`/`merge`/`rebase` foi executada.

**Etapa 2/6 (API de Pacientes): TESTADA com evidência real.** Etapa 3/6 (frontend) **NÃO foi iniciada**, aguardando autorização explícita.
