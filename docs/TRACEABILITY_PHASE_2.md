# Matriz de Rastreabilidade — Fase 2 / Etapa 1 de 6 (Cadastro e Identidade do Paciente)

**Rodada 1 (2026-08-20):** fechamento documental do achado de RLS. Cobre apenas o que
foi **implementado e testado em nível de banco de dados** (migrations 0017–0021 +
bateria real de testes SQL/RLS). Nenhum código TypeScript existia ainda.

**Rodada 2 (2026-08-20):** implementação real da **camada de domínio** de pacientes
(`packages/domain/src/patient/`), com testes unitários reais (60/60 PASS, ver seção
"Camada de Domínio" abaixo).

**Rodada 3 (2026-08-20):** implementação real da **API de pacientes**
(`apps/api/src/routes/patients.ts`), com 22/22 testes reais PASS contra o Supabase
oficial, papel `vitaloop_app`, RLS efetiva — ver `docs/PHASE_2_STEP_2_REPORT.md` e a
seção "Camada de API" abaixo.

**Rodada 4 (2026-08-20):** implementação do **frontend** de cadastro e identificação
de paciente (`apps/web/src/pages/Patient*.tsx`), consumindo exclusivamente os
endpoints da Rodada 3, com 23/23 testes de UI PASS — ver `docs/PHASE_2_STEP_3_REPORT.md`
e a seção "Camada de Frontend" abaixo. Nenhum backend/banco/migration alterado nesta
rodada. A tabela principal abaixo (colunas Banco/RBAC/RLS/API/Frontend) permanece como
estava ao final da Rodada 1 — as mudanças de cada rodada são registradas em seções
próprias, sem reescrever avaliações anteriores.

Referência: Documento 3 §9 (PAT-001..PAT-017); regra de aceite Doc 3 §64, Doc 4 §33/§53.

## Vocabulário de status usado nesta matriz

(idêntico ao adotado na Fase 1 — ver `docs/TRACEABILITY_PHASE_1.md`)

- **IMPLEMENTADO** — código/schema existe e está presente no repositório.
- **TESTADO** — existe evidência de execução real (SQL real no Supabase oficial).
- **PARCIAL** — parte da cadeia funciona e tem evidência; outra parte não foi
  implementada, não foi exercitada, ou não produz o efeito funcional esperado.
- **PENDENTE DE DECISÃO** — depende de decisão institucional/clínica/jurídica.
- **NOT RUN** — não foi possível executar; motivo técnico objetivo registrado.
- **BLOQUEADO** — não pode prosseguir sem uma decisão ou correção prévia.
- **HOMOLOGADO** — não se aplica a nenhum item desta matriz: homologação é ato formal
  do responsável humano, ainda não ocorrido para a Fase 2.

## Nota estrutural válida para toda a matriz

Nesta rodada, **API e frontend de todos os requisitos PAT-\* estão, sem exceção,
NÃO INICIADOS** (nenhum arquivo TypeScript de domínio/rota/tela criado). As colunas
"API" e "Frontend" abaixo são preenchidas com "—" (não iniciado) em toda a matriz, não
omitidas, para que a ausência fique explícita e rastreável. O que existe e foi testado
é exclusivamente a camada de **banco de dados** (schema, constraints, funções, RLS) e a
**correção da conexão da aplicação ao banco** (ver seção "Achado de segurança" abaixo).

---

## Matriz completa

