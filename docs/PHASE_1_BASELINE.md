# VITALOOP 1.3 — Baseline Homologado da Fase 1

> **Este documento é uma referência imutável.** Registra o estado exato no
> momento da homologação formal da Fase 1. Não deve ser reescrito para
> refletir mudanças futuras — mudanças futuras geram um novo baseline
> (Fase 2 em diante) ou uma nova rodada de gate, nunca uma edição silenciosa
> deste arquivo.

- **Data da homologação:** 2026-08-19
- **Projeto:** VITALOOP-v1.3 O FIM (construído do zero, isolado)
- **Repositório GitHub oficial (não sincronizado ainda):** `https://github.com/myscosta8-ctrl/VITALOOP-v1.3.git`
- **Supabase oficial:** `ovwqbmmsppkeekhsnrbv` (VITALOOP-v1.3), host `db.ovwqbmmsppkeekhsnrbv.supabase.co`, região us-east-2, Postgres 17.6

## 1. Escopo homologado

Fase 0 (Fundamentos) + Fase 1 (Identidade, Autenticação, Autorização, RBAC,
Need-to-Know, Acesso Excepcional). Nenhum módulo clínico.

## 2. Estado do banco (verificado nesta homologação, leitura real)

- **Migrations aplicadas:** 16 (`0001` a `0016`), idênticas entre os arquivos
  locais (`db/migrations/`) e o histórico do Supabase (`list_migrations`),
  sem lacunas, aplicadas sequencialmente em 2026-08-19.
- **Última migration válida:** `0016_resolve_app_identity`.
- **Tabelas no schema `app`:** 20 (incluindo `schema_migrations`).
- **RLS habilitada:** 19 tabelas (todas exceto `schema_migrations`).
- **Policies RLS:** 36.
- **Resíduos de teste:** 0 (confirmado por contagem em `app.users` ativos de
  teste, `app.idempotency_keys`, `auth.users` de teste).

## 3. Estado de segurança (verificado nesta homologação)

- **Supabase Security Advisors:** 0 alertas.
- **RLS:** negar-por-padrão, ativa em todas as tabelas de negócio.
- **RBAC:** `has_permission()` — testado com papel/sem papel, real (SQL + HTTP
  em rodadas anteriores desta mesma sessão).
- **Need-to-Know:** `can_access()`/`authorize()` — baseline técnico (escopo
  `sector`) testado real; escopo clínico inexistente (fases futuras).
- **Auditoria:** `audit_events` append-only (bloqueio de UPDATE/DELETE via
  trigger, confirmado real); `log_authz()` grava decisões de autorização.
- **Sessão/revogação:** `app.sessions` + checagem de revogação em
  `resolveRequestIdentity` — bug real de "sessão revogada continuava aceita"
  encontrado e corrigido nesta fase; revalidado com evidência HTTP real
  (mesmo token, pós-logout, recebe 401).
- **JWT:** verificação via JWKS público (ES256), sem segredo compartilhado;
  rejeição de token expirado testada real (servidor JWKS de teste local).
- **Break-glass:** `activate_break_glass()` — ativação, expiração calculada e
  auditoria vinculada testadas real (SQL e HTTP, incluindo `BreakGlassPage`
  no navegador: autorizado 201, negado 403).
- **Rate limiting / brute-force:** testados real (429 na 6ª tentativa de
  login; lockout SQL real 4 falhas=liberado, 5=bloqueado).

## 4. Estado dos testes (última execução completa com evidência real, mesma sessão)

- Suíte completa com `DATABASE_URL` real: **53/53 passed, 0 FAIL, 0 SKIP**
  (confirmado em 2 execuções consecutivas).
- Sem `DATABASE_URL` (estado padrão deste ambiente): **49 passed, 4 skipped**
  (auto-skip documentado e justificado no próprio arquivo de teste — não é
  falha, é comportamento esperado quando a credencial de banco não está
  presente no ambiente local).
- Lint: PASS. Typecheck (backend+frontend): PASS. Build (backend+frontend): PASS.

## 5. Estado do Git

- Branch: `main`. Remote único: `origin` →
  `https://github.com/myscosta8-ctrl/VITALOOP-v1.3.git`.
- **Nenhum commit realizado neste projeto até o momento da homologação.**
- Nenhum push/pull/fetch/merge/rebase realizado em nenhuma etapa.

## 6. Bugs reais encontrados e corrigidos durante a Fase 1 (histórico permanente)

1. `requireAuth` travava toda requisição HTTP autenticada (bug crítico de
   disponibilidade — preHandler síncrono sem sinal de conclusão para o
   Fastify). Corrigido tornando a função `async`.
2. Sessão revogada continuava sendo aceita pela API (achado real de
   segurança — JWT stateless não era cruzado com `app.sessions`). Corrigido
   adicionando checagem de revogação/expiração de sessão institucional.
3. Teste pré-existente de idempotência com falso-positivo (`NULL` não colide
   com `NULL` em UNIQUE) — corrigido vinculando `actor_user_id` real no teste.

## 7. Pendências institucionais (não resolvidas por esta homologação)

A homologação da Fase 1 **não** resolve nem presume resposta para:

- Política de senha (comprimento/complexidade/expiração).
- MFA/2FA — obrigatório? para quais perfis?
- Matriz definitiva de perfis × permissões × competência legal.
- Política institucional de break-glass (duração oficial, quem pode ativar).
- Regras definitivas de Need-to-Know clínico (paciente/atendimento/leito).
- Se profissão (`professional_type`) e vínculo (`relationship_type`) devem
  influenciar autorização como dimensões próprias — hoje **não influenciam**
  (confirmado por leitura do código-fonte).

Todas seguem explicitamente `NÃO DEFINIDO — NECESSITA DECISÃO` / `PENDENTE
DE DECISÃO INSTITUCIONAL`, nunca inventadas.

## 8. Limitações técnicas conhecidas

- A camada HTTP de `requirePermission` foi validada com banco conectado
  nesta sessão (evidência real), mas depende de `DATABASE_URL` estar
  configurada no ambiente de execução — este ambiente de desenvolvimento não
  a mantém persistente por padrão (removida do `.env` após cada uso, por
  precaução de segurança).
- Nenhuma tabela clínica existe ainda (paciente, atendimento, setor
  assistencial, leito, equipe) — Need-to-Know clínico aguarda essas
  fundações (fases futuras).

## 9. Ponto exato de partida da Fase 2

Qualquer trabalho de Fase 2 parte deste estado: 16 migrations (`0001`–
`0016`), código de `apps/api` e `apps/web` como estão neste commit lógico
(sem commit Git real ainda realizado), Documentos 1–4 inalterados desde o
início do projeto. Nenhuma tabela ou funcionalidade clínica existe além do
que está descrito acima.

## 10. Declaração de homologação

**FASE 1 — HOMOLOGADA** como fundação técnica do VITALOOP 1.3, em
2026-08-19, com base nas evidências reais registradas em
`docs/PHASE_1_REPORT.md`, `docs/TRACEABILITY_PHASE_1.md` e
`docs/PHASE_1_CLOSEOUT_DOCUMENTAL.md`.

Esta homologação **não** significa que as pendências institucionais da
seção 7 foram resolvidas — apenas que a fundação técnica está apta a
sustentar a Fase 2, e que essas decisões deverão ser tomadas antes ou
durante a implementação dos requisitos que delas dependem.
