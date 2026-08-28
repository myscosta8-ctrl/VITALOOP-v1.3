# Matriz de Rastreabilidade — Fase 1 (Identidade e Segurança)

**Revisão de fechamento documental — 2026-08-19.** Esta revisão corrige classificações
da versão anterior que confundiam "código existe" ou "teste equivalente" com
"testado"/"homologado". Nenhuma evidência positiva foi apagada — apenas reclassificada
com precisão. Divergências encontradas em relação à versão anterior estão marcadas
explicitamente com **[DIVERGÊNCIA CORRIGIDA]**.

Referência: Documento 3 §8 (SEC-001..SEC-022); regra de aceite Doc 3 §64, Doc 4 §33/§53.

## Vocabulário de status usado nesta matriz

- **IMPLEMENTADO** — código existe e está presente no repositório.
- **TESTADO** — existe evidência de execução real (HTTP real, SQL real no Supabase
  oficial, ou teste automatizado que exercita o comportamento real, não apenas a
  existência).
- **EVIDENCIADO** — há registro/prova documental de um comportamento específico,
  ainda que não cubra o requisito por inteiro.
- **PARCIAL** — parte da cadeia funciona e tem evidência; outra parte não foi
  implementada, não foi exercitada, ou não produz o efeito funcional esperado.
- **PENDENTE DE DECISÃO** — depende de decisão institucional/clínica/jurídica que não
  foi tomada; não é uma falha técnica.
- **NOT RUN** — não foi possível executar; motivo técnico objetivo registrado.
- **HOMOLOGADO** — não se aplica a nenhum item desta matriz ainda: homologação é um
  ato formal do responsável humano (Doc 3 §27/§61), que ainda não ocorreu para a
  Fase 1. **Por isso a coluna ACEITE é "PENDENTE" em toda a matriz, mesmo para
  requisitos com teste PASS.**

## Nota estrutural válida para várias linhas

`requirePermission` (nossa camada de enforcement HTTP em
`apps/api/src/security/require-auth.ts`, usada por RBAC/Need-to-Know) **nunca foi
exercitada via requisição HTTP real com banco conectado ao mesmo processo** — este
ambiente não possui `DATABASE_URL`/senha de Postgres (apenas acesso administrativo via
Supabase MCP). O que foi testado de fato, para RBAC/NTK/break-glass, foram as
**funções SQL subjacentes** (`has_permission`, `can_access`, `authorize`,
`activate_break_glass`, `log_authz`) executadas diretamente no Supabase oficial com a
mesma identidade real obtida por login HTTP genuíno — não a cadeia inteira dentro de
uma única requisição ao nosso servidor. Isso está registrado individualmente em cada
linha afetada (SEC-013, SEC-018, SEC-019).

---

## Matriz completa

