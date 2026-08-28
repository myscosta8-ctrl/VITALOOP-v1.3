# VITALOOP 1.3 — Relatório Técnico — Fase 2 / Etapa 1 de 6

**Cadastro e Identidade do Paciente — rodada de fechamento documental do achado de RLS**
**Data:** 2026-08-20
**Escopo desta rodada:** exclusivamente documental, por instrução explícita do usuário.
Nenhum código de domínio, API ou frontend foi escrito. Nenhuma tabela clínica nova foi
criada. Nenhum Documento oficial (1–4) foi alterado. Nenhuma ação de git além de
`status`/`diff` (verificação de integridade) foi executada.

---

## 1. ACHADO

A conexão real da aplicação (`apps/api`, via `pg.Pool` em `apps/api/src/db/pool.ts`)
sempre autenticou no Postgres como o papel `postgres` (via `DATABASE_URL` no formato
`postgresql://postgres.<ref>:<senha>@...pooler.supabase.com:6543/postgres`). O papel
`postgres`, neste projeto Supabase, tem `rolbypassrls = true`.

**Consequência:** toda política de Row Level Security de todo o schema `app` — desde a
Fase 0 (migration 0010) até a Fase 2 (migration 0017, pacientes) — nunca foi realmente
avaliada por uma conexão real da aplicação. A proteção de fato, em produção, sempre foi
exclusivamente a camada HTTP (`requireAuth`/`requirePermission`), não o banco de dados.
Isso contraria o modelo de "negar por padrão em múltiplas camadas independentes"
descrito no Documento 2 (Blueprint Técnico) §19 e implicitamente assumido como válido
na homologação formal da Fase 1 (2026-08-19).

## 2. CAUSA

A causa-raiz **já estava documentada no próprio código-fonte desde a Fase 0** e não foi
seguida até o fim. A migration
[`0010_security_context_and_rls.sql`](../db/migrations/0010_security_context_and_rls.sql),
linha 52, contém o comentário: *"PENDENTE; ajustar na etapa de configuração do
Supabase."*, imediatamente antes de criar (linhas 53-58) um papel `vitaloop_app` como
`NOLOGIN` — ou seja, deliberadamente inutilizável para conexão até que alguém
completasse esse ajuste pendente. Todas as políticas de RLS de todo o schema `app`,
desde então (incluindo as 8 tabelas novas de pacientes na migration 0017), já foram
escritas corretamente `to vitaloop_app` — nunca `to public`, nunca um papel diferente.
O ajuste pendente nunca foi concluído, inclusive durante a homologação formal da Fase 1,
que declarou RLS "testada e efetiva" com base em testes reais das **funções SQL**
subjacentes (`has_permission`, `can_access`, `authorize`), não da conexão de aplicação
propriamente dita — uma distinção que a própria matriz da Fase 1 já registrava para
`requirePermission`/HTTP (SEC-013), mas cujo paralelo ao nível de RLS/conexão de banco
não havia sido identificado até esta rodada.

## 3. CORREÇÃO

### 3.1 Migration 0019 — correção de design da detecção de duplicidade (achado anterior, mesma rodada de testes)

Durante o teste real do cenário de "conflito de identidade" (mesmo CPF, nomes
diferentes) exigido por PAT-015, descobriu-se que `cpf`/`cns` tinham constraints
`UNIQUE` rígidas no banco (migration 0017 original), tornando esse cenário
estruturalmente impossível entre dois pacientes ativos — a segunda inserção era
rejeitada pelo banco antes mesmo da função de detecção rodar. Isso contradiz o Doc 1
§11 ("confirmação antes de criar provável duplicado" — implica fluxo de confirmação
humana, não bloqueio automático do banco) e a instrução explícita desta etapa de
distinguir força de correspondência sem merge automático.
[`0019_patients_soft_duplicate_detection.sql`](../db/migrations/0019_patients_soft_duplicate_detection.sql)
substitui os índices `UNIQUE` por índices normais (mantendo os `CHECK` de formato),
deixando a prevenção de duplicidade inteiramente a cargo de
`app.detect_patient_duplicates()` + confirmação humana (a implementar na API/frontend).

