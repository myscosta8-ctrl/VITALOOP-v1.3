# Relatório da Fase 0 — Fundamentos

- **Projeto:** VITALOOP-v1.3 O FIM (construído do zero, isolado)
- **Data:** 2026-08-19
- **Escopo:** fundação arquitetural, segurança, dados e infraestrutura. Sem módulos clínicos.

## 1. Resumo da arquitetura

Monolito modular em monorepo (npm workspaces), TypeScript ponta a ponta, com **domínio
puro** isolado de UI/HTTP/banco. Segurança em profundidade: autorização no domínio e no
banco (RLS). PostgreSQL como fonte de verdade transacional; eventos de domínio (outbox)
como fonte única da Timeline. Observabilidade e health/readiness desde a fundação.
**Supabase é a plataforma prevista, porém PENDENTE de configuração** — o código de banco
é compatível, mas não depende de APIs proprietárias para operar/testar localmente.

## 2. Stack e justificativas

Ver `docs/architecture/ADR-0001-stack-e-arquitetura.md`. Decisões reversíveis, tomadas
tecnicamente conforme Doc 2 (recomendatório), aguardando confirmação formal do usuário.

## 3. Estrutura de diretórios

```
apps/api            API Fastify (transversais + health/ready)
packages/shared     Result, AppError, ids/tempo
packages/config     env validado (Zod)
packages/domain     máquina de estados + eventos de domínio
db/migrations       0001–0011 (SQL)
db/seeds            dados só de dev/teste
tests/integration   testes de banco/RLS (auto-skip sem DATABASE_URL)
scripts             runner de migrations local
docker              Postgres local + Dockerfile.api
docs                ADRs, operações, rastreabilidade, este relatório
.github/workflows   CI
```

## 4–7. Banco / tabelas / constraints / índices

Migrations 0001–0011. Tabelas (schema `app`): `institutions, units, sectors, users,
professional_profiles, roles, permissions, user_roles, role_permissions, access_policies,
sessions, audit_events, break_glass_access, domain_events, state_transitions,
idempotency_keys` + view `timeline` + `schema_migrations`.

Constraints/índices de destaque: unicidade de código institucional, username, email/cpf
parciais, escopo único de `user_roles`, período válido (`valid_until > valid_from`),
expiração de sessão, unicidade de idempotência `(scope, actor, key)`, idempotência de
eventos `(event_type, idempotency_key)`, FKs institucionais e de autoria.

## 8–12. Segurança / RBAC / RLS / máquina de estados / eventos / timeline

- **RBAC:** papéis, permissões, vínculos com escopo e validade (0003).
- **RLS:** habilitada em todas as tabelas `app`; políticas base negar-por-padrão via
  funções `app.ctx_*()` (0010); papel de menor privilégio `vitaloop_app`.
- **Máquina de estados:** motor genérico `@vitaloop/domain` (transições válidas/ inválidas,
  record auditável) + persistência `state_transitions` (append-only).
- **Eventos de domínio:** `@vitaloop/domain` + `domain_events` (outbox); occurred_at vs
  recorded_at (temporalidade).
- **Timeline:** view derivada de `domain_events` (sem segunda fonte de verdade).

## 13. Idempotência / concorrência / transações

`idempotency_keys` + header previsto; `withSecurityContext` (begin/commit/rollback) para
atomicidade; unique indexes e padrão `SELECT ... FOR UPDATE` para operações exclusivas.

## 14. Observabilidade / segurança HTTP

Logs estruturados (pino) com redaction de auth/cookie; request-id/correlação; envelope de
erro estável sem stack; headers de segurança; CORS negado por padrão; `/health` e `/ready`.

## 15. CI/CD / secrets / ambientes

`.github/workflows/ci.yml`: lint → typecheck → migrations (pg efêmero) → testes → build +
secret-scan. Secrets fora do código (`.gitignore`, `.env.example`). Ambientes separados
(env schema: development/test/staging/production).

## 16. Backup / restore / DR

`docs/operations/backup-restore-dr.md`. RPO/RTO/retenção/off-site: **NÃO DEFINIDO —
NECESSITA DECISÃO** (parametrizável, não inventado).

## 17. Testes — execução e resultado

> Preenchido após execução real (ver seção "Evidência de execução" abaixo).

- Unitários (domínio/config/shared/API) — Vitest.
- Integração/RLS (banco) — auto-skip sem `DATABASE_URL`.

### Evidência de execução (real, 2026-08-19)

Ambiente: Node v24.18.0, npm 11.16.0 (local, isolado). Sem `DATABASE_URL` (banco não
configurado — SUPABASE PENDENTE), logo os testes de integração fazem auto-skip.