| ID | Requisito | Banco (schema) | RBAC | RLS | API | Frontend | Auditoria/Evento | Teste (resultado) | Evidência | Status | Aceite | Pendência |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| PAT-001 | Cadastro completo do paciente | ✓ `app.patients` (0017) | ✓ `patient.read`/`patient.write` (0017) | ✓ `patients_read`/`patients_write`/`patients_update`, `to vitaloop_app` (0017) | — | — | `PatientRegistered` previsto (Doc 2 §37), **não emitido** — nenhum código insere em `app.domain_events` ainda | **PASS** (schema+RLS) — T1/T2 (CPF unicidade removida por design/formato), T-RLS-A..D (SELECT/INSERT deny/allow) | ver seção "Evidências" abaixo | PARCIAL (banco TESTADO; API/Frontend NÃO INICIADOS) | PENDENTE | TÉCNICA — API/domínio/frontend |
| PAT-002 | Identificação segura do paciente | ✓ CPF/CNS armazenados normalizados | N/A | herda de PAT-001 | — | — | N/A | **PASS** (formato) — T2 (CPF inválido rejeitado por CHECK) | ver Evidências | PARCIAL | PENDENTE | TÉCNICA — API/frontend |
| PAT-003 | CPF | ✓ `cpf` + `patients_cpf_format_ck` (regex 11 dígitos) | N/A | herda de PAT-001 | — | — | N/A | **PASS** — T2 (`'123'` rejeitado); **ver Achado de Segurança** — UNIQUE removida na 0019, motivo documentado | ver Evidências | PARCIAL | PENDENTE | TÉCNICA — validação de dígito verificador de CPF (não implementada; apenas formato) fica como pendência técnica futura |
| PAT-004 | CNS | ✓ `cns` + `patients_cns_format_ck` (regex 15 dígitos) | N/A | herda de PAT-001 | — | — | N/A | **NOT RUN** — nenhum teste de formato de CNS executado nesta rodada (apenas CPF) | — | IMPLEMENTADO | PENDENTE | TÉCNICA — executar teste de formato de CNS; validar dígito verificador (não implementado) |
| PAT-005 | Prontuário (número) | ✓ `medical_record_number` + `app.generate_medical_record_number()` + `patients_mrn_institution_uk` (único por instituição) | N/A | herda de PAT-001 | — | — | N/A | **PASS** — T6: geração sequencial confirmada (`2026000008`, `2026000009`); unicidade por instituição confirmada via índice | ver Evidências | TESTADO (banco) | PENDENTE | TÉCNICA — API/frontend |
| PAT-006 | Dados demográficos | ✓ `full_name`, `social_name`, `mother_name`, `birth_date`, `sex` (enum `patient_sex`: female/male/undetermined), `rg`, `address`, `city`, `state` | N/A | herda de PAT-001 | — | — | N/A | **PASS** (parcial) — inserção real exercitada em T3/T4/T5/T7 (campos usados sem erro) | ver Evidências | PARCIAL | PENDENTE | TÉCNICA — API/frontend; nenhuma validação de CEP/UF além do tipo `text` |
| PAT-007 | Contatos | ✓ `app.patient_contacts` (0017) | ✓ herda `patient.write`/`patient.read` (não há permissão dedicada) | ✓ `patient_contacts_read`/`patient_contacts_write` (0017) | — | — | N/A | **PASS** — T7: insert real com `is_emergency=true` | ver Evidências | PARCIAL (banco TESTADO) | PENDENTE | TÉCNICA — API/frontend |
| PAT-008 | Contato de emergência | ✓ `patient_contacts.is_emergency boolean` | herda de PAT-007 | herda de PAT-007 | — | — | N/A | **PASS** — coberto pelo mesmo teste de PAT-007 | ver Evidências | PARCIAL | PENDENTE | TÉCNICA — API/frontend; nenhuma regra de "pelo menos um contato de emergência obrigatório" implementada (não especificada) |
| PAT-009 | Alergias | ✓ `app.patient_allergies` (enum `allergy_severity`, `allergy_status`) | herda de patient.write/read | ✓ `patient_allergies_read`/`_insert`/`_update_status` (0017) | — | — | N/A | **PASS** — T5: insert real + trigger `forbid_allergy_content_update` bloqueia alteração de conteúdo, permite alteração de `status` (active→resolved) | ver Evidências | TESTADO (banco) | PENDENTE | TÉCNICA — API/frontend |
| PAT-010 | Reações adversas | ✓ `patient_allergies.reaction text` (campo estruturado, não texto livre solto — acoplado a `substance`/`severity`) | herda de PAT-009 | herda de PAT-009 | — | — | N/A | **PASS** — coberto pelo mesmo teste T5 (`reaction='Urticária'`) | ver Evidências | PARCIAL | PENDENTE | TÉCNICA — API/frontend; sem catálogo estruturado de reações (campo texto livre dentro de um registro estruturado) |
| PAT-011 | Antecedentes | ✓ `app.patient_antecedents` (`category text`, `status` enum) | herda | ✓ `patient_antecedents_read`/`_write` (0017) | — | — | N/A | **PASS** — T7: insert real (`category='clinical'`) | ver Evidências | PARCIAL | PENDENTE | TÉCNICA — API/frontend |
| PAT-012 | Medicamentos de uso contínuo | ✓ `app.patient_continuous_medications` (`medication`, `dose`, `frequency`, `status`) | herda | ✓ `patient_continuous_medications_read`/`_write` (0017) | — | — | N/A | **PASS** — T7: insert real | ver Evidências | PARCIAL | PENDENTE | TÉCNICA — API/frontend; sem catálogo/interação medicamentosa (fora de escopo desta etapa) |
| PAT-013 | Problemas ativos | ✓ `app.patient_active_problems` (`cid_code` opcional, `status` enum) | herda | ✓ `patient_active_problems_read`/`_write` (0017) | — | — | N/A | **PASS** — T7: insert real | ver Evidências | PARCIAL | PENDENTE | TÉCNICA — API/frontend; sem validação de código CID (campo livre) |
| PAT-014 | Histórico clínico (timeline) | ✓ `app.patient_timeline` (view filtrando `app.domain_events` por `patient_id`) | N/A (herda RLS de `domain_events`, Fase 0/1 — baseline, não estreitada por paciente ainda) | herdada de `domain_events` (Fase 0/1) | — | — | Depende de eventos gravados; **nenhum evento `PatientRegistered`/similar foi emitido ainda** (não há código que grava) | **PASS estrutural** — T9: view responde sem erro; **0 linhas** confirmado — esperado, não é falha, pois não há emissor de eventos ainda | ver Evidências | PARCIAL | PENDENTE | TÉCNICA — API deve emitir eventos de domínio ao criar/alterar paciente |
| PAT-015 | Detecção de duplicidade | ✓ `app.detect_patient_duplicates()`, `app.patient_duplicate_candidates`, `app.normalize_text()` (0017/0018) | ✓ `patient.duplicate.review` (0017) | ✓ `patient_duplicate_candidates_read`/`_write` (0017) | — | — | N/A | **PASS** — T3 (fraco: nome normalizado+nascimento iguais), T4 (conflito: mesmo CPF, nome diferente — só possível após 0019, ver Achado) | ver Evidências | TESTADO (banco) | PENDENTE | TÉCNICA — API deve chamar a função no fluxo de criação/edição; frontend deve exibir candidatos |
| PAT-016 | Merge (SE necessário) | ✓ `app.patient_merge_requests` (fluxo de solicitação/aprovação — **NÃO executa reatribuição de dados**, por decisão explícita registrada em PHASE_2_READINESS) | ✓ `patient.merge.request`/`patient.merge.approve` (0017) | ✓ `patient_merge_requests_read`/`_insert`/`_update` (0017) | — | — | N/A | **PASS** (estrutura) — T8: insert real com enum `requested` válido | ver Evidências | PARCIAL | PENDENTE DE DECISÃO (execução real do merge é institucional, ver PHASE_2_READINESS §pré-condição 2) | TÉCNICA — API de solicitação/aprovação; execução do merge propriamente dito permanece **fora de escopo por design**, não apenas por falta de código |
| PAT-017 | Auditoria de alterações | ✓ `created_by`/`updated_by`/`created_at`/`updated_at` em `patients`; `recorded_by`/`recorded_at` nas tabelas satélite; trigger `patients_touch_updated` | N/A | N/A | — | — | Depende de `app.audit_events` (Fase 0/1, já homologado) — **nenhuma rota grava ainda**, pois não há rota | **NOT RUN** — colunas de autoria existem no schema mas nenhum código de aplicação as preenche ainda (preenchimento é responsabilidade da API, inexistente) | — | IMPLEMENTADO (schema apenas) | PENDENTE | TÉCNICA — API deve popular `created_by`/`updated_by`/`recorded_by` e gravar em `audit_events` |

