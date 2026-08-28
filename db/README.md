# Banco de dados — VITALOOP 1.3

Fundação PostgreSQL (Supabase-compatível). **Não conectar a Supabase remoto nesta fase.**

## Estrutura

- `migrations/` — SQL versionado, aplicado em ordem (Doc 2 §65).
- `seeds/` — dados **apenas de desenvolvimento/teste** (Doc 2 §66). Nunca em produção.
- Runner: `scripts/migrate.ts` (usa `DATABASE_URL` LOCAL).

## Uso local

```bash
# 1. Suba um Postgres local (Docker):
docker compose -f docker/docker-compose.yml up -d db

# 2. Configure .env (a partir de .env.example) com DATABASE_URL local, por exemplo:
#    DATABASE_URL=postgres://vitaloop:vitaloop@localhost:5432/vitaloop_dev

# 3. Aplique as migrations:
npm run db:migrate

# 4. (opcional, DEV) carregue o seed de referência:
psql "$DATABASE_URL" -f db/seeds/0001_dev_reference.seed.sql
```

## Migrations desta fase (0001–0011)

| # | Conteúdo |
|---|---|
| 0001 | extensões (pgcrypto), schema `app`, controle de migrations |
| 0002 | identidade e hierarquia institucional |
| 0003 | RBAC (papéis, permissões, vínculos com escopo) |
| 0004 | sessões |
| 0005 | auditoria (append-only) + break-glass |
| 0006 | eventos de domínio (outbox) |
| 0007 | transições de estado (histórico) |
| 0008 | timeline (view sobre eventos) |
| 0009 | idempotência |
| 0010 | contexto de segurança + RLS base |
| 0011 | triggers de updated_at |

> Nenhuma tabela **clínica** (pacientes, atendimentos, prescrições...) é criada na Fase 0.
> Elas pertencem às fases 2+ e não foram antecipadas.
