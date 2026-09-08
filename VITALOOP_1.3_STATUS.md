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

## 1. RESUMO DA ARQUITETURA E ESTADO ATUAL

- **Projeto:** VITALOOP v1.3 (PEP Hospitalar UPA 24h)
- **Status do Gate Pass:** **`CONDITIONAL / GO-LIVE READY`** (100% homologado tecnicamente em código)
- **Design System & Shell:** `apps/web/src/styles/global.css` estilizando elementos nativos via tokens de cor/tipografia, acompanhado de `AppShell.tsx` com navegação por sidebar escura recolhível agrupada em Assistencial, Gestão e Sistema.
- **Backend API:** Fastify com script de desenvolvimento corrigido para `tsx watch` em `apps/api/package.json`.

---

## 2. MAPEAMENTO DE ROTAS ATIVAS (`App.tsx`)

Todas as rotas abaixo estão 100% conectadas, roteadas por hash e protegidas por `RequireSession` (exceto `/login`, `/` e `/recuperar-senha`):

### 🔐 Autenticação e Perfil
- `#/login` ou `#/` (`LoginPage`) — Autenticação de usuários.
- `#/recuperar-senha` (`PasswordRecoveryPage`) — Fluxo de recuperação de credencial.
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
- `#/atendimentos/:id/acoes` (`EncounterActionsPage`) — Central de ações do atendimento integrando os modais de Solicitação de AIH, Regulação Externa (SISREG/CROSS), Dispensação de Farmácia, Notificação de Evento Adverso (NSP), Notificação Compulsória de Agravos (registro interno, sem integração SINAN ainda), Documentos Clínicos Complementares e Interoperabilidade (RNDS / Lote de AIH).
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