| ID | Requisito | Módulo | Implementação | Banco | API | Frontend | RBAC | Need-to-Know | RLS | Auditoria | Teste (resultado) | Evidência | Status | Aceite | Pendência |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| SEC-001 | Login real | Autenticação | ✓ | N/A (credencial no Supabase) | ✓ `POST /auth/login` | ✓ `LoginPage` | N/A | N/A | N/A | PARCIAL (`login_attempts`, não `audit_events`) | **PASS** — HTTP real completo (login via nossa API → Supabase real, 200, JWT real) + 10 testes unitários | PHASE_1_REPORT §42-A item A; `auth.test.ts` | TESTADO | PENDENTE | nenhuma técnica |
| SEC-002 | Logout | Autenticação/Sessão | ✓ | ✓ `sessions.revoked_at` | ✓ `POST /auth/logout` | ✓ `ProfilePage` | N/A | N/A | N/A | — (rota não grava `audit_events`) | **PASS** — HTTP real (204) + confirmação real de invalidação no Supabase (token rejeitado com 403 após logout) + SQL real | PHASE_1_REPORT §42-A item B | TESTADO | PENDENTE | nenhuma técnica (nota: sem evento de auditoria dedicado ao logout) |
| SEC-003 | Sessões | Sessão | ✓ schema + escrita no handler | ✓ schema; escrita validada só via SQL | código presente; **nunca exercitado via HTTP com DB anexado** | N/A | N/A | N/A | ✓ (RLS Fase 0) | N/A | **PARCIAL** — SQL real replica fielmente o handler, mas a rota HTTP real nunca gravou uma sessão com banco conectado no mesmo processo | PHASE_1_REPORT §42-A item B | **PARCIAL** [DIVERGÊNCIA CORRIGIDA — era "TESTADO"] | PENDENTE | TÉCNICA — validar em runtime único com `DATABASE_URL` configurado |
| SEC-004 | Expiração | Autenticação | ✓ (`sessions.expires_at`; JWT `exp`) | ✓ constraint `sessions_expiry_ck` | verificador usa `jose` (enforcement padrão da lib) | N/A | N/A | N/A | N/A | N/A | **PARCIAL** — existe teste que um token **válido** é aceito; **não existe teste que um token expirado seja rejeitado** | `jwt-verifier.test.ts` (linhas 24-50, só caminho de aceitação) | **PARCIAL** [DIVERGÊNCIA CORRIGIDA — era "TESTADO"] | PENDENTE | TÉCNICA — criar teste com token expirado |
| SEC-005 | Revogação | Sessão | ✓ | ✓ (`app.sessions.revoked_at`) | ✓ Supabase real + nossa rota | N/A | N/A | N/A | N/A | — | **PARCIAL** — revogação no Supabase Auth: **PASS real** (403 comprovado pós-logout); revogação/consulta da sessão institucional **dentro do mesmo processo HTTP com banco**: **NOT RUN** (só validado via SQL direto replicando o handler) | PHASE_1_REPORT §42-A item B | **PARCIAL** [mantido conforme instrução — camada Supabase é PASS, camada `app.sessions` em runtime é PARCIAL] | PENDENTE | TÉCNICA — mesma do SEC-003 |
| SEC-006 | Dispositivos | Sessão | ✓ (`user_agent`/`ip_hash`) | ✓ capturado e confirmado por SQL real | ✓ login grava | N/A | N/A | N/A | N/A | N/A | **PASS** (no escopo definido) — captura de `ip_hash`/`user_agent` evidenciada na cadeia real de sessão; **sem** teste dedicado de múltiplos dispositivos, listagem ou revogação seletiva (funcionalidade não especificada nesta fase) | PHASE_1_REPORT §42-A item B | TESTADO (fundação apenas, conforme Doc 4 §10 — sem fingerprinting invasivo) | PENDENTE | nenhuma técnica dentro do escopo definido |
| SEC-007 | Recuperação de senha | Autenticação | ✓ | N/A (GoTrue) | ✓ `POST /password/recovery` | ✓ `PasswordRecoveryPage` | N/A | N/A | N/A | N/A (interno do GoTrue) | **PASS** — HTTP real (202, sem diferenciar e-mail existente) via curl **e via navegador real** (Browser tool, rede confirmada) | PHASE_1_REPORT §42-A; relatório original item 26 | TESTADO | PENDENTE | nenhuma técnica |
| SEC-008 | Alteração de senha | Autenticação | ✓ código completo (chama Supabase, grava `audit_events`, revoga sessões) | ✓ código presente (insert/update) — **não exercitado** | ✓ `POST /password/change` (código completo) | ✓ `ChangePasswordPage` (não exercitada no navegador) | N/A | N/A | N/A | ✓ código grava — **não exercitado** | **PARCIAL** — apenas o caminho de **rejeição** (401 sem sessão) foi testado; o caminho de **sucesso** (alteração real com sessão válida) nunca foi executado em nenhuma rodada | `auth.test.ts` linhas 151-160 (único teste existente) | **PARCIAL** [DIVERGÊNCIA CORRIGIDA — proposta do usuário sugeria PASS; evidência não sustenta] | PENDENTE | TÉCNICA — executar teste real do fluxo de sucesso |
| SEC-009 | Política de senha | Segurança | estrutura (`security_settings.password_min_length`) | ✓ coluna existe, valor não definido | — | — | N/A | N/A | N/A | N/A | N/A | — | **PENDENTE DE DECISÃO** | PENDENTE | INSTITUCIONAL — comprimento/complexidade/expiração |
| SEC-010 | MFA/2FA | Segurança | não implementado nesta fase | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | ADR-0003 | **PENDENTE DE DECISÃO** | PENDENTE | INSTITUCIONAL — obrigatório? para quais perfis? |
| SEC-011 | Rate limiting | Segurança | ✓ | N/A (memória) | ✓ login/recovery | N/A | N/A | N/A | N/A | N/A | **PASS** — HTTP real (6ª tentativa → 429) + testes unitários | `rate-limiter.test.ts`; PHASE_1_REPORT | TESTADO | PENDENTE | nenhuma técnica |
| SEC-012 | Brute-force protection | Segurança | ✓ | ✓ `login_attempts` | consultado antes do login (código) | N/A | N/A | N/A | N/A | ✓ `login_attempts` | **PASS** — SQL real (4 falhas → `false`; 5 falhas → `true`) | PHASE_1_REPORT §42-A / relatório original | TESTADO | PENDENTE | nenhuma técnica |
| SEC-013 | RBAC | Segurança | ✓ | ✓ `has_permission` | código presente (`requirePermission`) — **não exercitado via HTTP com DB** | N/A | ✓ testado via SQL | N/A | N/A | ✓ `log_authz` | **PASS** (camada SQL) — `has_permission` testado real (com/sem papel) e reexercitado na cadeia E2E do fechamento, sempre via SQL direto, nunca via HTTP com banco anexado | PHASE_1_REPORT + closeout §42-A item A | TESTADO (camada de domínio/SQL); camada HTTP de enforcement **NOT RUN** | PENDENTE | TÉCNICA — testar `requirePermission` via HTTP com `DATABASE_URL` |
| SEC-014 | Matriz definitiva de permissões | Segurança | estrutura (`role_permissions`) implementada; apenas 10 permissões **técnicas** criadas, nenhuma clínica | ✓ estrutura | — | — | ✓ estrutura | N/A | N/A | N/A | N/A | `0013_authz_needtoknow_bruteforce.sql` | **PENDENTE DE DECISÃO** (conteúdo institucional) | PENDENTE | INSTITUCIONAL — matriz definitiva por perfil/competência legal |
| SEC-015 | Permissões por profissão | Segurança / Need-to-Know | **PARCIAL** — `professional_profiles.professional_type` existe (Fase 0) mas **não é referenciado** por `has_permission`/`can_access`/`authorize` | PARCIAL (coluna existe, não usada em autorização) | — (nenhuma rota diferencia por profissão) | — | — (RBAC é por papel/código, não por profissão) | — (`can_access` não usa `professional_type`) | N/A | N/A | **NOT RUN** — não há mecanismo de "permissão por profissão" distinto para testar | `0013...sql` função `can_access` (linhas 94-106), confirmado por leitura direta do código nesta revisão | **PARCIAL** [DIVERGÊNCIA CORRIGIDA — proposta do usuário sugeria "IMPLEMENTADO/TESTADO"; o dado existe mas não influencia autorização] | PENDENTE | TÉCNICA (implementar a dimensão, se desejada) + INSTITUCIONAL (quais profissões têm quais privilégios) |
| SEC-016 | Permissões por setor | Need-to-Know | ✓ | ✓ | ✓ `can_access` | — | N/A | ✓ | N/A | N/A | **PASS** — SQL real (vinculado=`true`, não vinculado=`false`), único escopo genuinamente exercitado nesta fase | PHASE_1_REPORT §42-A; relatório original | TESTADO | PENDENTE | nenhuma técnica (escopo `sector` apenas — outros escopos não testados) |
| SEC-017 | Permissões por vínculo | Need-to-Know | **PARCIAL** — `access_assignments.relationship_type` existe e é armazenado, mas `can_access()` **não filtra nem diferencia** por esse valor | PARCIAL | — | — | — | PARCIAL (campo existe, sem efeito funcional) | N/A | N/A | **NOT RUN** quanto ao efeito funcional — `relationship_type` é metadado descritivo, não uma regra de autorização ativa | `0013...sql` função `can_access` (mesma leitura de código) | **PARCIAL** [DIVERGÊNCIA CORRIGIDA — proposta do usuário sugeria "IMPLEMENTADO/TESTADO"] | PENDENTE | TÉCNICA — decidir se `relationship_type` deve influenciar autorização e implementar, se sim |
| SEC-018 | Necessidade de saber | Need-to-Know | ✓ baseline técnico | ✓ | código presente (`requirePermission(scope)`) — **não exercitado via HTTP com DB** | — | ✓ combinado | ✓ testado (setor) | ✓ | ✓ `log_authz` | **PASS** para o baseline técnico (setor), via SQL real na cadeia E2E do fechamento; escopo clínico (paciente/atendimento) **inexistente** — depende de tabelas das fases 2+ | PHASE_1_REPORT + closeout §42-A item A | **IMPLEMENTADO EM BASELINE / ESCOPO CLÍNICO PENDENTE** (conforme instrução) | PENDENTE | INSTITUCIONAL (regras clínicas de NTK) + TÉCNICA (tabelas paciente/atendimento — fases futuras) |
| SEC-019 | Break-glass | Segurança | ✓ técnica completa | ✓ `activate_break_glass` testado real | código presente `POST /security/break-glass` — **não exercitado via HTTP com DB** | ✓ `BreakGlassPage` (código; **não testada no navegador**) | ✓ (`break_glass.use`) | ✓ (bypass testado) | N/A | ✓ vinculada, testada real (`severity=warning`) | **PASS** técnico — SQL real: ativação, expiração calculada, auditoria vinculada, confirmado por SELECT | PHASE_1_REPORT (item BG-1) + revalidação | **IMPLEMENTADO / TESTADO (camada técnica)** — **POLÍTICA INSTITUCIONAL PENDENTE** | PENDENTE | INSTITUCIONAL (duração oficial, quem pode ativar) — técnica: testar via HTTP com DB e no navegador |
| SEC-020 | Auditoria de acesso | Auditoria | ✓ | ✓ `audit_events` append-only | `requirePermission` grava (via `log_authz`, camada SQL testada) | N/A | N/A | N/A | N/A | ✓ | **PASS** — `log_authz` testado real (grava `access_granted`/`access_denied` com ator/recurso/motivo/request-id corretos) | PHASE_1_REPORT + closeout item A | TESTADO | PENDENTE | nenhuma técnica |
| SEC-021 | Tentativa negada | Auditoria | ✓ | ✓ | mesma ressalva de SEC-013/018 | N/A | N/A | N/A | N/A | ✓ | **PASS** — coberto pelos mesmos testes SQL reais de SEC-018/019 (`negado_outro_setor=false`, `negado_sem_permissao=false`, ambos gravariam `access_denied` via `log_authz`) | PHASE_1_REPORT + closeout item A | TESTADO | PENDENTE | nenhuma técnica |
| SEC-022 | Acesso excepcional (auditoria) | Auditoria | ✓ | ✓ `break_glass_access.audit_id` | N/A | N/A | N/A | N/A | N/A | ✓ vinculado | **PASS** — SQL real confirma vínculo `audit_id` ↔ evento com `severity=warning` | PHASE_1_REPORT (item BG-1) | TESTADO | PENDENTE | nenhuma técnica |

