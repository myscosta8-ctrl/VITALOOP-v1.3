# VITALOOP v1.3 — PLANEJAMENTO OFICIAL DA FASE 10

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
- **Fase 9 / Etapa 1 (Barramento FHIR R4 & Diagnósticos LIS/RIS/PACS):** HOMOLOGADA COM GATE PASS (`INT-001..003`, `INT-009`)
- **Fase 9 / Etapa 2 (Farmácia Central, SISREG, RNDS, Lote AIH & Identidade Federada):** HOMOLOGADA COM GATE PASS (`INT-004..008`)

---

## 2. Identificação Oficial da Fase 10

- **Número da Fase:** FASE 10
- **Nome Oficial:** SEGURANÇA TÉCNICA & LGPD
- **Fonte Documental Exata:** Matriz de Rastreabilidade (`Documento 3` Seção 24: `# 24. FASE 17 — SEGURANÇA TÉCNICA`), Blueprint Técnico (`Documento 2` Seções 51, 52, 53 e 54) e Blueprint Funcional Clínico (`Documento 1`).

---

## 3. Lista Completa de Requisitos (`SEC-T-001..016`)

| Código | Requisito | Módulo Exato | Descrição Sintética | Fonte Documental | Status Atual | Dependências |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **SEC-T-001** | IDOR / BOLA | Segurança | Proteção contra acesso/manipulação direta de objetos sem validação de vínculo e contexto. | Matriz §24 / Blueprint §51 | `PENDENTE` | `PAT-001`, `ENC-001`, `SEC-001` |
| **SEC-T-002** | Escalonamento de Privilégio | Segurança | Prevenção contra elevação horizontal/vertical de privilégios e bypass de papel funcional. | Matriz §24 / Blueprint §51 | `PENDENTE` | `SEC-001..005` |
| **SEC-T-003** | Bypass de RLS | Segurança | Garantia de aplicação incondicional da Row Level Security no PostgreSQL em 100% das queries. | Matriz §24 / Blueprint §51 | `PENDENTE` | `SEC-001..005` |
| **SEC-T-004** | Bypass de RBAC | Segurança | Garantia de verificação estrita de permissões granulares (`requirePermission`) em 100% dos endpoints API. | Matriz §24 / Blueprint §51 | `PENDENTE` | `SEC-001..005` |
| **SEC-T-005** | SQL Injection | Segurança | Proteção rigorosa contra injeção de comandos SQL via parâmetros, ordenação e filtros dinâmicos. | Matriz §24 / Blueprint §51 | `PENDENTE` | `SEC-001` |
| **SEC-T-006** | XSS (Cross-Site Scripting) | Segurança | Sanitização e sanitização de saída contra injeção de scripts maliciosos no cliente React/Fastify. | Matriz §24 / Blueprint §51 | `PENDENTE` | `SEC-001` |
| **SEC-T-007** | CSRF | Segurança | Proteção contra falsificação de requisições cross-site em operações modificadoras de estado. | Matriz §24 / Blueprint §51 | `PENDENTE` | `SEC-001` |
| **SEC-T-008** | CORS Restritivo | Segurança | Política de CORS restritiva para impedir acesso não autorizado de domínios/origens externas. | Matriz §24 / Blueprint §51 | `PENDENTE` | `SEC-001` |
| **SEC-T-009** | Headers de Segurança | Segurança | Configuração de cabeçalhos de segurança HTTP (HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy). | Matriz §24 / Blueprint §51 | `PENDENTE` | `SEC-001` |
| **SEC-T-010** | Gestão de Secrets | Segurança | Prevenção de vazamento de credenciais, tokens, senhas e chaves em código, variáveis expostas e payloads. | Matriz §24 / Blueprint §51 | `PENDENTE` | `SEC-001` |
| **SEC-T-011** | Logs Sanitizados | Segurança | Máscara e sanitização de dados sensíveis e credenciais em logs operacionais e de aplicação. | Matriz §24 / Blueprint §53 | `PENDENTE` | `SEC-001` |
| **SEC-T-012** | Proteção de Dados Sensíveis | LGPD | Cifragem/máscara de dados pessoais sensíveis (CPF, diagnósticos, CIDs) em trânsito e repouso. | Matriz §24 / Blueprint §52 | `PENDENTE` | `PAT-001..017` |
| **SEC-T-013** | Minimização de Dados | LGPD | Retorno estritamente minimizado de dados em respostas de API conforme o propósito assistencial. | Matriz §24 / Blueprint §52 | `PENDENTE` | `PAT-001..017` |
| **SEC-T-014** | Direitos do Titular LGPD | LGPD | Suporte aos direitos dos titulares (relatório de dados pessoais, confirmação de tratamento e exportação LGPD). | Matriz §24 / Blueprint §52 | `PENDENTE` | `PAT-001..017` |
| **SEC-T-015** | Retenção & Descarte | LGPD | Aplicação de políticas de ciclo de vida de dados assistenciais (retencão legal 20 anos) e descarte. | Matriz §24 / Blueprint §52 | `PENDENTE` | `PAT-001..017` |
| **SEC-T-016** | Auditoria Rastreável | Auditoria | Registro inalterável e append-only de auditoria clínica e de segurança para todas as operações sensíveis. | Matriz §24 / Blueprint §53 | `PENDENTE` | `SEC-001`, `PAT-001` |

