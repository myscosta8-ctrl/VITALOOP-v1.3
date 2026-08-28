# Fechamento Documental — Fase 1 (Identidade e Segurança)

**Data:** 2026-08-19
**Natureza desta rodada:** exclusivamente documental — nenhum código, banco, schema
ou migration foi alterado. Objetivo: corrigir a matriz de rastreabilidade para refletir
fielmente a evidência real, sem transformar "código existe" em "homologado", nem
"NOT RUN" em "PASS".

Fonte de evidência: `docs/PHASE_1_REPORT.md` (relatório original + §42-A de
fechamento técnico), `docs/TRACEABILITY_PHASE_1.md` (matriz corrigida nesta rodada),
`VITALOOP_1.3_STATUS.md`, e leitura direta do código-fonte para verificar afirmações
antes de as reclassificar (ver seção de divergências na matriz).

---

## A. Implementação

O que está genuinamente implementado (código presente no repositório):

- Autenticação via Supabase Auth (login, logout, recuperação de senha, alteração de
  senha) — código completo em `apps/api/src/routes/auth.ts`.
- Verificação de JWT sem segredo compartilhado (ES256 + JWKS público) —
  `apps/api/src/security/jwt-verifier.ts`.
- Identidade institucional separada da credencial, com provisionamento automático sem
  papéis (deny-by-default) — migrations 0014/0015, `app.resolve_app_identity`.
- RBAC granular (`has_permission`) e Need-to-Know genérico por escopo (`can_access`),
  combinados em `authorize()` — migration 0013.
- Break-glass técnico completo (`activate_break_glass`) com auditoria vinculada.
- Rate limiting em memória + brute-force lockout persistido (`is_locked_out`).
- `/ready` verificando Auth (JWKS) e banco separadamente, sem vazar segredos.
- Frontend mínimo (6 telas: login, perfil, recuperação/alteração de senha, break-glass,
  acesso negado) em `apps/web`.

**Ressalva importante desta revisão:** duas colunas de dados existem mas **não têm
efeito funcional** na autorização: `professional_profiles.professional_type` (SEC-015)
e `access_assignments.relationship_type` (SEC-017) — confirmado por leitura direta de
`db/migrations/0013_authz_needtoknow_bruteforce.sql`, função `can_access()`.

## B. Testes

O que foi **efetivamente executado com evidência real** (não apenas código presente):

- Login real via nossa API → Supabase Auth real (HTTP 200, JWT real).
- Verificação do JWT com nosso próprio código contra o JWKS público real.
- Logout real: o mesmo token, usado após o logout, foi rejeitado pelo próprio Supabase
  (`403 session_not_found`) — revogação do lado do servidor comprovada.
- Recuperação de senha real (HTTP 202, sem diferenciar e-mail existente) via curl e via
  navegador (Browser tool).
- Rate limiting real (6ª tentativa de login → 429).
- Brute-force lockout real via SQL (4 falhas → liberado; 5 falhas → bloqueado).
- RBAC + Need-to-Know combinados, via SQL real, usando a identidade real obtida por
  login HTTP genuíno: autorizado corretamente / negado por escopo errado / negado por
  falta de permissão — as três variantes corretas.
- Break-glass real via SQL: ativação, cálculo de expiração, evento de auditoria
  vinculado (`severity=warning`).
- Concorrência real: duas sessões Postgres independentes disputando idempotência
  (uma venceu, outra recebeu `unique_violation`) e um teste de atualização concorrente
  sem perda (`FOR UPDATE`, valor final correto).
- Advisors de segurança do Supabase: 0 alertas (revalidado ao final).
- Suíte local: `npm run lint`, `npm run typecheck` (backend+frontend), `npm test`
  (49 passed / 4 skipped), `npm run build` (backend+frontend) — todos executados e
  verdes nesta sessão.

O que **não foi executado** (ver seção F).

## C. Evidências

