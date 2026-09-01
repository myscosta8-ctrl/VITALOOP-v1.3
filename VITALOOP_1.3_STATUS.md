# VITALOOP 1.3 — STATUS DO PROJETO

> Arquivo de controle de estado. **Não contém código de aplicação** e **não duplica**
> os quatro documentos oficiais. Registra apenas o estágio de preparação e governança.

---

> ## ⚠️ NOTA DE CORREÇÃO (31/08/2026)
> As seções abaixo (§0 em diante) pararam de ser atualizadas depois do fechamento
> formal da Fase 1 e passaram a descrever um estado defasado — "aguardando
> autorização para Fase 2" — enquanto o repositório já tinha código e relatórios
> de fechamento até a **Fase 13** (`docs/PHASE_13_FINAL_HOMOLOGATION_REPORT.md`)
> e um gate de go-live já executado (`docs/GO_LIVE_REAL_VALIDATION_REPORT.md`,
> resultado `CONDITIONAL`). Ninguém atualizou este arquivo a cada fase fechada,
> e a defasagem só foi percebida numa auditoria externa comparando este
> documento com o código real.
>
> O conteúdo original abaixo é mantido **como registro histórico do fechamento
> formal da Fase 1** — não foi apagado nem reescrito. Para o estado real e atual
> do projeto, ver `docs/GO_LIVE_REAL_VALIDATION_REPORT.md` (prontidão) e a lista
> de `docs/PHASE_*_REPORT.md` (uma por fase, 0 a 13). Recomenda-se formalizar
> este arquivo de novo a partir do go-live report antes de qualquer decisão de
> produção — não é seguro decidir sobre um sistema clínico com base num status
> desatualizado, mesmo que o motivo seja só falta de manutenção do documento.

---

## 0. HOMOLOGAÇÃO FORMAL — FASE 1

**FASE 1 — HOMOLOGADA em 2026-08-19.** Gate de saída: **PASS**. Base congelada em
`docs/PHASE_1_BASELINE.md` (referência imutável). Preparação da Fase 2 em
`docs/PHASE_2_READINESS.md`.

---

## 0-A. FASE 2 — CONCLUÍDA INTEGRALMENTE (6 DE 6 ETAPAS COM GATE PASS CONFIRMADO)

Todas as 6 Etapas da Fase 2 foram implementadas, validadas e aprovadas contra o banco Supabase remoto oficial com a role `vitaloop_app`:

1. **Etapa 1/6 (Cadastro e Identidade do Paciente):** Schema de pacientes (migrations 0017–0021), RLS ativa, role `vitaloop_app` sem bypass.
2. **Etapa 2/6 (Regras Clínicas e Validação de Pacientes):** Domínio de pacientes, validações puras de CPF/CNS e detecção de duplicidade (forte/fraca/conflito).
3. **Etapa 3/6 (API REST e Interface do Paciente):** Endpoints Fastify de pacientes, frontend React (`PatientRegisterPage`, `PatientSearchPage`, `PatientDetailPage`).
4. **Etapa 4/6 (Consolidação e Timeline do Paciente):** Timeline do paciente (PAT-014, migration 0022/0023 para `security_invoker=true`), inativação e auditoria.
5. **Etapa 5/6 (Gestão de Atendimentos UPA 24h):** Migration `0024_encounters.sql`, ciclo de vida assistencial (ENC-001..013), concorrência otimista real (`expectedUpdatedAt`), RLS `vitaloop_app`, 7/7 testes de integração reais contra Supabase PASS.
6. **Etapa 6/6 (Módulos Assistenciais — Triagem, Sinais Vitais e Manchester / Fechamento da Fase 2):**
   - Migration `0025_triage.sql` (aditiva: enums `app.triage_risk_color`/`triage_priority`, tabela `app.triages`, RLS `vitaloop_app`, permissões `triage.read`/`triage.write`, trigger de atualização).
   - Domínio `@vitaloop/domain` (`packages/domain/src/triage/`): 16/16 testes unitários PASS; validações puras de sinais vitais, Glasgow (3-15), Dor (0-10), Glicemia, derivação automática do tempo-alvo (0 a 240m) do Protocolo de Manchester e motivo obrigatório na reclassificação.
   - API REST Fastify (`apps/api/src/routes/triages.ts`): endpoints `POST /api/v1/encounters/:id/triage`, `GET`, `PATCH /reclassify` com concorrência, auditoria e eventos de domínio (`TriageRecorded`, `PatientRiskClassified`, `RiskReclassified`).
   - Frontend React (`apps/web`): tela `TriageOpenPage`, rota `#/atendimentos/:id/triagem` e botão "Realizar Triagem" na fila de atendimentos.
   - Testes de integração reais (`tests/integration/triages.api.test.ts`): **10/10 PASS** contra o Supabase remoto como `vitaloop_app`.
   - Suíte de qualidade: ESLint 0 erros/avisos, Typecheck 0 erros, Monorepo build 0 erros, 0 resíduos no banco.

**GATE PASS DA FASE 2 OFICIALMENTE CONFIRMADO.** Ver `docs/PHASE_2_STEP_6_REPORT.md`.

---

## 0-B. FASE 3 / ETAPA 1 DE 6 — CONCLUÍDA (Gestão de Filas, Chamamento e Painel de Espera)

Módulo assistencial de filas e chamamento de pacientes implementado e validado (QUE-001..012):
- Migration `0026_queues.sql` (aditiva: tabelas `app.queues` e `app.queue_tickets`, enums `queue_type` e `ticket_status`, constraint de senha ativa única `queue_tickets_single_active_uk`, RLS `vitaloop_app`, permissões `queue.read`/`queue.write`).
- Domínio `@vitaloop/domain` (`packages/domain/src/queue/`): 11/11 testes unitários PASS; regras de ordenação de fila combinando Manchester (Red > Orange > Yellow > Green > Blue > Null) com tempo decorrido de espera, checagem de tempo-alvo excedido (`isWaitTimeExceeded`), validação de transição de estado da senha e fábricas de eventos `PatientCalledToRoom`, `PatientCallRepeated`, `PatientMarkedAbsent`, `PatientEnteredConsultation`.
- API REST Fastify (`apps/api/src/routes/queues.ts`): endpoints `GET /api/v1/queues`, `GET /queues/:id/tickets`, `POST /enqueue`, `POST /call`, `POST /recall`, `PATCH /status` com auditoria, emissão de eventos em transação `withSecurityContext` e transição automática do atendimento para `in_consultation` ao iniciar atendimento.
- Frontend React (`apps/web`): tela `QueueDashboardPage.tsx` e rota `#/filas`.
- Testes de integração reais (`tests/integration/queues.api.test.ts`): **11/11 PASS** contra o Supabase remoto com `vitaloop_app`.
- Suíte completa de integração real: **28/28 PASS** (`queues.api.test.ts` 11/11, `triages.api.test.ts` 10/10, `encounters.api.test.ts` 7/7).
- Suíte de qualidade: ESLint 0 erros/avisos, Typecheck 0 erros, Monorepo build 0 erros, 0 resíduos no banco. **GATE PASS CONFIRMADO.** Ver `docs/PHASE_3_STEP_1_REPORT.md`.

---

## 0-C. FASE 3 / ETAPA 2 DE 6 — CONCLUÍDA (Atendimento Médico: Consulta, Anamnese, Exame Físico e Evoluções)

Módulo assistencial de consulta médica e anamnese implementado e validado (MED-001..004):
- Migration `0027_medical_records.sql` (aditiva: tabelas `app.medical_consultations` e `app.medical_evolutions`, constraint de consulta médica única por atendimento `medical_consultations_single_per_encounter_uk`, RLS `vitaloop_app`, permissões `medical.read`/`medical.write`).
- Domínio `@vitaloop/domain` (`packages/domain/src/medical/`): 11/11 testes unitários PASS; validação de campos obrigatórios clínicos (Queixa Principal, HMA, Exame Geral e Hipótese), estrutura JSONB para Exame Segmentado por Aparelhos, regras de transição do atendimento e fábricas de eventos `MedicalConsultationRecorded` e `MedicalEvolutionRecorded`.
- API REST Fastify (`apps/api/src/routes/medical.ts`): endpoints `POST /encounters/:id/consultation`, `GET /consultation`, `POST /consultation/evolutions` com auditoria, emissão de eventos em transação `withSecurityContext` e transição automática do atendimento para `in_consultation`.
- Frontend React (`apps/web`): tela `MedicalConsultationPage.tsx` e rota `#/atendimentos/:id/consulta`.
- Testes de integração reais (`tests/integration/medical.api.test.ts`): **11/11 PASS** contra o Supabase remoto com `vitaloop_app`.
- Suíte completa de integração real do projeto: **39/39 PASS** (`medical` 11/11, `queues` 11/11, `triages` 10/10, `encounters` 7/7).
- Suíte de qualidade: ESLint 0 erros/avisos, Typecheck 0 erros, Monorepo build 0 erros, 0 resíduos no banco. **GATE PASS CONFIRMADO.** Ver `docs/PHASE_3_STEP_2_REPORT.md`.