### 3.2 Migration 0020 — tentativa inicial (desvio de rota, registrado por transparência)

[`0020_app_api_role_no_bypass_rls.sql`](../db/migrations/0020_app_api_role_no_bypass_rls.sql)
criou um papel novo `app_api`, sem `BYPASSRLS`, com grants amplos nas tabelas do schema
`app`. Testes reais subsequentes mostraram que, para **SELECT**, todos os cenários
(autorizado ou não) retornavam 0 linhas — inclusive o autorizado. Investigação revelou
a causa: nenhuma política de RLS jamais referenciou `app_api` (todas usam
`vitaloop_app` desde a Fase 0), então a conexão como `app_api` simplesmente não tinha
NENHUMA política aplicável — comportamento padrão de negação implícita do Postgres
quando RLS está habilitada mas não há política permissiva para o papel conectado. Esta
migration permanece no histórico (não editada, não removida — regra de append-only),
mas seus efeitos foram integralmente revertidos pela migration seguinte.

### 3.3 Migration 0021 — correção real

[`0021_activate_vitaloop_app_role.sql`](../db/migrations/0021_activate_vitaloop_app_role.sql):

1. `alter role vitaloop_app with login noinherit;` — ativa o papel já projetado desde a
   Fase 0.
2. `grant usage on schema extensions to vitaloop_app;` — necessário para
   `app.normalize_text()` (usa `extensions.unaccent`).
3. Aposenta `app_api`: revoga todos os grants (tabelas, sequences, functions, schemas,
   default privileges) e executa `drop role if exists app_api`.

A senha de `vitaloop_app` foi definida pelo próprio usuário, diretamente no SQL Editor
do painel Supabase, **fora do controle de versão** — nenhuma migration ou arquivo deste
repositório contém senha em texto. Mesma disciplina de segurança já usada nas Fases 0/1
(a Claude Code auto-mode classifier bloqueou, corretamente, duas tentativas de aplicar
SQL contendo senha em texto via ferramenta administrativa — a senha só foi definida
pelo usuário, nunca por esta sessão).

### 3.4 Correção operacional — porta do connection pooler

A `DATABASE_URL` de referência (documentada em comentário no `.env`, nunca commitada)
foi corrigida para `vitaloop_app.<ref>@aws-0-us-east-2.pooler.supabase.com:5432` —
**porta 5432 (session pooler)**, não 6543 (transaction pooler, usado nas Fases 0/1 para
o papel `postgres`). O papel novo não autenticou de forma confiável via a porta de
transação neste ambiente de teste; a porta de sessão é também a recomendação oficial do
Supabase para backends persistentes como o nosso Fastify (6543/transaction é indicado
para funções serverless/edge, não para um servidor de vida longa). Esta é uma mudança
de configuração de ambiente, não de schema — deve ser propagada para qualquer ambiente
real (staging/produção) quando configurado.

## 4. EVIDÊNCIAS

Todos os testes desta seção foram executados com uma conexão **real** via biblioteca
`pg` do Node, fora da ferramenta administrativa (Supabase MCP), autenticando pela rede
como `vitaloop_app` com a senha real fornecida pelo usuário — nunca persistida em
arquivo versionado, e verificada matematicamente contra o hash SCRAM-SHA-256 armazenado
em `pg_authid.rolpassword` antes de cada tentativa, para eliminar ambiguidade de erro
de digitação.

**RLS — leitura (SELECT), papel `vitaloop_app`:**

| Cenário | Esperado | Real | Veredito |
|---|---|---|---|
| Sem GUC de sessão (`vitaloop.roles` não setado) | 0 linhas | 0 linhas | PASS |
| Papel sem `patient.read` | 0 linhas | 0 linhas | PASS |
| Papel inexistente no GUC | 0 linhas | 0 linhas | PASS |
| Papel com `patient.read` | 1 linha (paciente de teste) | 1 linha | PASS |

