# VITALOOP 1.3 — O FIM

Prontuário Eletrônico do Paciente (PEP) orientado ao fluxo assistencial de uma UPA 24h.
**Construído do zero.** Fonte de verdade: os 4 documentos oficiais + instruções diretas do usuário.

> Repositório oficial (único): `https://github.com/myscosta8-ctrl/VITALOOP-v1.3.git`
> Estado de governança: ver [`VITALOOP_1.3_STATUS.md`](VITALOOP_1.3_STATUS.md).

## Estado atual

**FASE 0 — Fundamentos.** Fundação arquitetural, segurança, dados e infraestrutura.
Módulos clínicos ainda **não** implementados (fases 2+).

**SUPABASE — PENDENTE DE CONFIGURAÇÃO** (será usado; ainda não configurado).

## Estrutura

```
vitaloop-1.3/
├── apps/
│   └── api/            # API HTTP (Fastify): health/readiness, segurança, envelope, logs
├── packages/
│   ├── shared/         # Result, AppError, ids/tempo
│   ├── config/         # carregamento/validação de ambiente (Zod)
│   └── domain/         # máquina de estados + eventos de domínio (TS puro)
├── db/
│   ├── migrations/     # SQL versionado (Postgres/Supabase-compatível)
│   └── seeds/          # dados só de dev/teste
├── tests/
│   └── integration/    # testes de banco/RLS (auto-skip sem DATABASE_URL)
├── scripts/            # runner de migrations local
├── docker/             # Postgres local + Dockerfile.api (infra)
├── docs/               # ADRs, operações, rastreabilidade, relatório da fase
└── .github/workflows/  # CI (lint, typecheck, test, build, secret-scan)
```

## Scripts

```bash
npm install          # instala dependências (workspaces)
npm run typecheck    # tsc --build
npm run lint         # eslint
npm test             # vitest (unit + integração)
npm run build        # build de todos os pacotes
npm run db:migrate   # aplica migrations em DATABASE_URL LOCAL
```

## Princípios inegociáveis (dos documentos)

- Segurança no servidor/banco, nunca só no frontend (Doc 4 §12).
- Auditoria e rastreabilidade em toda ação relevante (Doc 1 §66; Doc 2 §39).
- Registros clínicos liberados são imutáveis/versionados (Doc 2 §7).
- Nenhum fluxo clínico crítico depende de mock (Doc 2 §0).
- Decisão institucional ausente ⇒ `NÃO DEFINIDO — NECESSITA DECISÃO` (nunca inventar).