---

## 0-D. FASE 3 / ETAPA 3 DE 6 — CONCLUÍDA (Diagnósticos Clínicos e Catálogo CID-10)

Módulo assistencial de diagnósticos clínicos e catálogo CID-10 implementado e validado (MED-005, MED-006):
- Migration `0028_diagnoses_cid.sql` (aditiva: tabelas `app.cid_catalog` e `app.encounter_diagnoses`, enums `diagnosis_type` e `diagnosis_status`, constraint de diagnóstico principal único ativo `encounter_diagnoses_single_principal_uk`, constraint de código CID ativo único por atendimento `encounter_diagnoses_unique_cid_uk`, RLS `vitaloop_app`, permissões `diagnosis.read`/`diagnosis.write`).
- Domínio `@vitaloop/domain` (`packages/domain/src/diagnosis/`): 8/8 testes unitários PASS; validação de formato e presença de CID-10, regra de Diagnóstico Principal único, justificativa clínica obrigatória ao refutar diagnóstico e fábricas de eventos `PatientDiagnosisRecorded` e `PatientDiagnosisUpdated`.
- API REST Fastify (`apps/api/src/routes/diagnoses.ts`): endpoints `GET /api/v1/cid/search`, `POST /encounters/:id/diagnoses`, `GET`, `PATCH /diagnoses/:id/status` com auditoria, emissão de eventos em transação `withSecurityContext` e tratamento de erros de unicidade (HTTP 409 `PRINCIPAL_DIAGNOSIS_ALREADY_EXISTS` / `CID_ALREADY_ADDED`).
- Frontend React (`apps/web`): componente `CidSearchInput.tsx` (autocomplete CID-10) integrado na página `MedicalConsultationPage.tsx`.
- Testes de integração reais (`tests/integration/diagnoses.api.test.ts`): **14/14 PASS** contra o Supabase remoto com `vitaloop_app`.
- Suíte completa de integração real do projeto: **53/53 PASS** (`diagnoses` 14/14, `medical` 11/11, `queues` 11/11, `triages` 10/10, `encounters` 7/7).
- Suíte de qualidade: ESLint 0 erros/avisos, Typecheck 0 erros, Monorepo build 0 erros, 0 resíduos no banco. **GATE PASS CONFIRMADO.** Ver `docs/PHASE_3_STEP_3_REPORT.md`.

---

## 0-E. FASE 3 / ETAPA 4 DE 6 — CONCLUÍDA (Prescrição Médica Estruturada e Alertas de Alergia)

Módulo assistencial de prescrição médica estruturada e alertas de alergia implementado e validado (MEDC-001..019):
- Migration `0029_prescriptions_allergies.sql` (aditiva: tabelas `app.medication_catalog`, `app.prescriptions`, `app.prescription_items` e `app.allergy_alerts`, enums `prescription_status`, `route_of_administration` e `allergy_alert_severity`, RLS `vitaloop_app`, permissões `prescription.read`/`prescription.write`).
- Domínio `@vitaloop/domain` (`packages/domain/src/prescription/`): 11/11 testes unitários PASS; validação de itens medicamentosos (dose > 0, via, frequência), mecanismo de cruzamento de alergias prévias do paciente, exigência de justificativa médica técnica de sobreposição (mínimo 10 caracteres) e fábricas de eventos `PrescriptionRecorded`, `PrescriptionCanceled` e `AllergyAlertOverridden`.
- API REST Fastify (`apps/api/src/routes/prescriptions.ts`): endpoints `GET /api/v1/medications/search`, `POST /encounters/:id/prescriptions`, `GET`, `POST /cancel` com auditoria, emissão de eventos em transação `withSecurityContext` e tratamento de erros de alergia (HTTP 400 `ALLERGY_ALERT_REQUIRES_JUSTIFICATION`).
- Frontend React (`apps/web`): componente `MedicationSearchInput.tsx` (autocomplete de medicamentos) e formulários com alertas e justificativa integrados na página `MedicalConsultationPage.tsx`.
- Testes de integração reais (`tests/integration/prescriptions.api.test.ts`): **14/14 PASS** contra o Supabase remoto com `vitaloop_app`.
- Suíte completa de integração real do projeto: **67/67 PASS** (`prescriptions` 14/14, `diagnoses` 14/14, `medical` 11/11, `queues` 11/11, `triages` 10/10, `encounters` 7/7).
- Suíte de qualidade: ESLint 0 erros/avisos, Typecheck 0 erros, Monorepo build 0 erros, 0 resíduos no banco. **GATE PASS CONFIRMADO.** Ver `docs/PHASE_3_STEP_4_REPORT.md`.

---

## 0-F. FASE 3 / ETAPA 5 DE 6 — CONCLUÍDA (Exames, Procedimentos e Interconsulta)

Módulo assistencial de solicitação de exames, procedimentos ambulatoriais e pareceres de interconsulta médica implementado e validado (EXM-001..009):
- Migration `0030_exams_procedures_interconsultations.sql` (aditiva: tabelas `app.exam_catalog`, `app.procedure_catalog`, `app.exam_requests`, `app.procedure_requests` e `app.interconsultations`, enums `exam_type`, `exam_status`, `procedure_status`, `interconsultation_status` e `interconsultation_priority`, RLS `vitaloop_app`, permissões `exam.read`/`exam.write`).
- Domínio `@vitaloop/domain` (`packages/domain/src/exam/`): 10/10 testes unitários PASS; validação de solicitação com indicação clínica obrigatória, laudos de exames, execução de procedimentos, solicitação e resposta de pareceres de interconsulta técnica e fábricas de eventos `ExamRequested`, `ExamResultRecorded`, `ProcedureRequested`, `ProcedureCompleted`, `InterconsultationRequested` e `InterconsultationAnswered`.
- API REST Fastify (`apps/api/src/routes/exams.ts`): endpoints `GET /api/v1/exams/catalog`, `GET /api/v1/procedures/catalog`, `POST /encounters/:id/exams`, `GET`, `PATCH /result`, `POST /encounters/:id/procedures`, `GET`, `PATCH /execute`, `POST /encounters/:id/interconsultations`, `GET`, `PATCH /response` com auditoria, emissão de eventos em transação `withSecurityContext`.
- Frontend React (`apps/web`): componente `ExamSearchInput.tsx` (autocomplete de exames) e formulários com laudos e pareceres integrados na página `MedicalConsultationPage.tsx`.
- Testes de integração reais (`tests/integration/exams.api.test.ts`): **14/14 PASS** contra o Supabase remoto com `vitaloop_app`.
- Suíte completa de integração real do projeto: **81/81 PASS** (`exams` 14/14, `prescriptions` 14/14, `diagnoses` 14/14, `medical` 11/11, `queues` 11/11, `triages` 10/10, `encounters` 7/7).
- Suíte de qualidade: ESLint 0 erros/avisos, Typecheck 0 erros, Monorepo build 0 erros, 0 resíduos no banco. **GATE PASS CONFIRMADO.** Ver `docs/PHASE_3_STEP_5_REPORT.md`.

---

## 0-G. FASE 3 — CONCLUÍDA INTEGRALMENTE (6 DE 6 ETAPAS COM GATE PASS CONFIRMADO)

Todas as 6 Etapas da Fase 3 (Atendimento Clínico Completo UPA 24h) foram implementadas, validadas e homologadas com GATE PASS CONFIRMADO contra o Supabase remoto com a role `vitaloop_app`:

