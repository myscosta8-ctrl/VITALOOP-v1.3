# VITALOOP 1.3 — Preparação para a Fase 2

> **Este documento NÃO implementa a Fase 2.** Apenas registra o ponto de
> partida, o que está congelado, e as pré-condições necessárias antes do
> primeiro comando de implementação. Fase 2, conforme Doc 3/Doc 4 (ordem
> macro §6): **Cadastro e Identidade do Paciente** (requisitos `PAT-001` a
> `PAT-017`, Doc 3 §9).

## 1. Base homologada da qual a Fase 2 partirá

Ver `docs/PHASE_1_BASELINE.md` (referência imutável). Resumo: Fase 0 + Fase
1 homologadas; 16 migrations (`0001`–`0016`); identidade institucional,
RBAC, Need-to-Know (baseline técnico), auditoria, sessões, break-glass,
rate-limiting/brute-force todos implementados e testados com evidência real.
Nenhum módulo clínico existe.

## 2. O que está congelado

- Os 4 Documentos oficiais (inalterados desde o início do projeto).
- As 16 migrations `0001`–`0016` (não devem ser editadas; qualquer alteração
  de schema é uma migration nova, `0017` em diante).
- O modelo de segurança: `app.ctx_*()`, `has_permission()`, `can_access()`,
  `authorize()`, `log_authz()`, `resolve_app_identity()`,
  `activate_break_glass()` — funções já homologadas; alterar seu contrato
  exige novo gate técnico, não uma extensão silenciosa.
- O padrão arquitetural: identidade (Supabase Auth) ≠ identidade
  institucional (`app.users`) ≠ RBAC ≠ Need-to-Know — camadas distintas,
  combinadas em `authorize()`. Módulos clínicos devem seguir o mesmo padrão,
  não reimplementar autorização por fora dele.
- O padrão de auditoria append-only (`audit_events`, `state_transitions`).
- O padrão de eventos de domínio (`domain_events`) como fonte única da
  Timeline — nenhum módulo clínico deve criar uma segunda fonte de verdade
  para histórico/timeline.

## 3. O que não pode ser alterado sem novo gate

- Qualquer uma das 16 migrations existentes.
- O contrato das funções de segurança listadas na seção 2.
- O comportamento de `requireAuth`/`requirePermission` (camada HTTP de
  enforcement) sem revalidação via HTTP real.
- As classificações `PENDENTE DE DECISÃO INSTITUCIONAL` — não podem virar
  implementação sem a decisão explícita do usuário/instituição.

## 4. Pendências institucionais que impactarão fases futuras

Diretamente relevantes para a Fase 2 (Cadastro de Paciente):

- **Regras de identificação/duplicidade de paciente** (Doc 1 §11 — validação
  de CPF/CNS, prevenção de duplicidade) — o Doc 1 já define o comportamento
  funcional; parâmetros institucionais específicos (ex.: fontes de validação
  de CPF/CNS) podem depender de integração externa ainda não definida
  (Doc 1 §73.19 — integrações externas efetivamente disponíveis).
- **Necessidade de saber por paciente** (SEC-018 desta Fase 1) — só poderá
  ser implementada de fato quando existir a tabela `patients` e a regra
  institucional de vínculo assistencial (Doc 1 §73, itens pendentes).
- **Retenção documental / LGPD aplicada a dados de paciente** (Doc 1 §73.15).

Indiretamente relevantes (aguardam fases ainda mais adiante, mas devem ser
lembradas ao desenhar `patients`): protocolo de classificação de risco,
Manchester, regras AIH/SIGTAP, catálogo de medicamentos.

## 5. Dependências técnicas já existentes (reaproveitáveis pela Fase 2)

- `app.institutions`, `app.units`, `app.sectors` (hierarquia institucional —
  Fase 0) — a tabela `patients` deverá referenciar essas quando aplicável
  (ex.: unidade de cadastro).
- `app.users`, RBAC, Need-to-Know — para autorização de quem pode
  cadastrar/ler/alterar pacientes (`patient.read`, `patient.write` — a
  criar como novas linhas em `app.permissions`, seguindo o padrão já
  estabelecido em `0013`, nunca reaproveitando as 10 permissões técnicas já
  criadas para fins distintos).