---

## Divergências corrigidas nesta revisão (resumo)

| Item | Classificação anterior | Classificação corrigida | Motivo |
|---|---|---|---|
| SEC-003 | TESTADO | **PARCIAL** | Escrita de sessão só testada via SQL direto; nunca via HTTP real com banco anexado ao processo. |
| SEC-004 | TESTADO | **PARCIAL** | O teste unitário existente comprova apenas *aceitação* de token válido; não há teste de *rejeição* de token expirado. |
| SEC-008 | EM IMPLEMENTAÇÃO → proposta do usuário: PASS | **PARCIAL** | Único teste existente cobre a rejeição (401 sem sessão); o fluxo de sucesso nunca foi executado. |
| SEC-013 | TESTADO (sem distinção de camada) | TESTADO (camada SQL) / **NOT RUN** (camada HTTP `requirePermission`) | A função SQL foi testada real; o middleware HTTP nunca rodou com banco conectado. |
| SEC-015 | EM IMPLEMENTAÇÃO → proposta do usuário: IMPLEMENTADO/TESTADO | **PARCIAL** | `professional_type` existe mas não é usado por nenhuma função de autorização — confirmado por leitura do código-fonte nesta revisão. |
| SEC-017 | IMPLEMENTADO → proposta do usuário: IMPLEMENTADO/TESTADO | **PARCIAL** | `relationship_type` é armazenado mas não influencia `can_access()` — confirmado por leitura do código-fonte nesta revisão. |
| SEC-002 | (auditoria implícita) | Auditoria = **—** | A rota de logout não grava `audit_events`, apenas atualiza `app.sessions`. |

