# VITALOOP v1.3 — PLANEJAMENTO OFICIAL DA FASE 8

## 1. Estado Anterior

Todas as etapas anteriores do projeto Vitaloop v1.3 foram concluídas, testadas e homologadas com Gate Pass confirmado:

- **Fases 0–6:** Concluídas e homologadas com Gate Pass (Prontuário, Filas, Consulta Médica, CID-10, Prescrição Médica, Exames, Desfecho/Alta, Enfermagem, SAE, Leitos UPA, Documentos Clínicos e Segurança do Paciente).
- **Fase 7 / Etapa 1 (`MGT-001..010`):** Gestão Operacional, Dashboards em Tempo Real e Indicadores da UPA — **HOMOLOGADA COM GATE PASS CONFIRMADO** (`docs/PHASE_7_STEP_1_REPORT.md` e `VITALOOP_1.3_STATUS.md` §0-L).
- **Baseline Atual:** Estado do repositório fixado no commit de baseline `e0014a7` (`chore: establish validated Vitaloop v1.3 baseline`).

---

## 2. Identificação Oficial da Fase 8

- **Número da Fase:** FASE 8
- **Nome Oficial:** REGULAÇÃO, FATURAMENTO SUS E AIH
- **Fonte Documental Exata:** Matriz de Rastreabilidade (`Documento 3` Seção 22: `# 22. FASE 15 — SUS / AIH / REGULAÇÃO`), Blueprint Funcional Clínico (`Documento 1` §45: "REGULAÇÃO" e §58: "AIH/SUS").
- **Localização nos Documentos:** Matriz de Rastreabilidade (`Documento 3` Seção 22, linhas 485–499) e Blueprint Funcional Clínico (`Documento 1` Seções 45 e 58, linhas 1162–1176 e 1422–1438).

---

## 3. Requisitos da Fase 8

A Fase 8 compreende exatamente os 10 requisitos abaixo, conforme formalizado na Matriz de Rastreabilidade (`Documento 3` Seção 22):

| Código | Requisito | Descrição Sintética | Fonte Documental | Status Atual | Dependências |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **SUS-001** | Laudo para AIH | Geração e preenchimento estruturado de laudo de solicitação de Autorização de Internação Hospitalar (AIH). | Matriz §22 / Blueprint §58 | `NÃO INICIADO` | `PAT-001`, `ENC-001`, `MED-001`, `OUT-001` |
| **SUS-002** | Catálogo SIGTAP | Tabela unificada SIGTAP/SUS tratada como dados versionáveis de procedimentos. | Matriz §22 / Blueprint §58 | `NÃO INICIADO` | `MEDC-001`, `EXA-001` |
| **SUS-003** | Mapeamento CID | Mapeamento obrigatoriedade de CID-10 Principal e Secundários para autorização da AIH. | Matriz §22 / Blueprint §58 | `NÃO INICIADO` | `MED-005` (CID-10) |
| **SUS-004** | Procedimentos Realizados | Registro e associação de Procedimento Principal e Procedimentos Secundários à AIH. | Matriz §22 / Blueprint §58 | `NÃO INICIADO` | `EXA-001`, `MEDC-001` |
| **SUS-005** | Compatibilidades SUS | Validação automática de regras de compatibilidade (Procedimento x CID x Idade x Sexo). | Matriz §22 / Blueprint §58 | `NÃO INICIADO` | `PAT-001`, `SUS-002`, `SUS-003` |
| **SUS-006** | Consistência de Faturamento | Validação de consistência e regras compulsórias do faturamento SUS para espelho da AIH. | Matriz §22 / Blueprint §58 | `NÃO INICIADO` | `SUS-001..005` |
| **SUS-007** | Regulação Médica | Solicitação de vaga externa e regulação médica inter-hospitalar. | Matriz §22 / Blueprint §45 | `NÃO INICIADO` | `OUT-001`, `BED-001` |
| **SUS-008** | Transferência Externa | Gestão de status de regulação, meio de transporte (SAMU/Ambulância) e confirmação de vaga. | Matriz §22 / Blueprint §45 | `NÃO INICIADO` | `SUS-007` |
| **SUS-009** | Documentação da Regulação | Anexo de relatórios clínicos e documentos de suporte à solicitação de regulação/AIH. | Matriz §22 / Blueprint §45/§58 | `NÃO INICIADO` | `DOC-001..010` |
| **SUS-010** | Validação Final da AIH | Validação completa, fechamento do espelho e exportação do lote da AIH/Faturamento. | Matriz §22 / Blueprint §58 | `NÃO INICIADO` | `SUS-001..009` |