---

## Camada de Domínio (Rodada 2, 2026-08-20)

Implementação real, pura (sem HTTP/banco/React — Doc 2 §3), em
`packages/domain/src/patient/`, adicionada ao barrel `packages/domain/src/index.ts`.
Testes reais: **60/60 PASS** (`npx vitest run packages/domain/src/patient`); suíte
completa do monorepo revalidada sem regressão: **109 passed / 4 skipped** (os 4 skipped
são os testes de integração com banco, que já eram pulados por falta de `DATABASE_URL`
nesta sessão — não relacionados a esta rodada). `tsc --build` (pacote e monorepo) e
`eslint .` (projeto inteiro): **0 erros, 0 avisos**.

| ID | Requisito | Arquivo(s) | Regra implementada | Teste (arquivo) | Status | Pendência |
|---|---|---|---|---|---|---|
| PAT-001 | Cadastro completo do paciente | `rules.ts` (`normalizePatientCreateInput`) | `fullName` obrigatório; agrega validação de CPF/CNS/nascimento em uma única normalização | `rules.test.ts` — "criação válida" (6 casos) | TESTADO (domínio) | API/Frontend |
| PAT-002 | Identificação segura do paciente | `identifiers.ts` | normalização (extração de dígitos) + validação de dígito verificador | `identifiers.test.ts` | TESTADO (domínio) | API/Frontend |
| PAT-003 | CPF | `identifiers.ts` (`isValidCpfChecksum`, `normalizeAndValidateCpf`) | dígito verificador módulo 11 (Receita Federal) + rejeição de sequência de dígito único | `identifiers.test.ts` (7 casos CPF) | TESTADO — validado contra CPF de teste publicamente conhecido (`111.444.777-35`) | API/Frontend |
| PAT-004 | CNS | `identifiers.ts` (`isValidCnsProvisionalChecksum`, `normalizeAndValidateCns`) | dígito verificador módulo 11 para prefixo 7/8/9 (provisório); **apenas formato** para prefixo 1/2 (definitivo) — limitação documentada no código (ver abaixo) | `identifiers.test.ts` (7 casos CNS) | PARCIAL (provisório TESTADO; definitivo apenas formato) | TÉCNICA — dígito verificador do CNS definitivo (prefixo 1/2) não implementado; risco de implementar incorretamente um algoritmo mais complexo a partir de memória foi julgado maior que o benefício — registrado honestamente em vez de arriscar um checksum errado |
| PAT-005 | Prontuário (geração/preservação) | `rules.ts` (`PATIENT_IMMUTABLE_FIELDS`, `assertNoImmutablePatientFieldsChanged`) | **preservação**: `medicalRecordNumber` é campo imutável, rejeitado em qualquer patch de atualização, em runtime E em tempo de compilação (`PatientUpdateInput` já o exclui do tipo). **Geração** permanece responsabilidade do banco (`app.generate_medical_record_number()`, já testado real em T6 — não duplicada aqui) | `rules.test.ts` — "assertNoImmutablePatientFieldsChanged" (4 casos) | TESTADO (domínio, preservação); geração já TESTADO no banco (Rodada 1) | API/Frontend |
| PAT-006 | Dados demográficos | `types.ts`, `rules.ts` | tipos espelham exatamente as colunas de `app.patients`; `birthDate` validado (formato ISO, não-futuro) | `rules.test.ts` — "validateBirthDate" (5 casos) | TESTADO (domínio) | API/Frontend; sem validação de UF/CEP (não especificado) |
| PAT-007 | Contatos | `rules.ts` (`validatePatientContactCreateInput`) | `name`/`phone` obrigatórios (espelha `not null` do schema) | `rules.test.ts` — "satélites" (2 casos) | TESTADO (domínio) | API/Frontend |
| PAT-008 | Contato de emergência | `types.ts` (`PatientContactCreateInput.isEmergency`), `rules.ts` | mesmo tipo/validação de PAT-007, com `isEmergency` opcional (default `false` no banco) | `rules.test.ts` — mesmo bloco | TESTADO (domínio) | API/Frontend; nenhuma regra de "ao menos um contato de emergência obrigatório" (não especificada) |
| PAT-009 | Alergias | `rules.ts` (`validatePatientAllergyCreateInput`, `assertAllergyContentUnchanged`) | `substance` obrigatório (nunca assume "nega" sem registro — Doc 1 §11); imutabilidade de `substance`/`reaction`/`severity`/`patientId` espelhando EXATAMENTE o trigger `forbid_allergy_content_update` (0017:112-124), já testado real no banco (T5) | `rules.test.ts` — "assertAllergyContentUnchanged" (4 casos) | TESTADO (domínio, paridade com T5 real) | API/Frontend |
| PAT-010 | Reações adversas | `types.ts` (`PatientAllergy.reaction`) | campo estruturado dentro do registro de alergia (não texto livre solto) | coberto pelos mesmos testes de PAT-009 | TESTADO (domínio) | API/Frontend; sem catálogo estruturado de reações |
| PAT-011 | Antecedentes | `rules.ts` (`validatePatientAntecedentCreateInput`) | `description` obrigatório | `rules.test.ts` — "satélites" | TESTADO (domínio) | API/Frontend |
| PAT-012 | Medicamentos de uso contínuo | `rules.ts` (`validatePatientContinuousMedicationCreateInput`) | `medication` obrigatório | `rules.test.ts` — "satélites" | TESTADO (domínio) | API/Frontend |
| PAT-013 | Problemas ativos | `rules.ts` (`validatePatientActiveProblemCreateInput`) | `description` obrigatório | `rules.test.ts` — "satélites" | TESTADO (domínio) | API/Frontend |
| PAT-014 | Histórico clínico (timeline) | `events.ts` | fábricas puras de eventos de domínio (`PatientRegistered`, `PatientUpdated`, `PatientInactivated`, `PatientContactAdded`, `PatientAllergyRecorded`, `PatientAllergyStatusChanged`, `PatientAntecedentRecorded`, `PatientContinuousMedicationRecorded`, `PatientActiveProblemRecorded/Resolved`, `PatientDuplicateDetected`, `PatientMergeRequested/Reviewed`) — reaproveitam `createDomainEvent` já existente; **nenhuma persistência** (não gravam em `app.domain_events` — isso é responsabilidade da API, ainda não implementada) | `events.test.ts` (4 casos) | TESTADO (fábricas); persistência API NOT RUN (sem API) | API deve gravar os eventos e popular `patient_id` a partir de `aggregateId` |
| PAT-015 | Detecção de duplicidade | `duplicate-detection.ts` (`detectDuplicates`, `requiresHumanConfirmation`) | reimplementação em TS pura da MESMA lógica de `app.detect_patient_duplicates()` (forte/fraco/conflito), permitindo pré-checagem no domínio antes de uma viagem ao banco | `duplicate-detection.test.ts` (6 casos, incluindo os 3 cenários — forte/fraco/conflito — em paridade com T3/T4 reais do banco) | TESTADO (domínio, paridade com T3/T4 reais) | API deve chamar tanto esta função (pré-checagem) quanto `app.detect_patient_duplicates()` (autoridade final, já testada) |
| PAT-016 | Merge (SE necessário) | `merge.ts` (`mergeRequestStateMachine`), `rules.ts` (`validateMergeRequestPatients`), `errors.ts` (`mergeExecutionNotDefinedError`) | reaproveita a máquina de estados genérica (`../state-machine.ts`) para `requested→approved`/`requested→rejected`; origem≠destino (espelha `patient_merge_distinct_ck`); **nenhuma transição para `executed` é exposta** — execução do merge permanece NÃO DEFINIDA (decisão institucional pendente, Doc 1/2/3/4) | `merge.test.ts` (4 casos, incluindo verificação explícita de que `executed` é inalcançável) | TESTADO (fluxo de revisão); execução PENDENTE DE DECISÃO (por design, não por falta de código) | API/Frontend do fluxo de solicitação/aprovação |
| PAT-017 | Auditoria de alterações | `events.ts` (todas as fábricas incluem `actorId`), `rules.ts` (`assertNoImmutablePatientFieldsChanged` protege `createdBy`) | preparação apenas — eventos carregam ator e timestamp; gravação real em `app.audit_events`/`app.domain_events` depende da API | cobertos indiretamente pelos testes de `events.test.ts` | PARCIAL (preparado; gravação NOT RUN sem API) | API |