**RLS — escrita (INSERT), papel `vitaloop_app`:**

| Cenário | Esperado | Real | Veredito |
|---|---|---|---|
| Sem GUC de sessão | bloqueado | `new row violates row-level security policy` | PASS |
| Papel sem `patient.write` | bloqueado | mesmo erro | PASS |
| Papel inexistente | bloqueado | mesmo erro | PASS |
| Papel com `patient.read`, sem `patient.write` | bloqueado | mesmo erro | PASS |
| Papel com `patient.write`, sem `RETURNING` | permitido | 1 linha inserida | PASS |
| Papel com `patient.write`, **com** `RETURNING`, sem `patient.read` | — | bloqueado (ver §5) | achado de design, não falha |

**Estado final do banco (confirmado após limpeza):**
- Advisors de segurança: **0 alertas**.
- `app.patients`: **0 linhas** (dados de teste removidos).
- Papéis de teste (`test_patient_reader`, `test_no_patient_perm`) e tabela de teste
  isolada `app.rls_debug_scratch`: **removidos**.
- Papel `app_api`: **não existe mais** (`drop role`).
- Papel `vitaloop_app`: **ativo, LOGIN habilitado, `rolbypassrls=false`**.

## 5. IMPLICAÇÃO DE DESIGN — `RETURNING` exige política de SELECT

Ao isolar a variável (testando o mesmo INSERT com e sem `RETURNING`), confirmou-se
comportamento padrão do PostgreSQL, não uma falha do schema: uma cláusula `RETURNING`
exige que a linha inserida também passe pela política de `SELECT` da tabela, pois
`RETURNING` implica uma leitura implícita da linha recém-criada. Um papel com
`patient.write` mas sem `patient.read` consegue inserir (sem `RETURNING`), mas a mesma
operação com `RETURNING` falha com o mesmo erro de RLS.

**Implicação registrada para a implementação futura da API** (ainda não escrita): o
endpoint de criação de paciente precisará decidir entre (a) exigir `patient.write` **e**
`patient.read` juntos para criar-e-retornar em uma única operação, ou (b) inserir sem
`RETURNING` e fazer uma leitura separada. Esta decisão fica pendente para quando o
código da API for de fato implementado — não decidida nesta rodada documental.

## 6. IMPACTO NA FASE 1 (sem reescrever histórico)

A homologação formal da Fase 1 (2026-08-19), registrada em `PHASE_1_BASELINE.md` e
`STATUS.md §0`, **não é revogada nem editada retroativamente**. Nenhuma linha da matriz
`TRACEABILITY_PHASE_1.md` é alterada por este relatório. O que fica registrado, de
forma aditiva:

- As evidências reais da Fase 1 sobre `has_permission`/`can_access`/`authorize`/
  `activate_break_glass`/`log_authz` continuam válidas exatamente como descritas — essas
  funções foram genuinamente exercitadas via SQL real, com identidade real obtida por
  login HTTP genuíno.
- A Fase 1 **não testou, e sua própria matriz já registrava isso como limitação**
  (SEC-013: "camada HTTP de enforcement NOT RUN" por falta de `DATABASE_URL` de
  aplicação), se a conexão real de produção respeitava RLS. Ela não respeitava.
- Não há necessidade de reabrir o gate da Fase 1: nenhuma evidência positiva anterior
  era falsa — era incompleta em um aspecto explicitamente não coberto, agora testado e
  corrigido para **todo** o schema `app` (não apenas pacientes, já que `vitaloop_app` é
  o mesmo papel referenciado por todas as políticas desde a migration 0010).
