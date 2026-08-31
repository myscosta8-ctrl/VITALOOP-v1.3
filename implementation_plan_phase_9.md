# VITALOOP v1.3 — PLANEJAMENTO OFICIAL DA FASE 9

## 1. Estado Anterior e Fases Homologadas

Todas as etapas e fases anteriores do repositório Vitaloop v1.3 foram concluídas, testadas e homologadas com Gate Pass Confirmado:

- **Fase 0 (Fundamentos & Baseline):** HOMOLOGADA COM GATE PASS
- **Fase 1 (Identidade e Segurança & RLS/RBAC):** HOMOLOGADA COM GATE PASS
- **Fase 2 (Prontuário, Admissão & Filas UPA):** HOMOLOGADA COM GATE PASS (`PAT-001..017`, `ENC-001..013`, `TRI-001..011`, `QUE-001..011`)
- **Fase 3 (Consulta Médica, CID-10, Prescrição & Exames):** HOMOLOGADA COM GATE PASS (`MED-001..013`, `MEDC-001..008`, `EXA-001..011`, `OUT-001..011`)
- **Fase 4 / Etapas 1, 2 e 3 (Enfermagem, SAE & Leitos UPA):** HOMOLOGADA COM GATE PASS (`NUR-001..012`, `MEDC-009..011`, `BED-001..013`)
- **Fase 5 / Etapa 1 (Documentos Clínicos, Atestados & Declarações):** HOMOLOGADA COM GATE PASS (`DOC-001..010`)
- **Fase 6 / Etapa 1 (Segurança do Paciente, Eventos Adversos & NSP):** HOMOLOGADA COM GATE PASS (`SAF-001..011`)
- **Fase 7 / Etapa 1 (Gestão Operacional & Dashboards UPA 24h):** HOMOLOGADA COM GATE PASS (`MGT-001..010`)
- **Fase 8 / Etapa 1 (Faturamento SUS, SIGTAP & Laudo AIH):** HOMOLOGADA COM GATE PASS (`SUS-001..006`)
- **Fase 8 / Etapa 2 (Regulação Médica, Transferência Externa & Fechamento AIH):** HOMOLOGADA COM GATE PASS (`SUS-007..010`)

---

## 2. Identificação Oficial da Próxima Fase
- **Número da Fase:** FASE 9
- **Nome Oficial:** INTEGRAÇÕES E BARRAMENTO HL7 / FHIR
- **Fonte Documental Exata:** Matriz de Rastreabilidade (`Documento 3` Seção 23: `# 23. FASE 16 — INTEGRAÇÕES`), Blueprint Funcional Clínico (`Documento 1` Seções 45, 58 e 60) e Blueprint Técnico (`Documento 2` Seções 12, 14 e 15).
- **Localização nos Documentos:** Matriz de Rastreabilidade (`Documento 3` Seção 23, linhas 502–516) e Blueprint Técnico (`Documento 2` Seções de Interoperabilidade FHIR/HL7).

---

## 3. Requisitos da Fase 9 (`INT-001..009`)