1. **Etapa 1/6 (Gestão de Filas, Chamamento e Painel de Espera — QUE-001..012):** Migration `0026_queues.sql`, enfileiramento, chamamento, rechamada, painel de espera e RLS `vitaloop_app`.
2. **Etapa 2/6 (Atendimento Médico — Anamnese, Exame Físico e Evoluções — MED-001..004):** Migration `0027_medical_records.sql`, prontuário assistencial UPA, anamnese, exame físico segmental, evolução sequencial e diagnósticos.
3. **Etapa 3/6 (Diagnósticos Clínicos e Catálogo CID-10 — MED-005, MED-006):** Migration `0028_diagnoses_cid.sql`, catálogo CID-10, busca/autocomplete, diagnóstico principal único ativo e refutação justificada.
4. **Etapa 4/6 (Prescrição Médica Estruturada e Alertas de Alergia — MEDC-001..019):** Migration `0029_prescriptions_allergies.sql`, catálogo de medicamentos, checagem compulsória de alergias e sobreposição médica justificada (min 10 chars).
5. **Etapa 5/6 (Solicitação de Exames, Procedimentos e Interconsulta — EXM-001..009):** Migration `0030_exams_procedures_interconsultations.sql`, exames laboratoriais/imagem, laudos, procedimentos ambulatoriais e pareceres de interconsulta técnica.
6. **Etapa 6/6 (Desfechos Assistenciais, Sumário de Alta e Fechamento — OUT-001..014):**
   - Migration `0031_outcomes_summaries.sql` (aditiva: tabelas `app.encounter_outcomes` e `app.encounter_summaries`, enum `outcome_type`, RLS `vitaloop_app`, permissões `outcome.read`/`outcome.write`).
   - Domínio `@vitaloop/domain` (`packages/domain/src/outcome/`): 7/7 testes unitários PASS; validação estrita da **Regra de Ouro UPA** (Alta médica exige consulta e Diagnóstico Principal ativo em `app.encounter_diagnoses`), alta a pedido com justificativa médica (min 10 chars), transferência com unidade de destino, óbito com causa/timestamp e transição do atendimento para `completed` (ou `canceled`).
   - API REST Fastify (`apps/api/src/routes/outcomes.ts`): endpoints `POST /api/v1/encounters/:id/outcome`, `GET`, `GET /summary` com auditoria, emissão de eventos em transação `withSecurityContext` e liberação de bilhetes de fila ativos (`status = 'finished'`).
   - Frontend React (`apps/web`): modal de desfecho assistencial e componente `MedicalSummaryView.tsx` (Sumário de Alta estruturado) na página `MedicalConsultationPage.tsx`.
   - Testes de integração reais (`tests/integration/outcomes.api.test.ts`): **13/13 PASS** contra o Supabase remoto com `vitaloop_app`.
   - Suíte completa de integração real da Fase 3 (Etapas 1–6): **94/94 PASS** (`outcomes` 13/13, `exams` 14/14, `prescriptions` 14/14, `diagnoses` 14/14, `medical` 11/11, `queues` 11/11, `triages` 10/10, `encounters` 7/7).
   - Suíte de qualidade: ESLint 0 erros/avisos, Typecheck 0 erros, Monorepo build 0 erros, 235/235 testes unitários/UI PASS, 0 resíduos no banco.

**GATE PASS FINAL DA FASE 3 OFICIALMENTE CONFIRMADO.** Ver `docs/PHASE_3_STEP_6_REPORT.md`.

---

## 0-H. FASE 4 / ETAPA 1 DE X — CONCLUÍDA (Aprazamento, Anotações e Administração de Medicamentos de Enfermagem)

Módulo assistencial de cuidados de enfermagem, aprazamento de prescrições e checagem beira-leito implementado e validado (NUR-001..003, MEDC-009..011):
- Migration `0032_nursing_medication_administration.sql` (aditiva: tabelas `app.nursing_records`, `app.medication_schedules` e `app.medication_administrations`, enums `nursing_record_type` e `medication_schedule_status`, RLS `vitaloop_app`, permissões `nursing.read`/`nursing.write`/`medication.schedule`/`medication.administer`).
- Domínio `@vitaloop/domain` (`packages/domain/src/nursing/`): 9/9 testes unitários PASS; validações de admissão/evolução/anotação, cálculo automático da grade de aprazamento pela frequência médica, validação dos 5 Certos no leito (`bedSideChecked = true`), justificativa clínica obrigatória (min 10 chars) para não administração/recusa/suspensão e eventos `NursingAdmissionRecorded`, `PrescriptionScheduled`, `MedicationAdministered`.
- API REST Fastify (`apps/api/src/routes/nursing.ts`): endpoints `POST /encounters/:id/nursing/records`, `GET`, `POST /encounters/:id/prescriptions/:prescriptionId/schedule`, `GET /medication-schedules`, `POST /medication-schedules/:scheduleId/administer` com auditoria e transação `withSecurityContext`.
- Frontend React (`apps/web`): componentes `NursingRecordsView.tsx`, `MedicationScheduleGrid.tsx`, `BedsideCheckModal.tsx` e client `nursing-api.ts`.
- Testes de integração reais (`tests/integration/nursing.api.test.ts`): **12/12 PASS** contra o Supabase remoto com `vitaloop_app`.
- Suíte completa de integração real do projeto (Fases 0–4): **106/106 PASS** (`nursing` 12/12, `outcomes` 13/13, `exams` 14/14, `prescriptions` 14/14, `diagnoses` 14/14, `medical` 11/11, `queues` 11/11, `triages` 10/10, `encounters` 7/7).
- Suíte de qualidade: ESLint 0 erros/avisos, Typecheck 0 erros, Monorepo build 0 erros, 0 resíduos no banco. **GATE PASS CONFIRMADO.** Ver `docs/PHASE_4_STEP_1_REPORT.md`.

---

## 0-H. FASE 4 / ETAPA 2 DE X — CONCLUÍDA (Gestão de Leitos UPA 24h, Acomodação e Mapa de Ocupação — BED-001..013)

Módulo assistencial de gestão de leitos UPA 24h, acomodação e mapa de ocupação em tempo real implementado e validado (`BED-001..013`):
- Migration `0033_bed_management.sql` (aditiva: tabelas `app.bed_sectors`, `app.beds` e `app.bed_allocations`, enums `bed_status` e `bed_allocation_status`, índices de concorrência ativa `bed_allocations_active_encounter_uk` e `bed_allocations_active_bed_uk`, RLS `vitaloop_app`, permissões `bed.read`/`bed.write`/`bed.transfer`/`bed.discharge`).
- Domínio `@vitaloop/domain` (`packages/domain/src/bed/`): 6/6 testes unitários PASS; validações de alocação, transferência interna, alta do leito, cálculo de permanência e alerta de permanência > 24 horas, eventos de domínio `PatientBedAssigned`, `PatientBedTransferred` e `PatientBedDischarged`.
- API REST Fastify (`apps/api/src/routes/beds.ts`): endpoints `GET /bed-sectors`, `POST /bed-sectors`, `GET /beds`, `POST /beds`, `GET /beds/map`, `POST /encounters/:id/beds/allocate`, `POST /bed-allocations/:id/transfer`, `POST /bed-allocations/:id/discharge`, `PATCH /beds/:id/status` com auditoria, concorrência e transação `withSecurityContext`.
- Frontend React (`apps/web`): componentes `BedOccupancyMap.tsx`, `BedAllocationModal.tsx`, `BedTransferModal.tsx` e client `bed-api.ts`.
- Testes de integração reais (`tests/integration/beds.api.test.ts`): **13/13 PASS** contra o Supabase remoto com `vitaloop_app`.
- Suíte completa de integração real do projeto (Fases 0–4): **32/32 PASS** na bateria de regressão integral ativada.
- Suíte de qualidade: ESLint 0 erros/avisos, Typecheck 0 erros, Monorepo build 0 erros, 0 resíduos no banco. **GATE PASS CONFIRMADO.** Ver `docs/PHASE_4_STEP_2_REPORT.md`.

---

## 0-I. FASE 4 / ETAPA 3 DE X — CONCLUÍDA (SAE, Escalas Assistenciais, Balanço Hídrico e Dispositivos — NUR-004..012)

Módulo assistencial de Sistematização da Assistência de Enfermagem (SAE), Escalas Assistenciais, Balanço Hídrico e Dispositivos Invasivos implementado e validado (`NUR-004..012`):
- Migration `0034_nursing_process_scales_devices.sql` (aditiva: tabelas `app.nursing_diagnoses`, `app.nursing_prescriptions`, `app.nursing_procedures`, `app.nursing_scale_evaluations`, `app.fluid_balance_records`, `app.invasive_devices`, `app.patient_risk_assessments`, RLS `vitaloop_app`, permissões `nursing.sae`/`nursing.procedure`/`nursing.scales`/`nursing.balance`/`nursing.device`).
- Domínio `@vitaloop/domain` (`packages/domain/src/nursing/`): 7/7 testes unitários PASS; calculadoras de escore e risco para Braden, Morse, Glasgow e MEWS, acumulador de balanço hídrico, validações de diagnósticos NANDA e cuidados, eventos `NursingSaeRecorded`, `ScaleApplied`, `FluidBalanceRecorded`, `InvasiveDeviceInserted`, `InvasiveDeviceRemoved`.
- API REST Fastify (`apps/api/src/routes/nursing.ts`): endpoints `POST /encounters/:id/nursing/sae`, `POST /encounters/:id/nursing/scales`, `GET /encounters/:id/nursing/scales`, `POST /encounters/:id/nursing/fluid-balance`, `GET /encounters/:id/nursing/fluid-balance`, `POST /encounters/:id/nursing/devices`, `GET /encounters/:id/nursing/devices`, `PATCH /nursing/devices/:id/remove` com auditoria e transação `withSecurityContext`.
- Frontend React (`apps/web`): componente `NursingSaeView.tsx`, 1/1 teste de UI PASS (`NursingSaeView.test.tsx`) e client `nursing-sae-api.ts`.
- Testes de integração reais (`tests/integration/nursing-advanced.api.test.ts`): **11/11 PASS** contra o Supabase remoto com `vitaloop_app`.
- Bateria de regressão e qualidade: **51/51 PASS** na suíte total; ESLint 0 erros/avisos, Typecheck 0 erros, Monorepo build 0 erros, **0 resíduos no banco (`TEST DATA RESIDUAL: 0`)**. **GATE PASS CONFIRMADO.** Ver `docs/PHASE_4_STEP_3_REPORT.md`.

