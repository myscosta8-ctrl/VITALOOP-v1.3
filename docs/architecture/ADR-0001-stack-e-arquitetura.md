# ADR-0001 — Stack e arquitetura da fundação

- **Status:** Aceito (tecnicamente, reversível) — sujeito à confirmação do usuário.
- **Data:** 2026-08-19
- **Fase:** 0 — Fundamentos
- **Contexto normativo:** Documento 2 §1–§5 (recomendatório), §57–§59.

## Decisão

Adotar, para a fundação:

| Camada | Escolha | Alternativa considerada | Justificativa |
|---|---|---|---|
| Monorepo | npm workspaces | pnpm/turbo | Sem ferramenta externa; nativo do Node ≥20 (Doc 2 §2.1/§3). |
| Linguagem | TypeScript ponta a ponta | JS | Contratos coerentes front/back/domínio (Doc 2 §0.4). |
| Domínio | Pacote puro `@vitaloop/domain` | lógica no backend | Domínio independente de UI/HTTP/banco (Doc 2 §1/§3). |
| Backend | Fastify | Express, NestJS | Logger pino integrado, schema/validação, performance (Doc 2 §5/§50). |
| Validação | Zod | JSON Schema puro | Validação tipada compartilhável (Doc 2 §33). |
| Banco | PostgreSQL via SQL migrations + `pg` | ORM (Prisma) | Constraints/RLS/transações explícitas no banco (Doc 2 §6/§19/§65). |
| Testes | Vitest | Jest | Rápido, ESM nativo (Doc 2 §70). |
| Frontend | React + Vite (mínimo na Fase 0) | Next.js | SPA; SSR não exigido na fundação (Doc 2 §4). |

## Consequências

- Positivas: domínio testável isoladamente; segurança no banco; baixo acoplamento a Supabase.
- A adoção do **Supabase** permanece **PENDENTE**; o código de banco é Supabase-compatível
  mas não depende de APIs proprietárias para operar/testar localmente (Doc 2 §2.2).
- Reversível: framework HTTP e camada de acesso a dados podem trocar sem afetar o domínio.

## Pendências relacionadas

- Confirmação formal da stack pelo usuário.
- DB-02 (Supabase sim/não) — decisão-mãe. **NÃO DEFINIDO — NECESSITA DECISÃO.**