| Código | Requisito | Descrição Sintética | Fonte Documental | Status Atual | Dependências |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **INT-001** | Integração LIS / Laboratório | Barramento de recepção e associação automática de laudos de laboratório (HL7 ORU_R01). | Matriz §23 / Blueprint §14 | `NÃO INICIADO` | `EXA-001..011`, `PAT-001` |
| **INT-002** | Integração RIS / Radiologia | Comunicação com sistemas de radiologia e solicitação de exames (HL7 ORM_O01). | Matriz §23 / Blueprint §14 | `NÃO INICIADO` | `EXA-001..011` |
| **INT-003** | Integração PACS / DICOM | Integração com servidor PACS via DICOM Web (WADO-RS / C-STORE Metadata) para imagens de exames. | Matriz §23 / Blueprint §14 | `NÃO INICIADO` | `INT-002`, `EXA-001` |
| **INT-004** | Integração Farmácia Central | Barramento de prescrição eletrônica e dispensação com farmácia hospitalar/dispensários. | Matriz §23 / Blueprint §15 | `NÃO INICIADO` | `MEDC-001..008` |
| **INT-005** | Integração Regulação (SISREG) | Barramento de exportação/leitura de solicitações com Centrais de Regulação (SISREG/CROSS). | Matriz §23 / Blueprint §45 | `NÃO INICIADO` | `SUS-007..010` |
| **INT-006** | Integração Barramento SUS | Barramento de conectividade com a Rede Nacional de Dados em Saúde (RNDS/DATASUS). | Matriz §23 / Blueprint §58 | `NÃO INICIADO` | `SUS-001..010` |
| **INT-007** | Exportação Lote AIH | Geração e exportação estruturada de lotes de AIH para sistemas de faturamento SUS. | Matriz §23 / Blueprint §58 | `NÃO INICIADO` | `SUS-010` |
| **INT-008** | Identidade Institucional | Provedor de identidade e autenticação federada institucional (OAuth2 / OpenID Connect / SAML2). | Matriz §23 / Blueprint §12 | `NÃO INICIADO` | `SEC-001..005` |
| **INT-009** | Barramento FHIR R4 | Servidor de Interoperabilidade FHIR R4 (Resources: Patient, Encounter, Observation, DiagnosticReport). | Matriz §23 / Blueprint §60 | `NÃO INICIADO` | `PAT-001`, `ENC-001` |

---

## 4. Requisitos Ainda Pendentes no Projeto Vitaloop v1.3

Permanecem não homologados no repositório apenas os requisitos pertencentes às seguintes fases:
- **Fase 9 (Integrações HL7/FHIR):** `INT-001` a `INT-009` (9 requisitos).
- **Fase 10 (Segurança Técnica & LGPD):** `SEC-T-001` a `SEC-T-016` (16 requisitos).
- **Fase 11 (Qualidade Global, E2E & Disaster Recovery):** `QLT-001` a `QLT-015` (15 requisitos).
- **Fase 12 (Produção & DevOps):** `PRD-001` a `PRD-020` (20 requisitos).
- **Fase 13 (Homologação Final & Go-Live):** `HOM-001` a `HOM-014` (14 requisitos).

Todos os 67 requisitos das Fases 0 a 8 possuem GATE PASS CONFIRMADO.

---

## 5. Divisão de Etapas da Fase 9

- **Análise Documental:** DIVISÃO DE ETAPAS NÃO DEFINIDA DOCUMENTALMENTE.
- **Proposta Técnica (NÃO OFICIAL):** Recomenda-se a divisão da Fase 9 em **2 etapas lógicas**:
  - *Etapa 1 de 2:* Barramento FHIR R4 e Integrações de Diagnóstico (Laboratório LIS, Radiologia RIS e PACS DICOM) — `INT-001`, `INT-002`, `INT-003`, `INT-009`.
  - *Etapa 2 de 2:* Barramento de Farmácia, Regulação SISREG/CROSS, Exportação Lote AIH SUS e Identidade Institucional — `INT-004`, `INT-005`, `INT-006`, `INT-007`, `INT-008`.

---

## 6. Objetivo Clínico e Operacional da Fase 9

Estabelecer a camada de interoperabilidade em saúde do VITALOOP v1.3 conforme os padrões internacionais HL7 (v2.x/v3) e HL7 FHIR R4, além do padrão de imagens médicas DICOM Web. O barramento deve permitir a troca bidirecional e segura de mensagens clínicas com laboratórios de análises clínicas (LIS), sistemas de radiologia/PACS, farmácia central, centrais de regulação pública (SISREG/CROSS) e provedores de identidade corporativos.

---

## 7. Proposta de Arquitetura (Somente em Nível de Planejamento)

### A. Banco de Dados (Migration 0040 Proposta)
A ser criada no momento da execução como `db/migrations/0040_interoperability_fhir_hl7.sql` (estritamente aditiva):
- Tabela `app.integration_messages`: Registro de audit log de mensagens HL7/FHIR recebidas e enviadas (message_type, payload_json, status: 'received' | 'processed' | 'failed', retry_count).
- Tabela `app.fhir_resources`: Cache de recursos FHIR R4 mapeados (resource_type: 'Patient' | 'Encounter' | 'Observation', resource_id, fhir_json).
- RLS habilitada para `vitaloop_app` com permissões `integration.read`, `integration.write`.