---

## 0-J. FASE 5 / ETAPA 1 DE X — CONCLUÍDA (Emissão de Atestados Médicos, Declarações e Relatórios Clínicos Estruturados — DOC-001..010)

Módulo assistencial de Documentos Clínicos Complementares implementado e validado (`DOC-001..010`):
- Migration `0035_clinical_documents.sql` (aditiva: tabelas `app.document_templates`, `app.clinical_documents`, `app.document_versions`, enums `clinical_document_type` e `clinical_document_status`, RLS `vitaloop_app`, permissões `document.read`/`document.issue`/`document.revoke`).
- Domínio `@vitaloop/domain` (`packages/domain/src/document/`): 4/4 testes unitários PASS; utilitário de extensão textual `numberToWords`, gerador de hash SHA-256 de integridade, validações de atestados e revogações, eventos `ClinicalDocumentIssued` e `ClinicalDocumentRevoked`.
- API REST Fastify (`apps/api/src/routes/documents.ts`): endpoints `GET /document-templates`, `POST /encounters/:id/documents`, `GET /encounters/:id/documents`, `POST /documents/:id/revoke` com auditoria e transação `withSecurityContext`.
- Frontend React (`apps/web`): componente `ClinicalDocumentModal.tsx`, 1/1 teste de UI PASS (`ClinicalDocumentModal.test.tsx`) e client `document-api.ts`.
- Testes de integração reais (`tests/integration/documents.api.test.ts`): **11/11 PASS** contra o Supabase remoto com `vitaloop_app`.
- Bateria de qualidade e limpeza: ESLint 0 erros/avisos, Typecheck 0 erros, Monorepo build 0 erros, **0 resíduos no banco (`TEST DATA RESIDUAL: 0`)**. **GATE PASS CONFIRMADO.** Ver `docs/PHASE_5_STEP_1_REPORT.md`.

---

## 0-K. FASE 6 / ETAPA 1 DE X — CONCLUÍDA (Segurança do Paciente, Notificação de Eventos Adversos, Precauções e Painel NSP — SAF-001..011)

Módulo assistencial de Segurança do Paciente e Notificação de Eventos Adversos implementado e validado (`SAF-001..011`):
- Migration `0036_patient_safety_adverse_events.sql` (aditiva: tabelas `app.adverse_events`, `app.patient_isolations`, `app.adverse_event_investigations`, enums `incident_severity` e `isolation_type`, RLS `vitaloop_app`, permissões `safety.read`/`safety.report`/`safety.manage`/`safety.investigate`).
- Domínio `@vitaloop/domain` (`packages/domain/src/safety/`): 2/2 testes unitários PASS; validações de notificação de incidente e severidade RDC 36, prescrição de isolamento assistencial, eventos `AdverseEventReported`, `PatientIsolationPrescribed`, `PatientIsolationEnded`.
- API REST Fastify (`apps/api/src/routes/safety.ts`): endpoints `POST /safety/adverse-events`, `GET /safety/adverse-events`, `POST /encounters/:id/isolations`, `GET /encounters/:id/isolations`, `PATCH /isolations/:id/end` com auditoria e transação `withSecurityContext`.
- Frontend React (`apps/web`): componente `AdverseEventReportModal.tsx`, 1/1 teste de UI PASS (`AdverseEventReportModal.test.tsx`) e client `safety-api.ts`.
- Testes de integração reais (`tests/integration/safety.api.test.ts`): **11/11 PASS** contra o Supabase remoto com `vitaloop_app`.
- Bateria de qualidade e limpeza: ESLint 0 erros/avisos, Typecheck 0 erros, Monorepo build 0 erros, **0 resíduos no banco (`TEST DATA RESIDUAL: 0`)**. **GATE PASS CONFIRMADO.** Ver `docs/PHASE_6_STEP_1_REPORT.md`.

---

## 0-L. FASE 7 / ETAPA 1 DE X — CONCLUÍDA (Gestão Operacional, Dashboards em Tempo Real e Indicadores da UPA — MGT-001..010)

Módulo assistencial e operacional de Gestão e Dashboards implementado e validado (`MGT-001..010`):
- Migration `0037_operational_management_dashboards.sql` (aditiva: tabela `app.management_alerts`, view analítica `app.v_operational_summary` com `security_invoker = true`, RLS `vitaloop_app`, permissões `management.read`/`management.export`/`management.alerts`).
- Domínio `@vitaloop/domain` (`packages/domain/src/management/`): 3/3 testes unitários PASS; calculadora de TMP em horas, avaliação de KPIs do Manchester (previsto vs realizado), limiares de sobrelotação de fila e leitos.
- API REST Fastify (`apps/api/src/routes/management.ts`): endpoints `GET /management/dashboard`, `GET /management/alerts`, `POST /management/alerts/:id/acknowledge`, `GET /management/reports/export` com auditoria e transação `withSecurityContext`.
- Frontend React (`apps/web`): componente `ManagementDashboardPage.tsx`, 1/1 teste de UI PASS (`ManagementDashboardPage.test.tsx`) e client `management-api.ts`.
- Testes de integração reais (`tests/integration/management.api.test.ts`): **7/7 PASS** contra o Supabase remoto com `vitaloop_app`.
- Bateria de qualidade e limpeza: ESLint 0 erros/avisos, Typecheck 0 erros, Monorepo build 0 erros, **0 resíduos no banco (`TEST DATA RESIDUAL: 0`)**. **GATE PASS CONFIRMADO.** Ver `docs/PHASE_7_STEP_1_REPORT.md`.

---

## 0-M. FASE 8 / ETAPA 1 DE 2 — CONCLUÍDA (Faturamento SUS, Catálogo SIGTAP e Laudo de AIH — SUS-001..006)

Módulo assistencial e financeiro de Faturamento SUS e Emissão de Laudos de AIH implementado e validado (`SUS-001..006`):
- Migration `0038_sus_aih_billing.sql` (aditiva: tabelas `app.sigtap_procedures` e `app.aih_requests`, RLS `vitaloop_app`, permissões `sus.read`/`sus.issue_aih`, semente de catálogo SIGTAP).
- Domínio `@vitaloop/domain` (`packages/domain/src/sus/`): 2/2 testes unitários PASS; validações de compatibilidade SUS (Procedimento × CID-10 × Idade × Sexo do paciente), justificativa clínica e regras de emissão de laudo AIH.
- API REST Fastify (`apps/api/src/routes/sus.ts`): endpoints `GET /sus/sigtap/search`, `POST /sus/validate-compatibility`, `POST /sus/aih-requests`, `GET /sus/aih-requests/:id` com auditoria e transação `withSecurityContext`.
- Frontend React (`apps/web`): componente `AihFormModal.tsx`, 1/1 teste de UI PASS (`AihFormModal.test.tsx`) e client `sus-api.ts`.
- Testes de integração reais (`tests/integration/sus.api.test.ts`): **9/9 PASS** contra o Supabase remoto com `vitaloop_app`.
- Bateria de qualidade e limpeza: ESLint 0 erros/avisos, Typecheck 0 erros, Monorepo build 0 erros, **0 resíduos no banco (`TEST DATA RESIDUAL: 0`)**. **GATE PASS CONFIRMADO.** Ver `docs/PHASE_8_STEP_1_REPORT.md`.

---

## 0-N. FASE 8 / ETAPA 2 DE 2 — CONCLUÍDA (Regulação Médica, Transferência Externa e Fechamento de AIH — SUS-007..010)