### Limitações e decisões técnicas registradas nesta rodada

- **CNS definitivo (prefixo 1/2):** dígito verificador NÃO implementado por decisão
  explícita — o algoritmo de derivação a partir do PIS/PASEP é mais complexo que o de
  CPF, e uma tentativa de implementá-lo a partir de memória, sem uma fonte confiável
  para verificar contra casos de teste conhecidos, corria risco real de introduzir um
  checksum sutilmente incorreto (rejeitando CNS válidos ou aceitando inválidos) — pior
  do que a limitação honesta registrada aqui. Apenas o formato (15 dígitos, já garantido
  pelo banco) é validado para este prefixo. Fica como pendência técnica explícita.
- **Geração de número de prontuário:** deliberadamente NÃO duplicada no domínio — a
  função `app.generate_medical_record_number()` (sequência Postgres, já testada real em
  T6) continua sendo a única fonte de geração; o domínio só garante que, uma vez
  atribuído, o valor não pode ser alterado por uma edição comum.
- **Execução de merge:** nenhuma função de domínio permite transicionar para `executed`
  — verificado explicitamente por teste (`merge.test.ts`). Isso não é uma lacuna de
  implementação; é a mesma decisão já registrada na migration 0017 e em
  `PHASE_2_READINESS.md`: a execução (reatribuição de dados clínicos) depende de decisão
  institucional ainda não tomada.