| Evidência | Local |
|---|---|
| Relatório técnico original da Fase 1 | `docs/PHASE_1_REPORT.md` (seções 1-42) |
| Fechamento técnico (E2E, revogação, `/ready`, concorrência) | `docs/PHASE_1_REPORT.md` §42-A |
| Matriz de rastreabilidade corrigida (esta rodada) | `docs/TRACEABILITY_PHASE_1.md` |
| Testes automatizados | `apps/api/src/security/*.test.ts`, `apps/api/src/routes/auth.test.ts`, `apps/api/src/server.test.ts` |
| Código-fonte verificado nesta revisão (para confirmar/corrigir divergências) | `db/migrations/0013_authz_needtoknow_bruteforce.sql`; `apps/api/src/routes/auth.ts` |
| Estado de governança | `VITALOOP_1.3_STATUS.md` §7 |

## D. Pendências técnicas (somente as realmente técnicas)

1. Executar `requirePermission`, escrita/revogação de `app.sessions`, e `/ready` com
   banco **dentro do mesmo processo HTTP** — requer `DATABASE_URL`/senha de Postgres,
   ausente neste ambiente.
2. Criar teste de **rejeição** de token JWT expirado (hoje só há teste de aceitação).
3. Executar teste real do **fluxo de sucesso** de alteração de senha (hoje só há teste
   do caminho de rejeição).
4. Testar `BreakGlassPage` no navegador (código existe; não exercitado via UI).
5. Decidir (tecnicamente, após decisão institucional) se `professional_type` e
   `relationship_type` devem influenciar autorização como dimensões próprias — hoje
   são apenas metadados armazenados, sem efeito funcional.

## E. Pendências institucionais (dependem de decisão humana)

1. Política de senha (comprimento/complexidade/expiração) — SEC-009.
2. MFA/2FA obrigatório — sim/não, e para quais perfis — SEC-010.
3. Matriz definitiva de perfis × permissões × competência legal — SEC-014.
4. Se profissão/vínculo devem ser dimensões de autorização distintas — SEC-015/SEC-017.
5. Regras clínicas definitivas de necessidade de saber (aguardam módulos de paciente/
   atendimento/leito) — SEC-018.
6. Política institucional de break-glass: duração oficial e quem pode ativar — SEC-019.

Nenhuma dessas ausências é um defeito técnico. Nenhuma foi inventada ou presumida.

## F. NOT RUN (testes que não puderam ser executados, com motivo)

| Item | Motivo objetivo |
|---|---|
| `requirePermission` via HTTP real com banco anexado | Sem `DATABASE_URL`/senha de Postgres no ambiente; apenas acesso administrativo via Supabase MCP. Não é apropriado substituir a camada `pg` de produção por chamadas MCP. |
| Escrita/consulta de `app.sessions` via HTTP real com banco anexado | Mesmo motivo acima. |
| `/ready` com banco realmente conectado no processo | Mesmo motivo acima. |
| Rejeição de token JWT expirado | Não é uma limitação de ambiente — é um teste que simplesmente não foi escrito. Registrado como pendência técnica (seção D), não como NOT RUN por bloqueio externo. |
| Fluxo de sucesso de alteração de senha | Idem — teste não escrito, não bloqueio de ambiente. Pendência técnica (seção D). |
| Simultaneidade temporal exata em teste de concorrência | O transporte de ferramenta disponível (chamadas MCP) não garante nem permite comprovar dispatch paralelo real ao nível de milissegundos. A garantia de correção (sem duplicação, sem perda de atualização) foi validada com duas sessões Postgres genuinamente independentes. |
| SEC-015/SEC-017 como dimensões funcionais de autorização | Não existem como mecanismo — não há o que testar até serem implementados. |

## G. Riscos (somente os reais)

- RLS de `domain_events`/`state_transitions` permanece em baseline "autenticado"
  (herdado da Fase 0) — deverá ser estreitada quando os módulos clínicos definirem
  Need-to-Know real por paciente/atendimento.
- Ausência de MFA nesta fase — aceitável enquanto não há dados clínicos reais
  expostos; deve ser revisitada antes de produção com pacientes reais.