Nenhuma divergência encontrada envolveu **piorar** uma evidência positiva real (ex.:
login/logout via HTTP real, revogação real no Supabase, RBAC/NTK via SQL real,
break-glass real, rate limiting real, brute-force real, auditoria real permanecem
como estavam). As correções tratam exclusivamente de **superclassificações** — código
ou dado que existia, mas foi descrito como mais testado/funcional do que a evidência
sustenta.

## Pendências institucionais explícitas (não são bugs técnicos)

- SEC-009 — política de senha institucional.
- SEC-010 — MFA/2FA obrigatório e para quais perfis.
- SEC-014 — matriz definitiva de perfis × permissões × competência legal.
- SEC-015/SEC-017 — se a instituição decidir que profissão/vínculo devem influenciar
  autorização como dimensões próprias (hoje não influenciam), isso exigirá decisão +
  implementação futura.
- SEC-018 — regras clínicas definitivas de necessidade de saber (aguardam paciente/
  atendimento/leito/vínculo assistencial — fases 2+).
- SEC-019 — política institucional de break-glass (duração oficial, quem pode ativar).

## Pendências técnicas explícitas (não dependem de decisão institucional)

- Executar `requirePermission`, criação/revogação de `app.sessions`, e `/ready` com
  banco real **dentro do mesmo processo HTTP** — requer `DATABASE_URL`/senha de
  Postgres, ausente neste ambiente (apenas acesso administrativo via Supabase MCP).
