# VITALOOP 1.3 — Relatório Técnico — Fase 2 / Etapa 3 de 6

**Frontend de Cadastro e Identificação do Paciente**
**Data:** 2026-08-20
**Escopo desta rodada:** implementação do frontend consumindo exclusivamente os
endpoints reais já implementados e testados na Etapa 2/6. Nenhum backend, banco,
migration, RLS, RBAC ou regra de domínio foi alterado.

---

## 1. Arquivos criados/alterados

**Novo:**
- [`apps/web/src/lib/patients-api.ts`](../apps/web/src/lib/patients-api.ts) — wrapper tipado sobre os endpoints reais (DTOs de fio, nenhuma regra de negócio).
- [`apps/web/src/components/DuplicateWarning.tsx`](../apps/web/src/components/DuplicateWarning.tsx) — representação dos 3 cenários de duplicidade.
- [`apps/web/src/pages/PatientSearchPage.tsx`](../apps/web/src/pages/PatientSearchPage.tsx) — busca/identificação.
- [`apps/web/src/pages/PatientRegisterPage.tsx`](../apps/web/src/pages/PatientRegisterPage.tsx) — cadastro.
- [`apps/web/src/pages/PatientDetailPage.tsx`](../apps/web/src/pages/PatientDetailPage.tsx) — identificação + dados complementares.
- `apps/web/src/pages/PatientSearchPage.test.tsx`, `PatientRegisterPage.test.tsx`, `PatientDetailPage.test.tsx` — 23 testes de UI.
- [`apps/web/vitest.setup.ts`](../apps/web/vitest.setup.ts) — cleanup do React Testing Library entre testes.

**Alterado:**
- [`apps/web/src/lib/api-client.ts`](../apps/web/src/lib/api-client.ts) — adicionado `patch()`, header customizável em `post()`, e `details` no `ApiError` (necessário para ler os candidatos de duplicidade retornados pela API — nenhum endpoint novo, apenas leitura de um campo que a API já retornava).
- [`apps/web/src/App.tsx`](../apps/web/src/App.tsx) — rotas `/pacientes`, `/pacientes/novo`, `/pacientes/:id` (roteador hash já existente, estendido para aceitar segmento dinâmico).
- [`apps/web/src/pages/ProfilePage.tsx`](../apps/web/src/pages/ProfilePage.tsx) — link de navegação para `#/pacientes` (1 linha).
- [`apps/web/package.json`](../apps/web/package.json) — devDependencies de teste (`@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`) — nenhuma dependência de produção adicionada.
- [`vitest.config.ts`](../vitest.config.ts) — inclui `*.test.tsx`, registra `apps/web/vitest.setup.ts`.

**Nenhum arquivo de `apps/api/src/`, `packages/domain/src/`, ou `db/migrations/` foi alterado.**

## 2. Telas/componentes implementados

- **Busca/identificação** (`PatientSearchPage`): busca por nome, CPF, CNS, prontuário; resultados com nome, nome social, prontuário, nascimento e CPF mascarado (Doc 1 §12 — identificação inequívoca sem expor mais dado do que a listagem exige); estado vazio explícito; link para cadastro.
- **Cadastro** (`PatientRegisterPage`): todos os campos de PAT-006 (nome completo, nome social, mãe, nascimento, sexo, CPF, CNS, RG, telefone, endereço, município, estado); validação de nome obrigatório no cliente; erros de CPF/CNS/servidor exibidos a partir da resposta real da API (nenhuma regra de validação duplicada); estado de sucesso com prontuário gerado.
- **Aviso de duplicidade** (`DuplicateWarning`, componente reutilizável): distingue visualmente forte/fraca/conflito; conflito exige reconhecimento explícito (checkbox) antes de habilitar a confirmação — nunca equiparado a duplicidade rotineira de um clique, mas usa o MESMO mecanismo de confirmação que a API já expõe (`confirmDuplicate`), sem inventar uma decisão nova.
- **Identificação/detalhe** (`PatientDetailPage`): cabeçalho com exatamente os itens do Doc 1 §12 (nome, nome social, prontuário, CPF/CNS, nascimento/idade, sexo, mãe, status); seções de contatos, alergias (com mudança de status), antecedentes, medicamentos contínuos e problemas ativos — cada uma com listagem + formulário de adição.

## 3. Endpoints utilizados

Exclusivamente os já implementados na Etapa 2/6: `POST/GET/PATCH /api/v1/patients`, `GET /api/v1/patients/:id`, `POST/GET /api/v1/patients/:id/{contacts,allergies,antecedents,continuous-medications,active-problems}`, `PATCH /api/v1/patients/:id/allergies/:allergyId`. **Nenhum endpoint novo foi criado.** (`detectDuplicates`/`listDuplicates`/`requestMerge` foram incluídos no wrapper `patients-api.ts` para uso futuro da Etapa 4+, mas nenhuma tela desta rodada os invoca — não há UI para revisão de duplicidade/merge nesta etapa, fora do escopo do cadastro básico.)

## 4. Testes realizados e resultado

**23/23 PASS** (`@testing-library/react` + `jsdom`, `useSession` mockado — sem rede real; a API real já foi validada com evidência na Etapa 2/6).