---

## 4. Etapas da Fase 8

- **Análise Documental:** DIVISÃO DE ETAPAS NÃO DEFINIDA DOCUMENTALMENTE. Os documentos oficiais (`Documento 1`, `Documento 2` e `Documento 3`) não subdividem previamente a Fase 8 em etapas fracionadas.
- **Proposta Técnica (NÃO OFICIAL):** Recomenda-se a execução da Fase 8 em **2 etapas lógicas**:
  - *Etapa 1 de 2:* Faturamento SUS, Laudo AIH, SIGTAP e Validações de Compatibilidade (`SUS-001..006`).
  - *Etapa 2 de 2:* Regulação Médica de Vagas, Transferência Inter-hospitalar e Fechamento (`SUS-007..010`).

---

## 5. Requisitos Pendentes Após a Fase 7

Apenas os requisitos abaixo permanecem não homologados no projeto VITALOOP v1.3:
- **Fase 8 (SUS / AIH / Regulação):** `SUS-001` a `SUS-010` (10 requisitos).
- **Fases Posteriores:**
  - *Fase 9 (Integrações HL7/FHIR):* `INT-001` a `INT-010`.
  - *Fase 10 (Segurança Técnica & LGPD):* `SEC-T-001` a `SEC-T-016`.
  - *Fase 11 (Qualidade Global, E2E & Disaster Recovery):* `QLT-001` a `QLT-015`.
  - *Fase 12 (Produção & DevOps):* `PRD-001` a `PRD-020`.
  - *Fase 13 (Homologação Final & Go-Live):* `HOM-001` a `HOM-014`.

Nenhum requisito das Fases 0 a 7 é considerado pendente, todos possuem GATE PASS CONFIRMADO.

---

## 6. Dependências

A Fase 8 depende de dados e regras assistenciais já homologados nas Fases 0–7:
- **Pacientes (`PAT-001..017`):** Cadastro do paciente, CNS (Cartão Nacional de Saúde), CPF, Nome da Mãe e Data de Nascimento para validações da AIH.
- **Atendimentos (`ENC-001..013`):** Data/hora de entrada, motivo do atendimento e fluxo de urgência.
- **Consulta Médica & CID-10 (`MED-001..013`):** Diagnóstico CID-10 Principal e Secundários.
- **Prescrição & Exames (`MEDC-001..008`, `EXA-001..011`):** Procedimentos e condutas que justificam a emissão da AIH e compõem o faturamento.
- **Leitos & Desfechos (`BED-001..013`, `OUT-001..011`):** Indicação de internação/observação > 24h e encaminhamento para transferência externa.
- **Documentos Clínicos (`DOC-001..010`):** Relatórios clínicos estruturados para instrução da regulação.

---

## 7. Objetivo da Fase 8

Estruturar no VITALOOP v1.3 o módulo de Faturamento SUS e Regulação de Leitos Externos conforme as normas da Portaria SAS/MS e catálogo SIGTAP. O sistema deve permitir aos médicos e faturistas a emissão de laudos de AIH com verificação automática de consistência (compatibilidade entre Procedimento Principal, CID-10, idade e sexo do paciente), evitar glosas de faturamento e gerenciar o fluxo de solicitação de vagas externas e regulação inter-hospitalar.

---

## 8. Arquitetura (Somente em Nível de Planejamento)

- **Banco de Dados (Migration 0038 proposta):**
  - Tabela `app.sigtap_procedures`: Tabela de catálogo versionável de procedimentos SUS.
  - Tabela `app.aih_requests`: Solicitações e laudos de AIH vinculados ao atendimento/paciente.
  - Tabela `app.external_regulations`: Solicitações de regulação de vagas e transferências inter-hospitalares.
- **Domínio (`packages/domain/src/sus/`):**
  - Validações de consistência de AIH, verificador de compatibilidade SIGTAP/CID-10/Idade/Sexo.
