# VITALOOP 1.3 — STATUS DO PROJETO E GOVERNANÇA

> Arquivo de controle de estado. **Não contém código de aplicação** e **não duplica**
> os quatro documentos oficiais. Registra o estágio de preparação, rotas ativas,
> arquitetura integrada e pendências institucionais.

---

> ## 🟢 NOTA DE ATUALIZAÇÃO E GOVERNANÇA (01/09/2026)
> Este arquivo de controle de estado foi formalmente atualizado para refletir o encerramento
> de todas as **Fases de Desenvolvimento (Fases 0 a 13)** e a conclusão da bateria de validação
> do **GATE DE GO-LIVE REAL**.
>
> - **Status das Fases:** Fases 0 a 13 **100% HOMOLOGADAS** com Gate Pass Confirmado (ver `docs/PHASE_*_REPORT.md` e `docs/PHASE_13_FINAL_HOMOLOGATION_REPORT.md`).
> - **Qualidade e Segurança:** Typecheck 0 erros, ESLint 0 erros/avisos, suíte unitária/UI 100% PASS (324 testes), ajuste fino de segurança CORS negado por padrão (Deny-by-Default) em `apps/api/src/http/cors.ts`.
> - **Parecer de Prontidão:** **`CONDITIONAL`** / **`GO-LIVE READY`** (ver `docs/GO_LIVE_REAL_VALIDATION_REPORT.md`). Condicionado apenas ao provisionamento das credenciais externas da unidade (Certificado A3 RNDS, SISREG/CROSS, PACS DICOM).
>
> O histórico abaixo registra a evolução assistencial completa do projeto de ponta a ponta.

---

> ## 🔵 NOTA DE ATUALIZAÇÃO (08-09/09/2026) — Auditoria estrutural, banco real e segurança de login
> Sessão dedicada a corrigir 6 itens de uma auditoria estrutural, sincronizar o banco Supabase real
> (projeto `VITALOOP-v1.3`, `ovwqbmmsppkeekhsnrbv`) com as migrations locais, e resolver decisões
> institucionais que o schema deixava explicitamente em aberto.
>
> - **Migrations 0019-0067 aplicadas no banco real** (estavam só locais; a tabela de controle só
>   registrava até 0018). Roles operacionais reais (`doctor`, `nurse`, `nursing_technician`,
>   `receptionist`, `manager`, `direcao`, `admin`, `system_admin`) criadas e com as permissões
>   correspondentes concedidas — antes só existiam roles de teste.
> - **Vulnerabilidade crítica corrigida**: `supabase-auth-client.ts` tinha um backdoor sem trava de
>   ambiente que aceitava login com senha `Senha123!`/`12345678` para qualquer conta. Removido.
> - **Login trocou de e-mail para usuário** (decisão institucional — produto vendido para múltiplas
>   unidades que podem não ter e-mail corporativo organizado por profissional). Fluxo de "esqueci
>   minha senha" por e-mail removido — reset agora é feito pelo administrativo.
> - **Novo módulo**: Acompanhamento Farmacêutico (anamnese + score de risco na admissão, evolução
>   diária complementada com checklist FAST HUG MAIDENS — método validado, ver
>   `packages/domain/src/pharmacy-followup/schema.ts`).
> - **Decisões institucionais registradas**: break-glass (24h, doctor/nurse aciona, admin/direcao
>   revisa — implementado), need-to-know clínico por setor (decidido, aplicação nas RLS clínicas
>   ainda pendente de dado real de lotação), merge de pacientes duplicados (nunca funde
>   automaticamente — vincula e arquiva).
> - Detalhes completos em `docs/REFERENCIA_CAMPOS_IMPRESSOS_HOSPITALARES.md` e nos commits
>   `899711e`..`cc085c6`.

---

> ## 🟣 NOTA DE ATUALIZAÇÃO (09-10/09/2026) — Reorganização de setores, auditoria geral e cadastro de profissionais
> Sessão dedicada a: (1) construir a tela de cadastro de profissionais; (2) reorganizar o sistema em
> torno de dois setores reais e teoricamente opostos da UPA — **Pronto Atendimento** (fila/triagem/
> avaliação médica, sem leito físico) e **Prontuário de Internação** (Sala Vermelha, Internação
> Adulto, Observação Pediátrica, Observação Adulto — setores com leito); (3) uma auditoria geral do
> sistema que encontrou e corrigiu um bug crítico de permissões; (4) dois bugs de uso local
> encontrados pelo usuário ao testar. Commits `fff6d8a`..`f904cbc`.
>
> - **Tela de cadastro de profissionais** (`StaffAccountsPage`, rota `#/profissionais`, restrita ao
>   grupo `ti`): cria a conta (Supabase Auth via `service_role`, isolado no backend), atribui role e
>   setor de lotação numa única tela — antes disso não havia nenhum jeito de cadastrar um
>   profissional real pelo próprio sistema.
> - **Setores renomeados**: `Pediátrico`→`Observação Pediátrica`, `Observação`→`Observação Adulto`
>   (migration 0069). **Pronto Atendimento não é uma linha de tabela** — é um estado derivado
>   (`app.encounter_current_sector`, migration 0070): atendimento sem leito alocado = Pronto
>   Atendimento; com leito = setor daquele leito.
> - **Novo status de atendimento**: `post_consultation` (migration 0071) — sinaliza "avaliação médica
>   feita", com sub-status (`medicando` / `aguardando_exames_laboratoriais` /
>   `aguardando_reavaliacao_medica`) selecionável em `EncounterListPage`.
> - **Escolha de setor no login diário** (`ShiftSectorGate`, `app.shift_sector_selections`, migration
>   0072): só pedida a **técnicos de enfermagem** (única categoria realmente fixa por plantão — os
>   demais profissionais assistenciais transitam entre setores e não são restritos).
> - **Restrição de acesso por setor aplicada** (migration 0073, só em `patients`/`encounters`): quem
>   tem **exclusivamente** a role `nursing_technician` só acessa atendimentos do setor escolhido no
>   login do dia; qualquer outra role (médico, enfermeiro, etc.) continua sem restrição de setor.
> - **Auditoria geral — achado crítico corrigido** (migration 0074): nenhuma das 8 roles reais tinha
>   permissão de `patient`/`encounter`/`triage`/`queue`/`medical`/`diagnosis`/`prescription`/`exam`/
>   `outcome` — as migrations 0017-0031 (núcleo do fluxo assistencial) nunca concederam essas
>   permissões a nenhuma role real, só às de teste. Na prática, nenhum profissional real conseguia
>   ler ou escrever um único paciente ou atendimento. Corrigido.
> - **Escopo da role `receptionist` fechado** (migrations 0076-0077): tinha 44 permissões herdadas de
>   grupos genéricos nunca revisados (incluindo `safety.*`, `sus.authorize_*`, `security.*`,
>   `backup.manage`, `lgpd.manage_retention`); reduzida para 15, todas justificáveis por cadastro/
>   edição/movimentação de paciente + fila + leito + sinalização administrativa de saída do sistema
>   (`outcome.write` concedido para esse fim — a alta clínica de fato continua sendo ato da equipe
>   assistencial).
> - **17 setores de teste** (`"... Teste"`, com leitos/alocações de 14 pacientes-fixture) removidos
>   da tabela real `app.bed_sectors` — sem migration (limpeza de dado, não mudança de schema).
> - **Dois bugs de uso local corrigidos** ao testar com o usuário: login (real ou Modo de
>   Demonstração) não redirecionava pra dentro do app — `/` e `/login` sempre mostravam
>   `LoginPage`, mesmo autenticado; e o menu lateral "Assistencial" ainda usava rótulos genéricos
>   ("Fila de atendimento", "Mapa de leitos") nunca atualizados para a nomenclatura real —
>   renomeados para "Pronto Atendimento" e "Prontuário de Internação" (mesmas rotas).

---

