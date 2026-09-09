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
- `#/atendimentos` (`EncounterListPage`) — Fila geral de atendimentos ativos da UPA.
- `#/atendimentos/novo` (`EncounterOpenPage`) — Abertura de novos atendimentos e admissão.
- `#/atendimentos/:id/triagem` (`TriageOpenPage`) — Triagem de risco (Protocolo de Manchester) e sinais vitais.
- `#/atendimentos/:id/consulta` (`MedicalConsultationPage`) — Consulta médica, anamnese, exames, prescição e desfecho.
- `#/atendimentos/:id/sae` (`NursingSaeView`) — Sistematização da Assistência de Enfermagem (SAE), escalas (Braden/Morse/Glasgow/MEWS) e balanço hídrico.
- `#/filas` (`QueueDashboardPage`) — Painel de chamada de senhas e gestão de filas de espera.

### 🆕 Novos Contêineres de Página Conectados
- `#/atendimentos/:id/enfermagem` (`EnfermagemPage`) — Contêiner de cuidados de enfermagem, aprazamento de prescrições, checagem beira-leito (5 Certos), dispositivos invasivos e anotações clínicas.
- `#/atendimentos/:id/acoes` (`EncounterActionsPage`) — Central de ações do atendimento, reorganizada em 3 abas (`Solicitações Médicas` / `Enfermagem-Multidisciplinar` / `Farmácia-Interoperabilidade`):
  - **Solicitações Médicas**: AIH, APAC, Autorizar AIH/APAC (regulação/auditoria — etapa separada de quem solicita), sangue/componentes/derivados, antimicrobiano de uso restrito (ATM), laudo de TFD, documento clínico, plano terapêutico (médico), evento adverso, regulação externa (SISREG/CROSS).
  - **Enfermagem/Multidisciplinar**: quadro clínico (SER), transferência interna (SBAR), projeto terapêutico multidisciplinar (enfermagem — distinto do plano terapêutico médico), Balanço Hídrico (períodos + status aberto/parcial/fechado), evolução de Serviço Social, avaliação Nutricional, avaliação Fisioterapêutica, notificação de agravo compulsório.
  - **Farmácia/Interoperabilidade**: dispensação de farmácia, **Acompanhamento Farmacêutico** (anamnese+score na admissão, evolução diária com checklist FAST HUG MAIDENS), interoperabilidade (RNDS / lote de AIH).
- `#/leitos` (`BedMapPage`) — Mapa interativo de leitos por setor assistencial, gestão de ocupação, transferência interna, alta do leito e alocação direta via formulário modal/overlay validado (sem o antigo `window.prompt`).

### 📊 Painéis de Gestão, Segurança e Sistema (8 Módulos Diretos)
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
| **Vínculo usuário↔role↔setor** | **PENDENTE** | Roles reais existem e têm permissão (migration 0065), mas `app.user_roles`/`app.access_assignments` estão vazios no banco real — nenhum profissional cadastrado ainda. Depende de a instituição cadastrar sua equipe real. |
| **Need-to-know clínico por setor (RLS)** | **DECIDIDO, NÃO APLICADO** | Infraestrutura pronta (`app.can_access`), mas as RLS das ~40 tabelas clínicas hoje só checam permissão de role, não escopo. Aplicar exige dado real de lotação (ver item acima) — recomendado testar numa branch Supabase antes de ir para produção. |
| **Redefinição de senha por administrador (para outro usuário)** | **NÃO CONSTRUÍDO** | Decidido que reset é feito pelo administrativo, mas só existe `POST /api/v1/auth/password/change` (troca da própria senha, autenticado) — falta uma tela/rota de admin resetando a senha de terceiros. |
| **Proteção de senha vazada (Supabase Auth)** | **PENDENTE — ação no dashboard** | Toggle simples em Authentication → Password Security no painel do Supabase; fora do alcance das ferramentas de automação usadas nesta sessão. |
| **Documentos de farmácia clínica adicionais** | **RESOLVIDO** | Anamnese, Score de Critérios e Acompanhamento Farmacêutico — construídos como módulo `pharmacy-followup` (ver item 10 da seção 3). |