- **Eventos de domínio:** todas as fábricas em `events.ts` são puras — nenhuma delas
  grava em `app.domain_events`, `app.audit_events` ou qualquer tabela. Persistência é
  responsabilidade da API (rodada futura), incluindo o mapeamento `aggregateId ->
  patient_id` na tabela `app.domain_events` (coluna já existente desde a Fase 0).

---

## Camada de API (Rodada 3, 2026-08-20)

Implementação real em `apps/api/src/routes/patients.ts`, reaproveitando integralmente
`packages/domain/src/patient/` (nenhuma regra de negócio duplicada) e a infraestrutura
já homologada (`requireAuth`/`requirePermission`/`withSecurityContext`). Conexão real
como `vitaloop_app` — RLS efetiva, sem bypass. Detalhamento completo, tabela de
endpoints, regras de autorização e os 22 cenários de teste (todos PASS, execução real
contra o Supabase oficial) em `docs/PHASE_2_STEP_2_REPORT.md`.

| ID | O que mudou nesta rodada | Status |
|---|---|---|
| PAT-001 | `POST/GET/PATCH /api/v1/patients` reais, testados (criação/consulta/atualização autorizada e negada) | API TESTADA |
| PAT-002/003/004 | CPF/CNS inválidos rejeitados via API real (400) | API TESTADA |
| PAT-005 | Prontuário gerado pelo banco, preservado como imutável — rejeição de alteração testada via API real (409) | API TESTADA |
| PAT-006 | Dados demográficos aceitos/atualizados via API real | API TESTADA |
| PAT-007/008 | `POST/GET .../contacts` testados | API TESTADA |
| PAT-009/010 | `POST/GET .../allergies` + mudança de status testados; conteúdo clínico preservado | API TESTADA |
| PAT-011 | `POST/GET .../antecedents` testados | API TESTADA |
| PAT-012 | `POST/GET .../continuous-medications` testados | API TESTADA |
| PAT-013 | `POST/GET .../active-problems` testados | API TESTADA |
| PAT-014 | Evento `PatientRegistered` gravado e verificado via API real; agregação completa da timeline (múltiplos tipos de evento) não exercitada end-to-end nesta rodada | PARCIAL |
| PAT-015 | `POST .../duplicates/detect` + `GET .../duplicates` testados; forte/fraca/conflito todos exercitados via API real | API TESTADA |
| PAT-016 | `POST .../merge-requests` + `PATCH .../merge-requests/:id/review` testados (fluxo requested→approved/rejected); execução do merge continua NÃO DEFINIDA (por design) | API TESTADA (escopo do domínio) |
| PAT-017 | Auditoria gravada e confirmada administrativamente (RLS bloqueia o próprio ator de ler sua auditoria, por design — ver `PHASE_2_STEP_2_REPORT.md §4`) | TESTADO |

Frontend: **NÃO INICIADO** em todos os 17 requisitos.

---

## Camada de Consolidação (Rodada 5, 2026-08-20)

Etapa 4/6 — integração clínica e consolidação. Nenhuma funcionalidade nova; três gaps
de integração encontrados e fechados (peças já construídas em etapas anteriores, nunca
conectadas): timeline do paciente (grant ausente + endpoint ausente), auditoria de
duplicidade (detectar/revisar não gravavam `audit_events`), inativação de paciente
(`createPatientInactivatedEvent` do domínio nunca conectado a uma rota). Detalhamento
completo em `docs/PHASE_2_STEP_4_REPORT.md`. Uma migration aditiva
(`0022_grant_patient_timeline.sql`, apenas GRANT, sem mudança de policy).

| ID | O que mudou nesta rodada | Status |
|---|---|---|
| PAT-014 | `GET /patients/:id/timeline` + seção no frontend | API + Frontend TESTADO — **ver correção de segurança abaixo** |
| PAT-015 | Auditoria completa de `detect`/`review` (antes ausente); cobertura funcional inalterada | Auditoria TESTADA |
| PAT-017 | Cobertura estendida para duplicidade | TESTADO (ampliado) |
| Inativação (PAT-001) | `PATCH /patients/:id/inactivate` + ação no frontend | API + Frontend TESTADO |

---

## Camada de Frontend (Rodada 4, 2026-08-20)

Implementação real em `apps/web/src/pages/{PatientSearchPage,PatientRegisterPage,
PatientDetailPage}.tsx` + `apps/web/src/components/DuplicateWarning.tsx`, consumindo
exclusivamente os endpoints já testados na Rodada 3 (`apps/web/src/lib/patients-api.ts`
é um wrapper de tipos de DTO, não reimplementa validação). Detalhamento completo,
telas, endpoints usados e os 23 cenários de teste (todos PASS) em
`docs/PHASE_2_STEP_3_REPORT.md`.

