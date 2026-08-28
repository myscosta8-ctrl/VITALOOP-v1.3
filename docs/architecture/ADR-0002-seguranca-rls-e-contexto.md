# ADR-0002 — Modelo de segurança, contexto e RLS

- **Status:** Aceito (base parametrizável).
- **Data:** 2026-08-19
- **Fase:** 0 — Fundamentos
- **Contexto normativo:** Documento 1 §6–§10; Documento 2 §19–§23/§51; Documento 4 §12–§16.

## Decisão

1. **Defesa em profundidade:** autorização em domínio/aplicação **e** no banco (RLS).
   O frontend nunca é a única camada (Doc 4 §12).
2. **Contexto por transação:** a aplicação injeta o contexto do ator em GUCs
   `vitaloop.user_id | institution_id | unit_id | sector_id | roles | break_glass`
   via `set_config(..., true)` dentro de uma transação
   (`apps/api/src/db/security-context.ts`).
3. **RLS negar-por-padrão:** RLS habilitada em todas as tabelas de `app`; políticas
   base permitem por contexto (migration `0010`). Funções `app.ctx_*()` leem o contexto.
4. **Auditoria append-only:** `audit_events` e `state_transitions` bloqueiam UPDATE/DELETE
   por trigger; sem policy de mutação (Doc 2 §39).
5. **Papel de menor privilégio:** a aplicação conecta como `vitaloop_app` (não-owner),
   para que a RLS efetivamente se aplique (Doc 3 PRD-002).

## Fronteira do que NÃO foi decidido (institucional/pendente)

- Matriz definitiva de perfis e permissões (RBAC-02).
- Necessidade de saber **por paciente** — será estreitada quando as tabelas clínicas
  existirem (fases 2+). As policies atuais de `domain_events`/`state_transitions` usam
  base "autenticado", explicitamente marcada para estreitamento.
- Política institucional de break-glass (duração, quem pode).
- Mapeamento `auth.uid()` (Supabase) → `vitaloop.user_id`.

> Tudo acima está registrado como **NÃO DEFINIDO — NECESSITA DECISÃO** e implementado
> de forma extensível, sem inventar política clínica/institucional.

## Consequências

- Segurança desde a fundação; trilha de auditoria protegida.
- As políticas base são conservadoras e deverão ser **endurecidas** por fase, nunca afrouxadas.