- Criar teste de rejeição de token JWT expirado (SEC-004).
- Executar teste real do fluxo de sucesso de alteração de senha (SEC-008).
- Testar `BreakGlassPage` no navegador (código existe, não exercitado via UI).

## Nota sobre execução via HTTP com banco simultâneo (SUPERADA nesta rodada)

A nota abaixo descrevia a limitação de ambiente vigente até a revisão anterior. Nesta
rodada (microfechamento técnico), o usuário forneceu uma `DATABASE_URL` real
(transiente, usada apenas em memória/env desta sessão, nunca commitada, removida ao
final), permitindo executar a API completa com Auth + banco simultaneamente pela
primeira vez. Os itens antes marcados PARCIAL/NOT RUN por este motivo específico foram
reclassificados abaixo. Nota original mantida para histórico:

> Este ambiente não possui a senha de conexão direta ao Postgres (apenas acesso via
> Supabase MCP, usado para todas as validações reais de banco desta fase). [...]

## Microfechamento técnico (rodada final, 2026-08-19 — com DATABASE_URL real)

| Grupo | Item | Resultado | Observação |
|---|---|---|---|
| A | `requirePermission` via HTTP + banco real | **PASS** (após correção de bug real) | Ver "Bugs corrigidos" abaixo |
| B | Rejeição de JWT expirado | **PASS** | HTTP real contra JWKS local (chave de teste — não é possível forjar a chave real do Supabase) |
| C | Alteração de senha — fluxo positivo | **PASS** | Senha antiga rejeitada, nova aceita, validação de senha fraca funcionando |
| D | Sessão institucional no fluxo HTTP completo | **PASS** (após correção de bug real) | Ver "Bugs corrigidos" abaixo |
| E | `/ready` com banco conectado | **PASS** (3 cenários: db+auth ok, db down, auth down) | |
| F | Break-glass via HTTP/UI | **PASS** (camada HTTP); UI no navegador não testada nesta rodada | Autorizado 201, não autorizado 403, sem token 401, sem justificativa 400 |
| G | Profissão × vínculo no RBAC/NTK | **PENDENTE DE DECISÃO INSTITUCIONAL** | Nenhuma regra suficiente nos Documentos 1-4; confirmado que o código não usa esses campos na autorização |