Módulo assistencial e operacional de Regulação Médica e Transferência Inter-Hospitalar implementado e validado (`SUS-007..010`):
- Migration `0039_external_regulation_transfer.sql` (aditiva: tabelas `app.external_regulations` e `app.regulation_documents`, RLS `vitaloop_app`, permissões `regulation.read`/`regulation.manage`, colunas de fechamento em `app.aih_requests`).
- Domínio `@vitaloop/domain` (`packages/domain/src/regulation/`): 2/2 testes unitários PASS; validações de solicitação de vaga externa, destino/especialidade, máquina de estados de regulação (`requested` -> `accepted` -> `transferred`), eventos `ExternalRegulationRequested`, `ExternalRegulationStatusUpdated`.
- API REST Fastify (`apps/api/src/routes/regulation.ts`): endpoints `POST /regulation/requests`, `GET /regulation/requests`, `GET /regulation/requests/:id`, `PATCH /regulation/requests/:id/status`, `POST /sus/aih-requests/:id/close` com auditoria e transação `withSecurityContext`.
- Frontend React (`apps/web`): componente `ExternalRegulationModal.tsx`, 1/1 teste de UI PASS (`ExternalRegulationModal.test.tsx`) e client `regulation-api.ts`.
- Testes de integração reais (`tests/integration/regulation.api.test.ts`): **8/8 PASS** contra o Supabase remoto com `vitaloop_app`.
- Bateria de qualidade e limpeza: ESLint 0 erros/avisos, Typecheck 0 erros, Monorepo build 0 erros, **0 resíduos no banco (`TEST DATA RESIDUAL: 0`)**. **GATE PASS CONFIRMADO.** Ver `docs/PHASE_8_STEP_2_REPORT.md`.

**Fase 8 100% ENCERRADA E HOMOLOGADA.**

---

## 0-O. FASE 9 / ETAPA 1 DE 2 — CONCLUÍDA (Barramento FHIR R4 e Integrações de Diagnóstico — INT-001, INT-002, INT-003, INT-009)

Módulo de interoperabilidade em saúde, barramento FHIR R4 e integrações de diagnóstico LIS/RIS/PACS implementado e validado (`INT-001`, `INT-002`, `INT-003`, `INT-009`):
- Migration `0040_interoperability_fhir_hl7.sql` (aditiva: tabelas `app.integration_messages`, `app.fhir_resources`, `app.dicom_studies`, RLS `vitaloop_app`, permissões `integration.read`/`integration.write`).
- Domínio `@vitaloop/domain` (`packages/domain/src/integration/`): 4/4 testes unitários PASS; parsers de mensagens HL7 v2 (ORU_R01 laudos laboratoriais, ORM_O01 pedidos radiológicos RIS) e mapeadores de recursos FHIR R4 (`Patient`, `Encounter`).
- API REST Fastify (`apps/api/src/routes/integration.ts`): endpoints FHIR R4 (`GET /fhir/R4/Patient/:id`, `GET /fhir/R4/Encounter/:id`), receptores HL7 (`POST /integration/hl7/oru`, `POST /integration/hl7/orm`), metadados DICOM PACS (`POST /integration/dicom/wado`) e consulta de barramento (`GET /integration/messages`) com auditoria e transação `withSecurityContext`.
- Frontend React (`apps/web`): componente `InteroperabilityDashboardPage.tsx`, 1/1 teste de UI PASS (`InteroperabilityDashboardPage.test.tsx`) e client `integration-api.ts`.
- Testes de integração reais (`tests/integration/integration.api.test.ts`): **9/9 PASS** contra o Supabase remoto com `vitaloop_app`. Regressão global monorepo: **498/498 PASS (100%)**.
- Bateria de qualidade e limpeza: ESLint 0 erros/avisos, Typecheck 0 erros, Monorepo build 0 erros, **0 resíduos no banco (`TEST DATA RESIDUAL: 0`)**. **GATE PASS CONFIRMADO.** Ver `docs/PHASE_9_STEP_1_REPORT.md`.

---

## 0-P. FASE 9 / ETAPA 2 DE 2 — CONCLUÍDA (Farmácia Central, SISREG/CROSS, RNDS/DATASUS, Lote AIH e Identidade Institucional — INT-004..008)

Módulo de dispensação eletrônica de farmácia, integração de regulação, conectividade RNDS via FHIR Bundle, exportação de lote de AIH e autenticação federada corporativa implementado e validado (`INT-004..008`):
- Migration `0041_pharmacy_rnds_identity_integration.sql` (aditiva: tabelas `app.pharmacy_dispensations`, `app.aih_export_batches`, `app.identity_providers`, RLS `vitaloop_app`, permissões `integration.read`/`integration.write`/`sus.issue_aih`).
- Domínio `@vitaloop/domain` (`packages/domain/src/integration/`): 4/4 testes unitários PASS; validação de itens de dispensação, gerador de lote de AIH elegíveis, construtor de FHIR Bundle para RNDS/DATASUS e validador de IdP corporativo.
- API REST Fastify (`apps/api/src/routes/integration.ts`): endpoints `POST /integration/pharmacy/dispense`, `POST /integration/rnds/send-bundle`, `POST /sus/aih-batches/export`, `POST /auth/federated/config` com auditoria e transação `withSecurityContext`.
- Frontend React (`apps/web`): componente `InteroperabilityStep2Panel.tsx`, 1/1 teste de UI PASS (`InteroperabilityStep2Panel.test.tsx`) e client `integration-api.ts`.
- Testes de integração reais (`tests/integration/integration-step2.api.test.ts`): **7/7 PASS** contra o Supabase remoto com `vitaloop_app`. Regressão global monorepo: **510/510 PASS (100%)**.
- Bateria de qualidade e limpeza: ESLint 0 erros/avisos, Typecheck 0 erros, Monorepo build 0 erros, **0 resíduos no banco (`TEST DATA RESIDUAL: 0`)**. **GATE PASS CONFIRMADO.** Ver `docs/PHASE_9_STEP_2_REPORT.md`.

---

## 0-Q. FASE 10 / ETAPA 1 DE 2 — CONCLUÍDA (Hardening Técnico de Segurança — SEC-T-001..011)

Hardening técnico de segurança, proteção IDOR/BOLA, prevenção de bypass RLS/RBAC, sanitização XSS/SQLi, CORS restritivo, headers HTTP de segurança, redação de secrets e logs mascarados implementado e validado (`SEC-T-001..011`):
- Migration `0042_security_hardening.sql` (aditiva: tabela `app.security_event_logs`, RLS `vitaloop_app`, permissões `security.read`/`security.write`).
- Domínio `@vitaloop/domain` (`packages/domain/src/security/`): 4/4 testes unitários PASS; escape HTML XSS, detecção de padrões SQLi, validação de escopo IDOR e mascarador de logs com redação de secrets e máscara CPF.
- API REST Fastify (`apps/api/src/routes/security.ts`): endpoints `GET /security/hardening-status`, `POST /security/events`, middleware HSTS, CSP, X-Content-Type-Options e CORS restritivo com auditoria e transação `withSecurityContext`.
- Frontend React (`apps/web`): componente `SecurityHardeningPanel.tsx`, 1/1 teste de UI PASS (`SecurityHardeningPanel.test.tsx`) e client `security-api.ts`.
- Testes de integração reais (`tests/integration/security-hardening.api.test.ts`): **8/8 PASS** contra o Supabase remoto com `vitaloop_app`. Regressão global monorepo: **518/518 PASS (100%)**.
- Bateria de qualidade e limpeza: ESLint 0 erros/avisos, Typecheck 0 erros, Monorepo build 0 erros, **0 resíduos no banco (`TEST DATA RESIDUAL: 0`)**. **GATE PASS CONFIRMADO.** Ver `docs/PHASE_10_STEP_1_REPORT.md`.

---

## 0-R. FASE 10 / ETAPA 2 DE 2 — CONCLUÍDA (Proteção de Dados, Direitos do Titular LGPD, Retenção e Auditoria — SEC-T-012..016)

