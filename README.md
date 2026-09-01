# VITALOOP 1.3 — O FIM

Prontuário Eletrônico do Paciente (PEP) orientado ao fluxo assistencial de uma UPA 24h.
**Construído do zero.** Fonte de verdade: os 4 documentos oficiais + instruções diretas do usuário.

> Repositório oficial (único): `https://github.com/myscosta8-ctrl/VITALOOP-v1.3.git`
> Estado de governança: ver [`VITALOOP_1.3_STATUS.md`](VITALOOP_1.3_STATUS.md).

## Estado atual

> **Nota de correção (31/08/2026):** esta seção estava desatualizada — descrevia
> apenas Fase 0/1 enquanto o repositório já contém código e relatórios até a
> Fase 13, além do `docs/GO_LIVE_REAL_VALIDATION_REPORT.md` (gate `CONDITIONAL`).
> `VITALOOP_1.3_STATUS.md` tem a mesma defasagem — ver nota equivalente no topo
> daquele arquivo. Isso precisa ser tratado como item de processo: o hábito de
> atualizar o status a cada fase parou de acontecer em algum ponto e ninguém
> notou até uma auditoria externa (Claude) comparar o texto com o código.

**Módulos clínicos implementados (Fases 0–13):** identidade/segurança, cadastro
e busca de paciente, fila/triagem (Manchester), atendimento/consulta médica,
registros de enfermagem/SAE, ocupação e transferência de leitos, AIH,
regulação externa (SISREG/CROSS), eventos adversos, interoperabilidade
(RNDS/DATASUS), painel de gestão, observabilidade, LGPD, disaster recovery.
Ver `docs/PHASE_*_REPORT.md` para o detalhe de cada fase e
`docs/GO_LIVE_REAL_VALIDATION_REPORT.md` para o estado de prontidão real.

**SUPABASE — configurado e validado** (RLS ativa, advisors 0 alertas — ver
`VITALOOP_1.3_STATUS.md` §7). Pendências de produção reais: certificado
ICP-Brasil A3 (RNDS/DATASUS), credenciamento SISREG/CROSS, servidor PACS
DICOM e Docker Engine no ambiente-alvo — todos bloqueados por infraestrutura
externa, não por código (ver GO_LIVE_REAL_VALIDATION_REPORT.md §2).

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
│   └── integration/    # testes de banco/RLS (falham alto sem DATABASE_URL —
│                        # intencional, não silenciam testes de segurança;
│                        # rode `npm run db:migrate` num Postgres local antes)
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