### Consequência: reclassificação de linhas da matriz principal

Com as correções aplicadas e testadas via HTTP real, as seguintes linhas passam de
PARCIAL/NOT RUN para **TESTADO**: **SEC-003** (sessão criada via HTTP real,
confirmada em `app.sessions`), **SEC-005** (revogação agora efetivamente aplicada:
mesmo token pós-logout recebe 401 em `/me` e em recurso protegido), **SEC-013**
(camada HTTP de `requirePermission` agora testada com autorizado/não-autorizado/sem
token), **SEC-004** (rejeição de expirado testada via HTTP real), **SEC-008**
(fluxo de sucesso de alteração de senha testado real).

### Bugs reais encontrados e corrigidos (mínimo necessário, nenhuma refatoração)

1. **`requireAuth` travava requisições autenticadas via HTTP (bug crítico).**
   Função síncrona de 2 parâmetros que, quando a autenticação era válida, não
   lançava exceção, não retornava Promise e não chamava callback `done` — o
   Fastify aguardava indefinidamente um sinal de conclusão que nunca chegava.
   Toda requisição autenticada a rotas protegidas travava permanentemente.
   Isolado por reprodução incremental (5 variantes) até confirmação por teste
   de controle (`async` funciona, `sync` de 2 args trava). Corrigido tornando
   `requireAuth` `async` e ajustando `requirePermission` para `await` a
   chamada. Arquivo: `apps/api/src/security/require-auth.ts`. Revalidado com
   sucesso via HTTP real (200 em ~4s).

2. **Sessão revogada continuava sendo aceita (achado de segurança real,
   corrigido).** Após logout real (confirmado 403 no próprio Supabase), o
   MESMO JWT continuava sendo aceito pela nossa API (`/me`: 200; break-glass:
   201 — segunda ativação criada com token que deveria estar morto). Causa: o
   verificador de JWT só checa assinatura/emissor/audiência/expiração — nunca
   consulta revogação de sessão institucional (JWTs são stateless). Corrigido
   adicionando checagem de `app.sessions` (`revoked_at is null and
   expires_at > now()`) em `resolveRequestIdentity`. Arquivo:
   `apps/api/src/security/request-identity.ts`. Revalidado: mesmo token, após
   logout, agora recebe 401 em `/me` e em `break-glass`.

### Achado registrado, não corrigido (fora do escopo desta rodada)

- **Teste pré-existente `idempotency scope+actor+key is unique` falha
  genuinamente** (não por timeout): insere sem vincular `actor_user_id` (fica
  `NULL`), e o Postgres trata `NULL` como distinto de `NULL` em constraints de
  unicidade — a "duplicata" não viola a constraint. Nenhuma rota da Fase 1 usa
  `idempotency_keys` sem ator vinculado (infraestrutura para fases clínicas
  futuras — Doc 2 §48), logo é defeito do TESTE (cenário não realista), não
  falha de segurança explorável hoje. Não corrigido por estar fora dos 7
  grupos (A-G) desta rodada — registrado como pendência técnica.
