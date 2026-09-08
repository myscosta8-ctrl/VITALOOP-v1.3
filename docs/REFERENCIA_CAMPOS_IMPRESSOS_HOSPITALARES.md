# Referência de campos — impressos hospitalares (fonte: pasta `pdfs_exemplo`, excluída)

Extraído de 18 PDFs reais fornecidos pelo usuário (fichas oficiais da UPA 24h Breves /
Prefeitura Municipal de Breves — SEMSA, mais um laudo padrão SUS/Ministério da Saúde),
todos preenchidos com dados de paciente real. Este documento preserva **apenas a
estrutura de campos** de cada impresso — nenhum nome, CPF, CNS, endereço, telefone ou
dado clínico real foi copiado pra cá. A pasta de origem (`pdfs_exemplo/`) foi apagada
depois desta extração, a pedido do usuário — este arquivo é a única referência restante.

Layout/design dos PDFs originais não importa pro Vitaloop (confirmado pelo usuário) — o
que importa é a *informação* que cada campo representa, pra decidir o que capturar nas
telas nativas do sistema.

---

## Padrão de cabeçalho comum (vale pra quase todo impresso de internação/enfermaria)

Nº prontuário · Nº registro · data/hora de internação · data/hora de alta · nome do
paciente · classificação de risco (cor) · nome da mãe · nacionalidade · convênio · sexo
· data de nascimento · idade · raça/cor · RG · CPF · CNS · telefone · endereço completo
· tipo de recepção · caráter do atendimento · leito · quarto · unidade/setor.

Isso bate com os campos de identificação que o Vitaloop já captura no cadastro do
paciente/encontro — confirma que aquele modelo já está alinhado com o padrão hospitalar
real.

---

## 1. AIH — Laudo para Autorização de Internação Hospitalar
*O original correto da UPA Breves já foi fornecido em sessão anterior; o exemplar desta
pasta serviu só de comparação de campos extras.*

Campos: nome do paciente, data de nascimento, sexo, raça/cor, nome da mãe, endereço
completo, município + UF + CEP, história da doença atual (texto longo), estado geral na
admissão (texto clínico), diagnóstico com CID-10, procedimento solicitado + código,
clínica/especialidade, caráter da internação, nome e CRM do médico solicitante, data da
solicitação, número de autorização.

**✅ Implementado** (2026-09-07): dados de identificação do paciente já cobertos pelo
módulo de paciente/encontro (não duplicados aqui). Procedimento SIGTAP + CID-10 +
justificativa clínica continuam como campos próprios do `AihFormModal`, com a validação
de compatibilidade SUS (idade/sexo/CID vs. tabela SIGTAP) que já existia — não foi
substituída. Os campos que faltavam (história da doença atual, estado geral na
admissão, clínica/especialidade, caráter da internação, nome/CRM do médico solicitante,
data da solicitação, número de autorização opcional) foram adicionados via o mesmo
motor de schema genérico (`@vitaloop/domain`'s `clinical-forms`,
`sus/aih-clinical-schema.ts`), renderizados dentro do `AihFormModal` via
`DynamicClinicalForm` e persistidos em `app.aih_requests.form_fields` (migration 0053).
Rota `GET /api/v1/sus/aih-clinical-fields-schema` + validação server-side na criação do
laudo (`POST /api/v1/sus/aih-requests`).