- `app.domain_events` — eventos como `PatientRegistered` (já previsto em
  Doc 2 §37) devem ser gravados nele, não em uma tabela própria.
- `app.audit_events` — toda alteração de cadastro deve auditar via
  `log_authz`/inserção direta em `audit_events`, seguindo o padrão existente.
- Máquina de estados genérica (`@vitaloop/domain`, `packages/domain`) —
  reaproveitável caso o cadastro de paciente tenha estados (ex.:
  ativo/mesclado/inativo), sem reinventar um motor de estados próprio.

## 6. Riscos conhecidos

- RLS de `domain_events`/`state_transitions` está em baseline "autenticado"
  (Doc 2 §19 exige negar-por-padrão mais estrito) — precisará ser estreitada
  quando `patients`/`encounters` existirem, para refletir Need-to-Know real.
- Sem MFA — aceitável apenas enquanto não há dados clínicos reais expostos;
  a Fase 2 introduz o primeiro dado pessoal sensível (paciente) e deve
  reabrir essa decisão institucional antes de produção real.
- Nenhuma tabela `patients` deve ser criada como cópia ad hoc — deve seguir
  o modelo já catalogado no Doc 2 §64 (`patients`, `patient_contacts`,
  `patient_allergies`), sem inventar campos além do especificado.

## 7. Requisitos da Fase 2 que dependem da fundação

Do Doc 3 §9 (Fase 2 — PAT-001 a PAT-017): cadastro completo, identificação
segura, CPF, CNS, prontuário, dados demográficos, contatos, contato de
emergência, alergias, reações adversas, antecedentes, medicamentos
contínuos, problemas ativos, histórico clínico, detecção de duplicidade,
merge controlado, auditoria de alterações. **Todos** dependem de:
- RBAC/Need-to-Know já homologados (Fase 1) para controlar quem pode
  cadastrar/ler/alterar.
- Auditoria append-only já homologada (Fase 0/1) para PAT-017.
- Eventos de domínio já homologados (Fase 0) para `PatientRegistered`.

## 8. Ordem recomendada para iniciar a Fase 2

Conforme Doc 4 §55 (regra de implementação por bloco): para cada requisito
PAT-*, seguir `ler requisito → localizar dependências → banco → domínio →
API → frontend → RBAC/RLS → auditoria/evento → testar → testar
negativamente → registrar evidência → atualizar matriz → só então avançar`.
Recomenda-se começar pela migration de `patients` + constraints de
unicidade/duplicidade (base de tudo), depois `patient_contacts` e
`patient_allergies`, só então a API e o frontend de cadastro.

## 9. Pré-condições para o primeiro comando de implementação da Fase 2

1. Autorização explícita do usuário para iniciar a Fase 2 (este documento
   não constitui essa autorização).
2. Decisão institucional (ou aceite explícito de adiar) sobre identificação/
   duplicidade de paciente (regras de CPF/CNS) — ao menos o suficiente para
   não inventar regra de validação.
3. Confirmação de que as permissões `patient.read`/`patient.write` (ou
   equivalentes) serão criadas como novas linhas em `app.permissions`,
   sem reaproveitar as 10 permissões técnicas da Fase 1.
4. `DATABASE_URL` disponível quando for necessário validar a Fase 2 com
   evidência real via HTTP (mesma limitação de ambiente da Fase 1).

## 10. Critérios para considerar a Fase 2 pronta para implementação

- Documento 1 §11/§12 revisado como fonte de verdade funcional (já
  disponível, não precisa de nova decisão para começar a estrutura básica).
- Nenhuma tabela clínica criada antes desta autorização explícita (regra já
  respeitada durante a Fase 0/1 — nenhuma tabela `patients` foi antecipada).
- Matriz de rastreabilidade da Fase 2 (`docs/TRACEABILITY_PHASE_2.md`, a
  criar somente quando a Fase 2 for autorizada) seguindo o mesmo rigor de
  classificação usado nesta Fase 1 (PASS/PARCIAL/NOT RUN/PENDENTE DE
  DECISÃO — nunca `✓` sem evidência).