- Três outros testes do mesmo arquivo falharam intermitentemente por timeout
  de 5000ms do Vitest — confirmado como latência de rede deste ambiente até o
  pooler do Supabase (4-8s observados repetidamente), não defeito funcional:
  todos passam com timeout ampliado (20s).

**Suíte final desta rodada:** lint PASS · typecheck PASS (backend+frontend) ·
testes **52 passed, 1 failed (real, não timeout), 0 skipped** · build PASS
(backend+frontend) · Supabase Security Advisors: **0 alertas**.

---

## Fechamento final (rodada seguinte, 2026-08-19 — mesmo dia)

### Correção do teste de idempotência

O teste `idempotency scope+actor+key is unique` foi corrigido em
`tests/integration/db.foundation.test.ts` (apenas o TESTE, nenhuma regra de
produção alterada): passou a vincular um `actor_user_id` real (usuário
descartável criado na mesma transação, desfeito pelo rollback), já que a
constraint é `(scope, actor_user_id, key)` e o Postgres trata `NULL` como
distinto de `NULL` em UNIQUE — sem ator vinculado, a "duplicata" nunca
colidia (falso positivo do teste anterior). Timeout de rede ampliado para
20s nos 4 testes deste arquivo (infraestrutura de teste, não produção).

### Resultado da suíte completa (2 execuções consecutivas, com `DATABASE_URL` real)

```
Test Files  10 passed (10)
     Tests  53 passed (53)
```

**0 FAIL, 0 SKIP**, confirmado em duas rodadas seguidas (11,9s e 16,5s). Uma
primeira tentativa nesta sessão teve 2 timeouts pontuais (blip de rede/DNS no
primeiro uso da conexão) — não reproduzido nas duas rodadas seguintes;
registrado por transparência, não escondido.

### BreakGlassPage — teste real no navegador

Fluxo completo testado via Browser tool contra API real + Supabase real:
1. Login real (`bg.ui.test@vitaloop.local.test`) → sessão válida.
2. Navegação para `#/break-glass` (SPA, sem reload).
3. **Cenário negado:** usuário sem papel atribuído → `POST
   /api/v1/security/break-glass` → **403 Forbidden** → tela exibiu "Acesso
   negado." (achado incidental do meu próprio erro de setup — vínculo de
   papel esquecido — mas serviu como evidência real e válida do caminho de
   negação).
4. Papel `break_glass.use` atribuído ao usuário via SQL.
5. **Cenário autorizado:** mesmo formulário reenviado → **201 Created** →
   tela exibiu "Acesso excepcional registrado e auditado."
6. **Auditoria confirmada via SQL:** `reason`/`justification` no banco batem
   exatamente com o texto digitado no formulário; `audit_events.action =
   'break_glass'`, `severity = 'warning'`, vinculado via `audit_id`.

**Resultado: PASS** (autorização, negação, justificativa e auditoria, todos
com evidência real de UI).

### Teste G — profissão × vínculo

Mantido **PENDENTE DE DECISÃO INSTITUCIONAL** (nenhuma implementação feita).
Nenhum documento oficial (1–4) define regra suficiente.

### Segurança final

RLS, RBAC, Need-to-Know, auditoria, sessão/revogação e JWT — todos
reconfirmados nesta rodada (via suíte de integração real + fluxo completo do
BreakGlassPage). Nenhuma vulnerabilidade nova encontrada. Advisors de
segurança do Supabase: **0 alertas**.

### Dados de teste removidos

Usuário Supabase Auth de teste excluído fisicamente. Papel/vínculos de teste
excluídos fisicamente. `app.users` de teste desativado logicamente (mesmo
padrão de sempre — FK de auditoria append-only impede exclusão física de um
usuário com histórico de auditoria). `idempotency_keys`: 0 resíduos
(transação de teste sempre com rollback). Confirmado por contagem: 0
resíduos em tabelas de negócio.

### Migrations

Nenhuma criada ou alterada nesta rodada. 16 migrations inalteradas.

### `.env` / segredos

`DATABASE_URL` removida do `.env` ao final desta rodada (mesmo padrão da
rodada anterior — uso transiente, nunca commitado).