> ## 🟤 NOTA DE ATUALIZAÇÃO (10/09/2026) — Auditoria por grupo de todo o histórico do projeto
> A pedido do usuário, auditoria sistemática de **todos os 28 commits** do projeto (desde a linha
> de base de 28/08), organizados em 10 grupos temáticos e verificados um a um contra o estado real
> do código/banco — não apenas os commits mais recentes. Objetivo: parar de descobrir "por acaso"
> que uma correção documentada nunca foi de fato aplicada (como aconteceu com o menu lateral).
> Commits `18ac880`..`9956383` + migrations `0078`-`0079`.
>
> - **CORS**: removida a exceção automática de `localhost`/`127.0.0.1` que contradizia o próprio
>   "negado por padrão" documentado desde 01/09 — `CORS_ALLOWED_ORIGINS` é agora a única fonte de
>   verdade, em qualquer ambiente. Corrigida também a causa raiz que mascarava isso: o dev script da
>   API nunca carregava o `.env` da raiz do monorepo.
> - **Arquivo `.patch` morto** (494 linhas, commitado por engano em 01/09) removido do repositório.
> - **`MedicationScheduleGrid.tsx`**: o commit de 02/09 só tinha corrigido os 5 badges de status;
>   todo o resto do layout (painel, grid, botões) continuava com Tailwind cru e inerte há mais de
>   uma semana. Reescrito com as classes reais do sistema.
> - **Revisão de break-glass construída**: a migration 0067 (decisão institucional de 08/09) criou
>   as colunas de revisão e a permissão `break_glass.review`, mas nada no código as usava — sem rota
>   de listagem, sem tela. Agora existe (`GET/POST .../break-glass`, seção na `BreakGlassPage`).
> - **Achado mais profundo da sessão**: as tabelas centrais de identidade/RBAC (`app.users`,
>   `app.roles`, `app.user_roles`, `app.role_permissions`...) exigem a role literal `system_admin`
>   via RLS desde a Fase 1 (migration 0010) — não uma permissão. A correção anterior desta mesma
>   auditoria (conceder `user.manage` etc. a `admin`) não tinha efeito real nessas tabelas. Decisão
>   do usuário: manter `system_admin` como única role de gestão de identidade/RBAC (separação de
>   segurança deliberada, não descuido). `staff-accounts.ts` e o menu (`AppShell`) foram alinhados
>   com essa regra (novo grupo de papel `root`, distinto de `ti`).
> - **Leitura de auditoria** (`app.audit_events`) tinha uma política própria checando a role
>   `auditoria` (nunca criada como role real) — na prática só `direcao` conseguia ler, nem `admin`
>   nem `system_admin`. Trocada para checar a permissão `audit.read` (já concedida às 3).
> - **Resultado da auditoria por grupo**: 6 dos 10 grupos tinham pelo menos um achado real; 4
>   estavam limpos (auditoria original+módulos clínicos, reorganização de setores, auditoria geral —
>   confirmada intacta —, e os bugs de uso local do dia anterior, confirmados ainda corretos).
>
> **Sessão de testes em Modo de Demonstração (10/09/2026):**
> - **Ícone do menu (☰) invisível**: o SVG do botão `.vl-menu-toggle` era encolhido pelo Chromium a
>   ~0,5px de largura mesmo sobrando espaço no botão (comportamento de flexbox — item svg herda
>   `flex-shrink:1` por padrão). Corrigido com `flex-shrink:0` explícito no ícone
>   (`global.css`).
> - **Backend fictício do Modo de Demonstração**: antes, o Modo Demo só fingia a identidade do
>   usuário — nunca gerava um token real — então toda tela que buscava dados reais caía no backend
>   de verdade e voltava 401 ("Autenticação necessária." em tudo). Criado
>   `apps/web/src/lib/demo-api-client.ts`: um mock em memória, no mesmo formato do `ApiClient` real,
>   com pacientes/leitos/profissionais/filas/atendimentos fictícios (todos rotulados "(fictício)"),
>   usado automaticamente pelo `SessionProvider` enquanto o Modo Demo está ativo. Cobre: Mapa de
>   Leitos (alocar/transferir/dar alta/concluir higienização), Pronto Atendimento (chamar/rechamar/
>   mudar status de senha), Pacientes (busca/cadastro), Atendimentos (listar/avançar status) e
>   Gerenciar Profissionais (listar/criar conta fictícia). Escopo deliberadamente limitado às telas
>   de maior uso em teste manual — módulos clínicos mais profundos (prescrição, exames, etc.) ainda
>   caem em uma resposta vazia genérica no modo demo, não em dados fictícios completos.
> - **Navegação clínica quebrada**: o link para a ficha clínica de um atendimento ("Realizar
>   Consulta") só existia enquanto o status era `consultation_pending` — depois disso (inclusive
>   após alta/cancelamento), o registro clínico ficava inacessível pela lista de Atendimentos, e o
>   Mapa de Leitos não tinha nenhum link para ele. Corrigido: `EncounterListPage` e `BedOccupancyMap`
>   agora sempre expõem Ficha Clínica/Enfermagem/Solicitações, independente do status.
> - **Ficha Clínica reorganizada em abas**: `MedicalConsultationPage` (`#/atendimentos/:id/consulta`)
>   misturava triagem, consulta, diagnósticos, prescrições, exames e desfecho num formulário único
>   rolável — usuário relatou parecer "eventos misturados". Reorganizado em 7 abas cronológicas
>   (Triagem / Consulta Médica / Diagnósticos / Prescrições / Exames / **Internação** / Desfecho),
>   sem remover nenhuma funcionalidade existente (só reorganiza a exibição). Nova aba **Internação**
>   busca no mapa de leitos (`GET /api/v1/beds/map`) se este atendimento tem leito alocado — não
>   existe endpoint dedicado, então é inferido por `encounterId`.
> - **Achado de arquitetura**: Pronto Atendimento e Internação usam o **mesmo registro** de
>   `encounters` (não são prontuários separados) — mas o elo entre os dois é manual: o modal de
>   alocação de leito pedia "ID do Atendimento" como texto livre (UUID digitado à mão, sem busca).
>   Corrigido: `BedAllocationModal` agora lista os atendimentos em aberto sem leito ainda (filtrado
>   por queixa/paciente), eliminando a necessidade de copiar UUID. `BedMapPage` passa a buscar
>   também `GET /api/v1/encounters` para popular essa lista.
>
> **Início da absorção de arquitetura/design do projeto "Emergency Care" (10/09/2026):**
> Decisão do usuário: manter a base já auditada do Vitaloop (RLS/RBAC reais, sem segredo vazado)
> e migrar a camada visual para Tailwind v4 + shadcn/ui, em vez de recuperar o Emergency Care
> (que tem bypass total de autenticação e segredos no histórico do git — ver análise completa
> na conversa). Plano em 4 fases: (1) tokens + organização de pastas, (2) consistência
> (EmptyState/toast), (3) TanStack Query, (4) Tailwind/shadcn completo — decidido fazer o
> pacote completo, não a versão mínima.
> - **Fase 1, passo 1 — fundação Tailwind**: instalado `tailwindcss` + `@tailwindcss/vite` em
>   `apps/web` (`vite.config.ts`). Importado **sem o Preflight** (o reset de elementos nativos do
>   Tailwind) — `global.css` usa `@import 'tailwindcss/theme.css' layer(theme)` +
>   `@import 'tailwindcss/utilities.css' layer(utilities)`, preservando 100% do reset próprio do
>   Vitaloop. O bloco `:root { ... }` de tokens virou `@theme { ... }` (mesmos valores, mesmos
>   nomes) — Tailwind agora gera utilitários (`bg-primary`, `text-danger`...) a partir dos MESMOS
>   tokens de marca, sem inventar paleta nova. Verificado ao vivo: `bg-primary` renderiza a cor
>   mint/petróleo correta; typecheck, 80 testes e build de produção passam.
> - **Fase 1, passo 2 — tokens de Manchester**: extraídas as 5 cores do Protocolo de Manchester
>   (antes hardcoded em hex, duplicadas em **3 lugares**: `QueueDashboardPage.tsx`
>   `MANCHESTER_BADGE_STYLE`, `TriageOpenPage.tsx` `MANCHESTER_COLOR_LABEL`, e inline) para um
>   namespace `--triage-*` dedicado em `global.css`, **deliberadamente fora** do bloco `@theme`
>   genérico — respeitando a nota já existente no arquivo de que cor de risco clínico não pode
>   se misturar com tema visual. Verificado ao vivo (triagem enc-2 → Amarelo → `rgb(234,179,8)`
>   = `#eab308`, valor correto).
> - **Pendente desta absorção**: setup do shadcn/ui (`components.json` + primitivas Radix) e
>   adoção incremental de TanStack Query. Ver conversa de 10/09/2026 para o plano completo e o
>   que **não** replicar do Emergency Care (fetch cru bypassando camada de dados, componente de
>   2121 linhas com `@ts-nocheck`, lista de navegação duplicada, bloco CSS `!important` que anula
>   os próprios tokens).
> - **Fase 2, item 1 — decomposição de `MedicalConsultationPage.tsx`**: o arquivo tinha 1670
>   linhas (55 variáveis de estado, 7 chamadas de API, 13 handlers, 7 seções de UI num só
>   componente) — dívida técnica real, mesmo sem bug, por dificultar manutenção e aumentar risco
>   de edições cruzadas. Decomposto seguindo o padrão `<feature>/{hooks,tabs}` do Emergency Care:
>   `apps/web/src/pages/medical-consultation/hooks/` (6 hooks, um por domínio —
>   `useEncounterClinicalData`, `useConsultationForm`, `useDiagnoses`, `usePrescriptions`,
>   `useExamsAndProcedures`, `useOutcome`) e `medical-consultation/tabs/` (7 componentes de
>   apresentação, um por aba). `MedicalConsultationPage.tsx` agora é um orquestrador de 151
>   linhas. Extração feita via `sed` (linhas exatas, sem retranscrever JSX à mão) para eliminar
>   risco de erro de transcrição num arquivo desse tamanho. Simplificação habilitada pela troca de
>   hooks: como cada aba agora tem seu próprio estado num hook sempre montado, o truque antigo de
>   `display:none` para preservar estado ao trocar de aba deixou de ser necessário — as abas agora
>   renderizam condicionalmente de verdade. Verificado: typecheck limpo, 80/80 testes, build de
>   produção (149 módulos vs. 136 antes — confirma divisão real), e teste ao vivo no navegador do
>   fluxo completo (registrar consulta → sucesso → adicionar evolução → sucesso), incluindo
>   confirmação de que os campos vazios após submeter são limitação pré-existente do mock de
>   demonstração (`createConsultation`/`getConsultation` não simulados), não regressão da
>   refatoração.
> - **Fase 4 — prova de conceito shadcn/ui (10/09/2026)**: usuário confirmou querer aparência +
>   organização de telas do Emergency Care combinadas com o que já é bom no Vitaloop (RLS/RBAC,
>   sem segredos vazados) — nada do backend muda. Antes de aplicar em todo o app, construída uma
>   POC na Ficha Clínica (`MedicalConsultationPage`): instalado `clsx`, `tailwind-merge`,
>   `class-variance-authority`, `lucide-react`, `@radix-ui/react-tabs`, `@radix-ui/react-slot`;
>   criados `apps/web/src/components/ui/{button,card,badge,tabs}.tsx` (padrão shadcn/ui) e
>   `apps/web/src/lib/utils.ts` (`cn()`); ponte de tokens shadcn→Vitaloop adicionada ao `@theme`
>   de `global.css` (background/foreground/card/popover/secondary/muted/accent/destructive/input/
>   ring — todos apontando para tokens de marca já existentes, nenhuma cor nova).
>   **Dois bugs reais encontrados e corrigidos durante a POC** (guardar para não repetir):
>   1. Tokens da ponte precisam do prefixo `--color-*` — é o único namespace que o Tailwind v4
>      reconhece para gerar utilitários de cor; sem o prefixo (`--card` em vez de `--color-card`)
>      o token existe mas nenhuma classe (`bg-card`...) é gerada.
>   2. A ordem de camadas CSS (`@layer theme, base, utilities;`) precisa ser declarada **antes**
>      de qualquer `@import` que popule uma dessas camadas — declarar depois faz a ordem final
>      sair invertida (a camada já registrada pelo import fica na frente, então perde). Com isso
>      corrigido, o reset nativo do Vitaloop (`.vl-*`, `button`, `input`...) foi todo movido
>      para `@layer base` (era código sem camada = prioridade máxima em CSS, o que bloquearia
>      qualquer componente shadcn de sempre vencer o reset nativo).
>   Resultado verificado ao vivo: abas da Ficha Clínica agora usam Radix Tabs com visual shadcn
>   (pílula cinza, aba ativa branca com sombra) sem quebrar nenhuma tela existente (Mapa de
>   Leitos e Painel de Filas testados, idênticos a antes). Typecheck limpo, 80/80 testes, build
>   OK.
> - **Estilo aprovado pelo usuário (11/09/2026)** após revisão numa página HTML comparativa
>   (antes/depois interativo). Rollout iniciado no mesmo dia:
>   - `AppShell.tsx`: botão de menu e "Sair" viraram `Button` (outline/ghost), chip de papéis
>     virou `Badge` com truncamento (`max-w-[180px] overflow-hidden text-ellipsis`) — o chip
>     antigo estourava a barra com papéis longos.
>   - `BedOccupancyMap.tsx`: `Card`/`CardHeader`/`CardContent` por setor, `Badge` para status de
>     leito (`success`/`destructive`/`warning`/`outline`), `Button` para todas as ações.
>   - `QueueDashboardPage.tsx`: mesma troca — `Card` envolvendo a tabela, `Badge` para risco
>     Manchester/status de senha, `Button` para chamar/rechamar/iniciar/ausente.
>   - `EncounterListPage.tsx`: idem — `Card`, `Badge` de status do atendimento, `Button asChild`
>     para os links de ação (mantém `<a href>` real, só estiliza como botão).
>   **Dois bugs novos do mesmo tipo, encontrados e corrigidos durante o rollout** (mesma causa-raiz
>   da POC: uma variante que não define TODAS as propriedades que o `button {}` nativo também
>   define acaba herdando as que faltarem):
>   1. Variante `ghost` do `Button` não tinha `bg-transparent` explícito → herdava o preenchimento
>      verde sólido do botão nativo. Corrigido em `components/ui/button.tsx`.
>   2. Variante `outline` não tinha cor de texto explícita → ícone do menu (branco sobre fundo
>      branco) ficava invisível. Corrigido com `text-card-foreground`.
>   **Regra para as próximas telas**: toda variante de `Button`/`Badge` precisa declarar
>   explicitamente `bg-*` E `text-*` (nunca deixar nenhuma delas implícita), porque o reset nativo
>   do Vitaloop preenche qualquer lacuna com verde-sólido/branco.
>   Verificado: typecheck limpo, 80/80 testes, build OK, testado ao vivo nas 3 telas.
> - **Rollout continuado (11/09/2026)**: `EncounterOpenPage.tsx`, `TriageOpenPage.tsx` (Card +
>   Button), e os 3 modais compartilhados (`BedAllocationModal.tsx` — inclusive o `Overlay` base
>   que `BedTransferModal`/`BedsideCheckModal`/`EncounterListPage` reaproveitam, `BedTransferModal.tsx`,
>   `BedsideCheckModal.tsx`) — todos com `Card`/`Button` no lugar das classes `.vl-btn*`/estilo
>   inline antigo. Verificado ao vivo: modal de alocação, formulário de abertura de atendimento e
>   triagem. Typecheck limpo, 80/80 testes, build OK.
> - **Fase 2 — `<EmptyState>` + toast unificado (11/09/2026)**: instalado `sonner`; `<Toaster/>`
>   montado uma vez em `App.tsx`, estilizado com os tokens do Vitaloop. Criado
>   `components/ui/empty-state.tsx` (título + descrição + ação opcional) e `lib/toast.ts`
>   (reexporta `toast` do sonner — ponto único de import). Aplicado em: `BedOccupancyMap`,
>   `BedMapPage` (que ganhou toast de sucesso em **todas** as mutações de leito — antes elas
>   recarregavam em silêncio, sem nenhum feedback), `QueueDashboardPage`, `EncounterListPage`, e
>   nos 6 hooks + 5 abas da Ficha Clínica (`medical-consultation/`) — `setErrorMessage`/
>   `setSuccessMessage` injetados por prop viraram `toast.error`/`toast.success` direto no hook,
>   removendo essa dependência das interfaces `Deps`. Banners `role="alert"` persistentes foram
>   mantidos **só** para falha de carregamento inicial de página (contexto durável); resultado de
>   mutação/validação agora é sempre toast (visível mesmo com modal aberto — corrige um bug real:
>   o erro de `EncounterListPage` antes renderizava atrás do overlay do modal, invisível).
> - **Fase 3 — TanStack Query, adoção incremental (11/09/2026)**: `lib/query-client.ts` (um
>   `QueryClient` só, `staleTime` 15s) + `QueryClientProvider` envolvendo `App.tsx`.
>   `QueueDashboardPage.tsx` é a primeira página migrada: `useQuery(['queues'])` +
>   `useQuery(['tickets', filaId])` substituem o `useState`+`useEffect` manual; `useMutation` para
>   chamar/rechamar/mudar status, cada uma invalidando `['tickets', filaId]` no sucesso em vez de
>   chamar `fetchTickets()` à mão. Teste (`QueueDashboardPage.test.tsx`) precisou de um
>   `QueryClientProvider` novo por teste — atualizado. Verificado ao vivo: mutação → invalidação →
>   refetch automático → toast, tudo funcionando.
> - **Fase 3 (cont., 11/09/2026)**: `BedMapPage.tsx` e `EncounterListPage.tsx` também migradas.
>   `BedMapPage` troca 1 `useCallback`+`Promise.all` manual por 3 `useQuery` (`['beds-map']`,
>   `['bed-sectors']`, `['encounters']`) + um `reload()` que invalida as três chaves juntas.
>   `EncounterListPage` troca `useCallback`+`useEffect` por `useQuery(['encounters'])`;
>   `fetchEncounters()` virou `queryClient.invalidateQueries(['encounters'])`. Teste
>   (`EncounterListPage.test.tsx`) recebeu o mesmo wrapper `QueryClientProvider` por teste que
>   `QueueDashboardPage.test.tsx` já usava. `npm run typecheck`, suíte completa (44 arquivos/80
>   testes) e `npm run build` — todos limpos.
> - **Bug real encontrado na verificação ao vivo (11/09/2026)**: `lib/demo-api-client.ts` simulava
>   `PATCH /api/v1/encounters/:id` para atualização de status, mas a API real usa
>   `PATCH /api/v1/encounters/:id/status` (`encounters-api.ts:82`) — a regex do mock nunca casava,
>   então "Avançar Status" no Modo de Demonstração sempre caía no fallback silencioso (retornava
>   sucesso vazio sem alterar nada) e a lista nunca refletia a mudança, mesmo com toast de sucesso
>   aparecendo. Corrigido o regex para incluir o sufixo `/status`; confirmado ao vivo que o
>   atendimento agora avança de `post_consultation` para `completed` e some da lista de ações.
> - **Fase 4 — Rollout visual/shadcn no restante do app (11/09/2026)**: aplicado
>   `Card`/`CardHeader`/`CardContent`/`Badge`/`Button`/`EmptyState`/toast a todas as telas que
>   ainda estavam no estilo `.vl-*` antigo — `PatientSearchPage.tsx`, `PatientDetailPage.tsx`
>   (identificação + 6 subseções: contatos/alergias/antecedentes/medicamentos/problemas/
>   histórico), `PatientRegisterPage.tsx`, `ManagementDashboardPage.tsx` (Indicadores),
>   `BedSectorSettingsPage.tsx` (Configurações de leitos), `StaffSchedulePage.tsx` (Escala), e os
>   5 módulos de Sistema — `QualityAccessibilityDashboard.tsx`, `ObservabilityDashboard.tsx`,
>   `DisasterRecoveryPanel.tsx`, `InteroperabilityDashboardPage.tsx`, `SecurityHardeningPanel.tsx`.
>   TanStack Query **não** foi aplicado nessas telas (mantidas em `useState`+`useEffect` manual) —
>   fora do escopo pedido nesta rodada, que era especificamente aparência/organização.
> - **Lição da rodada**: converter mensagem inline → toast quebrou 3 testes que já asseriam texto
>   renderizado diretamente no DOM (`PatientSearchPage` "carregando", `PatientDetailPage`
>   "motivo é obrigatório", `PatientRegisterPage` "erro interno") — toast usa um portal que não
>   existe na árvore isolada de teste, mesmo padrão já documentado para `EncounterOpenPage`/
>   `TriageOpenPage`. Revertido para banner/mensagem inline nesses 3 casos específicos; os módulos
>   de Sistema (que têm mensagens de sucesso testadas via `data-testid`, ex. "Checksum:",
>   "Sem conflito") foram deixados com a mensagem inline original por precaução, só ganhando
>   Card/Button ao redor — **regra para próximas rodadas: checar o arquivo de teste ANTES de
>   converter uma mensagem para toast**, não depois.
> - **Bug real encontrado (11/09/2026)**: `PatientDetailPage.tsx` `InactivatePatientAction` tinha
>   um `[error, setError]` que ficou momentaneamente órfão durante essa conversão — corrigido
>   junto, sem impacto em produção (só durante a própria edição desta sessão).
> - Verificado ao vivo (Modo de Demonstração): Pacientes (busca com resultado vazio → EmptyState),
>   Configurações de leitos, Escala (EmptyState + tabela de plantões), e os 5 módulos de Sistema —
>   todos renderizam corretamente; os módulos com endpoint não mockado no demo client (Indicadores,
>   Segurança) mostram o banner de erro "Recurso não disponível no Modo de Demonstração" já
>   existente, com a nova estilização aplicada corretamente.
> - typecheck limpo, suíte completa (44 arquivos/80 testes) e `npm run build` — todos OK.
> - **Fase 5 — TanStack Query no restante do app (11/09/2026)**: todas as telas restantes agora
>   usam `useQuery`/`useMutation` em vez de `useState`+`useEffect` manual —
>   `BedSectorSettingsPage.tsx`, `StaffSchedulePage.tsx` (3 queries paralelas + 4 mutations),
>   `ManagementDashboardPage.tsx`, e os 5 módulos de Sistema. Nos módulos que só disparam ações
>   (sem GET-on-mount) — `QualityAccessibilityDashboard`, `DisasterRecoveryPanel` — o padrão é
>   `useMutation` puro, sem `useQuery`; `ObservabilityDashboard`/`SecurityHardeningPanel` usam um
>   híbrido (mutation com `onSuccess`/`onError` escrevendo num `useState` local de mensagem) porque
>   3 ações independentes compartilhavam uma única área de status — não dava para derivar isso
>   direto de `isSuccess`/`isError` de múltiplas mutations sem ambiguidade de "qual foi a última".
> - **`PatientDetailPage.tsx`** (a maior migração): 1 `useQuery(['patient', id])` para a
>   identificação + 6 sub-`useQuery` independentes (`contacts`/`allergies`/`antecedents`/
>   `continuous-medications`/`active-problems`/`timeline`, todos sob a chave
>   `['patient', id, <secao>]`) — cada seção migrou de um `useList` hook artesanal (que replicava
>   `useState`+`useEffect`+reload manual) para `useQuery`, e cada `onAdd`/`onStatusChange` virou um
>   `useMutation` que invalida só a própria chave. `InactivatePatientAction` também virou
>   `useMutation`, invalidando `['patient', id]` no sucesso.
> - **`PatientSearchPage.tsx`**: busca (ação disparada pelo usuário, não um GET-on-mount) modelada
>   como `useMutation` — `mutate(params)` na submissão, `isPending`/`data` dirigem os 3 estados
>   (carregando/vazio/resultados); o estado de "acesso negado" (401/403) ficou fora da mutation,
>   tratado no `onError` como side-effect que seta um `useState` local (não cabe no modelo padrão
>   de erro/sucesso da mutation, é um redirecionamento de tela inteira).
> - **`PatientRegisterPage.tsx`**: cadastro virou `useMutation`; o fluxo de duplicidade (que exige
>   mostrar um aviso com "confirmar mesmo assim" antes de tentar de novo com `confirmDuplicate:
>   true`) manteve a árvore de decisão original dentro do `onError`, só trocando `try/catch` manual
>   por `mutate()`/callback — o estado "sucesso" agora vem de `createMutation.isSuccess` em vez de
>   uma variante própria.
> - **Lição da rodada**: 2 testes (`InteroperabilityDashboardPage`, `SecurityHardeningPanel`)
>   quebraram por uma corrida de timing — `await waitFor(() => expect(get).toHaveBeenCalledWith(...))`
>   confirma que a chamada HTTP foi disparada, mas não que o React já re-renderizou com o resultado;
>   com TanStack Query essa propagação passa por mais um ciclo de microtask do que o
>   `useState`+`.then()` manual anterior. Corrigido trocando o `expect(screen.getByTestId(...))`
>   síncrono logo após por `expect(await screen.findByTestId(...))` — regra geral: depois de
>   `waitFor` numa chamada de API, use `findBy*` (não `getBy*`) para o efeito subsequente no DOM.
> - Todas as telas migradas ganharam (ou já tinham, das fases anteriores) um wrapper
>   `QueryClientProvider` novo por teste no arquivo `.test.tsx` correspondente, seguindo o padrão
>   `renderPage()` estabelecido em `QueueDashboardPage.test.tsx`.
> - Verificado ao vivo: busca de paciente (mutation) → resultado → abrir prontuário → adicionar
>   contato (mutation invalida a query da seção, toast aparece, EmptyState permanece porque o mock
>   de demonstração não persiste GET dessas subseções — limitação conhecida do
>   `demo-api-client.ts`, não regressão); Configurações de Leitos → criar setor → tabela atualiza
>   instantaneamente via invalidação, sem reload manual.
> - typecheck limpo, suíte completa (44 arquivos/80 testes) e `npm run build` — todos OK.
> - **Rollout de TanStack Query e shadcn/ui: 100% completo em todas as telas planejadas.** Não há
>   mais pendência dessas duas frentes — o app inteiro usa o mesmo padrão visual e de data-fetching.
> - **Fase 6 — Campos clínicos SINAN (corpo, 17-48), Lote 1/4 (11/09/2026)**: das 19 doenças
>   cadastradas em `app.notifiable_diseases` (migration 0049), só `ACIDENTE_ANIMAL_PECONHENTO`
>   tinha os campos clínicos/epidemiológicos do corpo da ficha mapeados
>   (`packages/domain/src/notification/schemas/animais-peconhentos.ts`) — as outras 18 caíam no
>   fallback de só texto livre. Decisão de arquitetura confirmada lendo o código antes de começar:
>   a rota (`compulsory-notifications.ts`), a validação/sanitização, a persistência
>   (`body_fields jsonb`, migration 0050) e o formulário dinâmico da tela
>   (`CompulsoryNotificationModal`/`DynamicClinicalForm`) já são **100% agnósticos ao código da
>   doença** — portar uma doença nova é só escrever um arquivo de schema e registrar no índice,
>   **zero rota/migration/RLS/tela nova**.
> - **Origem do conhecimento de domínio**: o usuário perguntou se valia importar a lógica do
>   módulo SINAN do Emergency Care (projeto irmão, mais completo em cobertura de campos, mas com
>   camada de dados comprometida — identidade controlada pelo cliente via `localStorage`). Resposta
>   confirmada por auditoria: só o **inventário de campos por doença** (conhecimento público do
>   Ministério da Saúde/SINAN) foi reaproveitado — nenhum código, rota ou padrão de autenticação
>   do Emergency Care entrou no Vitaloop.
> - **Lote 1 implementado — arboviroses e síndromes respiratórias** (prioridade clínica de UPA):
>   `DENGUE`, `CHIKUNGUNYA`, `ZIKA`, `COVID19`, `SRAG`. Novo arquivo
>   `packages/domain/src/notification/schemas/shared-options.ts` com opções/campos reutilizáveis
>   entre fichas (`SIM_NAO_IGN_OPTIONS`, `LAB_RESULTADO_OPTIONS`, `EVOLUCAO_CASO_OPTIONS`,
>   fábricas `simNaoIgnField`/`labResultadoField`/`evolucaoCasoField`/`checklistFields`) — evita
>   repetir a mesma lista de opções em cada uma das 17 fichas do backlog.
> - **Decisão sobre código de campo**: semântico (`febre`, `hospitalizacao`), não o número oficial
>   impresso na ficha (diferente do padrão de Animais Peçonhentos, que foi extraído do PDF pixel a
>   pixel). Motivo: o preenchimento do PDF do **corpo** da ficha (campos 17+) não existe pra
>   nenhuma doença ainda — só o cabeçalho tem `apps/api/src/pdf/sinan-forms.ts`, e nem esse está
>   ligado a nenhuma rota. **Pendência registrada pelo usuário**: quando a calibração de PDF for
>   retomada, usar sempre os PDFs oficiais do SINAN (pasta `apps/api/assets/sinan/`), nunca
>   modelos genéricos — mesmo problema que o usuário nunca conseguiu resolver no Emergency Care.
> - Checklist de sintomas (ex.: Febre/Tosse/Cefaleia) virou um campo `code` Sim/Não/Ignorado por
>   item (o motor `ClinicalFormField` não tem tipo checkbox/multi-select) — mesmo padrão já usado
>   nos campos `41_dor`/`41_edema` de Animais Peçonhentos, agora extraído pra `checklistFields()`.
>   Campos condicionais (ex.: dados de hospitalização só aparecem se "Hospitalização" = Sim; bloco
>   de gestação em Zika só aparece se "Gestante" = Sim) usam `visibleWhen`, testados nos 7 testes
>   novos de `lote1-arboviroses-respiratorias.test.ts`.
> - **Não duplicado**: "Dados de Residência" (logradouro/bairro/UF/CEP) não virou campo novo — o
>   Vitaloop já captura endereço no cadastro do paciente; duplicar criaria duas fontes de verdade.
> - typecheck limpo em `packages/domain`, `apps/api` e `apps/web`; suíte de `packages/domain`
>   50 arquivos/296 testes (7 novos deste lote); suíte de `apps/web` 44 arquivos/80 testes
>   (inalterada); `npm run build` de `apps/api`/`apps/web` — todos OK.
> - **Verificação ao vivo não realizada nesta rodada**: o `demo-api-client.ts` não simula as rotas
>   de notificação compulsória (`/api/v1/notifiable-diseases` etc.) — isso já era assim antes
>   desta mudança, não é regressão. Adicionar esse mock ficaria fora do escopo prometido no plano
>   ("nenhum outro arquivo muda" além dos schemas); se quiser conferir visualmente, é um passo à
>   parte a decidir.
> - **Lote 2 implementado (11/09/2026) — doenças infantis/transmissão respiratória direta**:
>   `SARAMPO`, `COQUELUCHE`, `MENINGITE`. Mesmo padrão do Lote 1 (schema + registro no índice,
>   zero rota/migration/RLS/tela nova). Achado notável: a ficha oficial de Meningite tem opções
>   de **Evolução do Caso próprias** (Alta/Cura, Óbito por Meningite, Óbito por Outras Causas,
>   Ignorado) — diferentes do conjunto genérico `EVOLUCAO_CASO_OPTIONS` usado pelas outras fichas
>   — então `meningite.ts` não usa `evolucaoCasoField()`, define o campo inline. Sarampo ficou
>   focado só nessa doença (a ficha oficial junta Sarampo+Rubéola, mas o Vitaloop só tem o código
>   `SARAMPO` cadastrado, sem `RUBEOLA` separado — sorologia/classificação de rubéola de fora).
> - typecheck limpo em `packages/domain`/`apps/api`/`apps/web`; suíte de `packages/domain`
>   51 arquivos/302 testes (6 novos deste lote); suíte de `apps/web` 44 arquivos/80 testes
>   (inalterada); `npm run build` de `apps/api`/`apps/web` — todos OK. Mesma limitação de
>   verificação ao vivo do Lote 1 (demo client não simula rotas de notificação — pré-existente).
> - **Lote 3 implementado (11/09/2026) — doenças crônicas/endêmicas**: `TUBERCULOSE`,
>   `HANSENIASE`, `SIFILIS`, `HEPATITES_VIRAIS`, `LEPTOSPIROSE`. Dois achados relevantes:
>   (1) Tuberculose também tem **Evolução do Caso com opções próprias** (Cura/Abandono/Óbito por
>   TB/Óbito por outras causas/Transferência/Em Tratamento/Ignorado) — mesmo padrão do achado de
>   Meningite no Lote 2, reforça que "checar a ficha oficial antes de assumir opção genérica" é
>   regra, não exceção; (2) `HEPATITES_VIRAIS` unifica os 3 impressos oficiais (A/B/C) sob um
>   único schema com campo seletor `tipo_hepatite` controlando via `visibleWhen` qual bloco de
>   sorologia aparece — decisão necessária porque o Vitaloop só tem um código de doença cadastrado
>   (`HEPATITES_VIRAIS`), não três separados como a ficha oficial do MS.
> - typecheck limpo em `packages/domain`/`apps/api`/`apps/web`; suíte de `packages/domain`
>   52 arquivos/308 testes (6 novos deste lote, incluindo verificação de que só o bloco de
>   sorologia do tipo de hepatite selecionado aparece); suíte de `apps/web` 44 arquivos/80 testes
>   (inalterada); `npm run build` de `apps/api`/`apps/web` — todos OK. Mesma limitação de
>   verificação ao vivo dos lotes anteriores (demo client não simula rotas de notificação).
> - **Lote 4 implementado (11/09/2026) — acidentes, exposição e violência (último lote)**:
>   `FEBRE_AMARELA`, `TETANO_ACIDENTAL`, `RAIVA_HUMANA`, `INTOXICACAO_EXOGENA`,
>   `VIOLENCIA_INTERPESSOAL`. `VIOLENCIA_INTERPESSOAL` é a ficha mais extensa do backlog inteiro
>   (7 grupos: tipo de violência, especificação sexual condicional, meio de agressão, dados do
>   agressor, local/recorrência, encaminhamentos institucionais, dados do atendimento) — bloco de
>   especificação sexual (6 subcampos + 3 perguntas de conduta clínica) só aparece via
>   `visibleWhen` quando "Sexual" é marcado no tipo de violência. `TETANO_ACIDENTAL` e
>   `RAIVA_HUMANA` cobrem só a apresentação relevante pra UPA (acidental/exposição), não as
>   variantes neonatal/pré-exposição vacinal que a ficha oficial completa também tem.
> - typecheck limpo em `packages/domain`/`apps/api`/`apps/web`; suíte de `packages/domain`
>   53 arquivos/315 testes (7 novos deste lote); suíte de `apps/web` 44 arquivos/80 testes
>   (inalterada); `npm run build` de `apps/api`/`apps/web` — todos OK.
> - **🟢 BACKLOG DE CAMPOS CLÍNICOS SINAN (CORPO, 17-48) — 100% COMPLETO.** Todas as 19 doenças
>   cadastradas em `app.notifiable_diseases` (migration 0049) agora têm schema de campos
>   clínicos/epidemiológicos mapeado — a única que faltava (`ACIDENTE_ANIMAL_PECONHENTO`) já tinha
>   desde antes desta sessão. 4 lotes, 18 arquivos de schema novos + 1 de opções compartilhadas +
>   4 arquivos de teste (26 casos novos no total), zero rota/migration/RLS/tela nova em qualquer
>   um dos 4 lotes — a arquitetura genérica por código de doença absorveu tudo.
> - **Auditoria do problema de calibração do Emergency Care (11/09/2026)**: usuário pediu uma
>   investigação de por que ele nunca conseguiu resolver a calibração de PDF SINAN lá antes de
>   planejar a mesma etapa no Vitaloop. Causa raiz: **3 sistemas de coordenadas divergentes** —
>   (1) uma tabela de coordenadas "calibradas" no backend nunca lida em runtime (código morto —
>   o gerador real lia direto de AcroForm widgets), contradizendo a própria documentação de
>   arquitetura do projeto; (2) um segundo gerador de PDF completamente separado no frontend, sem
>   nenhuma fonte de verdade compartilhada com o backend; (3) as coordenadas que realmente valiam
>   (gravadas dentro dos binários dos PDFs) foram escritas por ≥3 scripts diferentes e
>   parcialmente não versionados, discordando entre si por 1-3pt nos mesmos campos. Git história
>   confirmou padrão de tentativa-e-erro (commits de "recalibrar TODAS as coordenadas" repetidos,
>   2 com mensagem idêntica minutos um do outro). **Decisão**: usar o material do Emergency Care
>   só como referência de "quais campos existem" — nenhuma coordenada numérica copiada sem
>   reverificação por pixel (o Vitaloop já evita as causas #1 e #2 por arquitetura: um único
>   gerador, `sinan-forms.ts`, coordenadas hardcoded documentadas com a fonte da medição).
> - **Fase A do plano de calibração implementada (11/09/2026)**: (1) renomeada a chave
>   `ATENDIMENTO_ANTIRRABICO` → `RAIVA_HUMANA` em `FORM_TEMPLATES`
>   (`apps/api/src/pdf/sinan-forms.ts`) pra bater com o código real de `app.notifiable_diseases`
>   — seguro, essa tabela ainda não estava ligada a nenhuma rota; (2) migration 0080 cadastra
>   `MALARIA`/`CHAGAS` como doença notificável (cabeçalho de PDF já calibrado, mas nunca tinham
>   sido cadastradas — não apareciam no modal); (3) dois novos schemas de corpo
>   (`malaria.ts`/`chagas.ts`, Chagas com bloco condicional fase aguda/crônica via
>   `visibleWhen`), completando agora **21 doenças com schema de corpo mapeado**.
> - **Fase B implementada (11/09/2026) — rota de exportação de PDF, pela primeira vez ligada a
>   algo**: `generateSinanFormPdf()` existia desde antes desta sessão mas nenhuma rota a chamava.
>   Nova `GET /api/v1/compulsory-notifications/:id/pdf` em `compulsory-notifications.ts` monta o
>   `SinanFormData` a partir dos dados já persistidos (paciente + notificação), calcula
>   idade/unidade (código do impresso: 1-Hora/2-Dia/3-Mês/4-Ano, cai pra unidade menor quando o
>   valor na maior seria zero — cobre recém-nascido atendido no mesmo dia) e mapeia o enum de sexo
>   do Vitaloop (female/male/undetermined) pro código do impresso (F/M/I). 404 explícito
>   (`NOT_FOUND_SINAN_FORM_NOT_AVAILABLE`) quando a doença não tem cabeçalho calibrado — nunca
>   gera com modelo genérico. `GET /api/v1/notifiable-diseases` agora retorna `pdfAvailable` por
>   doença, pra tela decidir quando mostrar o botão de impressão (tela ainda não tem esse botão —
>   fica pra quando a Fase C tiver a primeira doença calibrada de ponta a ponta).
>   **Preenche só o cabeçalho** (campos 1-16) — campos do corpo (17+) ainda não têm coordenada em
>   nenhuma ficha, isso é a Fase C.
> - typecheck limpo em `packages/domain`/`apps/api`/`apps/web`; `packages/domain`
>   54 arquivos/319 testes (4 novos: Malária/Chagas); `apps/api` 6 arquivos/31 testes
>   (infraestrutura, sem teste de integração de banco pra rota nova — precisa de conexão real);
>   `apps/web` 44 arquivos/80 testes (inalterada); builds de `apps/api`/`apps/web` OK.
> - **Fase C iniciada — Coqueluche, prova de conceito (11/09/2026)**: ao abrir o PDF oficial
>   `Coqueluche_v5.pdf` pela primeira vez pra medir coordenadas, descobri que o
>   **`COQUELUCHE_BODY_SCHEMA` do Lote 2 estava errado** — construído só a partir do inventário
>   semântico do Emergency Care, sem conferência campo a campo contra a ficha real. Achados:
>   campo `fase_clinica_atual` (Catarral/Paroxística/Convalescença) **não existe** na ficha
>   oficial; `pcr_bordetella_pertussis` também não existe (só tem "Resultado da Cultura"); as
>   opções de `doses_dtp` estavam erradas; e a ficha real tem **~30 campos de corpo** (31-64),
>   não os 7 do schema original. **`coqueluche.ts` foi totalmente reescrito** contra a ficha real
>   (dados complementares, antecedentes epidemiológicos, dados clínicos com sinais/sintomas e
>   complicações, atendimento/hospitalização, tratamento com antibiótico, dados laboratoriais,
>   medidas de controle com rastreamento de comunicantes, conclusão) — teste do Lote 2 atualizado
>   junto. **Essa mesma divergência provavelmente existe nas outras 20 doenças** — usuário já
>   confirmou que quer planejar a revisão de todas contra os PDFs oficiais (pendência registrada).
> - **Arquitetura de PDF estendida pra suportar corpo multi-página**: `sinan-forms.ts` ganhou
>   `FormTemplate.bodyBoxes` (coordenada por código semântico do schema, sempre absoluta — sem
>   transferência de delta de outra ficha) e `HeaderBox.page` (fichas SINAN têm 1-2 páginas, corpo
>   cai frequentemente na segunda). Lógica de posicionamento de campo extraída pra uma função
>   `placeField()` reaproveitada por cabeçalho e corpo — evita duplicar a lógica de comb/alinhamento/
>   debug border. `generateSinanFormPdf()` agora aceita `options.bodyFieldValues`.
> - **Cabeçalho de Coqueluche calibrado e confirmado** (não estava em `FORM_TEMPLATES` até
>   agora): deslocamento uniforme `xOffset:0, yOffset:-30` bateu em **todos** os 10 campos
>   testados (notificação, unidade, sintomas iniciais, nome, nascimento, idade/unidade, sexo,
>   raça, CNS, nome da mãe) — confirmado gerando 2 rounds de render com `debugBorders:true` e lendo
>   o PDF resultante diretamente (o Read tool lê PDF como imagem — não precisou de ferramenta de
>   rasterização externa, que este ambiente não tem instalada).
> - **Corpo de Coqueluche: os 3 campos incertos foram revisados (11/09/2026)** — grid fino de 5pt
>   focado na região exata desses campos + 2 rounds extras de render `debugBorders:true` isolando
>   só eles (sem os outros ~27 campos populados, pra ler sem poluição visual). Resultado: **2 de 3
>   confirmados corretos** (`contato_outro_especifique` — precisava descer 2pt pra não encostar na
>   linha acima; `doses_dtp` — já estava certo). **`doses_dtp`/`data_inicio_tosse` permanecem
>   incertos**: mesmo após 3 tentativas de ajuste (168→157→152), `data_inicio_tosse` mostrou a
>   MESMA sobreposição com o rótulo "39 Data do Início da Tosse" nas duas últimas rodadas — sinal
>   de que ou o campo precisa de uma correção bem maior que 5-10pt de cada vez, ou o que aparece no
>   PDF de verificação é um artefato de como o texto é extraído (ordem de conteúdo, não posição
>   visual real), não um erro genuíno. Sem uma segunda fonte de confirmação (exemplo manuscrito
>   real, como foi feito pro cabeçalho original), a IA parou de ajustar às cegas e documentou a
>   incerteza no código em vez de fingir calibrado — mesmo princípio que motivou a auditoria do
>   Emergency Care nesta sessão (não empilhar "correções" sobre um método que não está convergindo).
> - typecheck limpo em `apps/api`; suíte de `apps/api` 6 arquivos/31 testes (inalterada); `apps/web`
>   typecheck limpo.
> - **Coqueluche: 28 de 30 campos do corpo calibrados e verificados visualmente; 1 (`data_inicio_
>   tosse`) com posição plausível mas não confirmada — precisa de exemplo real preenchido à mão pra
>   fechar, mesmo padrão que resolveu os casos mais difíceis do cabeçalho original.**
> - **Pendente — Fase C, resto do trabalho**: (1) fechar `data_inicio_tosse` de Coqueluche quando
>   houver como conferir com exemplo real; (2) calibrar coordenadas do corpo doença por doença,
>   depois de cada schema revisado (ver plano de revisão logo abaixo).
>
> ### Plano de revisão de fidelidade dos schemas de corpo (aprovado 11/09/2026)
>
> Depois do achado de Coqueluche, o usuário pediu pra planejar a revisão de **todos** os outros 19
> schemas de corpo (Lotes 1/3/4 + Malária/Chagas da Fase A) contra os PDFs oficiais, já que nenhum
> deles nunca foi conferido campo a campo — só passaram nos testes de mecânica do schema
> (visibleWhen, opções não-vazias), não de fidelidade ao documento real. Plano completo em
> `C:\Users\Marcus Costa\.claude\plans\modular-roaming-moler.md`: 12 doenças já têm PDF oficial
> disponível em `apps/api/assets/sinan/` (Dengue+Chikungunya compartilham arquivo — 11 arquivos),
> revisadas uma por vez, menor risco primeiro (Meningite → Sarampo → Malária → Chagas →
> Leptospirose → Hepatites Virais → Febre Amarela → Raiva Humana → Tuberculose → Dengue/Chikungunya
> → Violência Interpessoal por último, a maior). 7 doenças continuam sem PDF (ZIKA, COVID19, SRAG,
> HANSENIASE, SIFILIS, TETANO_ACIDENTAL, INTOXICACAO_EXOGENA) — bloqueadas até o usuário
> providenciar o arquivo (COVID19/SRAG prometidos).
>
> **MENINGITE revisada e reescrita (11/09/2026) — primeira do plano, achado tão grave quanto
> Coqueluche.** `MENINGITE_BODY_SCHEMA` (Lote 2) tinha 2 campos inventados que não existem na
> ficha real (`fotofobia`, `agente_etiologico`) e faltavam **~30 campos inteiros**: vacinação
> detalhada (campo 33 — 8 vacinas, cada uma com sim/não + nº doses + data da última dose, 25
> campos sozinho), doenças pré-existentes (34), dados de contato epidemiológico (nome/telefone/
> endereço do contato, caso secundário — 35-39), hospitalização completa (41-45), a grade inteira
> de resultados laboratoriais por tipo de exame × material colhido (cultura/CIE/PCR/aglutinação
> pelo látex/bacterioscopia/isolamento viral × líquor/lesão petequial/sangue-soro/escarro/fezes —
> 18 campos), sorogrupo de N. meningitidis (53), medidas de controle (54-57), datas de evolução e
> encerramento (59-60), e o bloco de exame quimiocitológico + observações adicionais. Também 3
> campos com opções erradas: `aspecto_liquor` (faltava "Purulento", tinha "Não Realizado" em vez
> de usar o código 9 pra "Ignorado"), a classificação/etiologia do caso (schema antigo não tinha
> os 10 códigos reais de "Se Confirmado, Especifique"), e `criterio_confirmacao` (faltava
> "Isolamento viral"). **`meningite.ts` reescrito inteiro** (12 grupos, ~90 campos) contra o PDF
> oficial `Meningite_v5.pdf`; teste do Lote 2 atualizado com casos de regressão explícitos (sem
> `fotofobia`/`agente_etiologico`, opções corretas de aspecto do líquor/evolução, condicionais de
> vacinação/hospitalização/classificação). Build+testes de `packages/domain` (54 arquivos/323
> testes), `apps/api` e `apps/web` limpos — nenhuma tela/rota depende de código de campo
> hardcoded, confirma de novo que o motor genérico (`getBodySchema` por código de doença) absorve
> a reescrita sem tocar em mais nada. Coordenada de PDF ainda não calibrada pra Meningite (só a
> revisão de fidelidade do schema por enquanto — calibração é passo separado, depois que todas as
> 12 doenças da trilha tiverem o schema revisado, ou disease-a-disease conforme o usuário decidir
> a ordem de execução real).
>
> **SARAMPO revisada e reescrita (11/09/2026) — segunda da Trilha 1, mesmo padrão de achado.**
> `SARAMPO_BODY_SCHEMA` (Lote 1) tinha 3 campos de checklist que na ficha real (Exantematica_v5.pdf,
> "Sarampo/Rubéola") não existem como sim/não — `febre` e `exantema_maculopapular` são na verdade
> **datas** (campos 38/39, "Data do Início do Exantema"/"Data do Início da Febre"), e
> `linfadenopatia` usa outro nome real ("Presença de Gânglios Retroauriculares/Occipitais"). E
> faltavam ~40 campos inteiros: vacinação + data da última dose (33-34), dados de contato
> epidemiológico (35-37), hospitalização completa (41-45), a grade inteira de exame sorológico
> (Sarampo/Rubéola/Outras Exantemáticas × IgM/IgG × S1/S2/Re-Teste — 18 campos), isolamento viral
> com tipo de amostra + etiologia viral (49-50), medidas de controle com bloqueio vacinal por
> faixa etária (51-53), classificação final do caso descartado com 9 diagnósticos diferenciais
> (56), local provável da fonte de infecção quando o caso não é autóctone (57-62), data de
> óbito/encerramento (64-65). Também corrigido: `classificacao_final` só tinha Sarampo/Descartado
> — a ficha real cobre **Sarampo E Rubéola no mesmo impresso**, então a opção "Rubéola" foi restau-
> rada mesmo o Vitaloop só tendo o código `SARAMPO` cadastrado (não perder informação de quando a
> investigação confirma Rubéola em vez de Sarampo). `sarampo.ts` reescrito inteiro (10 grupos,
> ~65 campos) contra `Exantematica_v5.pdf`; teste do Lote 2 atualizado (6 testes novos/reescritos,
> total do arquivo agora 12). Build+testes de `packages/domain` (39 testes de notificação),
> `apps/api` e `apps/web` limpos. Coordenada de PDF ainda não calibrada.
>
> **MALARIA revisada e reescrita (11/09/2026) — terceira da Trilha 1.** `MALARIA_BODY_SCHEMA`
> (Fase A — escrito a partir do inventário do Emergency Care sem nunca abrir a ficha oficial) tinha
> campos inteiros que não existem em `Malaria_v5.pdf`: `especie_plasmodium` como campo próprio (a
> espécie é codificada DENTRO do campo "Resultado do Exame", não tem campo separado — a ficha real
> usa F/V/M/FG/O como parte de um único código de 10 opções); `gota_espessa_lamina`/
> `teste_rapido_tdr`/`pcr_biologia_molecular` (esta ficha só registra "Tipo de Lâmina" +
> "Resultado do Exame", não três métodos laboratoriais separados — TDR/PCR nem aparecem no
> impresso); `evolucao_caso` (esta ficha não tem campo de evolução — termina em Classificação
> Final + Data de Encerramento, sem Cura/Óbito). `esquema_terapeutico` também tinha opções
> inventadas (nomes de droga livres) em vez da lista numerada real de 12 esquemas + "Outro".
> Faltavam: atividade nos últimos 15 dias (33), tipo de lâmina/sintomas (34-35), parasitemia em
> cruzes (39), e o bloco completo de local provável da infecção (distrito/bairro/localidade, não
> só país/UF/município como a v1 tinha). `malaria.ts` reescrito inteiro (7 grupos, ~25 campos)
> contra `Malaria_v5.pdf`; teste do Lote 5 atualizado (3 testes novos, total do arquivo agora 6).
> Build+testes de `packages/domain` (41 testes de notificação), `apps/api` e `apps/web` limpos.
> Coordenada de PDF ainda não calibrada (o cabeçalho de Malária já estava calibrado desde a Fase A
> — só o corpo precisa de coordenada nova).
>
> **CHAGAS revisada e reescrita (11/09/2026) — quarta da Trilha 1, achado mais grave que os
> anteriores.** `CHAGAS_BODY_SCHEMA` (Fase A) tinha como **eixo central do schema inteiro** um
> campo `fase_doenca` (Aguda/Crônica) condicionando dois blocos (exames parasitológicos diretos vs.
> forma clínica/ECG) — mas a ficha oficial do SINAN (`Chagas_v5.pdf`) é **só de Doença de Chagas
> AGUDA**; não existe "fase crônica" nem campos `forma_clinica`/`ecg` em lugar nenhum do impresso
> (Chagas crônica não é agravo de notificação compulsória separado no SINAN — essa dicotomia foi
> inventada do zero). Removido o eixo inteiro. Faltavam também: todo o bloco de antecedentes
> epidemiológicos (vestígios de triatomídeos, uso de sangue/hemoderivados, controle sorológico em
> hemoterapia, manipulação de material com T. cruzi, mãe com infecção chagásica, transmissão oral
> — 33-40), a checklist completa de sinais e sintomas (41, 12 itens), a grade inteira de sorologia
> (ELISA/Hemoaglutinação/IFI × IgM/IgG × S1/S2, com títulos pra IFI — 20 campos), parasitológico
> direto/indireto com tipo de exame (42-45), histopatológico (51-52), tipo/droga/tempo de
> tratamento (53-55), medidas de controle (56), critério de confirmação/descarte (58), modo e
> local prováveis da infecção com códigos reais (61-62 — a v1 tinha códigos diferentes dos
> impressos), local provável completo (63-68), doença relacionada ao trabalho (69). `chagas.ts`
> reescrito inteiro (10 grupos, ~65 campos) contra `Chagas_v5.pdf`; teste do Lote 5 atualizado (4
> testes novos/reescritos, total do arquivo agora 7). Build+testes de `packages/domain` (42
> testes de notificação), `apps/api` e `apps/web` limpos. Coordenada de PDF ainda não calibrada
> (cabeçalho já estava desde a Fase A).
>
> **LEPTOSPIROSE revisada e reescrita (11/09/2026) — quinta da Trilha 1.** `LEPTOSPIROSE_BODY_
> SCHEMA` (Lote 3) tinha um campo `tratamento` inteiro (Penicilina/Doxiciclina/Ceftriaxona) que
> **não existe em lugar nenhum da ficha real** — a ficha SINAN de Leptospirose não registra
> antibioticoterapia. O checklist de "Exposição/Fonte de Infecção" tinha itens que não batem com
> os 12 reais do campo 33 (`solo_lamacento`, `contato_bovinos_cao`, `trabalho_abatedouro_
> frigorifico`, `lazer_rios_lagoas` não existem como tais). O checklist de sintomas tinha só 8 dos
> 15 reais do campo 36, incluindo `choque_hipotensao` que não existe nesta ficha. Faltavam também:
> casos anteriores de leptospirose no local (34), data de atendimento (35), hospitalização
> completa com datas/UF/município/hospital (37-42), a grade inteira de laboratório (Sorologia
> IgM-Elisa, Microaglutinação com sorovar/título por amostra, Isolamento, Imunohistoquímica,
> RT-PCR — ~20 campos), classificação final/critério de confirmação (61-62), local provável da
> fonte de infecção completo (63-68), área/ambiente da infecção (69-70), doença relacionada ao
> trabalho (71), data de óbito/encerramento (73-74). "Evolução do Caso" também tinha opções
> genéricas em vez das 4 próprias da ficha. `leptospirose.ts` reescrito inteiro (11 grupos, ~65
> campos) contra `Ficha_Leptospirose.pdf`; teste do Lote 3 atualizado (4 testes novos/reescritos,
> total do arquivo agora 9). Build+testes de `packages/domain` (45 testes de notificação),
> `apps/api` e `apps/web` limpos. Coordenada de PDF ainda não calibrada.
>
> **HEPATITES_VIRAIS revisada e reescrita (11/09/2026) — sexta da Trilha 1, achado estrutural.**
> `HEPATITES_VIRAIS_BODY_SCHEMA` (Lote 3) usava um campo `tipo_hepatite` (A/B/C) como eixo central,
> condicionando via `visibleWhen` qual bloco de sorologia aparecia — mas **a ficha oficial não
> separa os marcadores sorológicos por tipo**: o campo real (46, "Resultados Sorológicos/
> Virológicos/Teste rápido") é uma única grade com os 12 marcadores de hepatite A/B/C/D/E lado a
> lado, sempre visíveis, sem nenhum campo "tipo de hepatite" controlando o que aparece — o mais
> próximo é "Suspeita de" (33), que é só informativo. A versão anterior também só cobria A/B/C; a
> ficha real cobre A, B, C, D **e E**. Faltavam: vacinação (34), institucionalização (35), agravos
> associados (36), contato com portador de HBV/HBC por tipo (37), a checklist inteira de
> exposição a procedimentos de risco (14 itens, cada um com "Sim há menos/mais de 6 meses" —
> 38-39), local/município da exposição e dados dos comunicantes (40-41), o bloco de triagem de
> banco de sangue/CTA (42-44), genotipagem completa do HCV com 8 opções (47, a v1 tinha 6 sem
> "Não se aplica"), forma clínica e classificação etiológica (49-50), e a lista completa de 13
> prováveis fontes/mecanismos de infecção (51, a v1 tinha só 7). `hepatites-virais.ts` reescrito
> inteiro (7 grupos, ~50 campos) contra `Ficha_Hepatites_Virais.pdf`; teste do Lote 3 atualizado
> (2 testes novos/reescritos, total do arquivo agora 10). Build+testes de `packages/domain` (46
> testes de notificação), `apps/api` e `apps/web` limpos. Coordenada de PDF ainda não calibrada.
>
> **FEBRE_AMARELA revisada e reescrita (11/09/2026) — sétima da Trilha 1.** `FEBRE_AMARELA_BODY_
> SCHEMA` (Lote 4) tinha só 3 grupos e ~9 campos genéricos contra os ~50 campos reais de
> `Febre_Amarela_v5.pdf`. Faltavam: investigação entomológica/epizootias completa (33, 3 itens —
> a v1 não tinha nada disso), UF/município/unidade de saúde da vacinação (36-38), os 4 sinais e
> sintomas reais (39 — dor abdominal, sinal de Faget, sinais hemorrágicos, distúrbios de excreção
> renal — nenhum estava na v1, que não tinha bloco de sintomas algum), hospitalização completa com
> local (40-44), exames inespecíficos — bilirrubinas e transaminases (45), a segunda amostra
> sorológica (48-49), histopatologia/imunohistoquímica/RT-PCR (53-56, a v1 só tinha "isolamento
> viral" genérico sem esses três exames), classificação final com as 3 opções reais (Silvestre/
> Urbana/Descartado — não existe "confirmado" simples nesta ficha), critério de confirmação (58),
> local provável da infecção completo (59-65), doença relacionada ao trabalho e atividade no
> local (66-67), data de óbito/encerramento (69-70). "Evolução do Caso" (68) também tem opções
> próprias da ficha, não as genéricas que a v1 usava. `febre-amarela.ts` reescrito inteiro (9
> grupos, ~50 campos) contra `Febre_Amarela_v5.pdf`; teste do Lote 4 atualizado (3 testes
> novos/reescritos, total do arquivo agora 9). Build+testes de `packages/domain` (48 testes de
> notificação), `apps/api` e `apps/web` limpos. Coordenada de PDF ainda não calibrada.
>
> **RAIVA_HUMANA revisada e reescrita (11/09/2026) — oitava da Trilha 1, achado estrutural.**
> `RAIVA_HUMANA_BODY_SCHEMA` (Lote 4) usava `evolucao_caso` genérico, mas **esta ficha
> (`anti_rabico_v5.pdf`) não tem campo de evolução do caso** — é um atendimento (avaliação de
> exposição + profilaxia), não uma doença com desfecho clínico registrado. `tipo_exposicao` e
> `esquema_profilaxia` também tinham opções/estrutura inventadas — a ficha real trata exposição,
> localização da lesão e tipo de ferimento como 3 checklists separados de Sim/Não/Ignorado, não
> um único campo de opção livre. Faltavam: localização da lesão como checklist real (33),
> ferimento único/múltiplo (34), tipo de ferimento como checklist (35), data da exposição (36),
> antecedentes de tratamento anti-rábico com pré/pós-exposição e prazo de conclusão (37-38),
> doses aplicadas anteriormente (39), condição do animal e se é passível de observação (41-42), o
> bloco inteiro de tratamento indicado/vacina com laboratório/lote/vencimento (43-46), as 5 datas
> de aplicação da vacina (47), condição final do animal após observação (48), interrupção/
> abandono de tratamento (49-51), eventos adversos à vacina e ao soro (52, 59), o bloco inteiro de
> soro anti-rábico — peso, quantidade, tipo, infiltração, laboratório, lote (53-58), data de
> encerramento (60). `raiva-humana.ts` reescrito inteiro (9 grupos, ~45 campos) contra
> `anti_rabico_v5.pdf`; teste do Lote 4 atualizado (3 testes novos/reescritos, total do arquivo
> agora 11). Build+testes de `packages/domain` (50 testes de notificação), `apps/api` e
> `apps/web` limpos. Coordenada de PDF ainda não calibrada (o cabeçalho já estava desde a Fase A,
> só o corpo precisa de coordenada nova).
>
> **TUBERCULOSE revisada e reescrita (11/09/2026) — nona da Trilha 1, achado estrutural.**
> `TUBERCULOSE_BODY_SCHEMA` (Lote 3) tinha um grupo "Desfecho" (`evolucao_caso`:
> Cura/Abandono/Óbito por TB/etc.) e um campo `tdo_tratamento_diretamente_observado` que **não
> existem** na ficha real — a revisão de 2014 (`Tuberculose_v5.pdf`) é de página única, só
> notificação/investigação; evolução do caso é rastreada num módulo de acompanhamento separado,
> fora deste impresso. `populacoes_especiais` também estava errado como seleção única — a ficha
> real é um checklist de 4 itens independentes (Privado de Liberdade, Profissional de Saúde,
> População em Situação de Rua, Imigrante — sem "Indígena", que a v1 tinha inventado, com
> "Profissional de Saúde" que a v1 não tinha). `tipo_entrada` tinha códigos fora de ordem (v1:
> 4-Transferência/5-Pós-óbito/6-Não Sabe; real: 4-Não Sabe/5-Transferência/6-Pós-óbito).
> `localizacao_extrapulmonar` tinha opções incompletas (faltava Cutânea e Laríngea). `trm_tb`
> (Teste Molecular Rápido) tinha opções erradas — faltava a distinção crítica de resistência à
> Rifampicina (Detectável Sensível vs. Detectável Resistente), central pra vigilância de TB-MDR.
> Faltavam campos inteiros: beneficiário de transferência de renda (34), radiografia do tórax
> (39), terapia antirretroviral durante o tratamento (41), histopatologia (42), teste de
> sensibilidade com as 7 opções reais (45), data de início do tratamento atual (46), total de
> contatos identificados (47). `tuberculose.ts` reescrito inteiro (5 grupos, ~30 campos) contra
> `Tuberculose_v5.pdf`; teste do Lote 3 atualizado (3 testes novos/reescritos, total do arquivo
> agora 12). Build+testes de `packages/domain` (52 testes de notificação), `apps/api` e
> `apps/web` limpos. Coordenada de PDF ainda não calibrada (o cabeçalho já usava `headerBoxes`
> customizado desde a Fase B, só o corpo precisa de coordenada nova).
>
> **DENGUE e CHIKUNGUNYA revisadas e reescritas juntas (11/09/2026) — 10ª e 11ª da Trilha 1.**
> Compartilham o mesmo impresso físico (`Ficha_DENGCHIK_FINAL.pdf`), então revisadas na mesma
> rodada. `DENGUE_BODY_SCHEMA` (Lote 1) tinha um checklist de 12 sintomas com itens levemente
> diferentes dos 14 reais do campo 33 (faltava "Dor nas costas"; a ficha real usa só Sim/Não pra
> esse campo, não Sim/Não/Ignorado) e faltava inteiramente o checklist de doenças pré-existentes
> (34, 7 itens). Faltava também Isolamento Viral e Sorotipo (DENV1-4) completos, e principalmente
> **o bloco inteiro de Dengue com Sinais de Alarme e Dengue Grave** (68-71, ~20 sub-itens) — a
> distinção clínica mais importante desta ficha pra conduta em UPA, ausente por completo na v1.
> `CHIKUNGUNYA_BODY_SCHEMA` tinha um checklist de 8 sintomas "mais distintivos"
> (`poliartralgia_migratoria`, `edema_articular`) que **não existem como campos separados** — a
> ficha real usa o mesmo checklist de 14 sinais compartilhado com Dengue, do qual "Artralgia
> intensa" já é o item específico. `artralgia_persistente_apos_2_semanas` também foi inventado —
> a ficha real trata isso via "Apresentação Clínica: Aguda/Crônica" (64), campo à parte. Mais
> grave: `classificacao_final` tinha um código **"14 — Chikungunya Fase Crônica" que não existe**
> na ficha (só existe "13 — Chikungunya"; fase crônica é o campo separado 64). Ambos os schemas
> ganharam local provável de infecção completo, critério de confirmação, hospitalização com UF/
> município/telefone, e "Evolução do Caso" com as 5 opções reais (inclui "Óbito em investigação"),
> substituindo o genérico. `dengue.ts` reescrito inteiro (9 grupos, ~65 campos);
> `chikungunya.ts` reescrito inteiro (7 grupos, ~40 campos), ambos contra `Ficha_DENGCHIK_FINAL.pdf`.
> Teste do Lote 1 atualizado (4 testes novos/reescritos, total do arquivo agora 9). Build+testes
> de `packages/domain` (54 testes de notificação), `apps/api` e `apps/web` limpos. Coordenada de
> PDF ainda não calibrada pra nenhuma das duas.
>
> **🟢 TRILHA 1 COMPLETA (11/09/2026) — VIOLENCIA_INTERPESSOAL revisada e reescrita, última das 12
> doenças com PDF disponível.** Era a ficha mais extensa do backlog e o schema anterior (Lote 4)
> tinha a estrutura mais distante da real: `tipo_violencia_autoprovocada` não existe como item do
> checklist — "a lesão foi autoprovocada?" é campo próprio (54), independente do tipo de
> violência; `violencia_sexual_atentado_pudor` não existe (crime removido da legislação
> brasileira em 2009, substituído pelo conceito ampliado de estupro); `vinculo_agressor` estava
> modelado como seleção única quando a ficha real (61) é um checklist de 18 vínculos possíveis
> (podem ser marcados vários, já que pode haver mais de um agressor). Faltavam campos inteiros:
> dados da pessoa atendida completos — nome social, situação conjugal, orientação sexual,
> identidade de gênero, deficiência/transtorno (33-39); dados completos da ocorrência — UF/
> município/distrito/bairro/logradouro/zona/hora (40-51); motivação da violência com 11 opções,
> incluindo discriminação por sexismo/homofobia/racismo/xenofobia (55); procedimentos realizados
> em violência sexual — profilaxias, coletas, contracepção de emergência, aborto previsto em lei
> (59); ciclo de vida e suspeita de uso de álcool do provável autor (63-64); violência relacionada
> ao trabalho e CAT (66-67); circunstância da lesão por CID-10 capítulo XX (68). Encaminhamentos
> tinha só 9 dos 14 itens reais (faltava Delegacia de Atendimento à Mulher/Idoso, Conselho do
> Idoso, Centro de Referência dos Direitos Humanos, Defensoria Pública, Justiça da Infância e
> Juventude). `evolucaoCasoField()` genérico removido — esta ficha não tem evolução clínica, só
> data de encerramento. `violencia-interpessoal.ts` reescrito inteiro (11 grupos, ~110 campos)
> contra `violencia_v5.pdf`; teste do Lote 4 atualizado (5 testes novos/reescritos, total do
> arquivo agora 15). Build+testes de `packages/domain` (58 testes de notificação), `apps/api` e
> `apps/web` limpos. Coordenada de PDF ainda não calibrada.
>
> **🟢 RESULTADO FINAL DA TRILHA 1: as 12 doenças com PDF oficial disponível (Meningite, Sarampo,
> Malária, Chagas, Leptospirose, Hepatites Virais, Febre Amarela, Raiva Humana, Tuberculose,
> Dengue, Chikungunya, Violência Interpessoal) foram todas revisadas campo a campo contra o PDF
> oficial e reescritas onde necessário — 100% delas tinham divergências graves (campos
> inventados, opções erradas, ou dezenas de campos reais faltando). Nenhuma tinha o schema
> correto antes desta revisão. Junto com Coqueluche (revisada antes desta rodada) e Animais
> Peçonhentos (schema original, sempre correto), são 14 das 21 doenças cadastradas com schema
> agora verificado contra a ficha real.**
>
> **Pendente — Trilha 2 (7 doenças sem PDF oficial, bloqueadas)**: ZIKA, COVID19, SRAG,
> HANSENIASE, SIFILIS, TETANO_ACIDENTAL, INTOXICACAO_EXOGENA continuam com schema nunca
> verificado contra a ficha real — sem PDF não há como revisar com confiança, e a regra desta
> sessão é nunca usar modelo genérico. COVID19 e SRAG têm arquivo prometido pelo usuário.
>
> **Pendente — calibração de coordenadas**: todas as 13 doenças com schema revisado (12 da
> Trilha 1 + Coqueluche) têm cabeçalho calibrado (algumas desde a Fase A/B) mas **corpo ainda sem
> coordenada** — só Coqueluche teve o corpo calibrado (28 de 30 campos confirmados, 1 ainda
> incerto). As outras 11 doenças da Trilha 1 precisam do mesmo processo de calibração de corpo
> (grid de 5pt + verificação visual com `debugBorders:true`) que ainda não começou pra nenhuma
> delas.
>
> ### Trilha 2 destravada — COVID19 e SRAG (11/09/2026)
>
> O usuário providenciou os PDFs oficiais de COVID19 e SRAG (colocados na raiz do projeto,
> `COVID19.pdf`/`SRAG.pdf`) — copiados pra `apps/api/assets/sinan/` como `Covid19_v5.pdf`/
> `Srag_v5.pdf`. Revisão de fidelidade feita na mesma sessão.
>
> **🔴 ACHADO ARQUITETURAL IMPORTANTE**: nenhuma das duas usa o layout clássico do "Sinan NET"
> (campos 1-30 de cabeçalho + 31+ de corpo) que as outras 12 doenças da Trilha 1 usam.
> - **COVID19** é a ficha do **e-SUS Notifica** (sistema diferente, 2021) — blocos rotulados sem
>   numeração (IDENTIFICAÇÃO, ESTRATÉGIA E LOCAL DE TESTAGEM, DADOS CLÍNICOS EPIDEMIOLÓGICOS,
>   EXAMES LABORATORIAIS, ENCERRAMENTO, RASTREAMENTO DE CONTATOS), sem o bloco de identificação
>   1-16 usual.
> - **SRAG** é a ficha do **Sinan Influenza** (subsistema próprio de vigilância, 2012, CID J11) —
>   cabeçalho vai só até o campo 26 (não 30), com ordem diferente (1=Data do preenchimento,
>   7=Cartão SUS antes da data de nascimento, 11=Gestante antes de Raça/Cor).
>
> **Consequência pra Fase C (calibração)**: quando a vez dessas duas chegar, `HEADER_BOXES`/
> `xOffset`/`yOffset` (usado nas outras 12) **não vai funcionar** — vão precisar de coordenadas
> totalmente novas, cabeçalho e corpo, medidas do zero contra cada layout específico. Documentado
> nos comentários de `covid19.ts`/`srag.ts` pra não presumir offset uniforme quando chegar a hora.
>
> **COVID19 revisada e reescrita**: schema anterior (Lote 1) tinha 8 sintomas sem "Assintomático"/
> "Dor de Cabeça" e nenhuma das 10 condições/comorbidades reais (doenças cardíacas crônicas,
> renais crônicas avançadas, doenças cromossômicas, puérpera, gestante, diabetes, imunossupressão,
> obesidade, etc.). Faltava estratégia/local de testagem, vacinação com laboratório/lote por dose,
> e a grade completa de **8 tipos de exame diferentes** (RT-PCR, RT-LAMP, sorológicos IgA/IgM/IgG/
> anticorpos totais, testes rápidos IgM/IgG/antígeno), cada um com estado do teste/data/resultado
> próprios — a v1 só tinha 2 exames genéricos. `evolucaoCasoField()`/`labResultadoField()`
> genéricos removidos — esta ficha tem evolução (Cancelado/Em tratamento domiciliar/Cura/
> Internado/Internado em UTI/Óbito/Ignorado) e classificação (Descartado/Confirmado Clínico-
> Epidemiológico/Confirmado Laboratorial/Confirmado Clínico-Imagem/Confirmado Por Critério
> Clínico/Síndrome Gripal Não Especificada) com códigos próprios, nada a ver com o conjunto
> genérico. `covid19.ts` reescrito inteiro (7 grupos, ~55 campos) contra `Covid19_v5.pdf`.
>
> **SRAG revisada e reescrita**: schema anterior tinha só 7 sintomas genéricos e **nenhum fator de
> risco** (a ficha real lista 10: Pneumopatias Crônicas, Doença Cardiovascular/Hepática/
> Neurológica/Renal Crônica, Síndrome de Down, Diabetes Mellitus, Imunodeficiência, Puerpério,
> Obesidade+IMC). Faltava vacinação contra gripe + antiviral, internação completa com UF/
> município/unidade, Raio X de Tórax, suporte ventilatório e UTI com datas de entrada/saída, a
> grade completa de dados laboratoriais (tipo de amostra, metodologia IFI/RT-PCR/outro método com
> data de resultado própria por método), diagnóstico etiológico com **8 agentes diferentes**
> incluindo subtipagem de Influenza A, critério de confirmação, data de alta/óbito. Classificação
> final tinha opções genéricas em vez de "SRAG por Influenza/outros vírus/outros agentes/não
> especificada" — conceito bem diferente de Cura/Óbito. **Incerteza genuína documentada no
> código**: o texto extraído do PDF perto do campo 27 ("Recebeu Vacina...") continha uma lista de
> opções de antiviral (Oseltamivir/Zanamivir) que semanticamente pertence ao campo 31 ("Uso de
> antiviral?"), não à pergunta de vacina — provável embaralhamento de ordem de extração de texto
> entre duas caixas próximas. Resolvido atribuindo a lista ao campo `tipo_antiviral` (companheiro
> de 31, leitura clinicamente coerente), mas marcado como precisando de confirmação visual/pixel
> na calibração — mesmo padrão de transparência de `data_inicio_tosse` em Coqueluche. `srag.ts`
> reescrito inteiro (7 grupos, ~50 campos) contra `Srag_v5.pdf`.
>
> Teste do Lote 1 atualizado (6 testes novos/reescritos, total do arquivo agora 12). Build+testes
> de `packages/domain` (61 testes de notificação), `apps/api` e `apps/web` limpos. Coordenada de
> PDF ainda não calibrada pra nenhuma das duas (e vai precisar de abordagem própria, não o método
> compartilhado — ver achado arquitetural acima).
>
> **Trilha 2 agora: 2 de 7 destravadas e revisadas (COVID19, SRAG).** Faltam 5 sem PDF: ZIKA,
> HANSENIASE, SIFILIS, TETANO_ACIDENTAL, INTOXICACAO_EXOGENA — ainda sem previsão.
>
> ### Calibração de PDF iniciada — SRAG (11/09/2026)
>
> Usuário pediu pra começar a calibração de coordenadas porque COVID19/SRAG "são os principais
> utilizados na UPA". Começando por SRAG (COVID19 fica pra depois — ver observação abaixo sobre
> por que é um trabalho maior).
>
> **Cabeçalho de SRAG calibrado**: grid de 5pt/2pt sobreposto ao PDF-base + 4 rounds de render de
> verificação com `debugBorders:true`. 10 dos 11 campos confirmados corretos (notificationDate,
> symptomOnsetDate, notifyingUnit, patientName, cns, birthDate, age, ageUnit, race, motherName).
> **`sex` fica com uma pequena imperfeição documentada**: depois de 4 tentativas de ajuste de X,
> ainda sobrepõe 1-2 caracteres do texto impresso "Ignorado" — não bloqueante (o valor gravado
> continua legível), mas não fechado com 100% de confiança. Precisa de confirmação por zoom real
> de alta resolução (não disponível neste ambiente) — mesmo padrão de transparência já usado em
> Coqueluche.
>
> **Corpo de SRAG calibrado** (campos 27-52, ~50 caixas): grid de 5pt + 2 rounds de verificação.
> A maioria confirmada correta, incluindo 2 colisões geométricas reais que foram corrigidas
> (`tipo_antiviral` e `raio_x_torax` colidiam com a caixa de data vizinha — movidos pra linha
> própria). **Achado metodológico importante**: alguns campos de checklist (sintomas, fatores de
> risco, parainfluenza) mostraram sobreposição de 1 caractere no render de verificação, mas ao
> conferir as MESMAS coordenadas contra um grid limpo (sem nenhum valor preenchido) elas bateram
> exatamente com a posição real da caixinha impressa — confirma que a sobreposição é um artefato
> de como o PDF de verificação extrai/ordena texto pra leitura (não a posição visual real), mesma
> lição já registrada em `data_inicio_tosse` (Coqueluche). `metodologia_rtpcr`/`tipo_rtpcr` (pág.
> 2) mantiveram leve sobreposição mesmo após ajuste — não bloqueante, sem confirmação final.
>
> **COVID19 NÃO calibrado ainda** — motivo: sua ficha (e-SUS Notifica) não usa o layout clássico
> de campos numerados que todo o resto do sistema pressupõe (`SinanFormData`/`HEADER_BOXES`
> foram desenhados em torno de "Tipo de Notificação=1, Agravo=2, ... Nome=8, Data Nasc=9" etc.).
> A ficha de COVID19 tem campos completamente diferentes (CPF, Passaporte, Profissional de
> Saúde/Segurança, País de origem, Estratégia de Testagem) que não têm equivalente em
> `SinanFormData` hoje. Calibrar o cabeçalho de COVID19 exigiria primeiro estender o modelo de
> dados (`SinanFormData` ou um tipo próprio) antes de sequer começar a medir coordenadas — um
> trabalho de arquitetura, não só de medição. Pendente decisão do usuário sobre se vale a pena
> agora ou depois.
>
> PDFs de COVID19/SRAG (que o usuário colocou na raiz do projeto) copiados pra
> `apps/api/assets/sinan/` como `Covid19_v5.pdf`/`Srag_v5.pdf`; cópias da raiz removidas depois de
> confirmado que os arquivos oficiais já estão no lugar certo do projeto.
>
> ### Extensão de arquitetura + calibração de COVID19 (11/09/2026)
>
> Usuário pediu pra prosseguir com a extensão de arquitetura necessária pra calibrar COVID19
> também. Levantamento: de todos os campos de identificação que a ficha do e-SUS Notifica precisa
> (CPF, Passaporte, Estrangeiro, Profissional de Saúde/Segurança, Ocupação/CBO, País de Origem,
> Povo/Comunidade Tradicional, CEP, Logradouro/Número/Bairro/Complemento, Telefone 1/2, E-mail,
> Etnia Indígena), só **CPF** e **UF de residência** existem hoje em `app.patients` sem estar
> ligados a `SinanFormData` — todos os outros simplesmente não existem no banco (nem em
> `packages/domain/src/patient/types.ts`). Criar todos exigiria uma migration + mudança de tipo +
> tela de captura nova — fora de escopo desta rodada (o usuário pediu calibração, não uma feature
> de cadastro nova).
>
> **Decisão**: estender `SinanFormData` só com `cpf` e `state` (os dois que já existem no banco);
> `municipality` já existia na interface mas nunca tinha sido colocado no objeto `values` nem
> tinha `HEADER_BOXES` — corrigido também (afeta só COVID19 hoje, já que nenhuma outra ficha
> calibrada usa esse campo em posição própria). Rota `GET /api/v1/compulsory-notifications/:id/pdf`
> (`apps/api/src/routes/compulsory-notifications.ts`) atualizada pra selecionar `p.cpf`/`p.state`
> e passar pro `SinanFormData`. **Todos os campos sem fonte de dados ficam em branco no PDF
> gerado** — nunca inventados, mesma regra de sempre.
>
> **Cabeçalho de COVID19 calibrado**: grid de 5pt + 2 rounds de verificação com
> `debugBorders:true`. notificationDate, cpf, cns, patientName, motherName, birthDate, state e
> municipality confirmados na posição certa (2 precisaram de ajuste de uma linha inteira na
> primeira tentativa — corrigidos). **Limitação de arquitetura documentada pra `sex`/`race`**:
> esta ficha marca "X" numa de várias caixinhas por campo (Masculino/Feminino separadas, não uma
> caixa única pra escrever a letra como no Sinan NET clássico) — o mecanismo atual só sabe
> escrever um valor numa posição fixa, sem escolher condicionalmente entre caixas. Pra esses dois
> campos, o valor aparece como texto simples perto do rótulo da seção (informação correta e
> visível, mas não no padrão visual "X marcado" da ficha) — resolver direito exigiria estender
> `HeaderBox` pra suportar múltiplas posições condicionais por valor, não feito nesta rodada.
> Corpo (Estratégia de Testagem, Sintomas, Condições, Vacinação, Exames Laboratoriais,
> Encerramento) **ainda não calibrado** — próximo passo se o usuário quiser continuar.
>
> Build+testes de `apps/api` (31 testes) limpos depois de toda a mudança.
>
> ### Corpo do COVID19 calibrado (11/09/2026)
>
> Grid de 5pt sobreposto ao PDF-base + 2 rounds de render de verificação com `debugBorders:true`,
> cobrindo os 6 grupos do schema: Estratégia e Local de Testagem, Sintomas, Condições, Vacinação,
> Exames Laboratoriais (8 tipos de teste, página 1, mais Teste Rápido de Antígeno na página 2) e
> Encerramento + Rastreamento de Contatos (página 2, landscape 841×595 — diferente da página 1,
> que é A4 retrato).
>
> **Achado corrigido na 1ª rodada**: a grade de Exames Laboratoriais (8 exames × estado/data/
> resultado) tinha `estado`/`resultado` posicionados 8pt acima de `data_coleta` em cada linha —
> isso fazia o valor vazar pra linha do exame ANTERIOR (confirmado comparando com `data_coleta`,
> que já batia certo em todas as 8 linhas desde a 1ª tentativa, já que datas são inconfundíveis:
> "05092026" só aparece uma vez por render). Corrigido colocando os três campos na mesma altura —
> confirmado certo depois do ajuste, todos os 8 exames caem na linha própria agora.
>
> Vacinação (1ª/2ª dose com data/laboratório/lote) e a tabela de Exames Laboratoriais renderizaram
> limpos desde a primeira tentativa. Campos de código simples (Estratégia, Sintomas, Condições,
> Evolução, Classificação) seguem a mesma limitação já documentada pro cabeçalho — texto simples
> perto do rótulo, não uma marca "X" na caixinha exata da opção (ficha inteira usa esse padrão
> "Marcar X" com várias caixinhas por campo, que o mecanismo atual não escolhe condicionalmente).
> Rastreamento de Contatos (tabela repetível) virou um campo de texto livre único, mesmo padrão já
> usado noutras fichas com tabelas repetíveis.
>
> **COVID19 agora tem cabeçalho E corpo calibrados** — mesmo nível de calibração das 12 doenças da
> Trilha 1 e Coqueluche. SRAG segue com cabeçalho e corpo calibrados desde a rodada anterior. Das
> 2 doenças da Trilha 2 destravadas, ambas (COVID19 e SRAG) estão com PDF completo calibrado.
>
> Build+testes de `apps/api` (31 testes) limpos.
>
> ### Corpo de Tuberculose e Raiva Humana calibrados (12/09/2026)
>
> Usuário pediu pra continuar a calibração de corpo (cabeçalho já estava pronto desde a Fase B/C
> pra ambas) com Tuberculose e Raiva Humana — as próximas 2 doenças da Trilha 1 depois de
> Coqueluche/SRAG/COVID19.
>
> **Tuberculose (campos 31-47, página única)**: grid de 5pt + 3 rounds de verificação com
> `debugBorders:true`. **Achado sistemático**: a 1ª tentativa tinha TODO o corpo ~18pt alto demais
> (mesmo padrão já visto depois em Raiva Humana) — confirmado porque vários campos apareciam
> vazando pra dentro do texto da SEÇÃO ANTERIOR (ex.: "123456" sobre "Dados Compl[123456]ementares
> do Caso"). Corrigido com um shift uniforme de -18pt. 2ª rodada revelou o grupo "Doenças e
> Agravos Associados" ainda vazando pra dentro da lista de opções do campo 36 (Se Extrapulmonar)
> — corrigido baixando mais ~10pt. 3ª rodada confirmou os campos 46/47 (datas finais), que nas
> tentativas anteriores não apareciam de jeito nenhum (y longe demais da linha real). **Todos os
> ~25 campos confirmados na posição certa** depois disso — nenhuma incerteza remanescente.
>
> **Raiva Humana (campos 31-60, ficha de 2 páginas)**: mesmo processo, 4 rounds de verificação.
> Mesmo achado sistemático de "~18-20pt alto demais" em toda a página 1 — corrigido com shift
> uniforme. Página 2 (datas de dose 1-5, condição final do animal, interrupção de tratamento,
> soro anti-rábico) confirmada majoritariamente correta após o mesmo ajuste — as 3 datas de dose
> testadas (1ª/2ª/3ª) renderizaram limpas na posição certa. **2 campos ficaram genuinamente
> incertos, documentados em vez de fingidos calibrados** (mesmo padrão de `data_inicio_tosse` em
> Coqueluche): `data_exposicao` (campo 36) — depois de 4 tentativas (y:310→290→345→320), o valor
> caiu em 3 linhas erradas diferentes, nunca na linha 36 (a ficha tem um layout multi-coluna nessa
> região que não bateu com as estimativas do grid de 5pt); `data_vencimento_vacina` (campo 46) —
> depois de 3 tentativas (y:130→100→55), oscilou entre "cai na linha do campo 43/44" e "passa do
> rodapé da página", sem nunca acertar a linha 46. Ambos precisam de uma segunda fonte de
> confirmação (zoom real de alta resolução, não disponível neste ambiente) antes de fechar —
> mantidos com o valor mais plausível encontrado, não um valor aleatório.
>
> Build+testes de `apps/api` (31 testes) limpos depois das duas calibrações.
>
> **Balanço**: das 12 doenças da Trilha 1, 2 têm corpo calibrado (Tuberculose, Raiva Humana) — as
> outras 10 (Meningite, Sarampo, Malária, Chagas, Leptospirose, Hepatites Virais, Febre Amarela,
> Dengue, Chikungunya, Violência Interpessoal) só têm cabeçalho calibrado por enquanto. Fora da
> Trilha 1, Coqueluche (28/30 campos) e as 2 doenças da Trilha 2 (COVID19, SRAG) também já têm
> corpo calibrado — total de 5 doenças com PDF completo (cabeçalho + corpo) prontas pra impressão.

---

## 1. RESUMO DA ARQUITETURA E ESTADO ATUAL

- **Projeto:** VITALOOP v1.3 (PEP Hospitalar UPA 24h)
- **Status do Gate Pass:** **`CONDITIONAL / GO-LIVE READY`** (100% homologado tecnicamente em código)
- **Design System & Shell:** `apps/web/src/styles/global.css` estilizando elementos nativos via tokens de cor/tipografia, acompanhado de `AppShell.tsx` com navegação por sidebar escura recolhível agrupada em Assistencial, Gestão e Sistema.
- **Backend API:** Fastify com script de desenvolvimento corrigido para `tsx watch` em `apps/api/package.json`.

---

## 2. MAPEAMENTO DE ROTAS ATIVAS (`App.tsx`)

Todas as rotas abaixo estão 100% conectadas, roteadas por hash e protegidas por `RequireSession` (exceto `/login` e `/`):

### 🔐 Autenticação e Perfil
- `#/login` ou `#/` (`LoginPage`) — Autenticação por **usuário** (não e-mail — decisão institucional, ver nota de 08-09/09/2026). Redefinição de senha é feita pelo administrativo, não há autoatendimento.
- `#/perfil` (`ProfilePage`) — Gestão de perfil do profissional de saúde.
- `#/alterar-senha` (`ChangePasswordPage`) — Troca obrigatória/voluntária de senha.
- `#/break-glass` (`BreakGlassPage`) — Acesso emergencial auditado (*Break-Glass*).

### 🏥 Módulo Assistencial e Recepção
- `#/pacientes` (`PatientSearchPage`) — Busca e localização de pacientes (CPF, CNS, Prontuário).
- `#/pacientes/novo` (`PatientRegisterPage`) — Cadastro de pacientes com validações puras e detecção de duplicidade.
- `#/pacientes/:id` (`PatientDetailPage`) — Prontuário consolidado, histórico e timeline do paciente.
- `#/pacientes/:id/lgpd` (`LgpdPrivacyPanel`) — Extrato de transparência e direitos do titular LGPD (Art. 18).
- `#/atendimentos` (`EncounterListPage`) — Fila geral de atendimentos ativos da UPA. Avanço de status inclui `post_consultation` ("Pós-Avaliação Médica") com sub-status obrigatório (medicando / aguardando exames laboratoriais / aguardando reavaliação médica).
- `#/atendimentos/novo` (`EncounterOpenPage`) — Abertura de novos atendimentos e admissão.
- `#/atendimentos/:id/triagem` (`TriageOpenPage`) — Triagem de risco (Protocolo de Manchester) e sinais vitais.
- `#/atendimentos/:id/consulta` (`MedicalConsultationPage`) — Consulta médica, anamnese, exames, prescição e desfecho.
- `#/atendimentos/:id/sae` (`NursingSaeView`) — Sistematização da Assistência de Enfermagem (SAE), escalas (Braden/Morse/Glasgow/MEWS) e balanço hídrico.
- `#/filas` (`QueueDashboardPage`) — Painel de chamada de senhas e gestão de filas de espera ("Pronto Atendimento" no menu).

### 🆕 Novos Contêineres de Página Conectados
- `#/atendimentos/:id/enfermagem` (`EnfermagemPage`) — Contêiner de cuidados de enfermagem, aprazamento de prescrições, checagem beira-leito (5 Certos), dispositivos invasivos e anotações clínicas.
- `#/atendimentos/:id/acoes` (`EncounterActionsPage`) — Central de ações do atendimento, reorganizada em 3 abas (`Solicitações Médicas` / `Enfermagem-Multidisciplinar` / `Farmácia-Interoperabilidade`):
  - **Solicitações Médicas**: AIH, APAC, Autorizar AIH/APAC (regulação/auditoria — etapa separada de quem solicita), sangue/componentes/derivados, antimicrobiano de uso restrito (ATM), laudo de TFD, documento clínico, plano terapêutico (médico), evento adverso, regulação externa (SISREG/CROSS).
  - **Enfermagem/Multidisciplinar**: quadro clínico (SER), transferência interna (SBAR), projeto terapêutico multidisciplinar (enfermagem — distinto do plano terapêutico médico), Balanço Hídrico (períodos + status aberto/parcial/fechado), evolução de Serviço Social, avaliação Nutricional, avaliação Fisioterapêutica, notificação de agravo compulsório.
  - **Farmácia/Interoperabilidade**: dispensação de farmácia, **Acompanhamento Farmacêutico** (anamnese+score na admissão, evolução diária com checklist FAST HUG MAIDENS), interoperabilidade (RNDS / lote de AIH).
- `#/leitos` (`BedMapPage`) — Mapa interativo de leitos por setor assistencial ("Prontuário de Internação" no menu — Sala Vermelha, Internação Adulto, Observação Pediátrica, Observação Adulto), gestão de ocupação, transferência interna, alta do leito e alocação direta via formulário modal/overlay validado (sem o antigo `window.prompt`).

### 📊 Painéis de Gestão, Segurança e Sistema (9 Módulos Diretos)
- `#/profissionais` (`StaffAccountsPage`) — Cadastro de profissionais: cria conta (usuário/senha), atribui role e setor de lotação. Restrito ao grupo de papel `ti`.
- `#/indicadores` (`ManagementDashboardPage`) — Dashboard de gestão operacional, TMP, indicadores Manchester e alertas de sobrelotação.
- `#/configuracoes/leitos` (`BedSectorSettingsPage`) — Cadastro de setores assistenciais e capacidade de leitos (Etapa 5 #10). Restrito ao grupo de papel `gestao`.
- `#/escala` (`StaffSchedulePage`) — Escala de profissionais: férias/afastamentos e plantões, substituindo o controle por planilha (Etapa 5 #11). Restrito ao grupo de papel `gestao`.
- `#/interoperabilidade` (`InteroperabilityDashboardPage`) — Barramento FHIR R4, receptores HL7 v2 (LIS/RIS) e WADO DICOM. (Dispensação de farmácia, RNDS e lote de AIH ficam em `EncounterActionsPage`, por atendimento — não nesta rota.)
- `#/observabilidade` (`ObservabilityDashboard`) — Métricas de sistema em tempo real, propagação de Correlation ID (`X-Request-Id`) e auditoria de logs.
- `#/seguranca` (`SecurityHardeningPanel`) — Painel de segurança, proteção IDOR/BOLA, validação de RLS/RBAC e políticas de sanitização.
- `#/qualidade` (`QualityAccessibilityDashboard`) — Suíte de testes E2E, simulação de concorrência com trava otimista e impressão de laudos com hash SHA-256.
- `#/disaster-recovery` (`DisasterRecoveryPanel`) — Monitoramento de jobs de backup/restore, RPO (15 min) e RTO (60 min).

---

## 3. CORREÇÕES DE CÓDIGO RECENTES APLICADAS

1. **`MedicationScheduleGrid.tsx`**: Removidas classes utilitárias inoperantes do Tailwind (`bg-emerald-100`, `text-emerald-800`, etc.). Substituídas por classes CSS semânticas (`.vl-badge`, `.vl-badge-success`, `.vl-badge-warning`, `.vl-badge-danger`, `.vl-badge-neutral`, `.vl-badge-info`) definidas no `global.css` e consumindo as variáveis/tokens oficiais de cor do projeto (`--color-success-soft`, `--color-danger`, etc.).
2. **`BedMapPage.tsx`**: Removidas as chamadas legadas a `window.prompt()` na alocação de leitos. Implementado modal/overlay estruturado (componente `Overlay`) com validação de preenchimento obrigatório para `encounterId` e `patientId`, preservando a chamada de API `bedApi.allocateBed(...)`.
3. **`apps/api/package.json`**: Corrigido script `dev` alterando `node --experimental-strip-types` por `tsx watch` para resolução adequada de imports de módulos `.js`/`.ts`.
4. **Autenticação (10 arquivos)**: chamadas `fetch()` cruas sem header `Authorization` migradas para o `ApiClient` padrão.
5. **Schemas clínicos** de Serviço Social, Nutrição e Fisioterapia reescritos a partir de impressos reais da UPA Breves (padrão `tipo_registro` admissão/evolução); Plano Terapêutico (médico) e Projeto Terapêutico Multidisciplinar (enfermagem) separados após conflação indevida.
6. **Balanço Hídrico** reconstruído com número de balanço, status (aberto/parcial/fechado) e períodos, substituindo o modelo v1 que só acumulava total corrido.
7. **Autorização de AIH/APAC** separada em etapa distinta da solicitação (regulação/auditoria x requisitante), com schemas, permissões (`sus.authorize_aih`/`sus.authorize_apac`) e rotas próprias.
8. **`apps/web/vite.config.ts`**: `vitest.setup.ts` registrado em `test.setupFiles` — cleanup automático do DOM entre testes passou a funcionar quando a suíte roda de dentro de `apps/web` isoladamente; removidos 27 contornos manuais (`afterEach(cleanup)`) redundantes.
9. **Migrations 0019-0067 aplicadas no Supabase real** (`VITALOOP-v1.3`, `ovwqbmmsppkeekhsnrbv`) — 27 já estavam estruturalmente presentes sem registro na tabela de controle, 19 realmente faltavam. Roles operacionais reais provisionadas (migration 0065) com as permissões correspondentes.
10. **Novo módulo — Acompanhamento Farmacêutico** (`packages/domain/src/pharmacy-followup/`): anamnese + score de risco na admissão, evolução diária complementada com checklist **FAST HUG MAIDENS** (Vincent, 2005; Mabasa et al., *Can J Hosp Pharm*, 2011), citado em protocolo institucional real (HU-UNIVASF/EBSERH, 2019, ISBN 978-85-92656-18-8).
11. **Decisões institucionais registradas** (migration 0067): break-glass (24h, doctor/nurse aciona, admin/direcao/system_admin revisa), need-to-know clínico por setor (decisão registrada, aplicação nas RLS pendente de dado real de lotação), merge de pacientes duplicados (nunca funde automaticamente — vincula e arquiva).
12. **`VULNERABILIDADE CRÍTICA CORRIGIDA`**: `apps/api/src/security/supabase-auth-client.ts` aceitava login com senha `Senha123!` ou `12345678` para **qualquer** e-mail, sem trava de ambiente — rodava também em produção. Backdoor removido por completo.
13. **Login trocado de e-mail para usuário** em toda a stack (`LoginPage.tsx`, `session-context.tsx`, rota `/api/v1/auth/login`) — decisão institucional, produto vendido para múltiplas unidades sem e-mail corporativo padronizado. E-mail sintético (`usuario@vitaloop.local`) usado internamente só para satisfazer a API do Supabase Auth.
14. **Fluxo "esqueci minha senha" por e-mail removido** (`PasswordRecoveryPage`, rota `/recuperar-senha`, `POST /api/v1/auth/password/recovery`) — redefinição de senha agora é sempre feita pelo administrativo da unidade.
15. **`.env.example`** atualizado — não diz mais "Supabase pendente de configuração"; reflete o projeto real já ativo (só a URL, que não é segredo).
16. **~250 arquivos de depuração removidos** (calibração de PDF SINAN) e `.gitignore` atualizado para nunca versionar `DOC/`/`PDF MODELO SINAN/` (documentos hospitalares reais usados só para extração de modelo).
17. **Tela de cadastro de profissionais** (`StaffAccountsPage`, `#/profissionais`): cria conta real (Supabase Auth Admin API via `service_role`, isolado no backend), atribui role e setor de lotação — primeira forma de cadastrar profissional real pelo próprio sistema.
18. **Reorganização em dois setores reais**: setores de leito renomeados (`Observação Pediátrica`/`Observação Adulto`, migration 0069); Pronto Atendimento modelado como **estado derivado**, não uma linha de tabela (`app.encounter_current_sector`, migration 0070) — atendimento sem leito alocado = Pronto Atendimento, com leito = setor daquele leito.
19. **Novo status `post_consultation`** (migration 0071) com sub-status obrigatório (medicando / aguardando exames laboratoriais / aguardando reavaliação médica) — corrige também um bug que a criação desse status introduziu: `assertEncounterStatusPermitsConsultation` não incluía `post_consultation`, impedindo o médico de registrar justamente a reavaliação que o sub-status sinaliza.
20. **Escolha de setor no login diário** (`ShiftSectorGate`, migration 0072) — só exigida de técnicos de enfermagem; e **restrição de acesso por setor aplicada** (migration 0073, RLS de `patients`/`encounters`) só para quem tem exclusivamente essa role.
21. **`AUDITORIA GERAL — ACHADO CRÍTICO CORRIGIDO`** (migration 0074): nenhuma das 8 roles reais tinha permissão de `patient`/`encounter`/`triage`/`queue`/`medical`/`diagnosis`/`prescription`/`exam`/`outcome` — migrations 0017-0031 nunca concederam essas permissões a role real nenhuma. Na prática, nenhum profissional real acessava um único paciente ou atendimento. Corrigido; também corrigida uma migration aplicada mas nunca registrada na tabela de controle (0070) e adicionado um índice de performance (0075).
22. **Escopo da role `receptionist` fechado** (migrations 0076-0077): de 44 para 15 permissões, todas justificáveis por cadastro/edição/movimentação de paciente, fila, leito e sinalização administrativa de saída do sistema (`outcome.write`) — removidas permissões de prontuário clínico, segurança do paciente, autorização SUS, segurança técnica, observabilidade, backup, LGPD e integração que nunca fizeram sentido para recepção.
23. **17 setores de teste removidos** da tabela real `app.bed_sectors` (com leitos/alocações de 14 pacientes-fixture) — limpeza de dado, sem migration.
24. **Bug de redirecionamento pós-login**: `/` e `/login` sempre mostravam `LoginPage`, mesmo já autenticado (login real ou Modo de Demonstração) — nada navegava pra dentro do app. Corrigido com redirecionamento automático para `#/filas`.
25. **Menu lateral desatualizado**: "Fila de atendimento"/"Mapa de leitos" nunca refletiam a nomenclatura real — renomeados para "Pronto Atendimento"/"Prontuário de Internação" (mesmas rotas).
26. **`AUDITORIA POR GRUPO — 10/09`**: CORS sem mais exceção automática de `localhost` (única fonte de verdade é `CORS_ALLOWED_ORIGINS`, em qualquer ambiente); dev script da API corrigido pra carregar o `.env` da raiz (nenhuma variável chegava ao processo antes); arquivo `.patch` morto (494 linhas, 01/09) removido; `MedicationScheduleGrid.tsx` teve o resto do Tailwind cru (além dos 5 badges já corrigidos em 02/09) finalmente substituído pelas classes reais do sistema.
27. **Revisão de break-glass construída**: `GET/POST /api/v1/security/break-glass(/:id/review)` + seção "Revisão de acessos excepcionais" na `BreakGlassPage` — a política decidida na migration 0067 nunca tinha sido implementada de fato.
28. **Permissões administrativas de Fase 1 concedidas também a `admin`**: `user.manage`, `role.manage`, `assignment.manage`, `audit.read`, `session.manage`, `security.settings.manage` (migration 0013) só estavam em `system_admin`; `admin` (role operacional real desde 0065) nunca tinha sido revisitada.
29. **Achado mais profundo**: as tabelas centrais de identidade/RBAC (`app.users`, `app.roles`, `app.user_roles`, `app.role_permissions`, `app.access_policies`, `app.professional_profiles`, `app.institutions/units/sectors`) exigem a role literal `system_admin` via RLS (migration 0010) — não a permissão. O item 28 acima não dá a `admin` controle real sobre essas tabelas. Decisão do usuário: manter assim (separação de segurança deliberada). `staff-accounts.ts` (todas as 4 rotas) e o menu (`AppShell`, novo grupo de papel `root`) alinhados com essa regra — a tela de cadastro de profissionais agora exige `system_admin` de forma consistente e visível só pra quem tem essa role.
30. **Leitura de auditoria corrigida**: `app.audit_events` checava a role `auditoria` (nunca criada como role real) — só `direcao` lia de fato. Trocado para checar a permissão `audit.read` (concedida a `admin`/`system_admin`/`direcao`).
31. **`.env` local completo para testes reais**: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` configurados — `/api/v1/ready` confirma banco e autenticação prontos. Falta só `SUPABASE_SERVICE_ROLE` para a tela de cadastro de profissionais funcionar de ponta a ponta localmente.

---

## 4. DOCUMENTAÇÃO DE BLOQUEIOS E PENDÊNCIAS DE INFRAESTRUTURA EXTERNA

Conforme auditado e registrado formalmente em `docs/GO_LIVE_REAL_VALIDATION_REPORT.md`, os itens abaixo representam **pendências externas e institucionais**, não sendo falhas de código ou bugs passíveis de correção via software:

| Item / Serviço Externo | Categoria | Status | Descrição da Pendência Externa |
| :--- | :--- | :---: | :--- |
| **Certificado Digital ICP-Brasil A3 (RNDS/DATASUS)** | Interoperabilidade Governamental | **BLOCKED** | Provisionamento de certificado digital mTLS da unidade de saúde junto ao Ministério da Saúde para envio do FHIR Bundle RNDS em ambiente de produção real. |
| **Credenciamento SISREG / CROSS** | Regulação de Leitos SUS | **BLOCKED** | Obtenção das chaves corporativas de API e contratos de integração com os Web Services estaduais/municipais de regulação de leitos. |
| **Servidor PACS DICOM Web** | Diagnóstico por Imagem | **BLOCKED** | Conexão com o servidor PACS DICOM físico (ex.: Orthanc / dcm4chee) na rede do hospital/UPA. |
| **Docker Engine / Runtime** | Infraestrutura | **BLOCKED** | Instalação e execução do Docker Engine e Compose no servidor/ambiente-alvo final de deploy. |

*Nota: O parecer final de prontidão da aplicação é **`CONDITIONAL`** unicamente aguardando os 4 itens de infraestrutura externa acima.*

---

## 5. PENDÊNCIAS INTERNAS CONHECIDAS (não são bloqueio externo — decisão/dado pendente)

| Item | Status | Descrição |
| :--- | :---: | :--- |
| **Vínculo usuário↔role↔setor** | **PARCIAL** | Tela de cadastro de profissionais existe (`#/profissionais`, item 17 da seção 3) e já atribui role+setor no ato da criação — mas nenhum profissional real foi cadastrado ainda (banco real só tem contas de teste). Depende da instituição usar a tela. |
| **Need-to-know clínico por setor (RLS)** | **PARCIAL** | Aplicado (migration 0073) só para `patients`/`encounters` e só restringe quem tem exclusivamente a role `nursing_technician` (via escolha de setor no login diário, item 20 da seção 3). As demais ~38 tabelas clínicas e as demais roles continuam sem escopo por setor — decisão do usuário foi deixar assim (só técnico de enfermagem é fixo por plantão). Não passou por branch de teste antes de ir para produção (decisão registrada, risco avaliado como nulo por não haver técnico de enfermagem real ainda). |
| **Redefinição de senha por administrador (para outro usuário)** | **NÃO CONSTRUÍDO** | Decidido que reset é feito pelo administrativo, mas só existe `POST /api/v1/auth/password/change` (troca da própria senha, autenticado) — falta uma tela/rota de admin resetando a senha de terceiros. |
| **Proteção de senha vazada (Supabase Auth)** | **PENDENTE — ação no dashboard** | Toggle simples em Authentication → Password Security no painel do Supabase; fora do alcance das ferramentas de automação usadas nesta sessão. |
| **Documentos de farmácia clínica adicionais** | **RESOLVIDO** | Anamnese, Score de Critérios e Acompanhamento Farmacêutico — construídos como módulo `pharmacy-followup` (ver item 10 da seção 3). |
| **Ambiente local sem banco/auth real** | **RESOLVIDO** | `.env` local já tem `DATABASE_URL` (banco real), `SUPABASE_URL` e `SUPABASE_ANON_KEY` — `/api/v1/ready` confirma `db: ok`, `auth: ok`. Falta só `SUPABASE_SERVICE_ROLE` (Settings → API → service_role), necessária apenas para a tela de cadastro de profissionais (Admin API do Supabase Auth). |
| **Nenhuma conta `system_admin` real cadastrada** | **PENDENTE** | A tela de cadastro de profissionais (`#/profissionais`) agora exige literalmente a role `system_admin` (não mais `admin` — achado de auditoria em 10/09, ver item 26 da seção 3), mas nenhuma conta real com essa role existe no banco ainda — só contas de teste. Sem `SUPABASE_SERVICE_ROLE` configurada (item acima) e uma primeira conta `system_admin` criada manualmente, ninguém consegue usar a tela. |
| **Revisão de break-glass** | **RESOLVIDO** | `GET/POST /api/v1/security/break-glass(/:id/review)` + seção na `BreakGlassPage` (ver item 27 da seção 3). |

> ## 🟡 Corpo de Meningite e Sarampo calibrados — sem renderização visual (12/09/2026)
> Continuação da Fase C (calibração de coordenadas PDF) pra Meningite e Sarampo, as duas
> próximas doenças da Trilha 1 depois de Tuberculose/Raiva Humana. Achado importante: ao
> contrário do que constava neste arquivo, **nenhuma das duas tinha entrada em `FORM_TEMPLATES`**
> — nem cabeçalho nem corpo estavam calibrados (só o schema de campos, revisado em sessão
> anterior, existia). Calibrei as duas do zero (cabeçalho 1-16 + corpo 17+) nesta sessão.
>
> **Método (diferente das rodadas anteriores)**: este ambiente não tem `pdftoppm`/poppler/
> ImageMagick/PyMuPDF instalado — o Read tool não conseguiu renderizar PNG do PDF pra inspeção
> visual, ao contrário das rodadas de Coqueluche/Tuberculose/Raiva Humana/SRAG/COVID19. Em vez
> disso, instalei `pdfjs-dist` temporariamente (`npm install --no-save`, removido ao final) pra
> extrair a posição real (x,y) de cada string de texto do PDF-base, e apliquei a mesma técnica
> de "transferência de delta" já usada em MALÁRIA/CHAGAS/TUBERCULOSE — mas campo a campo (não
> um offset uniforme): calculei `delta = caixa_já_confirmada_por_pixel_em_ANIMAIS_PECONHENTOS -
> posição_do_rótulo_em_ANIMAIS_PECONHENTOS` pra cada campo do cabeçalho, e apliquei esse delta à
> posição do rótulo equivalente extraída de Meningite/Sarampo (o bloco "Notificação Individual"
> é idêntico entre todas as fichas Sinan NET clássicas). Confirmado por uma segunda fonte
> independente: as marcas de comb ("|") das datas/CNS extraídas de cada ficha bateram com o
> resultado do delta-transfer em todos os campos de data, dentro de ~1-3pt.
>
> Depois de escrever as coordenadas, gerei um PDF de teste com `debugBorders:false` (achatado) e
> reextrai o texto — achei e corrigi 6 campos de corpo onde eu tinha colocado o valor NA MESMA
> linha do rótulo em vez da linha em branco ABAIXO (a convenção real desta ficha, confirmada
> pelos deltas do próprio cabeçalho): `nome_contato` e `observacoes_adicionais` (as duas
> fichas), `nome_hospital` (Meningite) e `nome_hospital`/`municipio_hospital` (Sarampo). Depois
> do ajuste, reconferido: nenhum valor bate em cima do texto do rótulo ou vaza pra linha
> vizinha.
>
> **Campos de confiança menor** (documentado no código, não fingido como certo): caixinhas
> pequenas de Sim/Não/código único sem nenhuma marca de texto própria (retângulos vetoriais
> puros) tiveram a posição estimada pela proximidade do rótulo, não medida diretamente — afeta
> a grade de Vacinação de Meningite (8 vacinas × Sim/Não), a grade de Resultados Laboratoriais
> de Meningite (18 campos) e a grade Sarampo/Rubéola/Outras × IgM/IgG × S1/S2/Re-Teste de
> Sarampo (18 campos). Os campos de DATA em ambas as grades têm marca de comb real extraída
> (alta confiança); só os campos de código/texto sem marca própria ficam nessa categoria.
>
> Build (`apps/api`) limpo, suíte completa (`apps/api`+`packages/domain`, 378 testes) passando.
> `.scratch/` e a instalação temporária de `pdfjs-dist` removidos ao final; `package-lock.json`
> revertido (a instalação temporária tinha sujado o lockfile sem necessidade).
>
> **Balanço atualizado**: 4 das 12 doenças da Trilha 1 agora têm corpo calibrado (Tuberculose,
> Raiva Humana, Meningite, Sarampo); 8 continuam só com cabeçalho (Malária, Chagas,
> Leptospirose, Hepatites Virais, Febre Amarela, Dengue, Chikungunya, Violência Interpessoal) —
> destas, Malária/Chagas/Tuberculose já tinham cabeçalho calibrado antes desta sessão, mas
> Leptospirose/Hepatites Virais/Febre Amarela/Dengue/Chikungunya/Violência Interpessoal **nem
> cabeçalho têm ainda** (mesmo achado de Meningite/Sarampo — precisa confirmar cada uma
> individualmente antes de assumir que está calibrada). 7 doenças no total têm PDF completo
> (cabeçalho+corpo) pronto pra impressão: Coqueluche, SRAG, COVID19, Tuberculose, Raiva Humana,
> Meningite, Sarampo.

> ## 🟡 Corpo de Malária e Chagas calibrados (12/09/2026)
> Continuação da Fase C: as duas próximas doenças com cabeçalho já calibrado (Fase A) e corpo
> ainda pendente. Mesmo método sem renderização visual usado em Meningite/Sarampo (extração de
> texto posicionado via `pdfjs-dist`, delta-transfer campo a campo). Verificação feita gerando
> um PDF achatado de teste e reextraindo o texto pra confirmar cada valor cai na linha certa,
> sem sobrepor rótulo ou vazar pra campo vizinho — achei e corrigi 1 colisão real (Malária:
> `municipio_provavel_infeccao` era largo demais e podia invadir o rótulo "Distrito" com um
> nome de município mais longo; encurtado de 230pt pra 95pt).
>
> **Malária** (1 página + comprovante destacável, este último sem fonte de dados — não
> preenchido): ~20 campos de corpo, incluindo a grade "Esquema de Tratamento" (13 opções) e o
> bloco completo de Local Provável da Infecção (UF/país/município/distrito/bairro/localidade).
> **Chagas** (2 páginas, ~50 campos): a mais complexa calibrada até agora sem renderizador —
> checklist de 12 sintomas, 2 exames parasitológicos (direto/indireto × tipo), e a grade de
> sorologia ELISA/Hemoaglutinação/IFI × IgM/IgG × S1/S2 (com títulos pra IFI), tratamento,
> medidas de controle e conclusão com modo/local prováveis da infecção. Confiança menor
> (documentada no código) nos campos de código único sem marca de texto própria, mesma
> ressalva já usada em Meningite/Sarampo — a grade de sorologia de Chagas é a parte mais
> incerta desta ficha.
>
> Build+testes (`apps/api`+`packages/domain`, 378 testes) limpos. `.scratch/` e a instalação
> temporária de `pdfjs-dist` removidos.
>
> **Balanço atualizado**: 9 doenças com PDF completo (cabeçalho+corpo) pronto pra impressão:
> Coqueluche, SRAG, COVID19, Tuberculose, Raiva Humana, Meningite, Sarampo, Malária, Chagas.
> Restam, da Trilha 1: Leptospirose, Hepatites Virais, Febre Amarela, Dengue, Chikungunya,
> Violência Interpessoal — nenhuma delas tem cabeçalho confirmado em `FORM_TEMPLATES` ainda
> (precisa checar cada uma no código antes de assumir).

> ## 🟡 Leptospirose e Hepatites Virais calibradas do zero (12/09/2026)
> Continuação da Fase C. Ao contrário de Malária/Chagas (que já tinham cabeçalho da Fase A),
> estas duas **não tinham nenhuma entrada em `FORM_TEMPLATES`** — mesmo achado de Meningite/
> Sarampo. Calibradas do zero (cabeçalho 1-16 + corpo 17+), mesmo método sem renderização
> visual (extração de texto posicionado via `pdfjs-dist` + delta-transfer campo a campo,
> confirmado por marca de comb própria de cada ficha).
>
> **Leptospirose** (2 páginas, ~55 campos): checklist de 12 situações de risco, checklist de
> 16 sintomas, grade de sorologia (ELISA 1ª/2ª amostra, Microaglutinação 1ª/2ª amostra com até
> 2 sorovares+títulos cada, Isolamento/Imunohistoquímica/RT-PCR), conclusão com local provável
> completo. **Hepatites Virais** (2 páginas, ~50 campos): checklist de 14 exposições a
> procedimentos de risco, grade de 12 marcadores sorológicos (HAV/HBsAg/HBc/HBs/HBe/HDV/HCV/
> HEV), banco de sangue/CTA, classificação etiológica com 10 combinações de vírus. Um campo
> (`data_investigacao`/`ocupacao` de Hepatites Virais) não teve marca de comb própria
> encontrada nas proximidades — calibrado só pelo delta padrão, documentado como tal no código.
>
> Verificado por PDF achatado de teste + reextração de texto; nenhuma colisão real encontrada
> desta vez (ao contrário da rodada de Malária/Chagas). Build+testes (`apps/api`+
> `packages/domain`, 378 testes) limpos. `.scratch/` e instalação temporária removidos.
>
> **Balanço atualizado**: 11 doenças com PDF completo (cabeçalho+corpo) pronto pra impressão:
> Coqueluche, SRAG, COVID19, Tuberculose, Raiva Humana, Meningite, Sarampo, Malária, Chagas,
> Leptospirose, Hepatites Virais. Restam da Trilha 1: Febre Amarela, Dengue, Chikungunya,
> Violência Interpessoal — nenhuma confirmada em `FORM_TEMPLATES` ainda.

> ## 🟡 Febre Amarela e Dengue calibradas do zero (12/09/2026)
> Continuação da Fase C. Mesmo achado de Meningite/Sarampo/Leptospirose/Hepatites Virais:
> nenhuma das duas tinha entrada em `FORM_TEMPLATES`. Calibradas do zero (cabeçalho + corpo),
> mesmo método sem renderização visual.
>
> **Febre Amarela** (2 páginas, ~45 campos): investigação entomológica/epizootias, vacinação com
> local, 4 sinais clínicos, hospitalização, exames inespecíficos (bilirrubinas/transaminases),
> sorologia (1ª/2ª amostra), isolamento/histopatologia/imunohistoquímica/RT-PCR, conclusão com
> local provável completo. **Dengue** (2 páginas, ~65 campos, PDF compartilhado com Chikungunya
> — só `DENGUE` calibrado agora, `CHIKUNGUNYA` fica pra depois): 14 sinais clínicos, 7 doenças
> pré-existentes, laboratório completo (sorologia IgM/NS1/isolamento/RT-PCR/sorotipo/
> histopatologia/imunohistoquímica), hospitalização com telefone, conclusão, e os dois blocos
> condicionais mais importantes clinicamente — **Dengue com Sinais de Alarme** (9 itens) e
> **Dengue Grave** (14 itens em 3 categorias: extravasamento, sangramento, comprometimento de
> órgãos).
>
> Achado real de colisão nesta rodada (mesmo processo: PDF achatado + reextração de texto):
> `municipio_hospital` (Dengue) estava posicionado na MESMA linha do rótulo "Município do
> Hospital" em vez da linha em branco compartilhada com UF/Data de Internação (mesma linha) —
> corrigido.
>
> Build+testes (`apps/api`+`packages/domain`, 378 testes) limpos. `.scratch/` e instalação
> temporária removidos.
>
> **Balanço atualizado**: 13 doenças com PDF completo (cabeçalho+corpo) pronto pra impressão:
> Coqueluche, SRAG, COVID19, Tuberculose, Raiva Humana, Meningite, Sarampo, Malária, Chagas,
> Leptospirose, Hepatites Virais, Febre Amarela, Dengue. Restam da Trilha 1: Chikungunya
> (mesmo PDF de Dengue, só falta o corpo específico) e Violência Interpessoal (a maior, ~50
> campos, deixada por último de propósito desde o plano original).

> ## 🟢 Chikungunya e Violência Interpessoal calibradas — TRILHA 1 COMPLETA (12/09/2026)
> Últimas duas doenças da Trilha 1. **CHIKUNGUNYA** reaproveita o cabeçalho e a maior parte do
> corpo já calibrados em DENGUE (mesmo PDF-base, campos físicos compartilhados: sinais
> clínicos, doenças pré-existentes, hospitalização, local provável de infecção, conclusão,
> histopatologia/imunohistoquímica) — só o bloco de laboratório específico (Sorologia IgM
> Chikungunya 1ª/2ª amostra + PRNT, campos 35-38) precisou de coordenadas novas.
>
> **VIOLÊNCIA INTERPESSOAL** (2 páginas, ~90 campos, a maior ficha do projeto — deixada por
> último de propósito): calibrada do zero (cabeçalho até o campo 32, não 30 como as demais —
> tem um campo extra de tipo de unidade notificadora antes do nome da unidade). Cobre dados da
> pessoa atendida (nome social, situação conjugal, orientação sexual, identidade de gênero,
> deficiência/transtorno), dados completos da ocorrência (endereço completo + hora + local),
> contexto/motivação da violência, tipo de violência (10 itens), meio de agressão (9 itens),
> violência sexual (5 itens + procedimentos realizados, 8 itens), dados do provável autor
> (18 vínculos possíveis + sexo + suspeita de álcool + ciclo de vida), encaminhamento (14
> redes/instituições) e dados finais (CAT, CID-10, acompanhante).
>
> Verificação (PDF achatado + reextração de texto) achou e corrigiu **8 colisões reais** nesta
> rodada — o maior número até agora, esperado dado o tamanho da ficha: `municipio_ocorrencia`/
> `distrito_ocorrencia` estavam inline em vez de na linha abaixo compartilhada com UF (mesmo
> padrão do bloco "Dados de Residência" do cabeçalho, que este bloco espelha estruturalmente);
> `bairro_ocorrencia`/`logradouro_ocorrencia`/`numero_ocorrencia`/`complemento_ocorrencia`/
> `ponto_referencia_ocorrencia` e os 3 campos de acompanhante (`nome_acompanhante`/
> `vinculo_acompanhante`/`telefone_acompanhante`) tinham a largura do rótulo subestimada,
> invadindo o próprio texto do rótulo. Todos corrigidos e reconferidos.
>
> Build+testes (`apps/api`+`packages/domain`, 378 testes) limpos. `.scratch/` e instalação
> temporária removidos.
>
> **TRILHA 1 COMPLETA**: as 12 doenças (Meningite, Sarampo, Malária, Chagas, Leptospirose,
> Hepatites Virais, Febre Amarela, Raiva Humana, Tuberculose, Dengue, Chikungunya, Violência
> Interpessoal) + Coqueluche/Animais Peçonhentos (fora da Trilha 1, já feitas antes) + SRAG/
> COVID19 (fora da Trilha 1, sistemas próprios) somam **15 doenças com PDF completo**
> (cabeçalho+corpo) pronto pra impressão. Restam só as 5 doenças da Trilha 2, sem PDF oficial
> disponível: ZIKA, HANSENIASE, SIFILIS, TETANO_ACIDENTAL, INTOXICACAO_EXOGENA — bloqueadas,
> sem previsão, até o documento chegar.

> ## 🟢 Estado "Internado" de primeira classe — ADM-001..008 (12/09/2026)
> Handoff recebido de sessão separada (`docs/handoffs/HANDOFF_2026-09-12_ESTADO_INTERNADO.md`)
> com banco/domínio já prontos e aplicados ao vivo no Supabase real. Verifiquei (não assumi)
> que as migrations `0081_encounter_admitted_status`/`0082_admissions` já estavam aplicadas
> (`enum admitted`, tabela `app.admissions`, trigger `guard_encounter_admission_transition`
> confirmados via `execute_sql`) mas sem registro em `app.schema_migrations` — registrei os
> dois checksums pra não haver reaplicação quebrada por `migrate.ts` no futuro.
>
> **Completei a parte que faltava (API + tela)**:
> - Novo módulo de domínio `packages/domain/src/admission/` (types/rules/events, 7 testes),
>   mesmo padrão de `bed/`.
> - Rotas `apps/api/src/routes/admissions.ts`: `GET/POST/PATCH /api/v1/encounters/:id/admission`
>   + `POST .../admission/discharge`. Propaga o erro 23514 do gatilho do banco como 409 com a
>   mensagem em português já pronta.
> - `InternacaoTab.tsx` deixou de ser só leitura: agora tem formulário de internar (diagnóstico +
>   justificativa, só aparece com leito ativo alocado), evolução da internação, e encerramento
>   (alta/transferência/óbito) — que só fecha `app.admissions`, o desfecho final do atendimento
>   continua exigindo a aba "Desfecho" já existente (outcomeType `admission_bed`), como o handoff
>   pediu pra não duplicar.
> - Build+testes limpos: `packages/domain` (354 testes), `apps/api` (385 no total com domain),
>   `apps/web` (44 arquivos, 80 testes) — todos passando.
>
> **Gaps que continuam em aberto** (fora de escopo deste handoff, já documentados): escala de
> enfermagem por leito, regulação de leito entre unidades, RLS por setor além de
> `nursing_technician`.

---

> ## 🟢 FASE 3 DO PLANO DE RECONSTRUÇÃO ASSISTENCIAL — Escalas de Risco (12/09/2026)
> Auditoria encontrou que a rota `POST /api/v1/encounters/:id/nursing/scales` e a tabela
> `app.patient_risk_assessments` já existiam (contrariando a suposição inicial do plano de
> "zero API") — mas a única tela existente (`NursingSaeView.tsx`) tinha um único botão que sempre
> submetia os mesmos valores fixos de Braden, sem formulário real e sem Morse/Fugulin.
>
> - **Domínio**: `calculateScaleScore` (`packages/domain/src/nursing/rules.ts`) ganhou a Escala de
>   Fugulin (12 indicadores, 1-4 cada, 12-48 pontos, 5 categorias de complexidade assistencial —
>   faixas conferidas em fonte externa, já que não existia estudo caso brasileiro anterior no
>   projeto). Braden e Morse já estavam corretos, só sem UI real.
> - **API**: `apps/api/src/routes/nursing.ts` — enum de `scaleType` ganhou `'fugulin'`; condição de
>   escalonamento pra `app.patient_risk_assessments` ampliada pras 3 categorias de maior
>   dependência do Fugulin.
> - **Web**: novo `NursingScalesPanel.tsx` — formulário real por escala (Braden: 6 subescalas;
>   Morse: 6 itens com pontuação própria; Fugulin: 12 indicadores) + histórico de avaliações do
>   atendimento (a rota `GET .../nursing/scales` já existia e nunca tinha sido consumida pelo
>   frontend). Substitui o botão fixo em `NursingSaeView.tsx`.
> - Nenhuma migration nova — `scale_type` já era `text` sem CHECK constraint.
> - Build+testes limpos: `packages/domain`, `apps/api`, `apps/web` (106 arquivos, 470 testes).

---

> ## 🟢 FASE 4 DO PLANO DE RECONSTRUÇÃO ASSISTENCIAL — Checklist de Alta + Óbito (12/09/2026)
> - **Declaração de Óbito estruturada**: `app.encounter_outcomes` ganhou coluna `death_certificate_data`
>   jsonb (Causa Mortis A obrigatória/B/C/D, circunstância do óbito, dados de declarante) —
>   campos antigos (`death_timestamp`/`death_certificate_info`) mantidos intactos. Validação de
>   domínio em `packages/domain/src/outcome/rules.ts` exige Causa Mortis A + circunstância.
>   Formulário estruturado embutido em `DesfechoTab.tsx` (só aparece quando o tipo de desfecho é
>   'death').
> - **Checklist de Alta**: nova tabela `app.discharge_checklists` (mesmo padrão form_fields jsonb
>   das outras fichas via engine `clinical-forms`), reaproveitando as permissões `outcome.read`/
>   `outcome.write` já existentes. Novo botão "Checklist de Alta" na aba de Solicitações Médicas.
> - **Achado colateral corrigido**: a rota de desfecho fazia `UPDATE` direto no status do
>   atendimento (bypassando a máquina de estados, mesmo padrão de bug já corrigido na Fase 1 do
>   fluxo Pronto Atendimento) — trocado por `transitionEncounterStatus`.
> - **Achado colateral NÃO corrigido nesta rodada** (spawn de tarefa separada): desfecho tipo
>   `admission_bed` ainda força o atendimento pra `completed` em vez de `admitted` — contradiz a
>   Fase 1 (Internação como estado de 1ª classe). Fora de escopo desta fase, sinalizado à parte.
> - Nenhuma migration quebra compatibilidade — tudo aditivo. Build+testes limpos: `packages/domain`,
>   `apps/api`, `apps/web` (106 arquivos, 473 testes).

---

> ## 🟢 FASE 5 (PARCIAL) DO PLANO DE RECONSTRUÇÃO ASSISTENCIAL — 12/09/2026
> 3 dos 6 gaps administrativos/operacionais do mapa Emergency Care → Vitaloop, priorizados pelo
> usuário:
> - **Inventário de Pertences do Paciente**: novo `app.patient_belongings_inventories`
>   (form_fields jsonb via engine clinical-forms), reaproveita `nursing.read`/`nursing.write`.
>   Botão na aba Enfermagem/Multidisciplinar.
> - **Medicamentos Controlados**: coluna `controlled_class` no catálogo (Portaria SVS/MS 344/98 —
>   Tramadol/MED-009 marcado A1), nova tabela `app.controlled_medication_dispensations` com
>   colunas relacionais reais (não form_fields, porque tem regra própria: número da notificação de
>   receita obrigatório pras listas A/B) vinculada a `app.prescription_items`. Reaproveita
>   `medication.administer`/`nursing.read`. Botão na aba Farmácia.
> - **Ficha de Referência**: novo `app.referral_forms` (form_fields jsonb), complementa
>   `app.external_regulations` (que só cobre a solicitação de vaga) com o resumo clínico
>   estruturado que acompanha o paciente. Reaproveita `regulation.read`/`regulation.manage`.
>   Botão na aba de Solicitações Médicas.
> - **Ainda pendentes da Fase 5** (não pedidos nesta rodada): estoque de farmácia (lote/validade),
>   painel de TV (chamada pública), passagem de plantão estruturada.
> - Migration 0086 (aditiva). Build+testes limpos: `packages/domain`, `apps/api`, `apps/web`
>   (107 arquivos, 477 testes).