```
npm run typecheck  ->  tsc --build --force : OK (sem erros)
npm run lint       ->  eslint .            : OK (exit 0)
npm run build      ->  tsc --build         : OK
npm test           ->  vitest run
  Test Files  5 passed | 1 skipped (6)
  Tests       25 passed | 4 skipped (29)
    packages/shared/src/shared.test.ts .......... 7
    packages/config/src/env.test.ts ............. 5
    packages/domain/src/state-machine.test.ts ... 4
    packages/domain/src/domain-event.test.ts .... 3
    apps/api/src/server.test.ts ................. 6
    tests/integration/db.foundation.test.ts ..... 4 skipped (sem DATABASE_URL)
```

Os 4 testes de integração (append-only de auditoria, unicidade de idempotência, timeline
derivada de eventos, contexto RLS) rodarão automaticamente quando houver um Postgres local
ou no CI (serviço `postgres:16`). Não foram executados aqui por ausência de banco.

## 18. Itens pendentes / bloqueados

- Institucional: matriz de perfis/permissões, necessidade de saber por paciente,
  break-glass, RPO/RTO/backup/DR, provedor de auth. Todos **NÃO DEFINIDO — NECESSITA DECISÃO**.
- Supabase: execução remota, Auth/Storage/Realtime, mapeamento de identidade — **PENDENTE**.

## Validação Supabase (real, 2026-08-19)

Projeto oficial `ovwqbmmsppkeekhsnrbv` (VITALOOP-v1.3), Postgres 17.6, via Supabase MCP
autenticado (sem manuseio de senha). Migrations 0001–0012 aplicadas; schema conferido
(17 tabelas, 1 view, 5 enums, 8 functions, 10 triggers, 31 policies, 54 índices, 19 FKs,
16 tabelas com RLS). Testes comportamentais reais (cada um com rollback — sem resíduo):

| Teste | Resultado |
|---|---|
| RLS deny-by-default (sem contexto) | PASS — 0 linhas visíveis |
| RLS allow (contexto autenticado) | PASS — catálogo/self visíveis |
| RLS isolamento (self-read) | PASS — u1 vê só a si |
| RLS auditoria por papel | PASS — 0 sem papel / 1 com `auditoria` |
| RBAC bypass (escrita sem `system_admin`) | PASS — RLS violation |
| Auditoria append-only UPDATE | PASS — bloqueado por trigger |
| Auditoria append-only DELETE | PASS — bloqueado por trigger |
| Auditoria INSERT (ator/ação/ts/req-id) | PASS |
| Idempotência unique (scope,actor,key) | PASS — unique violation |
| Idempotência de evento (type,key) | PASS — unique violation |
| Evento → Timeline | PASS — evento aparece na timeline |
| Temporalidade occurred_at<recorded_at | PASS |
| Transições append-only UPDATE | PASS — bloqueado |
| Atomicidade transacional (rollback) | PASS — 0 remanescente |
| Advisors de segurança Supabase | PASS — 0 alertas (após 0012) |

Correções desta validação: **migration 0012** (fixa `search_path` das 8 funções —
advisor `function_search_path_mutable`). Suporte de teste: concessão temporária de
`vitaloop_app` a `postgres` para exercer `SET ROLE`, **revogada ao final**
(estado de privilégios restaurado; `set_option=false`).

NÃO VALIDADO / NOT RUN (honesto):
- Concorrência com duas sessões paralelas reais — exige duas conexões diretas
  (`DATABASE_URL`) ou harness da app; validada apenas a garantia por unique-constraint.
- `/ready` contra o banco Supabase ao vivo — exige `DATABASE_URL` (pooler 6543) com
  credencial no ambiente, ausente nesta etapa. Lógica de health/readiness validada por
  testes de API.
- Suíte `vitest` de integração local — **SKIP** (sem `DATABASE_URL`); cobertura
  equivalente foi feita via SQL real no Supabase (tabela acima).

## 19. Status final da Fase 0

**FASE 0 VALIDADA — com pendências não bloqueantes.**

Fundação implementada e **validada contra PostgreSQL/Supabase real** (RLS, RBAC, auditoria
append-only, eventos, timeline, idempotência, transações). Suíte local verde
(lint/typecheck/unit/build). Pendências **não bloqueantes**: concorrência multi-sessão e
`/ready` ao vivo (dependem de `DATABASE_URL` no ambiente); decisões institucionais
(perfis/permissões, break-glass, RPO/RTO) permanecem `NÃO DEFINIDO — NECESSITA DECISÃO`;
Auth/Storage/Realtime do Supabase fora do escopo da Fase 0.
