# Handoff — Estado "internado" de primeira classe (2026-09-12)

> Este documento foi gerado numa sessão de chat separada, dedicada só à camada
> de banco/domínio (ver `VITALOOP_1.3_STATUS.md` seção de governança pra
> registrar esta entrada). Aplicado e verificado ao vivo contra o Supabase
> real (`VITALOOP-v1.3`, `ovwqbmmsppkeekhsnrbv`). Falta a camada de API +
> tela — é isso que este handoff pede pro Code construir.

## Origem

Auditoria de 2026-09-12 (Code, no VS Code) encontrou: internação não é
estado de primeira classe no atendimento (`state-machine.ts` só ia até
`completed`); `InternacaoTab.tsx` era 100% leitura; um atendimento podia ir
para `completed` com leito ainda ocupado, sem nenhum aviso. Os três achados
foram confirmados lendo o código real antes de qualquer mudança.

## O que já foi feito (banco + domínio — aplicado e testado)

1. **Migration `0081_encounter_admitted_status.sql`** — adiciona `'admitted'`
   ao enum `app.encounter_status` (sozinha, no padrão seguro já usado em
   0071 pra `post_consultation`: novo valor de enum não pode ser comparado
   na mesma transação em que foi criado).

2. **Migration `0082_admissions.sql`**:
   - Tabela `app.admissions`: período ATIVO de internação (médico
     responsável, diagnóstico de admissão, justificativa, status
     `active`/`discharged`/`transferred_out`/`deceased`). **Não duplica**
     sumário de alta — o fechamento final continua em
     `app.encounter_outcomes`/`app.encounter_summaries` (migration 0031),
     igual já é hoje pra alta direta da UPA.
   - Permissões `admission.read` (ampla: toda a equipe real) e
     `admission.write` (restrita a `doctor`/`admin`/`system_admin` — ato
     médico, mesmo padrão de `outcome.write`/`medical.write` já usado em
     0074).
   - RLS habilitado, políticas por permissão (mesmo padrão do resto do
     schema `app`).
   - **Trigger `encounters_guard_admission`** em `app.encounters`
     (`BEFORE UPDATE`): bloqueia no banco (defesa em profundidade, não só
     API) —
     - marcar `status = 'admitted'` sem leito ativo em `bed_allocations`;
     - marcar `status = 'completed'` com leito ou internação ainda ativos.
   - **Testado ao vivo** (transação com `ROLLBACK`, sem resíduo no banco):
     internar sem leito → rejeitado com mensagem clara; internar com leito
     → aceito; concluir com internação ativa → rejeitado com mensagem clara.
   - `get_advisors(type=security)` depois da migration: **zero achados
     novos** (só o aviso pré-existente de proteção de senha vazada, já
     documentado no STATUS.md).

3. **`packages/domain/src/encounter/types.ts`** — `'admitted'` adicionado ao
   union `EncounterStatus`, mesma posição do enum do banco (depois de
   `post_consultation`).

4. **`packages/domain/src/encounter/state-machine.ts`** —
   `ALLOWED_TRANSITIONS` atualizado:
   - `in_consultation` e `post_consultation` agora também permitem ir para
     `admitted`;
   - `admitted` só permite ir para `completed` (nunca `canceled` —
     internação se encerra por alta/óbito/transferência, não se cancela);
   - auto-transição `admitted → admitted` já é permitida de graça pelo
     `from === to` existente em `isValidEncounterStatusTransition` (cobre
     evolução/reavaliação sem trocar de "página" de estado).
   - **Verificado**: `npm run typecheck` limpo e `npx vitest run
     packages/domain` — **347/347 testes passando**, incluindo
     `encounter/state-machine.test.ts` e `encounter/rules.test.ts` (a
     mudança é só aditiva, não removeu nenhuma transição existente).

## O que falta (API + frontend — para o Code construir)

1. **Rotas** (seguir o padrão de `apps/api/src/routes/outcomes.ts` /
   `beds.ts`, ambos já reais):
   - `POST /api/v1/encounters/:id/admission` — cria linha em
     `app.admissions` (médico logado = `admitting_doctor_id`) **e** muda
     `encounters.status` para `admitted` na mesma transação. O trigger do
     banco já rejeita se não houver leito ativo — a rota só precisa
     propagar o erro 409 pro frontend com a mensagem do banco (já vem
     clara em português).
   - `PATCH /api/v1/encounters/:id/admission` — evolução (atualizar
     diagnóstico/justificativa, trocar `admitting_doctor_id` em handover).
   - `POST /api/v1/encounters/:id/admission/discharge` — marca
     `app.admissions.status = 'discharged'`, `ended_at = now()`, e só
     **depois** permite `encounters.status = 'completed'` via o fluxo de
     desfecho já existente (`encounter_outcomes`/`encounter_summaries`,
     `outcome_type = 'admission_bed'` ou o que fizer sentido no
     desfecho real).
   - `GET /api/v1/encounters/:id/admission` — leitura, pra alimentar a tela.

2. **`InternacaoTab.tsx`** — hoje é só leitura (36 linhas). Precisa virar
   uma aba de ação de verdade: botão "Internar" (abre formulário com CID +
   justificativa, só visível se `medical.write` E leito ativo alocado —
   replicar a checagem do backend na UI pra dar feedback antes de bater na
   API), evolução da internação, botão "Dar alta da internação" (dispara o
   fluxo de desfecho existente). Seguir o padrão shadcn/ui + TanStack Query
   já adotado no resto do app (ver `medical-consultation/hooks/` e
   `medical-consultation/tabs/` como referência de estrutura).

3. **Documentar em `docs/TRACEABILITY_PHASE_*.md`** — este handoff propõe
   IDs `ADM-001..008` pra rastreabilidade (não oficializados no Doc 3
   original, que não previu internação como fase própria — decisão de
   formalizar ou não é do usuário/Code, não minha).

## Não escopo deste handoff (gaps que continuam em aberto)

- Escala de enfermagem por leito (não existe hoje pra nenhum leito, UPA ou
  internação).
- Regulação de leito entre unidades (`regulation_code` já existe em
  `bed_allocations`, mas sem fluxo/tela dedicada).
- RLS por setor (`need-to-know` clínico) só cobre `nursing_technician` hoje
  — decisão já registrada no STATUS.md como consciente, não bug.