Mecanismos de proteção de dados sensíveis, minimização de respostas de API, transparência LGPD (Art. 18), políticas de retenção legal assistencial do prontuário (20 anos) e auditoria imutável append-only implementado e validado (`SEC-T-012..016`):
- Migration `0043_lgpd_data_rights_retention.sql` (aditiva: tabelas `app.lgpd_data_requests`, `app.data_retention_policies`, RLS `vitaloop_app`, permissões `lgpd.export`/`lgpd.manage_retention`).
- Domínio `@vitaloop/domain` (`packages/domain/src/security/`): 2/2 testes unitários PASS (`lgpd.test.ts`); gerador de extrato LGPD de dados pessoais com CPF mascarado (`123.***.***-00`), hash de integridade SHA256 e validador de retenção assistencial de 20 anos (Lei 13.787/2018).
- API REST Fastify (`apps/api/src/routes/security.ts`): endpoints `POST /lgpd/patients/:id/export` e `GET /lgpd/retention-policies` com auditoria e transação `withSecurityContext`.
- Frontend React (`apps/web`): componente `LgpdPrivacyPanel.tsx`, 1/1 teste de UI PASS (`LgpdPrivacyPanel.test.tsx`) e client `security-api.ts`.
- Testes de integração reais (`tests/integration/lgpd.api.test.ts`): **6/6 PASS** contra o Supabase remoto com `vitaloop_app`. Regressão global monorepo: **527/527 PASS (100%)**.
- Bateria de qualidade e limpeza: ESLint 0 erros/avisos, Typecheck 0 erros, Monorepo build 0 erros, **0 resíduos no banco (`TEST DATA RESIDUAL: 0`)**. **GATE PASS CONFIRMADO.** Ver `docs/PHASE_10_STEP_2_REPORT.md`.

---

## 0-S. FASE 11 / ETAPA 1 DE 2 — CONCLUÍDA (Qualidade Técnica, Concorrência, E2E, Impressão PDF e Acessibilidade — QLT-001..010, QLT-014..015)

Suíte global de qualidade técnica, testes E2E assistenciais completos de ponta-a-ponta, simulação de concorrência e trava otimista, leiaute de impressão PDF de documentos clínicos com checksum de integridade e auditoria de acessibilidade ARIA frontend implementado e validado (`QLT-001..010`, `QLT-014..015`):
- Banco de Dados: **Migration NÃO CRIADA** / **Supabase NÃO ALTERADO** (estruturas existentes das Fases 0 a 10 reutilizadas).
- Domínio `@vitaloop/domain` (`packages/domain/src/quality/`): 3/3 testes unitários PASS (`quality.test.ts`); validador de concorrência com trava otimista, gerador de leiaute de impressão PDF de laudos assistenciais e auditor de acessibilidade ARIA.
- API REST Fastify (`apps/api/src/routes/quality.ts`): endpoints `POST /quality/documents/:id/print` e `POST /quality/simulate-concurrency` sob `requirePermission`, `withSecurityContext` e auditoria `auditAction`.
- Frontend React (`apps/web`): componente `QualityAccessibilityDashboard.tsx`, 1/1 teste de UI PASS (`QualityAccessibilityDashboard.test.tsx`) e client `quality-api.ts`.
- Testes de integração reais & E2E (`tests/integration/quality-e2e.api.test.ts`): **5/5 PASS** contra o Supabase remoto com `vitaloop_app`. Regressão global monorepo: **533/533 PASS (100%)**.
- Bateria de qualidade e limpeza: ESLint 0 erros/avisos, Typecheck 0 erros, Monorepo build 0 erros, **0 resíduos no banco (`TEST DATA RESIDUAL: 0`)**. **GATE PASS CONFIRMADO.** Ver `docs/PHASE_11_STEP_1_REPORT.md`.

---

## 0-T. FASE 11 / ETAPA 2 DE 2 — CONCLUÍDA (Disaster Recovery, Backup e Restore — QLT-011..013)

Mecanismos institucionais de execução e verificação de backups lógicos, validação de integridade de restore pós-restauração, simulação de Disaster Recovery com failover, parâmetros RPO (15 min) e RTO (60 min) implementado e validado (`QLT-011..013`):
- Migration `0044_disaster_recovery_backup_audit.sql` (aditiva: tabela `app.backup_restore_jobs`, RLS `vitaloop_app`, permissões `backup.manage`).
- Domínio `@vitaloop/domain` (`packages/domain/src/quality/`): 2/2 testes unitários PASS (`dr.test.ts`); executor de jobs de backup com metadados RPO/RTO e validador de integridade de hash pós-restore.
- API REST Fastify (`apps/api/src/routes/quality.ts`): endpoints `POST /quality/backup-restore/execute` e `GET /quality/backup-restore/jobs` sob `requirePermission`, `withSecurityContext` e auditoria `auditAction`.
- Frontend React (`apps/web`): componente `DisasterRecoveryPanel.tsx`, 1/1 teste de UI PASS (`DisasterRecoveryPanel.test.tsx`) e client `quality-api.ts`.
- Testes de integração reais (`tests/integration/dr.api.test.ts`): **6/6 PASS** contra o Supabase remoto com `vitaloop_app`. Regressão global monorepo: **541/541 PASS (100%)**.
- Bateria de qualidade e limpeza: ESLint 0 erros/avisos, Typecheck 0 erros, Monorepo build 0 erros, **0 resíduos no banco (`TEST DATA RESIDUAL: 0`)**. **GATE PASS CONFIRMADO.** Ver `docs/PHASE_11_STEP_2_REPORT.md`.

---

## 0-U. FASE 12 / ETAPA 1 DE 2 — CONCLUÍDA (Produção, DevOps, Containerização & Healthchecks — PRD-001..010)

Arquitetura de produção e DevOps, containerização multi-stage (API Fastify & NGINX Web), `docker-compose.prod.yml`, validação estrita de envvars e secrets em produção (`@vitaloop/config`), CORS de produção restritivo, healthchecks (`/health`, `/ready`), validador da pipeline de migrations (0001..0044) e rotinas de backup/restore de produção implementado e validado (`PRD-001..010`):
- Banco de Dados: **Migration NÃO CRIADA** / **Supabase NÃO ALTERADO** (estruturas existentes das Fases 0 a 11 reutilizadas).
- DevOps & Config: `docker/Dockerfile.web`, `docker/docker-compose.prod.yml`, `validateProductionEnv` em `@vitaloop/config` (`env.ts`).
- Domínio `@vitaloop/domain` (`packages/domain/src/quality/`): 4/4 testes unitários PASS (`quality.test.ts`); validador da pipeline de migrations e segurança de rollback.
- API REST Fastify (`apps/api/src/routes/health.ts`): endpoints `/health`, `/ready`, `/api/v1/health` e `/api/v1/ready`.
- Testes de integração reais & DevOps (`tests/integration/prd-step1.api.test.ts`): **4/4 PASS** contra o Supabase remoto com `vitaloop_app`. Regressão global monorepo: **545/545 PASS (100%)**.
- Bateria de qualidade e limpeza: ESLint 0 erros/avisos, Typecheck 0 erros, Monorepo build 0 erros, **0 resíduos no banco (`TEST DATA RESIDUAL: 0`)**. **GATE PASS CONFIRMADO.** Ver `docs/PHASE_12_STEP_1_REPORT.md`.

---

## 0-V. FASE 12 / ETAPA 2 DE 2 — CONCLUÍDA (Observabilidade, Métricas, Logs Estruturados, Correlation ID & DR Ambiental — PRD-011..020)

Mecanismos de observabilidade avançada, telemetria e métricas operacionais, logs estruturados JSON sanitizados (sem CPF ou secrets), propagação de correlation ID (`X-Request-Id`) e status de Disaster Recovery ambiental implementado e validado (`PRD-011..020`):
- Migration `0045_observability_metrics_audit.sql` (aditiva: tabela `app.system_metrics`, RLS `vitaloop_app`, permissões `observability.read`/`observability.manage`).
- Domínio `@vitaloop/domain` (`packages/domain/src/quality/`): 4/4 testes unitários PASS (`observability.test.ts`); construtor de logs estruturados JSON, sanitização de secrets/CPF, validador de correlation ID e telemetria de saúde.
- API REST Fastify (`apps/api/src/routes/observability.ts`): endpoints `POST /observability/metrics`, `GET /observability/metrics` e `GET /observability/dr-status` sob `requirePermission`, `withSecurityContext` e auditoria `auditAction`.
- Frontend React (`apps/web`): componente `ObservabilityDashboard.tsx`, 1/1 teste de UI PASS (`ObservabilityDashboard.test.tsx`) e client `observability-api.ts`.
- Testes de integração reais (`tests/integration/prd-step2.api.test.ts`): **6/6 PASS** contra o Supabase remoto com `vitaloop_app`. Regressão global monorepo: **551/551 PASS (100%)**.
- Bateria de qualidade e limpeza: ESLint 0 erros/avisos, Typecheck 0 erros, Monorepo build 0 erros, **0 resíduos no banco (`TEST DATA RESIDUAL: 0`)**. **GATE PASS CONFIRMADO.** Ver `docs/PHASE_12_STEP_2_REPORT.md`.

---

## 0-W. FASE 13 — HOMOLOGAÇÃO FINAL & GO-LIVE — CONCLUÍDA (`HOM-001..014`)