| ID | O que mudou nesta rodada | Status |
|---|---|---|
| PAT-001..006 | Formulário de cadastro real, testado (vazio/obrigatórios/CPF/CNS/sucesso/erro) | Frontend TESTADO |
| PAT-002..006 | Busca por nome/CPF/CNS/prontuário, resultados, estado vazio | Frontend TESTADO |
| PAT-007/008 | Seção de contatos (listar + adicionar) | Frontend TESTADO |
| PAT-009/010 | Seção de alergias (listar + adicionar + mudar status) | Frontend TESTADO |
| PAT-011 | Seção de antecedentes (listar + adicionar) | Frontend TESTADO |
| PAT-012 | Seção de medicamentos contínuos (listar + adicionar) | Frontend TESTADO |
| PAT-013 | Seção de problemas ativos (listar + adicionar) | Frontend TESTADO |
| PAT-014 | Nenhuma UI de timeline nesta rodada (fora do escopo explícito da Etapa 3/6) | Frontend NÃO INICIADO |
| PAT-015 | Aviso de duplicidade (forte/fraca/conflito) na tela de cadastro, com confirmação explícita; conflito exige reconhecimento adicional. Tela de revisão administrativa de candidatos NÃO implementada | PARCIAL |
| PAT-016 | Nenhuma UI de solicitação/aprovação de merge nesta rodada (fora do escopo explícito) | Frontend NÃO INICIADO |
| PAT-017 | Sem UI própria (auditoria não é exposta ao usuário final por especificação) | N/A |

---

## Achado de segurança 2 — bypass total de RLS via views de timeline (Rodada 6, GATE PASS)

Auditoria cruzada de fechamento da Etapa 4/6 (somente leitura) encontrou e confirmou
empiricamente: `app.timeline`/`app.patient_timeline` (views das migrations 0008/0017)
não tinham `security_invoker=true` e são de propriedade de `postgres`
(`rolbypassrls=true`) — a policy `domain_events_read` nunca era avaliada para leituras
por essas views, um bypass TOTAL de RLS, não apenas ausência de escopo por paciente. A
migration 0022 (Etapa 4) tornou esse caminho alcançável via HTTP pela primeira vez.
Corrigido com migration aditiva
[`0023_fix_timeline_view_rls_bypass.sql`](../db/migrations/0023_fix_timeline_view_rls_bypass.sql)
(`security_invoker=true` nas duas views, nenhum grant novo necessário). Comprovado por
teste real: bloqueio sem sessão (0 linhas), leitura correta com sessão autenticada,
isolamento entre pacientes, rota HTTP revalidada, teste de regressão dedicado
adicionado à suíte (`26. regressão de segurança`). Detalhamento completo em
`docs/PHASE_2_STEP_4_REPORT.md` §13. **GATE PASS.**

---

## Achado de segurança — RLS não efetivamente aplicada pela conexão da aplicação

### ACHADO

A aplicação (`apps/api`) sempre conectou ao Postgres usando a `DATABASE_URL` no formato
`postgresql://postgres.<ref>:<senha>@...pooler.supabase.com:.../postgres` — ou seja,
autenticando como o papel `postgres`. Esse papel tem `rolbypassrls = true`. Como
resultado, **toda política de Row Level Security de todo o schema `app` — incluindo as
já declaradas "testadas e efetivas" na homologação formal da Fase 1 (2026-08-19) —
nunca foi de fato avaliada pela conexão real da API**, em nenhuma fase do projeto até
esta rodada. A proteção real, na prática, sempre foi exclusivamente a camada HTTP
(`requireAuth`/`requirePermission`), não o banco.

### CAUSA

Investigação de código (não apenas de configuração) revelou que a causa-raiz já era
conhecida e estava documentada desde a Fase 0: a migration
[`0010_security_context_and_rls.sql`](../db/migrations/0010_security_context_and_rls.sql)
(linhas 52-58) já criava um papel dedicado `vitaloop_app`, propositalmente `NOLOGIN`,
com o comentário explícito no código-fonte: *"PENDENTE; ajustar na etapa de
configuração do Supabase."* Todas as políticas de RLS de todo o schema `app` — de
0010 até 0017 (pacientes, inclusive) — já foram escritas corretamente com
`to vitaloop_app`, nunca `to public` ou um papel genérico. Esse ajuste pendente (dar
`LOGIN` ao papel e passar a usá-lo na `DATABASE_URL` real) nunca foi concluído,
inclusive durante a homologação formal da Fase 1, que declarou RLS "testada e efetiva"
— o que era verdade apenas no nível lógico (políticas corretamente desenhadas e
testadas via SQL administrativo), não no nível de conexão real da aplicação (nenhuma
requisição HTTP real jamais autenticou no banco como `vitaloop_app`).

### CORREÇÃO

Duas migrations foram necessárias, registradas de forma transparente (nenhuma edição
de migration anterior, conforme regra de append-only):

1. **[`0020_app_api_role_no_bypass_rls.sql`](../db/migrations/0020_app_api_role_no_bypass_rls.sql)**
   — tentativa inicial: criação de um papel novo (`app_api`), sem `BYPASSRLS`, com
   grants amplos. **Foi um desvio de rota** — como nenhuma política de RLS referencia
   `app_api` (todas usam `vitaloop_app`), uma conexão como esse papel não tinha
   NENHUMA política aplicável, e testes reais confirmaram 0 linhas visíveis em
   **todos** os cenários, inclusive o autorizado. Mantida no histórico de migrations
   (não editada nem apagada), mas seus efeitos foram integralmente revertidos pela
   migration seguinte.