- **Recomendação registrada, não uma ação desta rodada:** caso o usuário deseje, uma
  rodada futura pode revalidar via HTTP real (com `apps/api` configurada para usar
  `vitaloop_app`) os itens da Fase 1 marcados PARCIAL/NOT RUN por falta de banco
  conectado ao processo (SEC-003, SEC-005, SEC-013 camada HTTP, SEC-018 camada HTTP,
  SEC-019 camada HTTP) — agora tecnicamente possível com o papel correto disponível.
  Isso não foi executado nesta rodada por estar fora do escopo autorizado (documental,
  Fase 2 apenas).

## 7. IMPACTO NA FASE 2

- A matriz `docs/TRACEABILITY_PHASE_2.md` (criada nesta rodada) reflete PAT-001 a
  PAT-017 com o vocabulário padrão do projeto — nenhum item é declarado "concluído";
  todos os itens de API/Frontend estão explicitamente "—" (não iniciado).
- Os testes de schema T1–T9 (formato de CPF, duplicidade fraca/conflito, imutabilidade
  de alergia, geração de prontuário, tabelas satélite, timeline, merge requests) estão
  todos **PASS** com evidência real, documentados na matriz.
- A Etapa 1/6 permanece **em andamento** — apenas a camada de banco de dados está
  testada; nenhum código de domínio, API ou frontend existe ainda.

## 8. PENDÊNCIAS

- Implementação de domínio/validação (Zod ou equivalente) para os campos de paciente.
- Implementação da API (`apps/api/src/routes/patients.ts` ou equivalente): criar, ler,
  buscar, atualizar, inativar, listar contatos/alergias/antecedentes/medicamentos/
  problemas, detecção de duplicidade, solicitação/aprovação de merge — todos com
  `requireAuth`/`requirePermission` usando as novas permissões `patient.*`.
- Decisão de design registrada na §5 (`RETURNING` vs. `patient.write`+`patient.read`).
- Implementação do frontend (busca, cadastro, subseções clínicas, indicadores de
  duplicidade, estados de erro/carregamento/confirmação).
- Emissão de eventos de domínio (`PatientRegistered` e equivalentes) — nenhum código
  ainda grava em `app.domain_events` para pacientes; por isso `app.patient_timeline`
  retorna corretamente 0 linhas (estrutural, não uma falha).
- Preenchimento de `created_by`/`updated_by`/`recorded_by` e gravação em
  `app.audit_events` — depende da API, inexistente ainda (PAT-017 NOT RUN).
- Validação de dígito verificador de CPF/CNS (hoje apenas formato) — técnica, não
  institucional, não implementada nesta rodada.
- Teste de formato de CNS (paralelo ao já feito para CPF) — não executado nesta rodada.
- Recomendação (não executada) da §6: revalidação via HTTP real dos itens de Fase 1
  agora tecnicamente possíveis com `vitaloop_app` disponível.
- PENDENTE DE DECISÃO INSTITUCIONAL (já registrada em `PHASE_2_READINESS.md`, mantida):
  execução real do merge de pacientes permanece fora de escopo por design, não apenas
  por falta de código.

## 9. GATE

**Etapa 1/6 (Fase 2): NÃO CONCLUÍDA.** Esta rodada fecha exclusivamente a camada de
banco de dados e o achado de segurança de RLS, com evidência real para tudo o que é
declarado PASS/TESTADO. Nenhum requisito PAT-\* está "concluído" — todos dependem, no
mínimo, de API e frontend, ainda não implementados. Etapa 2/6 e qualquer módulo clínico
além do cadastro de paciente **não foram iniciados**, conforme instrução.

**Verificação de integridade (git, somente leitura):**

```
$ git status --short
```

Nenhum commit foi criado nesta sessão (histórico do projeto ainda não possui nenhum
commit — todos os arquivos aparecem como não rastreados, `??`, desde o início do
projeto). Nenhuma ação de `add`/`commit`/`push`/`pull`/`fetch`/`merge`/`rebase` foi
executada. Ver saída completa anexada ao fechamento em `VITALOOP_1.3_STATUS.md`.

**Aguardando autorização explícita do usuário para iniciar a implementação de código
(domínio, API, frontend) da Etapa 1/6.**