Homologação final técnica, funcional, assistencial, de segurança, interoperabilidade, infraestrutura e operação do VITALOOP v1.3 auditada, testada e confirmada (`HOM-001..014`):
- Suíte E2E de Homologação Final (`tests/integration/homologation-e2e.api.test.ts`): **5/5 PASS** contra o Supabase remoto com `vitaloop_app`.
- Regressão Global do Monorepo: **542/542 PASS (100%)** em 66 suítes de teste (207 unitários de domínio, 6 de config, 60 UI e 269 de integração remota).
- Bateria de qualidade e limpeza: ESLint 0 erros/avisos, Typecheck 0 erros, Monorepo build 0 erros, **0 resíduos no banco (`TEST DATA RESIDUAL: 0`)**.
- **GATE PASS CONFIRMADO — SISTEMA 100% PRONTO PARA PRODUÇÃO (`GO-LIVE READY`).** Ver `docs/PHASE_13_FINAL_HOMOLOGATION_REPORT.md`.

**Fase 13 100% ENCERRADA E HOMOLOGADA (`HOM-001..014`). VITALOOP v1.3 CONCLUÍDO.**

**Achado de segurança relevante para o projeto inteiro (não apenas Fase 2):** a conexão
real da API sempre autenticou no Postgres como `postgres` (`rolbypassrls=true`),
portanto **RLS nunca foi de fato aplicada por nenhuma requisição real da aplicação**,
em nenhuma fase, incluindo a Fase 1 já homologada — a proteção real sempre foi apenas a
camada HTTP. Causa: um papel dedicado `vitaloop_app` já existia desde a Fase 0
(migration 0010), propositalmente `NOLOGIN`, com pendência documentada no próprio
código-fonte ("PENDENTE; ajustar na etapa de configuração do Supabase") nunca
concluída. Corrigido nesta rodada: `vitaloop_app` ativado (migration 0021), papel de
desvio `app_api` (migration 0020) aposentado. RLS real (SELECT/INSERT, deny/allow)
retestada e confirmada com conexão genuína como `vitaloop_app` — ver detalhamento
completo em `docs/PHASE_2_STEP_1_REPORT.md` §1-6. **A homologação da Fase 1 não é
revogada nem reescrita** — suas evidências permanecem válidas quanto ao que testaram
(funções SQL via identidade real); a lacuna específica (conexão de aplicação vs. RLS)
não estava coberta e agora está, para o schema inteiro.

Ver `docs/PHASE_2_STEP_1_REPORT.md` (relatório técnico completo) e
`docs/TRACEABILITY_PHASE_2.md` (matriz PAT-001..017) para o fechamento documental
integral desta rodada.

---

## 1. Identificação

- **Projeto:** VITALOOP-v1.3 O FIM
- **Construção:** DO ZERO (sem inventário/migração/inspeção/reutilização de qualquer versão anterior)
- **Caminho local:** `C:\Users\Marcus Costa\Desktop\MEUS PROJEOS\Vitaloop-v1.3 O FIM`
- **Repositório GitHub oficial (único autorizado):** https://github.com/myscosta8-ctrl/VITALOOP-v1.3.git
- **Fonte de verdade:** os 4 documentos oficiais + instruções diretas do usuário
- **Data de referência deste registro:** 2026-08-19

---

## 2. Fonte de verdade (hierarquia de autoridade)

0. Instrução direta do usuário (prevalece)
1. Documento 1 — Blueprint Funcional e Clínico
2. Documento 2 — Blueprint Técnico
3. Documento 3 — Matriz de Rastreabilidade, Implementação, Testes e Homologação
4. Documento 4 — Protocolo de Execução e Governança

> Regra de escopo vigente: as referências dos documentos a **inventário, inspeção,
> migração, comparação ou reutilização do v1.2** são **NÃO APLICÁVEIS** a este projeto.

---

## 3. Status do Git (local)

- `.git`: **inicializado nesta pasta** (Fase 0B)
- Branch inicial: **main**
- Remote `origin`: `https://github.com/myscosta8-ctrl/VITALOOP-v1.3.git` (único)
- Push: **NÃO realizado** (aguardando autorização explícita)
- Pull / Fetch / Merge / Rebase: **NÃO realizados**
- Conteúdo importado de outro repositório: **NENHUM**
- Commits: **nenhum ainda** (aguardando sua autorização para o primeiro commit/push)
- Verificação de integridade (só leitura) ao final da rodada de fechamento documental da
  Fase 2/Etapa 1 (2026-08-20): `git status --short` confirma todos os arquivos como não
  rastreados (`??`), nenhuma alteração destrutiva; `git log` confirma "does not have any
  commits yet" — consistente com o estado desde o início do projeto. Nenhuma ação de
  `add`/`commit`/`push`/`pull`/`fetch`/`merge`/`rebase` foi executada nesta rodada.

---

## 4. Status do Supabase

**SUPABASE — CONFIGURADO E VALIDADO (Fase 0 + Fase 1).**

- Projeto oficial: `ovwqbmmsppkeekhsnrbv` (name: VITALOOP-v1.3), host
  `db.ovwqbmmsppkeekhsnrbv.supabase.co`, região us-east-2, Postgres 17.6.
- Conexão realizada via Supabase MCP autenticado (sem manuseio/exposição de senha).
- Migrations `0001`–`0023` aplicadas e registradas. `0023`: correção do bypass total
  de RLS via views de timeline (`security_invoker=true`) — ver §0-A abaixo. `0001`–`0016`: fundação (Fase 0/1).
  `0017`–`0018`: schema de pacientes (Fase 2/Etapa 1). `0019`: correção de design da
  detecção de duplicidade (remoção de UNIQUE rígido de CPF/CNS). `0020`: tentativa
  inicial de papel de conexão sem BYPASSRLS (desvio de rota, revertida). `0021`:
  correção real — ativação do papel `vitaloop_app` (existente desde a Fase 0) e
  aposentadoria de `0020`/`app_api`. `0022`: grant de SELECT em
  `app.timeline`/`app.patient_timeline` para `vitaloop_app` (Etapa 4/6 — gap de
  integração da timeline do paciente). Ver `docs/PHASE_2_STEP_1_REPORT.md` e
  `docs/PHASE_2_STEP_4_REPORT.md`.
- RLS, RBAC, Need-to-Know, break-glass, auditoria append-only, eventos, timeline,
  idempotência, brute-force lockout e transações validados por SQL real (ver
  `docs/PHASE_0_REPORT.md` e `docs/PHASE_1_REPORT.md`).
- **Papel de conexão real da aplicação: `vitaloop_app`** (não `postgres` — ver achado de
  segurança em `docs/PHASE_2_STEP_1_REPORT.md` §1-3: `postgres` tem `rolbypassrls=true`
  e nunca aplicou RLS de fato). RLS real retestada com `vitaloop_app` nesta rodada:
  SELECT e INSERT, deny/allow, todos PASS.
- Advisors de segurança do Supabase: **0 alertas** (após migrations 0012, 0018, e
  reverificação ao final de cada rodada, incluindo esta — 0019/0020/0021).
- **Supabase Auth (GoTrue) configurado e validado**: login/logout/recuperação de senha
  reais testados via HTTP contra o projeto oficial, incluindo através da nossa própria
  API (ADR-0003). JWT assinado com ES256; verificação via JWKS público — **sem segredo
  compartilhado**.
- Nenhuma credencial de qualquer outro projeto foi utilizada ou procurada.
- Storage/Realtime do Supabase: ainda **NÃO** configurados (fora do escopo desta fase).

---

## 5. Decisões CONFIRMADAS

- Projeto: VITALOOP-v1.3 O FIM
- Construção: DO ZERO
- Fonte de verdade: 4 documentos oficiais + instruções diretas
- Banco/plataforma prevista: **SUPABASE** (ainda não configurado)
- PostgreSQL: SIM, através do Supabase
- RLS: obrigatório
- RBAC: obrigatório
- Auditoria: obrigatória
- Timeline: obrigatória
- Máquina de estados: obrigatória
- Eventos de domínio: obrigatórios
- Idempotência: obrigatória
- Controle de concorrência: obrigatório
- Testes: obrigatórios
- Rastreabilidade: obrigatória
- GitHub oficial: https://github.com/myscosta8-ctrl/VITALOOP-v1.3.git

---

## 6. Decisões PENDENTES (dependem de definição do usuário)

Institucional / clínico / jurídico / operacional — **não inventar**:

- política institucional de identidade (provedor Supabase Auth adotado tecnicamente
  via ADR-0003; política de senha/MFA institucional segue pendente)