### B. Camada de Domínio (`packages/domain/src/integration/`)
- Mapeadores puros: `mapPatientToFhirResource`, `mapEncounterToFhirResource`, `parseHl7OruMessage`.

### C. API REST Fastify (`apps/api/src/routes/integration.ts`)
- Endpoints FHIR R4: `GET /api/v1/fhir/R4/Patient/:id`, `GET /api/v1/fhir/R4/Encounter/:id`.
- Endpoints Webhook/Barramento: `POST /api/v1/integration/hl7/oru` (Recepção de laudos LIS).

### D. Frontend React (`apps/web`)
- Painel de visualização de mensagens de integração e status do barramento FHIR/HL7.

---

## 8. Estratégia de Testes e Critérios de GATE PASS

- **Testes Unitários:** Validação dos parsers de mensagem HL7 e mapeadores FHIR R4.
- **Testes de UI React:** Componentes de monitoramento de integração.
- **Testes de Integração Remota:** Injeção de requisições Fastify simulando receptores LIS/PACS executando sob RLS `vitaloop_app`.
- **Regressão:** 100% PASS na suíte de regressão das Fases 0–8 (75 testes existentes).
- **Quality Checks:** ESLint 0 erros/0 avisos, Typecheck 0 erros, Monorepo Build PASS.
- **Limpeza do Banco:** `TEST DATA RESIDUAL: 0`.

---

## 9. Fora do Escopo da Fase 9
- Substituição do banco PostgreSQL relacional nativo da aplicação por um banco de dados exclusivamente FHIR não relacional.
- Testes de penetração/segurança técnica avançada (reservados para a Fase 10).

---

## 10. "NÃO DEFINIDO NO BLUEPRINT"
- Protocolo proprietário de comunicação de hardware antigo sem suporte a RS-232, HL7 ou DICOM Web.

---

STATUS:
PLANEJAMENTO CONCLUÍDO

FASES/ETAPAS HOMOLOGADAS:
- Fase 0 (Fundamentos) — GATE PASS
- Fase 1 (Identidade e Segurança) — GATE PASS
- Fase 2 (Prontuário e Atendimento UPA) — GATE PASS
- Fase 3 (Consulta Médica, CID-10, Prescrição, Exames, Alta) — GATE PASS
- Fase 4 / Etapas 1, 2 e 3 (Enfermagem, SAE e Leitos UPA) — GATE PASS
- Fase 5 / Etapa 1 (Documentos Clínicos, Atestados) — GATE PASS
- Fase 6 / Etapa 1 (Segurança do Paciente, Eventos Adversos, NSP) — GATE PASS
- Fase 7 / Etapa 1 (Gestão Operacional e Dashboards UPA) — GATE PASS
- Fase 8 / Etapa 1 (Faturamento SUS, SIGTAP e Laudo AIH) — GATE PASS
- Fase 8 / Etapa 2 (Regulação Médica, Transferência Externa e Fechamento AIH) — GATE PASS

PRÓXIMA FASE:
FASE 9

NOME OFICIAL:
INTEGRAÇÕES E BARRAMENTO HL7 / FHIR

FONTE DOCUMENTAL:
Matriz de Rastreabilidade (Documento 3 §23), Blueprint Funcional Clínico (Documento 1 §45/§58/§60) e Blueprint Técnico (Documento 2 §12/§14/§15)

REQUISITOS DA PRÓXIMA FASE:
INT-001..009

REQUISITOS PENDENTES:
INT-001..009, SEC-T-001..016, QLT-001..015, PRD-001..020, HOM-001..014

ETAPAS OFICIALMENTE DEFINIDAS:
DIVISÃO DE ETAPAS NÃO DEFINIDA DOCUMENTALMENTE

JUSTIFICATIVA:
Conforme Matriz §23, a Fase 9 é a sequência lógica oficial do roadmap após a conclusão do Faturamento SUS e Regulação Médica (Fase 8).

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
implementation_plan_phase_9.md