- A camada HTTP de enforcement (`requirePermission`) nunca foi exercitada de ponta a
  ponta com banco real — o risco é que exista uma divergência de comportamento entre o
  que a função SQL faz isoladamente e o que a rota Fastify faz ao redor dela (parsing
  de contexto, tratamento de erro, etc.) que só apareceria em teste HTTP real.
- Nenhum alerta de segurança do Supabase Advisor. Nenhum FAIL em testes executados.

## H-2. Atualização — Microfechamento técnico (2026-08-19, rodada com DATABASE_URL real)

Com uma `DATABASE_URL` real fornecida transitoriamente pelo usuário (nunca commitada,
removida ao final da sessão), foi possível executar a API completa (Auth + banco
simultâneos) pela primeira vez, fechando 6 dos 7 grupos de pendências técnicas
identificados no fechamento documental anterior (A, B, C, D, E, F — todos PASS; G
permanece PENDENTE DE DECISÃO INSTITUCIONAL, corretamente, pois nenhum documento
oficial define regra suficiente para implementar profissão/vínculo como dimensões de
autorização). Dois bugs reais foram encontrados e corrigidos (mínimo necessário):
`requireAuth` travava requisições autenticadas (bug crítico de disponibilidade); sessão
revogada continuava sendo aceita pela API (achado real de segurança). Detalhes completos
em `docs/TRACEABILITY_PHASE_1.md` §"Microfechamento técnico". Um teste pré-existente
(`idempotency ... is unique`) foi descoberto com defeito real (não timeout), fora do
escopo desta rodada, registrado como pendência técnica.

Suíte final: lint PASS · typecheck PASS · testes 52 passed/1 failed(real)/0 skipped ·
build PASS · Supabase Security Advisors 0 alertas.

## H-3. Fechamento final (rodada seguinte, 2026-08-19)

- Teste `idempotency scope+actor+key is unique` **corrigido** (vinculação de
  `actor_user_id` real) — apenas o teste, nenhuma regra de produção alterada.
- Suíte completa: **53/53 passed, 0 FAIL, 0 SKIP**, confirmado em 2 execuções
  consecutivas com `DATABASE_URL` real.
- `BreakGlassPage` testada de ponta a ponta no navegador real: autorização
  (201), negação (403), auditoria confirmada por SQL (texto do formulário
  batendo exatamente com o registro em `break_glass_access`/`audit_events`).
- Nenhuma migration criada/alterada. Nenhum Documento 1-4 tocado. Nenhum
  commit/push/pull/fetch/merge/rebase.
- Dados de teste removidos (0 resíduos em tabelas de negócio); `DATABASE_URL`
  removida do `.env` ao final.
- Advisors de segurança do Supabase: 0 alertas.

Ver `docs/TRACEABILITY_PHASE_1.md` §"Fechamento final" para o detalhamento completo.

## H. Status

**FASE 1 — TECNICAMENTE FECHADA E PRONTA PARA HOMOLOGAÇÃO.**

Justificativa:
- A matriz de rastreabilidade foi corrigida para eliminar superclassificações
  (7 divergências identificadas e corrigidas — ver `docs/TRACEABILITY_PHASE_1.md`).
- Não há mais nenhuma célula "✓ implícito" sem evidência correspondente.
- Pendências técnicas e institucionais estão separadas e listadas explicitamente.
- Itens NOT RUN estão registrados com motivo objetivo, não convertidos em PASS.
- Nenhum requisito foi declarado "HOMOLOGADO" — essa é uma decisão exclusiva do
  responsável humano (Doc 3 §27/§61; Doc 4 §33/§53), que ainda não ocorreu.

Não se declara "FASE 1 CONCLUÍDA" porque, segundo o Documento 4, conclusão requer
homologação formal — um ato humano, não uma verificação automatizada. O que esta
rodada certifica é que a **documentação agora representa fielmente a realidade
técnica**, condição necessária (mas não suficiente) para a homologação.