2. **[`0021_activate_vitaloop_app_role.sql`](../db/migrations/0021_activate_vitaloop_app_role.sql)**
   — correção real: habilita `LOGIN` no papel `vitaloop_app` já existente desde a Fase
   0, concede `USAGE` em `extensions` (necessário para `app.normalize_text()`), e
   aposenta `app_api` (revoga todos os grants e remove o papel). A senha de
   `vitaloop_app` foi definida separadamente pelo usuário, diretamente no SQL Editor
   do Supabase, **fora do controle de versão** — nenhuma migration contém senha em
   texto (mesmo padrão de segurança já usado na Fase 0/1).

Adicionalmente, a `DATABASE_URL` de referência (documentada em comentário no `.env`,
nunca commitada) foi corrigida para usar `vitaloop_app` na **porta 5432 (session
pooler)**, não `postgres`/6543 (transaction pooler) — o papel recém-criado não
autenticou de forma confiável via o pooler de transação neste ambiente; a porta de
sessão é também a recomendação oficial do Supabase para backends persistentes como o
nosso Fastify (a porta 6543/transaction é recomendada para funções serverless/edge).

### EVIDÊNCIAS

Testes executados com conexão **real** (Node `pg`, fora do MCP administrativo,
autenticando via rede como `vitaloop_app`, senha real fornecida pelo usuário,
nunca persistida em arquivo versionado):

| Teste | Cenário | Resultado esperado | Resultado real | Veredito |
|---|---|---|---|---|
| T-RLS-A | SELECT sem GUC de sessão nenhum (equivalente a "sem sessão") | 0 linhas | 0 linhas | **PASS** |
| T-RLS-B | SELECT com papel sem `patient.read` | 0 linhas | 0 linhas | **PASS** |
| T-RLS-C | SELECT com papel **inexistente** no GUC | 0 linhas | 0 linhas | **PASS** |
| T-RLS-D | SELECT com papel **com** `patient.read` | 1 linha (o paciente de teste) | 1 linha | **PASS** |
| T-RLS-W1 | INSERT sem GUC de sessão | bloqueado | `new row violates row-level security policy` | **PASS** |
| T-RLS-W2 | INSERT com papel sem `patient.write` | bloqueado | `new row violates row-level security policy` | **PASS** |
| T-RLS-W3 | INSERT com papel inexistente | bloqueado | `new row violates row-level security policy` | **PASS** |
| T-RLS-W4 | INSERT com papel com `patient.read`, **sem** `patient.write` | bloqueado | `new row violates row-level security policy` | **PASS** |
| T-RLS-W5 | INSERT com papel **com** `patient.write`, **sem** `RETURNING` | permitido | 1 linha inserida | **PASS** |

Confirmação independente: senha de `vitaloop_app` verificada matematicamente contra o
hash SCRAM-SHA-256 armazenado (`pg_authid.rolpassword`) antes de cada tentativa de
conexão, eliminando ambiguidade de erro de digitação como causa de falhas anteriores de
autenticação durante a configuração.

### IMPLICAÇÃO DE DESIGN — `INSERT ... RETURNING` exige também política de SELECT

Durante T-RLS-W4/W5 foi observado que um `INSERT ... RETURNING` falha com o mesmo erro
de RLS mesmo quando o papel possui `patient.write`, **se não possuir também
`patient.read`**. Isso é comportamento padrão e documentado do PostgreSQL (não é falha
de schema): uma cláusula `RETURNING` exige que a linha inserida também seja visível sob
as políticas de `SELECT` da tabela, porque `RETURNING` implica uma leitura implícita da
linha recém-criada. Confirmado isolando a variável: o mesmo INSERT, sem `RETURNING`,
foi permitido apenas com `patient.write`; com `RETURNING`, passou a exigir
`patient.write` **e** `patient.read` juntos.

**Implicação para a futura API de criação de paciente (Etapa 1/6, ainda não
implementada):** o endpoint de criação (`POST /patients` ou equivalente) precisará
tratar isso explicitamente — ou exigir `patient.write`+`patient.read` combinados para
criar-e-retornar o registro criado em uma única operação, ou inserir sem `RETURNING` e
fazer uma leitura separada (sujeita então normalmente à política de `patient.read`).
Esta decisão de design **fica registrada como pendência técnica para a implementação da
API**, não decidida nesta rodada (rodada é documental, sem código).

### IMPACTO RETROATIVO NA FASE 0/1 (SEM REESCREVER HISTÓRICO)

A homologação formal da Fase 1 (2026-08-19, registrada em `PHASE_1_BASELINE.md` e
`STATUS.md §0`) **permanece como está, sem edição retroativa** — nenhuma linha da Fase
1 foi apagada ou reclassificada silenciosamente. Este documento registra, de forma
aditiva, a seguinte correção de entendimento:

- As linhas SEC-013 (RBAC), SEC-016 (Need-to-Know por setor), SEC-018/019/020/021/022
  (auditoria/break-glass) da Fase 1 continuam **corretas quanto ao que testaram**: as
  **funções SQL** (`has_permission`, `can_access`, `authorize`, `activate_break_glass`,
  `log_authz`) foram genuinamente exercitadas com sucesso via SQL real no Supabase
  oficial, com a identidade real obtida por login HTTP genuíno.