**✅ Fluxo de autorização em duas etapas** (2026-09-07): `numero_autorizacao` foi MOVIDO
pra fora do formulário de criação — quem solicita não preenche mais esse campo. Novo
schema `AIH_AUTHORIZATION_FIELDS_SCHEMA` (profissional autorizador, número e data da
autorização), nova permissão `sus.authorize_aih` (distinta de `sus.issue_aih`,
migration 0064), nova rota `POST /api/v1/sus/aih-requests/:id/authorize` que transiciona
o laudo pro status `authorized`. Tela `SusAuthorizationPanel` (botão "Autorizar
AIH/APAC (regulação/auditoria)" na aba "Solicitações Médicas" da tela de ações).

---

## 2. Solicitação de Sangue, Componentes e Derivados (prioridade do usuário)

**✅ Implementado** (2026-09-07): tela nativa (`BloodProductRequestModal`, botão
"Solicitar sangue/componentes/derivados" na tela de ações do atendimento), rota
`/api/v1/hemotherapy/blood-product-requests` com validação, tabela
`app.blood_product_requests` (migration 0051). Motor de schema genérico
(`@vitaloop/domain`'s módulo `clinical-forms`) generalizado a partir do trabalho do
SINAN pra servir esta e futuras telas do tipo.

**Cabeçalho**: paciente, data de nascimento, sexo, peso, HB/HT, hospital, apartamento,
enfermaria/leito, registro hospitalar, categoria, recebeu transfusão antes (sim/não +
quando + onde), antecedentes de anticorpo irregular (sim/não), solicitou doadores,
indicação clínica/cirurgia proposta (texto).

**Tabela de hemocomponentes/hemoderivados** (cada linha = item + quantidade a solicitar):
- Concentrado de hemácias (+300ml/unid)
- Concentrado de hemácias pobre em leucócitos (+300ml/unid)
- Concentrado de hemácias pobre em leucócitos irradiado (+300ml/unid)
- Plasma fresco congelado (+200ml/unid)
- Concentrado de plaquetas pobre em leucócitos (+60ml/unid)
- Concentrado de plaquetas pobre em leucócitos irradiado (+60ml/unid)
- Concentrado de plaquetas por aférese (+300ml/unid)
- Crioprecipitado (+20ml/unid)
- Outros (texto livre)

**Classificação de urgência** (escolha única):
- Urgência — realizar em até 3 horas
- Não urgente (rotina) — realizar em até 24 horas
- Programada — cirurgia eletiva (data+hora) OU transfusão ambulatorial (data+hora)
- Transfusão em residência (exige Termo de Responsabilidade)
- Auto-transfusão

**Transfusão de extrema urgência**: campo de autorização (sem testes pré-transfusionais,
por risco de vida) + médico solicitante + data/hora + coletado por + data/hora.

**Assinatura**: médico solicitante + CRM + data.

**Fora do escopo da tela do profissional**: seção "uso exclusivo da Fundação Hemopa"
(tabela data/produto/G.S./volume/coleta/tubo/resultado/hora/técnico) e campos
PAI (Pesquisa de Anticorpos Irregulares) I/II, AC, CD — são preenchidos pelo banco de
sangue depois de a solicitação chegar lá, não pelo profissional da UPA.

**No Vitaloop hoje**: não existe nenhuma tela, tabela ou rota pra isso.

---

## 3. Formulário Antimicrobiano — ATM (prioridade do usuário)

**✅ Implementado** (2026-09-07): tela nativa (`AntimicrobialRequestModal`, botão
"Solicitar antimicrobiano de uso restrito (ATM)" na tela de ações do atendimento), rota
`/api/v1/pharmacy-atm/antimicrobial-requests`, tabela `app.antimicrobial_requests`
(migration 0052). Campo "Medicamento" evoluído de texto livre pra código fechado com os
8 antibióticos de uso restrito do impresso (evita nome divergente na farmácia). Parecer
do farmacêutico capturado no mesmo formulário por enquanto — não há tela de revisão
separada ainda.

**Cabeçalho**: nome do paciente, idade, leito, diagnóstico, data de internação,
justificativa (texto).

**Tratamento**: tratamento pretendido, medicamento, posologia, dose, intervalo, tempo de
uso (dias), total do tratamento (fórmula "DxIxT" = Dose x Intervalo x Tempo), ampolas,
frasco-ampolas, bolsas.

**Parecer do farmacêutico**: de acordo / contrário (escolha única) + justificativa, com 3
opções de disponibilidade em estoque (contempla o tratamento / contempla parcialmente /
não há disponível) + campo "outros" + data.

**Lista de referência — antibióticos de uso restrito** (provavelmente o gatilho pra saber
quando este formulário é obrigatório): Cefepime, Ciprofloxacino, Clindamicina,
Levofloxacino, Meropenem, Metronidazol, Piperacilina+Tazobactam, Vancomicina.

**No Vitaloop hoje**: não existe nenhuma tela, tabela ou rota pra isso.

---

## 4. Ficha de Admissão Médica

Estrutura simples: nome do paciente, data (nascimento/admissão — no exemplar os dois
apareciam confusos, atenção ao desenhar a tela pra deixar claro qual é qual), história da
doença atual (texto longo), conduta (texto — no exemplar continha algo como "1) Internação
+ Prescrição", sugerindo lista numerada de condutas, não só texto livre), assinatura
médico/CRM.

**No Vitaloop hoje**: `MedicalConsultationPage` cobre parte disso (consulta médica geral);
conferir se "história da doença atual" + "conduta" já têm campo equivalente lá, ou se essa
ficha é especificamente pro momento da internação (diferente da consulta ambulatorial).

---

## 5. Atualização de Quadro Clínico de Paciente Regulado (SER)

Usado quando o paciente já está regulado (aguardando vaga/procedimento via sistema
estadual de regulação) e precisa de atualização de status.

Campos: nome, data, data de nascimento, município de origem, nome da mãe, data do
cadastro, diagnóstico regulado, mudança de diagnóstico (sim/não + para qual), número da
solicitação no SER, sinais vitais (PA, FC, FR, Tº, SpO2, HGT), evolução diária (texto),
pendências (texto), conduta (texto — no exemplar: alta + encaminhamento pra outra
especialidade), assinatura médico/CRM.

**✅ Implementado** (2026-09-07): tela nativa (`SerUpdateModal`, botão "Atualizar quadro
clínico (SER)" na tela de ações do atendimento), rota `/api/v1/ser/ser-updates` com
validação, tabela `app.ser_updates` (migration 0056) — um registro por evolução (podem
existir vários ao longo da espera na regulação). Conceito confirmado como distinto do
módulo `regulation`/`ExternalRegulationModal` já existente (que trata de
solicitar/acompanhar a regulação em si, não da evolução clínica de quem já está
regulado). Construído com a mesma fábrica genérica de Sangue/ATM/TFD (schema único,
sem lógica de negócio própria).

---

## 6. Laudo para Solicitação/Autorização de Procedimento Ambulatorial (APAC)

Formulário oficial do Ministério da Saúde/SUS, numerado (campos 1 a 52) — irmão do AIH,
mas pra procedimento ambulatorial em vez de internação. Numeração original preservada:

1. Nome do estabelecimento de saúde · 2. CNES · 3. Nome do paciente · 4. Nº do prontuário
· 5. CNS · 6. Data de nascimento · 7. Sexo · 8. Nome da mãe/responsável · 9. Telefone ·
10. Endereço · 11. Município de residência · 12. Cód. IBGE do município · 13. UF · 14. CEP

**Procedimentos solicitados** (até 6 linhas, cada uma): código de procedimento, nome do
procedimento principal, quantidade (campos 15-32).

33. Descrição do diagnóstico · 34. CID-10 principal · 35. CID-10 secundário · 36. CID-10
causas associadas · 37. Justificativa (texto longo).

**Solicitação**: 38. Nome do profissional solicitante · 39. Data · 40. Tipo de documento
(CNS/CPF) · 41. Nº do documento · 42. Assinatura e carimbo.

**Autorização** (preenchido por quem autoriza, não pelo solicitante): 43. Nome do
profissional autorizador · 44. Código do órgão emissor · 45. Tipo de documento · 46. Nº do
documento · 47. Data · 48. Assinatura e carimbo (nº registro conselho) · 49. Nº da
autorização (APAC) · 50. Período de validade da APAC (de/até).

**Estabelecimento executante**: 51. Nome fantasia · 52. CNES.

**✅ Implementado** (2026-09-07): tela nativa (`ApacFormModal`, botão "Solicitar APAC" na
tela de ações do atendimento), reaproveitando o mesmo padrão do AIH — procedimento
SIGTAP principal/secundário + CID-10 principal com validação real de compatibilidade
(idade/sexo/CID vs. catálogo `app.sigtap_procedures`, mesma função
`validateSigtapCompatibility` do AIH). Tabela própria `app.apac_requests` (migration
0054, espelha `app.aih_requests`). Campos administrativos que não têm coluna própria
(descrição do diagnóstico, CID de causas associadas, dados do profissional
solicitante, e estabelecimento executante) via o motor `clinical-forms`
(`packages/domain/src/sus/apac-clinical-schema.ts`), expostos em
`GET /api/v1/sus/apac-clinical-fields-schema` e validados em
`POST /api/v1/sus/apac-requests`.

**✅ Fluxo de autorização em duas etapas** (2026-09-07): o bloco de autorização (campos
43-50) foi MOVIDO pra fora do formulário de criação — mesma correção do AIH. Novo schema
`APAC_AUTHORIZATION_FIELDS_SCHEMA`, nova permissão `sus.authorize_apac` (migration
0064), nova rota `POST /api/v1/sus/apac-requests/:id/authorize`. Mesma tela
`SusAuthorizationPanel` do AIH cobre os dois documentos (compartilham o mesmo conceito
de "laudo pendente de autorização").

---

## 7. Receituário Médico (simples)

Bem mais simples que "Prescrição Médica" (item 9 abaixo, documento de internação) — é a
receita de saída/ambulatorial: nome do paciente, data, lista numerada de itens
(medicamento + posologia em texto livre por item), assinatura médico/CRM. No exemplar,
duas vias impressas lado a lado (via farmácia + via paciente).

**No Vitaloop hoje**: módulo `prescription` existe (ligado a `MedicationScheduleGrid`,
mais voltado a prescrição/aprazamento de internação) — conferir se cobre esse caso mais
simples de receita de saída, ou se precisa de fluxo próprio.

---

## 8. Sumário de Alta

Nome do paciente, data de nascimento, data de internação, data da alta, diagnóstico de
internação + CID, diagnóstico de alta + CID, resumo clínico (texto longo), orientações
para continuidade do tratamento (texto longo), assinatura médico/CRM + data.

**No Vitaloop hoje**: `EncounterSummary` (módulo `outcome`) já cobre quase tudo isso
(chiefComplaint, primaryDiagnosisCode/Description, summaryNotes, dischargeInstructions) —
falta comparar se precisa de um campo separado pra "diagnóstico de internação" vs
"diagnóstico de alta" (hoje só tem um `primaryDiagnosisCode`) e se `EncounterOutcome` já
cobre data de internação/alta.

---

## 9. Tratamento Fora de Domicílio — TFD (Laudo Médico LM/TFD)

Usado quando o paciente precisa ser encaminhado pra tratamento em outro município.

Campos: número, nome, sexo, idade, endereço, data de nascimento, identidade, profissão,
acompanhante + relação (parentesco), história da doença atual (texto longo), exame físico
(texto longo — sinais vitais aparecem embutidos no texto livre no exemplar, não em campos
próprios), diagnóstico (texto), exame complementar (texto), tratamento realizado (texto),
tratamento indicado (texto), tempo provável (número, dias), profissional responsável
(nome/carimbo + cargo + data).

**✅ Implementado** (2026-09-07): tela nativa (`TfdRequestModal`, botão "Emitir laudo de
Tratamento Fora de Domicílio (TFD)" na tela de ações do atendimento), rota
`/api/v1/tfd/tfd-requests` com validação, tabela `app.tfd_requests` (migration 0055).
Identificação do paciente já coberta pelo módulo de paciente/encontro (não duplicada).
Sem lógica de negócio própria (ao contrário de AIH/APAC) — feature de schema único
construída com a mesma fábrica genérica de rota/cliente já usada por Sangue/ATM
(`clinical-form-route-factory.ts`/`clinical-request-api-factory.ts`), sem nenhuma
coluna relacional extra (todo campo cabe em `form_fields` JSONB).

---

## 10-18. Documentos de enfermaria/enfermagem (estrutura já preservada antes desta sessão)

Os 9 impressos abaixo tiveam sua estrutura extraída numa sessão anterior (a partir de
PDFs que já foram removidos por conterem dado real de dois pacientes diferentes — um do
Hospital Regional do Marajó, outro sem instituição clara — e vinham de um sistema chamado
"Salutem"; rodapé de geração e numeração de página daquele sistema não precisam ser
replicados):

### 10. Prescrição Médica (documento interno de internação, ≠ Receituário simples)
**Cabeçalho**: Nº prontuário, Nº registro, recepção, data de internação/alta, nome do
paciente, caráter (urgência/eletivo), convênio, nome da mãe, sexo, nacionalidade, raça,
RG, CPF, CNS, data de nascimento, idade, endereço, telefone, Nº da prescrição, data/hora
do documento, início/fim da validade, centro de custo, médico responsável + CRM +
especialidade, alergia, peso, leito/quarto/unidade.
**Corpo — 3 blocos de tabela**: Dieta (item numerado); Medicamentos (nome, quantidade/
unidade, "se necessário", via, frequência, horário — com sub-itens tipo "4" e "4,1" pro
diluente); Orientação enfermagem (itens numerados + frequência); Avaliação
multidisciplinar e Hemocomponente (seções livres).
**Rodapé**: 5 linhas de assinatura (Técnico Tarde/Noite/Manhã, Enfermeiro, Médico+CRM).

### 11. Balanço Hídrico
Cabeçalho: registro/prontuário/paciente/nascimento/idade/mãe/quarto/leito/clínica, número
do balanço, situação (aberto/fechado parcial/fechado), data de referência. Tabela
principal: item do lançamento nas linhas (soro, medicamentos, dieta — por nome
específico) × horários nas colunas (de hora em hora), separado em Ganho/Perda, com
subtotais por período (06h, 12h) e total geral. Rodapé com fechamento por dia e geral.

**✅ Reescrito contra impresso real** (2026-09-07): a v1 (NUR-009,
`app.fluid_balance_records`, direction intake/output + lista fechada de `fluidType`)
tinha sido descoberta já existente numa etapa anterior, mas SEM número de balanço,
status ou item por nome livre — três lacunas reais confirmadas contra o modelo real
(PDF + telas do sistema SALUTEM fornecidos pelo usuário na pasta `DOC/`, extraídos e
depois apagados — continham dado de paciente real). Reescrita completa (v2): cada
balanço é um PERÍODO numerado (`balanceNumber`, sequencial por atendimento — ex.:
"Balanço Hídrico: 8559") com status (`open`/`partially_closed`/`closed`) e data de
referência; cada lançamento tem item por nome livre (não uma lista fechada de tipos de
fluido), hora+minuto, e região/lateralidade opcionais (relevantes pra débito de
dreno/ferida — vistos na tela real de preenchimento). Tabelas
`app.fluid_balance_periods`/`app.fluid_balance_entries` (migration 0063, aditiva — a
tabela v1 `app.fluid_balance_records` foi MANTIDA no banco, só não é mais escrita pela
aplicação). Tela nativa `FluidBalanceModal` (botão "Balanço Hídrico" na central de
ações do atendimento) substitui a mini-seção que existia dentro de `NursingSaeView`.
Layout de grade hora-a-hora do papel não foi reproduzido pixel a pixel — a tela mostra
uma lista cronológica de lançamentos com totais, mesma informação, forma mais simples
(decisão já validada pelo usuário em outras telas desta sessão).

### 12. Evolução do Enfermeiro — SAE
Cabeçalho padrão + tempo de internação, mecanismo de trauma (quando aplicável), hipótese
diagnóstica médica, AMP (antecedentes médicos pessoais), peso, AMF (antecedentes médicos
familiares), breve histórico (texto longo), evolução/exame físico diária (texto longo,
detalhado — dispositivos, monitorização, sistemas), dispositivos invasivos (checkbox +
local + data, ex: AVP, TOT), intercorrências, mudanças significativas da terapêutica,
procedimentos realizados (lista). Segunda página: nota, plano terapêutico de enfermagem
(problemas ativos, diagnósticos de enfermagem, metas/resultados esperados, meta clínica).
Assinatura: nome + COREN.

### 13. Evolução Médica Diária de Enfermaria Clínica
Cabeçalho padrão + classificação de risco (cor). Corpo: diagnósticos (numerado, principal
na primeira linha), história da doença atual (copiar da urgência + parecer de
interconsulta), comorbidades (sim/não+especificar), reconciliação medicamentosa
(sim/não+especificar), alergias (sim/não+especificar), risco pra TEV (estratificado),
critérios de sepse (sim/não), antibioticoterapia atual (nome/data início/duração),
evolução do dia, exame físico, plano terapêutico (copiado da admissão, atualizado).
Segunda página: laboratório/cultura/exames de imagem, aguarda exames (sim/não+
especificar), data prevista de alta (reavaliar diariamente), conduta médica (texto longo).
Assinatura: nome + CRM.

### 14. Nota de Intercorrência (mesma estrutura pra médica e enfermagem)
Cabeçalho padrão + campo único "Notas" (texto livre, registro cronológico) + assinatura
(COREN pra enfermagem, CRM pra médica).

**✅ Já existia** (confirmado por busca no código em 2026-09-07, a pedido do usuário):
não como tela separada "Nota de Intercorrência", mas coberto funcionalmente pelos
recursos genéricos já existentes com a MESMA estrutura (texto livre + registro
cronológico + assinatura do profissional logado). Lado enfermagem: `NursingRecord` com
`recordType: 'annotation'` ("Anotação" em `NursingRecordsView.tsx`) — COREN vem do
profissional logado. Lado médico: `MedicalEvolution` (`evolutionText` +
`doctorId`, usado em `MedicalConsultationPage.tsx`) — CRM vem do profissional logado.

### 15. Plano Terapêutico (MÉDICO)
Cabeçalho padrão + classificação. Corpo numerado: diagnósticos (principal na primeira
linha); motivo da internação; objetivos da terapêutica (linha a linha, com tempo previsto
por meta); elegibilidade pra protocolo institucional (checkboxes: antibioticoprofilaxia
cirúrgica, cirurgia segura, controle da dor, identificação segura, jejum, prevenção de
LPP, prevenção de queda, TCE, TEV); tempo de internação previsto (dias); equipe
multidisciplinar (checkboxes: enfermagem obrigatório, fisioterapia, etc.). Assinatura:
nome + **CRM**.

**✅ Implementado** (2026-09-07): tela nativa (`TherapeuticPlanModal`, botão "Registrar
plano terapêutico" na tela de ações do atendimento), rota
`/api/v1/therapeutic-plan/therapeutic-plans`, tabela `app.therapeutic_plans` (migration
0057). Checkboxes de protocolo institucional e equipe multidisciplinar modelados como
campos `code` sim/não independentes, não obrigatórios (ausência = não avaliado). **Sem
impresso real fornecido para este documento especificamente** — campos por praxe médica,
a confirmar se divergir. Sem lógica de negócio própria — mesma fábrica genérica de
TFD/SER.

**⚠️ Importante — NÃO confundir com o item 15b abaixo**: o usuário confirmou
explicitamente (2026-09-07) que "Plano Terapêutico" (médico/CRM) e "Projeto Terapêutico
Multidisciplinar" (enfermagem/COREN) são **dois documentos reais distintos** nesta UPA,
não um substituindo o outro. Numa correção anterior deste mesmo dia, cheguei a
confundir os dois (reescrevendo este item com a estrutura da enfermagem) — foi revertido.

### 15b. Projeto Terapêutico Multidisciplinar (ENFERMAGEM)
Cabeçalho padrão + classificação de risco (cor). Corpo: resumo do projeto (texto livre);
diagnósticos de enfermagem (lista numerada); resultado esperado (lista numerada,
correspondente a cada diagnóstico); possíveis intervenções (lista numerada); tempo
estimado de internação (dias). Assinatura: nome + **COREN**. Sem checkboxes de
protocolo institucional (isso é exclusivo do Plano Terapêutico médico, item 15).

**✅ Implementado** (2026-09-07): tela nativa (`NursingTherapeuticPlanModal`, botão
"Registrar projeto terapêutico multidisciplinar (Enfermagem)" na tela de ações do
atendimento), rota `/api/v1/nursing-therapeutic-plan/nursing-therapeutic-plans`, tabela
`app.nursing_therapeutic_plans` (migration 0062). **✅ Confirmado contra impresso real**
("PROJETO TERAPEUTICO MULTIDISCIPLINAR - ENFERMAGEM", Hospital Regional Público do
Marajó, fornecido pelo usuário, extraído e apagado — continha dado de paciente real).
Ver `packages/domain/src/nursing-therapeutic-plan/schema.ts`. Sem lógica de negócio
própria — mesma fábrica genérica de TFD/SER.

### 16. Transferência Interna de Pacientes — SBAR
Cabeçalho padrão + classificação. Formato SBAR: setor de origem/destino, data/hora,
impressão diagnóstica, alergia (sim/não), nível de consciência (checkbox), suporte
ventilatório (checkbox), sinais vitais em grade (Tº, FC, FR, SpO2, PA), swab de
vigilância (sim/não), exames pendentes (sim/não), dieta, eliminações. Segunda página:
higiene corporal (sim/não), curativo (sim/não+local), isolamento (sim/não), dispositivos
(checkbox+local), recomendações, intercorrência no transporte (sim/não), observações,
enfermeiro responsável pelo transporte + enfermeiro responsável pelo recebimento (dois
nomes, rastreabilidade). Assinatura: nome + COREN.

**✅ Implementado** (2026-09-07): tela nativa (`SbarTransferModal`, botão "Transferência
interna (SBAR)" na tela de ações do atendimento), rota `/api/v1/sbar/sbar-transfers`,
tabela `app.sbar_transfers` (migration 0058). Sinais vitais como campos numéricos do
schema (mesmo padrão do SER/Triage). Campos condicionais (local do curativo, detalhe da
intercorrência) só aparecem quando o campo correspondente é "sim". Sem lógica de
negócio própria — mesma fábrica genérica de TFD/SER/Plano Terapêutico.

### 17. Histórico de Enfermagem
Cabeçalho: prontuário, registro, data internação/alta, paciente, mãe, nacionalidade,
convênio, sexo, nascimento, idade, raça, RG, CPF, CNS, telefone, endereço, recepção,
caráter. Corpo: texto clínico livre e extenso cobrindo admissão, monitorização,
dispositivos, sistemas orgânicos, dieta, eliminações — parecido em estilo com a Evolução
do Enfermeiro, mas mais como relato único de admissão. Assinatura: nome + COREN.

### 18. Acompanhamento Farmacêutico (Anamnese + Score + Evolução)
Três impressos reais do Hospital Regional Público do Marajó, fornecidos pelo usuário em
2026-09-08 e apagados de `DOC/` após extração (continham dado de paciente real):
"ANAMNESE FARMACEUTICA", "SCORE DE CRITERIOS PARA DEFINICAO DO ACOMPANHAMENTO
FARMACOTERAPEUTICO" e "ACOMPANHAMENTO FARMACEUTICO". Decisão do usuário: os três
compartilham o mesmo motor de `tipo_registro` já usado em Nutrição/Fisioterapia —
Anamnese + Score juntos formam o registro de **admissão** ao acompanhamento
farmacêutico (feito uma vez), Acompanhamento Farmacêutico é a **evolução** repetida
(análise periódica de prescrição).

Anamnese (campos de admissão): hábitos de vida, alergias a medicamentos, medicamentos
de uso contínuo, medicamentos de uso próprio (cada um sim/não + texto livre no impresso
real; modelado aqui como texto livre — vazio equivale a "não").

Score (campos de admissão): quantidade de medicamentos em uso, uso de medicamentos
intravenosos, uso de medicamentos potencialmente perigosos, uso de sonda, faixa etária,
problemas renais/hepáticos, problemas cardíacos/pulmonares, imunossupressão, pontuação
total, classificação de risco, conduta definida. **Nota**: o impresso real só documenta
o significado de pontuação 5-8 ("risco moderado"); as faixas de "baixo" e "alto" foram
inferidas por não estarem no impresso — revisar se o farmacêutico confirmar limites
diferentes.

Acompanhamento (campos de evolução): antimicrobianos em uso (com início/previsão de
término), tratamento antimicrobiano anterior, analgesia, profilaxia de úlcera de
estresse, outras classes medicamentosas, projeto terapêutico/seguimento.

Assinatura (sempre): farmacêutico responsável + CRF + data.

Distinto de `app.antimicrobial_requests` (Formulário ATM, item 3 — solicitação pontual
de antimicrobiano de uso restrito) e de `app.pharmacy_dispensations` (dispensação) —
este é o acompanhamento farmacoterapêutico contínuo do paciente. Implementado em
`PharmacyFollowUpModal`, `/api/v1/pharmacy-followup/pharmacy-followups`, tabela
`app.pharmacy_followups` (migration 0066).

**Melhoria baseada em evidência (2026-09-08)**: a pedido do usuário, o grupo de
evolução foi complementado com um checklist **FAST HUG MAIDENS** — mnemônico
padronizado e validado de acompanhamento farmacêutico (VINCENT, J. L. *Give your
patient a fast hug (at least) once a day*. Critical Care Medicine, 2005; estendido por
MABASA, V. H. et al. *A Standardized, Structured Approach to Identifying Drug-Related
Problems in the Intensive Care Unit: FASTHUG-MAIDENS*. Can J Hosp Pharm, 64(5),
2011), citado e adotado em protocolo institucional real de hospital universitário
brasileiro (HU-UNIVASF/EBSERH, *Protocolo de Acompanhamento Farmacoterapêutico*,
2019, ISBN 978-85-92656-18-8). Campos novos, complementares aos já extraídos do
impresso real do Marajó: sedação, tromboprofilaxia, delirium, controle glicêmico,
conciliação medicamentosa, clearance de creatinina (fórmula CKD-EPI) e interações/
alergias/duplicidades identificadas. O campo de medicamentos potencialmente perigosos
(admissão) também ganhou referência à Lista de Medicamentos Potencialmente Perigosos
do ISMP Brasil. Nenhum campo do impresso real original foi removido ou alterado.

---

## Lacunas confirmadas (nenhum módulo/tela hoje)

- ~~Serviço Social~~ → **✅ implementado (2026-09-07), ver "Módulos sem impresso real" abaixo**
- ~~Nutricionista~~ → **✅ implementado (2026-09-07), ver "Módulos sem impresso real" abaixo**
- ~~Fisioterapia~~ → **✅ implementado (2026-09-07), ver "Módulos sem impresso real" abaixo**
- Solicitação de Hemoterápicos → **na verdade já coberto pelo item 2 acima**
  (Solicitação de Sangue, Componentes e Derivados é o mesmo documento)
- ~~Laudo/Autorização de Procedimento Ambulatorial (APAC)~~ → **✅ implementado, ver item 6**
- ~~Formulário Antimicrobiano (ATM)~~ → **✅ implementado, ver item 3**
- ~~Tratamento Fora de Domicílio (TFD)~~ → **✅ implementado, ver item 9**
- ~~Atualização de Quadro Clínico de Paciente Regulado (SER)~~ → **✅ implementado, ver item 5**
- ~~Balanço Hídrico~~ → **✅ já existia (módulo `nursing`/NUR-009), ver item 11** — não era
  lacuna de verdade, estava listada por engano nesta seção
- ~~Plano Terapêutico~~ → **✅ implementado, ver item 15**
- ~~Transferência Interna SBAR~~ → **✅ implementado, ver item 16**

---

## Módulos sem impresso real (campos desenhados por praxe, não extraídos de PDF)

Em 2026-09-07, **Serviço Social, Nutricionista e Fisioterapia nunca tinham tido um PDF
real da UPA fornecido** pra extração de campos, e foram implementados por praxe
hospitalar a pedido explícito do usuário. **No mesmo dia, o usuário forneceu os
impressos reais de Serviço Social e Nutrição** (pasta `DOC/`, extraídos e apagados —
continham dado de paciente real) e os dois schemas foram corrigidos contra eles:

- **Evolução de Serviço Social** (renomeado de "Avaliação"): `SocialWorkAssessmentModal`,
  `/api/v1/social-work/social-work-assessments`, tabela
  `app.social_work_assessments` (migration 0059, sem alteração de schema DB).
  **✅ Confirmado contra impresso real** ("EVOLUCAO ASSISTENTE SOCIAL", Hospital
  Regional Público do Marajó) — o impresso real é enxuto: um único campo de evolução
  em texto livre (registro cronológico) + assinatura (nome + CRESS). Campos de
  vulnerabilidades/encaminhamentos/rede de apoio viraram enriquecimento OPCIONAL (não
  existem como campos próprios no impresso real). Ver
  `packages/domain/src/social-work/schema.ts`.
- **Avaliação Nutricional**: `NutritionAssessmentModal`,
  `/api/v1/nutrition/nutrition-assessments`, tabela `app.nutrition_assessments`
  (migration 0060, sem alteração de schema DB).
  **✅ Confirmado contra dois impressos reais** ("TRIAGEM NUTRICIONAL – NRS-2002" e
  "EVOLUCAO NUTRICAO", mesmo hospital) — são dois TIPOS DE REGISTRO distintos, não uma
  soma de campos opcionais: a Triagem Nutricional é feita SOMENTE na admissão do
  paciente (mesmo conceito de `recordType: 'admission'` já usado em `NursingRecord`),
  a Evolução Nutricional é feita repetidamente. Schema tem um campo `tipo_registro`
  (triagem_admissao / evolucao) que controla via `visibleWhen` qual grupo de campos
  aparece: triagem mostra o NRS-2002 completo (8 perguntas + escore + classificação,
  todos obrigatórios quando esse tipo é escolhido); evolução mostra estado
  geral/aceitabilidade da dieta, prescrição dietoterápica (dieta + via de alimentação +
  função fisiológica, obrigatórios), antropometria e necessidades nutricionais
  (opcionais) e conduta (obrigatória). Assinatura (nome + CRN) sempre visível/obrigatória
  nos dois tipos. Ver `packages/domain/src/nutrition/schema.ts`.
- **Avaliação/Evolução Fisioterapêutica**: `PhysiotherapyAssessmentModal`,
  `/api/v1/physiotherapy/physiotherapy-assessments`, tabela
  `app.physiotherapy_assessments` (migration 0061). **Ainda NÃO confirmado contra
  impresso real** — nenhum foi fornecido para Fisioterapia até agora. Padronizado
  (2026-09-07, a pedido do usuário: "prossiga padronizando do jeito que achar melhor")
  pelo MESMO padrão admissão/evolução já confirmado por dois impressos reais desta UPA
  (Nutrição — ver item acima): campo `tipo_registro` (`avaliacao_inicial`/`evolucao`)
  escolhe entre um bloco de avaliação funcional inicial (mobilidade, força, respiratória,
  dependência funcional, diagnóstico cinético-funcional, objetivos — feito uma vez, no
  encaminhamento) e um bloco de evolução por sessão (texto livre + conduta aplicada —
  repetido a cada atendimento). Assinatura (nome + CREFITO) sempre obrigatória nos dois
  tipos. Se o impresso real da UPA divergir, revisar `packages/domain/src/physiotherapy/schema.ts`.

A mesma remessa de impressos reais também trouxe o modelo de "PROJETO TERAPEUTICO
MULTIDISCIPLINAR - ENFERMAGEM" — um documento NOVO e distinto do Plano Terapêutico
médico do item 15, implementado como item 15b (ver acima).