- matriz definitiva de perfis
- permissões definitivas
- regras institucionais de break-glass (duração/quem pode — estrutura técnica pronta,
  baseline de 60 min parametrizável em `app.security_settings`)
- política de necessidade de saber por paciente/atendimento (infraestrutura genérica
  pronta — `app.access_assignments`; escopamento clínico aguarda fases 2+)
- protocolo de classificação de risco
- uso e versão do Manchester
- regras AIH / SUS / SIGTAP
- política de assinatura eletrônica
- política de retenção documental
- RPO
- RTO
- política institucional de backup
- requisitos institucionais de disaster recovery
- integrações externas efetivamente disponíveis
- demais itens da Matriz de Decisões (Fase 0A) marcados como dependentes do usuário

> As recomendações técnicas da Fase 0A **não** foram convertidas em decisões.
> Detalhes técnicos (stack, arquitetura, etc.) permanecem aguardando aprovação.

---

## 7. Estágio atual

**FASE 0 — VALIDADA. FASE 1 — Identidade e Segurança: TECNICAMENTE FECHADA E
PRONTA PARA HOMOLOGAÇÃO — AGUARDANDO HOMOLOGAÇÃO FORMAL do usuário.**

**Fechamento final (última rodada):** teste de idempotência pré-existente corrigido
(vinculação de `actor_user_id` real — só o teste, nenhuma regra de produção alterada);
suíte completa **53/53, 0 FAIL, 0 SKIP** confirmado em 2 execuções consecutivas com
banco real; `BreakGlassPage` testada de ponta a ponta no navegador (autorização 201,
negação 403, auditoria confirmada por SQL); Teste G (profissão/vínculo) mantido
`PENDENTE DE DECISÃO INSTITUCIONAL`, nada implementado; nenhuma migration tocada;
advisors 0 alertas; dados de teste removidos; `DATABASE_URL` removida do `.env`.

Ver `docs/PHASE_1_CLOSEOUT_DOCUMENTAL.md` para o fechamento documental completo e sua
seção H-2/H-3 (microfechamento técnico e fechamento final). A matriz
`docs/TRACEABILITY_PHASE_1.md` foi revisada em três rodadas: (1) correção de
superclassificações via leitura de código; (2) microfechamento técnico com
`DATABASE_URL` real fornecida transitoriamente pelo usuário (nunca commitada, removida
ao final), que permitiu executar a API completa (Auth+banco) pela primeira vez.

**Nesta última rodada:** 6 de 7 pendências técnicas fechadas com PASS real via HTTP
(requirePermission, JWT expirado, alteração de senha, sessão institucional, `/ready`
com banco, break-glass); 1 permanece corretamente `PENDENTE DE DECISÃO INSTITUCIONAL`
(profissão/vínculo no RBAC). **Dois bugs reais foram encontrados e corrigidos:**
(a) `requireAuth` travava toda requisição autenticada (bug crítico de disponibilidade,
Fastify preHandler síncrono sem sinal de conclusão); (b) sessão revogada continuava
sendo aceita pela API (achado real de segurança — JWT é stateless e não checávamos
`app.sessions`). Ambos corrigidos minimamente, revalidados com evidência HTTP real.
Suíte final: 52 passed / 1 failed (defeito real em teste pré-existente de Fase 0,
fora do escopo desta rodada) / 0 skipped. Advisors: 0 alertas.

### Fase 0 (fundação) — ver `docs/PHASE_0_REPORT.md` / `docs/TRACEABILITY_PHASE_0.md`
Monorepo, `packages/{shared,domain,config}`, `apps/api` transversal, migrations
0001–0012, RLS/RBAC base, auditoria append-only, eventos, timeline, idempotência,
CI/CD, Docker (infra), backup/restore/DR documentado. Validada contra o Supabase
oficial (RLS, auditoria, timeline, idempotência, advisors 0 alertas).

### Fase 1 (identidade e segurança) — ver `docs/PHASE_1_REPORT.md` / `docs/TRACEABILITY_PHASE_1.md`
- **Autenticação real via Supabase Auth** (ADR-0003): login/logout/recuperação/alteração
  de senha, proxied pela nossa API (`apps/api/src/routes/auth.ts`), testados end-to-end
  com HTTP real contra o projeto oficial.
- **Verificação de JWT sem segredo compartilhado** (ES256 + JWKS público) —
  `apps/api/src/security/jwt-verifier.ts`.
- **Identidade institucional separada da credencial** (Doc 4 §7/§15): `app.users`,
  `app.resolve_app_identity`, provisionamento automático sem papéis (deny-by-default).
- **RBAC granular + Need-to-Know genérico**: `app.has_permission`, `app.can_access`,
  `app.authorize` (migrations 0013/0016), com testes SQL reais (permitir/negar,
  escopo vinculado/não vinculado, break-glass sobrepondo).
- **Break-glass real**: `app.activate_break_glass` — testado, gera registro +
  auditoria vinculada (severidade `warning`), duração parametrizável.
- **Rate limiting + brute-force lockout**: limiter em memória na API + `app.is_locked_out`
  persistido no banco — ambos testados com comportamento real (5 tentativas → bloqueio).
- **`/ready` real**: checa banco e Supabase Auth (JWKS) de verdade, com timeout e sem
  vazar segredos; testado nos três estados (ok / not_configured / down → 503).
- **Frontend mínimo** (`apps/web`, React+Vite): login, perfil/vínculo, recuperação e
  alteração de senha, acesso negado, break-glass — testado no navegador contra a API
  real (login real, recuperação real, acesso negado real).
- **Concorrência real**: duas sessões Postgres independentes disputando a mesma chave
  de idempotência — vencedora única, perdedora com `unique_violation`, sem duplicação.

Todas as validações usaram dados de teste claramente identificados, sempre limpos ao
final (rollback ou exclusão/desativação lógica). Nenhum resíduo de teste em tabelas de
negócio; um registro de auditoria de teste permanece **por design** (append-only —
essa é exatamente a garantia comprovada) com ator desvinculado.

### Fechamento técnico (rodada de encerramento) — ver `docs/PHASE_1_REPORT.md` §42-A

- **Teste E2E real**: PASS. Login real (nossa API → Supabase Auth) → JWT verificado
  com nosso próprio código (JWKS real) → identidade institucional real → RBAC+NTK
  combinados (`authorize`) com as 3 variantes corretas → auditoria gravada. Ressalva:
  os passos de banco foram exercitados via SQL direto (mesma identidade real), não
  dentro do processo Fastify com `pg.Pool` simultâneo — ver NOT RUN abaixo.
- **Revogação de sessão**: PASS. Logout real via nossa API; o mesmo token, usado depois
  contra o Supabase, passou de 200 para **403 `session_not_found`** — revogação real do
  lado do servidor, não só descarte no cliente. `app.sessions` também revogada.
- **`/ready` real**: PASS para Auth (ok/down, checagem de rede genuína). NOT RUN para
  banco conectado simultaneamente (mesmo motivo abaixo).
- **Concorrência real**: PASS quanto às garantias de correção — corrida de idempotência
  (duas sessões reais, uma venceu, outra `unique_violation`) e atualização concorrente
  sem perda (`FOR UPDATE`, valor final correto). Sobreposição temporal exata entre as
  duas sessões **não pôde ser comprovada** com o transporte disponível — registrado
  com honestidade, sem simular o resultado.

### Itens NÃO executados (honestamente registrados, não bloqueantes)
- Qualquer cenário exigindo `DATABASE_URL`/senha de Postgres **dentro do processo da
  API rodando simultaneamente com a autenticação** (identidade institucional via HTTP,
  `/ready` com banco, sessão revogada consultada pela própria API) — este ambiente não
  possui credencial de conexão direta ao Postgres, apenas acesso administrativo via
  Supabase MCP. Não é apropriado que o código de produção troque sua camada `pg` por
  chamadas ao MCP (ferramenta administrativa, não dependência de runtime). Fica
  registrado como decisão do usuário: fornecer `DATABASE_URL` fecharia este último
  ponto, se desejado.
- Comprovação de sobreposição temporal exata (simultaneidade) entre duas sessões
  concorrentes — o transporte de ferramenta disponível não garante nem permite
  verificar dispatch paralelo real; a garantia de correção (sem duplicação/perda) foi
  validada com duas sessões genuinamente independentes.

---

## 8. Próxima etapa autorizada

**Aguardando autorização explícita do usuário** para: (a) primeiro commit/push ao GitHub;
(b) configuração de Storage/Realtime do Supabase; (c) definição das decisões institucionais
pendentes; (d) início da FASE 2.

Não iniciar a Fase 2 automaticamente. Não fazer push sem autorização.