- O que a Fase 1 **não testou, e não poderia ter testado com os meios disponíveis
  então** (sem `DATABASE_URL` própria para uma conexão de aplicação dedicada — a
  matriz da Fase 1 já registrava essa limitação explicitamente para `requirePermission`
  via HTTP, SEC-013), é se a **conexão real da API ao Postgres** respeitava RLS. Ela
  não respeitava — porque usava `postgres`, não `vitaloop_app`.
- Conclusão honesta: a homologação da Fase 1 estava correta sobre "as políticas de RLS
  estão bem desenhadas e a lógica de autorização funciona quando exercida", mas **não
  cobria, e não afirmava cobrir**, "a conexão real de produção da API respeita RLS" —
  essa lacuna específica só foi descoberta e fechada nesta rodada da Fase 2. Não há
  necessidade de reabrir o gate da Fase 1: nenhuma evidência anterior era falsa, apenas
  incompleta em um aspecto que não havia sido testado, e que agora está testado e
  corrigido para o projeto inteiro (todas as tabelas do schema `app`, não apenas
  pacientes, já que `vitaloop_app` é o mesmo papel referenciado desde a migration 0010).

### ESTADO FINAL DO BANCO APÓS ESTA RODADA

- Advisors de segurança do Supabase: **0 alertas** (reconfirmado após 0019/0020/0021).
- Dados de teste: **0 registros residuais** — tabela `app.patients` com **0 linhas**,
  papéis de teste (`test_patient_reader`, `test_no_patient_perm`) removidos, tabela de
  teste isolada `app.rls_debug_scratch` removida.
- Papel `app_api`: **removido** (`drop role`).
- Papel `vitaloop_app`: **ativo, com LOGIN, sem BYPASSRLS**, é agora o papel de conexão
  real de referência da aplicação (documentado em comentário no `.env`, senha fora do
  controle de versão).
- `DATABASE_URL` no `.env` local: **vazia** ao final desta rodada (mesma disciplina de
  precaução da Fase 1).

---

## Testes de schema T1–T9 (banco, fora do achado de RLS)

| Teste | Escopo | Resultado | Evidência |
|---|---|---|---|
| T1 | Unicidade de CPF (comportamento **antes** da 0019) | **PASS** (a versão anterior à correção rejeitava CPF duplicado por `UNIQUE`) — comportamento superado pela 0019, mantido aqui por rastreabilidade histórica | SQL real, `duplicate key value violates unique constraint "patients_cpf_uk"` |
| T2 | Formato de CPF inválido (`'123'`) rejeitado por CHECK | **PASS** | SQL real, `patients_cpf_format_ck` |
| T3 | Duplicidade fraca — nomes com acentuação/caixa/espaços diferentes, mesma data de nascimento | **PASS** | `match_strength='weak'`, `match_reason='Mesmo nome (normalizado) e data de nascimento.'` |
| T4 | Duplicidade "conflito" — mesmo CPF, nomes diferentes (só possível **após** 0019) | **PASS** | `match_strength='conflict'`, `match_reason='Mesmo CPF/CNS com nome diferente — possível erro de cadastro ou identidade indevida.'` |
| T5 | Imutabilidade de alergia — UPDATE de `substance` bloqueado; UPDATE de `status` permitido | **PASS** | Trigger capturado via exception handler; `substance` inalterado, `status` alterado para `resolved` |
| T6 | Geração de `medical_record_number` — sequencial, único por instituição | **PASS** | `2026000008`, `2026000009`; índice `patients_mrn_institution_uk` confirmado |
| T7 | Tabelas satélite — `patient_contacts`, `patient_antecedents`, `patient_continuous_medications`, `patient_active_problems` | **PASS** | 4 inserts reais na mesma transação, sem erro |
| T8 | `patient_merge_requests` — insert com enum válido (`requested`) | **PASS** | insert real, sem erro |
| T9 | `app.patient_timeline` — view responde sem erro | **PASS estrutural** | 0 linhas — esperado, pois nenhum evento de domínio foi emitido ainda (não há emissor de eventos, API inexistente) |

Todos os testes T1–T9 foram executados em transações isoladas com `rollback` (exceto os
dados criados especificamente para os testes de RLS T-RLS-\*, que foram criados de
forma durável e explicitamente removidos ao final — ver seção anterior). Nenhum dado de
teste permanece no banco.

---

## Pendências institucionais explícitas (não são bugs técnicos)

- PAT-003/004 — validação de dígito verificador de CPF/CNS (hoje só formato) —
  decisão técnica, não institucional, mas não implementada nesta rodada.
- PAT-016 — execução real do merge de pacientes (reatribuição de dados) permanece
  **fora de escopo por decisão já registrada** em `PHASE_2_READINESS.md` — apenas o
  fluxo de solicitação/aprovação existe.
- Necessidade de saber (Need-to-Know) por paciente — as políticas de RLS de pacientes
  criadas na 0017 são gated exclusivamente por RBAC (`has_permission`); nenhuma usa
  `can_access`/Need-to-Know ainda. Registrado como **PENDENTE DE DECISÃO/TÉCNICA** —
  já antecipado em `PHASE_2_READINESS.md §6` antes desta etapa começar.
