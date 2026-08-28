# Matriz de Rastreabilidade — Fase 0 (Fundamentos)

Referência: Documento 3 §7 (FND-001..FND-025) e regra de rastreabilidade Doc 4 §24.

Estados: PLANEJADO · EM IMPLEMENTAÇÃO · IMPLEMENTADO · TESTADO · VALIDADO · CONCLUÍDO.
> "IMPLEMENTADO" não é "CONCLUÍDO". Validação depende de banco/CI reais (ver Relatório).

Legenda de aplicabilidade: ✓ presente · N/A não aplicável nesta fase · PEND pendente institucional.

| REQ | Requisito | Fundação/Arquivo | Banco | API/Infra | RBAC | Auditoria | Teste | Estado |
|---|---|---|---|---|---|---|---|---|
| FND-001 | Arquitetura em camadas | monorepo `packages/*`,`apps/*`; ADR-0001 | N/A | `apps/api` | N/A | N/A | `server.test.ts` | IMPLEMENTADO |
| FND-002 | PostgreSQL | `db/migrations/0001` | ✓ | `db/pool.ts` | N/A | N/A | `db.foundation.test.ts`(skip s/DB) | IMPLEMENTADO |
| FND-003 | RLS | `0010_security_context_and_rls` | ✓ | `security-context.ts` | ✓ | N/A | integração(RLS, s/DB) | IMPLEMENTADO |
| FND-004 | RBAC | `0003_rbac` | ✓ | policies `0010` | ✓ | N/A | integração | IMPLEMENTADO |
| FND-005 | Sessões | `0004_sessions` | ✓ | — | ✓ | N/A | — | IMPLEMENTADO |
| FND-006 | Autenticação | `users.auth_subject`; ADR-0002 | ✓ | PEND(provedor) | ✓ | ✓ | — | EM IMPLEMENTAÇÃO |
| FND-007 | Identidade real do usuário | `app.users`; ctx `user_id` | ✓ | `security-context.ts` | ✓ | ✓ | domain FSM exige actorId | IMPLEMENTADO |
| FND-008 | Necessidade de saber | ctx `institution/unit/sector`; policies base | ✓ | ✓ | ✓ | N/A | PEND(clínico) | EM IMPLEMENTAÇÃO |
| FND-009 | Acesso excepcional (break-glass) | `0005 break_glass_access` | ✓ | ctx `break_glass` | ✓ | ✓ | — | IMPLEMENTADO (política PEND) |
| FND-010 | Auditoria | `0005 audit_events` append-only | ✓ | envelope/logs | ✓ | ✓ | integração(append-only) | IMPLEMENTADO |
| FND-011 | Máquina de estados | `domain/state-machine.ts`; `0007` | ✓ | — | N/A | ✓(record) | `state-machine.test.ts` | TESTADO(unit) |
| FND-012 | Eventos de domínio | `domain/domain-event.ts`; `0006` | ✓ | — | N/A | ✓ | `domain-event.test.ts` | TESTADO(unit) |
| FND-013 | Timeline | `0008 timeline` (view s/ eventos) | ✓ | — | N/A | ✓ | integração(timeline) | IMPLEMENTADO |
| FND-014 | Integridade transacional | `withSecurityContext` (begin/commit/rollback) | ✓ | ✓ | N/A | N/A | PEND(DB) | IMPLEMENTADO |
| FND-015 | Concorrência | unique idx (`user_roles`, idempotency); FOR UPDATE(padrão) | ✓ | — | N/A | N/A | PEND(DB conc.) | EM IMPLEMENTAÇÃO |
| FND-016 | Idempotência | `0009 idempotency_keys` | ✓ | header previsto | N/A | N/A | integração(unique) | IMPLEMENTADO |
| FND-017 | Observabilidade | pino logger; request-id; `/health`,`/ready` | N/A | ✓ | N/A | N/A | `server.test.ts` | IMPLEMENTADO |
| FND-018 | Logs | logger + redact | N/A | ✓ | N/A | N/A | — | IMPLEMENTADO |
| FND-019 | Health/readiness | `routes/health.ts` | N/A | ✓ | N/A | N/A | `server.test.ts` | TESTADO |
| FND-020 | Backup/restore | `docs/operations/backup-restore-dr.md` | PEND | PEND | N/A | N/A | N/A | PLANEJADO (PEND infra) |
| FND-021 | Disaster recovery | idem | PEND | PEND | N/A | N/A | N/A | PLANEJADO (PEND infra) |
| FND-022 | CI/CD | `.github/workflows/ci.yml` | ✓(pg service) | ✓ | N/A | ✓ | roda no GitHub | IMPLEMENTADO (não executado localmente) |
| FND-023 | Ambientes | `.env.example`; `docker/compose`; env schema | ✓ | ✓ | N/A | N/A | `env.test.ts` | IMPLEMENTADO |
| FND-024 | Secrets | `.gitignore`; `.env.example`; secret-scan CI | N/A | ✓ | ✓ | N/A | CI secret-scan | IMPLEMENTADO |
| FND-025 | Rollback | migrations expand/contract; ADR/estratégia | ✓ | — | N/A | N/A | N/A | PLANEJADO |

## Itens explicitamente PENDENTES (institucional)

- Matriz definitiva de perfis/permissões (FND-004 refino) — NÃO DEFINIDO — NECESSITA DECISÃO.
- Necessidade de saber por paciente (FND-008 refino clínico).
- Política de break-glass (FND-009).
- RPO/RTO/backup/DR (FND-020/021/025).
- Provedor de autenticação e mapeamento Supabase (FND-006).