---

## 4. Requisitos Ainda Pendentes no Projeto Vitaloop v1.3

- **Fase 10 (Segurança Técnica & LGPD):** `SEC-T-001` a `SEC-T-016` (16 requisitos).
- **Fase 11 (Qualidade Global, E2E & Disaster Recovery):** `QLT-001` a `QLT-015` (15 requisitos).
- **Fase 12 (Produção & DevOps):** `PRD-001` a `PRD-020` (20 requisitos).
- **Fase 13 (Homologação Final & Go-Live):** `HOM-001` a `HOM-014` (14 requisitos).

Todos os 76 requisitos das Fases 0 a 9 possuem GATE PASS CONFIRMADO.

---

## 5. Objetivo Técnico e de Segurança da Fase 10

Validar, reforçar e automatizar todos os mecanismos de segurança técnica e conformidade com a LGPD (Lei Geral de Proteção de Dados - Lei 13.709/2018) na aplicação VITALOOP v1.3. O objetivo é garantir imunidade a vulnerabilidades críticas (OWASP Top 10 API / Web), assegurar que RLS e RBAC sejam totalmente invioláveis, implementar a geração de extrato de transparência de dados LGPD para o titular do prontuário, garantir sanitização estrita de logs e políticas de retenção/descarte seguro.

---

## 6. Proposta de Arquitetura (Somente em Nível de Planejamento)

### A. Banco de Dados (Migration 0042 Proposta)
A ser criada no momento da execução como `db/migrations/0042_security_hardening_lgpd.sql` (estritamente aditiva):
- Tabela `app.lgpd_data_requests`: Registro de solicitações de direitos de titulares LGPD (id, patient_id, requested_by, request_type: 'export' | 'rectification' | 'access', status: 'completed', exported_data_hash, created_at).
- Tabela `app.data_retention_policies`: Registro de políticas de expiração e retenção legal de registros (id, entity_type: 'audit_events' | 'logs' | 'inactive_patients', retention_days, action: 'archive' | 'purge', updated_at).
- Políticas RLS ativadas com permissões `security.manage`, `lgpd.export` para `vitaloop_app`.

### B. Camada de Domínio (`packages/domain/src/security/` & `lgpd/`)
- Módulo `security-sanitizer.ts`: Funções puras de sanitização de strings, prevenção contra XSS (`escapeHtml`) e detecção de padrões suspeitos de SQLi.
- Módulo `lgpd-exporter.ts`: Gerador de pacote/extrato minimizado de dados pessoais do paciente sob preceitos da LGPD Art. 18.
- Módulo `log-masker.ts`: Utilitário de máscara de CPF (ex: `123.***.***-45`), nome parcial e credenciais em logs de auditoria.

### C. API Fastify REST (`apps/api/src/routes/security.ts` & `lgpd.ts`)
- Endpoints de Direitos do Titular LGPD: `POST /api/v1/lgpd/patients/:id/export` (Geração de extrato LGPD de dados pessoais).
- Middleware Fastify de Segurança (Headers Helmet/CSP, CORS restritivo, Rate Limiting refinado, Validação IDOR por escopo de paciente/atendimento).
- Sanity Check de RLS/RBAC via testes automatizados na API.

### D. Frontend React (`apps/web`)
- Painel de Privacidade e Transparência LGPD (visualização do histórico de acessos ao prontuário do paciente e solicitação de extrato de dados).
- Componentes com sanitização automática contra XSS na renderização de laudos e campos de texto livre.

---

## 7. Estratégia de Testes e Critérios de GATE PASS

- **Testes Unitários:** Validação de sanitizadores XSS, mascaradores de log, checagem de regras de retenção e gerador de extrato LGPD.
- **Testes de UI React:** Componente de extrato e transparência LGPD sem exposição de segredos ou tokens.
- **Testes de Integração Remota:** Suíte de penetração/autenticação negativa testando especificamente tentativas de IDOR, bypass de RLS sem GUC, bypass de RBAC sem permissão e SQLi em filtros.
- **Regressão Global:** 100% PASS na suíte de regressão das Fases 0–9 (510 testes existentes).
- **Quality Checks:** ESLint 0 erros/0 avisos, Typecheck 0 erros, Monorepo Build PASS.
- **Limpeza do Banco:** `TEST DATA RESIDUAL: 0`.

---

## 8. Fora do Escopo da Fase 10
- Certificação formal externa ISO 27001 por empresa auditora terceira (reservado para homologação institucional final).
- Implementação de infraestrutura física de HSM (Hardware Security Module) de datacenter local.

---

## 9. "NÃO DEFINIDO NO BLUEPRINT"
- Algoritmo proprietário específico de criptografia quântica pós-RSA.

---

STATUS:
PLANEJAMENTO CONCLUÍDO

FASE ANTERIOR:
FASE 9 — GATE PASS

PRÓXIMA FASE:
FASE 10

NOME OFICIAL:
SEGURANÇA TÉCNICA & LGPD

REQUISITOS:
SEC-T-001..016

EXECUÇÃO:
NÃO INICIADA

ALTERAÇÕES NO CÓDIGO:
NENHUMA

ALTERAÇÕES NO BANCO:
NENHUMA

SUPABASE:
NÃO ALTERADO

COMMIT/PUSH:
NÃO REALIZADO

DOCUMENTO:
implementation_plan_phase_10.md