- **API REST Fastify (`apps/api/src/routes/sus.ts`):**
  - `POST /api/v1/sus/aih-requests` (Emissão de laudo AIH)
  - `GET /api/v1/sus/aih-requests/:id` (Consulta de espelho da AIH)
  - `GET /api/v1/sus/sigtap/search` (Consulta ao catálogo SIGTAP)
  - `POST /api/v1/regulation/requests` (Solicitação de vaga externa)
- **Frontend React (`apps/web`):**
  - Componente `AihFormModal.tsx` e `ExternalRegulationModal.tsx`.
- **RLS / RBAC:**
  - Permissões RBAC: `sus.read`, `sus.issue_aih`, `regulation.manage`.
  - RLS ativada para a role `vitaloop_app`.

---

## 9. Estratégia de Execução

PLANEJAMENTO
→ AUTORIZAÇÃO FORMAL DO USUÁRIO
→ IMPLEMENTAÇÃO DOS MÓDULOS DE DOMÍNIO, API E FRONTEND
→ TESTES UNITÁRIOS E UI
→ TESTES DE INTEGRAÇÃO REMOTA COM SUPABASE RLS
→ BATERIA DE REGRESSÃO DAS FASES 0–7
→ HOMOLOGAÇÃO & LIMPEZA DE DADOS
→ CONCESSÃO DE GATE PASS

---

## 10. Critérios de GATE PASS

A Fase 8 somente receberá GATE PASS se todos os critérios abaixo forem atendidos:
- Testes unitários do domínio: 100% PASS;
- Testes de UI: 100% PASS;
- Testes de integração remota no Supabase (`vitaloop_app` under RLS): 100% PASS;
- Regressão integral das Fases 0–7: 100% PASS;
- RLS: PASS;
- RBAC: PASS;
- Autenticação e `withSecurityContext`: PASS;
- Auditoria de dados (`app.audit_events`): PASS;
- Quality checks: ESLint 0 erros/0 avisos, Typecheck 0 erros, Monorepo Build PASS;
- Limpeza da base de dados: `TEST DATA RESIDUAL: 0`;
- Relatório oficial criado em `docs/PHASE_8_REPORT.md` e `VITALOOP_1.3_STATUS.md` atualizado.

---

## 11. Fora do Escopo

- Faturamento de planos de saúde de medicina suplementar / convênios privados (TISS/TUSS).
- Integração síncrona webservice direta via API rest privada com sistemas de regulação estaduais específicos sem especificação em catálogo público (reservada para a Fase 9 — Integrações).

---

## 12. NÃO DEFINIDO NO BLUEPRINT

- Formato de arquivo magnético de remessa exportado no padrão BPA/BPI antigo da DATASUS (trata-se de funcionalidade "NÃO DEFINIDA DOCUMENTALMENTE").

---

STATUS:
PLANEJAMENTO CONCLUÍDO

FASE ANTERIOR:
FASE 7 / ETAPA 1 — GATE PASS

PRÓXIMA FASE:
FASE 8

NOME OFICIAL:
REGULAÇÃO, FATURAMENTO SUS E AIH

FONTE DOCUMENTAL:
Matriz de Rastreabilidade (Documento 3 §22) e Blueprint Funcional Clínico (Documento 1 §45/§58)

REQUISITOS DA FASE 8:
SUS-001..010

ETAPAS OFICIALMENTE DEFINIDAS:
DIVISÃO DE ETAPAS NÃO DEFINIDA DOCUMENTALMENTE

REQUISITOS PENDENTES:
SUS-001..010, INT-001..010, SEC-T-001..016, QLT-001..015, PRD-001..020, HOM-001..014

PRIMEIRA ETAPA DA FASE 8:
ETAPA 1 DE 2 DA FASE 8 (PROPOSTA TÉCNICA: SUS-001..006 - Laudo AIH e SIGTAP)

JUSTIFICATIVA:
Conforme Matriz §22 e Blueprint §45/§58, a Fase 8 é a próxima sequência do roadmap após a conclusão da Gestão Operacional (Fase 7).

EXECUÇÃO:
NÃO INICIADA

ALTERAÇÕES NO CÓDIGO:
NENHUMA

ALTERAÇÕES NO BANCO:
NENHUMA

MIGRATION:
NÃO CRIADA/APLICADA

SUPABASE:
NÃO ALTERADO

COMMIT/PUSH:
NÃO REALIZADO

DOCUMENTO:
implementation_plan_phase_8.md