| # | Cenário | Arquivo | Resultado |
|---|---|---|---|
| 1 | Abertura da tela | RegisterPage | PASS |
| 2 | Carregamento | SearchPage | PASS |
| 3 | Formulário vazio | RegisterPage | PASS |
| 4 | Validação de obrigatórios | RegisterPage | PASS |
| 5 | CPF inválido | RegisterPage | PASS |
| 6 | CNS inválido | RegisterPage | PASS |
| 7 | Cadastro válido | RegisterPage | PASS |
| 8 | Tratamento de sucesso | RegisterPage | PASS |
| 9 | Erro da API | RegisterPage | PASS |
| 10 | Paciente duplicado (forte) | RegisterPage | PASS |
| 11 | Conflito de identidade | RegisterPage | PASS |
| 12 | Busca por nome | SearchPage | PASS |
| 13 | Busca por CPF | SearchPage | PASS |
| 14 | Busca por CNS | SearchPage | PASS |
| 15 | Busca por prontuário | SearchPage | PASS |
| 16 | Ausência de resultados | SearchPage | PASS |
| 17 | Erro 403 | SearchPage | PASS |
| 18 | Sessão expirada (401) | SearchPage | PASS |
| 19 | Contatos | DetailPage | PASS |
| 20 | Alergias | DetailPage | PASS |
| 21 | Antecedentes | DetailPage | PASS |
| 22 | Medicamentos | DetailPage | PASS |
| 23 | Problemas | DetailPage | PASS |

### Achados corrigidos durante a rodada

- Atributo HTML `required` no campo nome interceptava o `submit` via validação nativa do navegador antes do handler React rodar — impedia a mensagem de erro customizada de aparecer. Removido; validação passou a ser feita inteiramente pelo código (mensagem amigável, consistente com os demais erros da tela).
- `@testing-library/react` não limpava o DOM entre testes (projeto não usa `globals: true` no Vitest) — causava `getByRole`/`getByLabelText` encontrarem elementos duplicados entre casos. Corrigido com `afterEach(cleanup)` explícito em `apps/web/vitest.setup.ts`.

## 5. Suíte completa

`npx vitest run` (monorepo inteiro): **132 passed / 26 skipped** (skips são os testes de integração real com Supabase, que exigem `DATABASE_URL` — não fornecida nesta rodada, sem regressão). Nenhum teste pré-existente quebrou.

## 6. Lint / typecheck / build

- `eslint .`: **0 erros/avisos** (projeto inteiro, incluindo os novos arquivos).
- `tsc --build` (monorepo) e `tsc --noEmit -p apps/web`: **0 erros**.
- `npm run build --workspaces`: **sucesso** em todos os pacotes, incluindo `vite build` do frontend (bundle gerado sem erros).
- Verificação visual: dev server (`apps/web`) sobe sem erros de console; rota `#/pacientes` renderiza o estado "Carregando…" corretamente sem sessão (mesmo comportamento já existente em todas as rotas protegidas do projeto, não uma regressão desta rodada).

## 7. Pendências

- Tela de revisão de duplicidade persistida (`GET/PATCH /duplicates`) e de solicitação/aprovação de merge — os métodos já existem no wrapper `patients-api.ts`, mas nenhuma UI foi construída para eles nesta rodada (fora do escopo explícito: "cadastro e identificação", não revisão administrativa).
- Nenhuma tela de inativação de paciente (endpoint ainda não existe na Etapa 2).
- Acessibilidade: revisão formal (contraste, navegação por teclado ponta a ponta) não foi feita — os componentes seguem os padrões semânticos já usados no restante do projeto (`role="alert"`/`role="status"`, `<label htmlFor>`), mas uma auditoria dedicada de acessibilidade está fora do escopo desta rodada.
- **Nenhuma pendência de backend/banco foi identificada** — nenhuma necessidade de alteração de migration, RLS, RBAC ou domínio surgiu durante a implementação; a API da Etapa 2/6 já era suficiente para tudo o que esta rodada exigia.

## 8. Requisitos PAT-001–PAT-017 afetados

PAT-001 a PAT-013 avançam de "API testada, frontend não iniciado" para **Frontend TESTADO** (formulários e listagens reais, cobertos por teste). PAT-014 (timeline) e PAT-015/016 (duplicidade/merge administrativos) permanecem sem UI dedicada nesta rodada — PAT-015 tem cobertura PARCIAL (o aviso de duplicidade na criação usa a mesma detecção, mas a tela de revisão de candidatos não existe). PAT-017 (auditoria) não tem UI própria (não especificada nos Documentos para esta etapa).

## 9. Confirmação: backend/banco/migrations NÃO alterados

- Nenhum arquivo em `apps/api/src/` foi criado ou modificado.
- Nenhum arquivo em `packages/domain/src/` foi criado ou modificado.
- `db/migrations/` permanece com 21 arquivos (`0001`–`0021`) — nenhuma migration nova, nenhuma edição.
- Nenhum dado foi criado no banco pelo frontend (a suíte de testes é 100% mockada, sem chamadas de rede reais).
- Nenhum endpoint novo foi criado na API.

## 10. Confirmação: Etapa 4/6 NÃO iniciada

Nenhum módulo clínico (atendimento, triagem, prescrição etc.) foi tocado. Nenhuma Timeline clínica completa foi implementada (apenas o evento `PatientRegistered`, já existente desde a Etapa 2). Nenhum Need-to-Know clínico definitivo foi implementado.

---

**Etapa 3/6 (Frontend de Cadastro e Identificação): implementada e testada.**
**Etapa 4/6 NÃO iniciada — aguardando autorização explícita.**
