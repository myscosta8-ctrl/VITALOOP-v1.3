# Planejamento Oficial — Fase 12 / Etapa 1 de 2: Produção, DevOps, Containerização & Healthchecks

## Escopo da Etapa 1 (`PRD-001..010`)
1. **PRD-001 — Docker / Containerização Multi-Stage:**
   - Multi-stage Dockerfile para API Fastify (`docker/Dockerfile.api`) e Frontend Web (`docker/Dockerfile.web`).
   - `docker/docker-compose.prod.yml` para orquestração de produção/staging com healthchecks e usuário não-root `node`.
2. **PRD-002 — Usuário de Banco Não-Superuser:**
   - Garantir uso estrito da role de produção `vitaloop_app` (`NOLOGIN`, conectada via RLS) com grants mínimos de produção.
3. **PRD-003 — Gestão de Secrets e Validação de Ambiente:**
   - Validador rigoroso de variáveis de ambiente obrigatórias de produção em `@vitaloop/config` (`env-validator.ts`).
4. **PRD-004 — CORS de Produção:**
   - Habilitação e parametrização estrita via lista explícita de origens autorizadas.
5. **PRD-005 & PRD-006 — Healthcheck & Readiness:**
   - Endpoints `/health`, `/ready`, `/api/v1/health` e `/api/v1/ready` com verificação de conectividade com Postgres Supabase DB.
6. **PRD-007 — Pipeline de Migrations:**
   - Script automatizado de verificação da integridade e aplicação de migrations (`scratch/verify_migrations.ts` / `@vitaloop/domain`).
7. **PRD-008 — Estratégia de Rollback:**
   - Script de rollback e validação de consistência pós-rollback (`packages/domain/src/quality/rollback-validator.ts`).
8. **PRD-009 & PRD-010 — Backup & Restore de Produção:**
   - Integração das rotinas de backup e restore com auditoria em `app.backup_restore_jobs` e `app.audit_events`.

---

## Matriz de Requisitos da Etapa 1 (`PRD-001..010`)

| Requisito | Nome | Módulo | Descrição |
|---|---|---|---|
| **PRD-001** | Docker | DevOps | Dockerfile multi-stage e docker-compose.prod.yml |
| **PRD-002** | Usuário não-superuser | Banco | Conexão estrita via role `vitaloop_app` com RLS ativa |
| **PRD-003** | Secrets | Segurança | Validação rigorosa de envvars sem credenciais hardcoded |
| **PRD-004** | CORS de produção | Segurança | Allowlist estrito de origens de produção |
| **PRD-005** | Healthcheck | Infra | Liveness check (`GET /health` e `GET /api/v1/health`) |
| **PRD-006** | Readiness | Infra | Readiness check com DB ping (`GET /ready` e `GET /api/v1/ready`) |
| **PRD-007** | Migrations | Banco | Validador de ordem e integridade de migrations 0001..0044 |
| **PRD-008** | Rollback | DevOps | Procedimento e script de validação de rollback |
| **PRD-009** | Backup | Infra | Rotina de backup e auditoria de produção |
| **PRD-010** | Restore | Infra | Rotina de restore e validação pós-restauração |
