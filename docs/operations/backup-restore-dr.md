# Backup, Restore e Disaster Recovery — plano base

- **Fase:** 0 — Fundamentos (documentação; execução depende de infra/Supabase).
- **Contexto normativo:** Documento 2 §55/§56; Documento 3 PRD-009..PRD-014, QLT-011..QLT-013.

> Regra: **backup sem teste de restauração NÃO é considerado validado** (Doc 2 §55).

## 1. Parâmetros institucionais — PENDENTES

| Parâmetro | Valor | Situação |
|---|---|---|
| RPO (perda máxima aceitável) | `<placeholder>` | **NÃO DEFINIDO — NECESSITA DECISÃO** |
| RTO (tempo máximo de recuperação) | `<placeholder>` | **NÃO DEFINIDO — NECESSITA DECISÃO** |
| Frequência de backup | `<placeholder>` | **NÃO DEFINIDO — NECESSITA DECISÃO** |
| Retenção de backup | `<placeholder>` | **NÃO DEFINIDO — NECESSITA DECISÃO** |
| Local off-site | `<placeholder>` | **NÃO DEFINIDO — NECESSITA DECISÃO** |
| Responsável por DR | `<placeholder>` | **NÃO DEFINIDO — NECESSITA DECISÃO** |

Nenhum valor oficial foi inventado. Serão parametrizados quando decididos.

## 2. Estratégia base (a validar quando o Supabase/infra existir)

- **Backup lógico:** `pg_dump` (schema + dados) agendado; artefato criptografado.
- **Backup físico/PITR:** conforme provedor (Supabase oferece PITR em planos elegíveis) — **PENDENTE**.
- **Off-site:** cópia cifrada fora do ambiente primário.
- **Criptografia:** em repouso e em trânsito.

## 3. Restore

1. Provisionar instância limpa.
2. Restaurar dump/PITR.
3. Aplicar migrations pendentes (`npm run db:migrate`).
4. Validar integridade (constraints, contagens, RLS ativa).
5. Smoke test da API (`/health`, `/ready`).

## 4. Teste de restauração (obrigatório)

- Periodicidade: `<placeholder>` — **NÃO DEFINIDO — NECESSITA DECISÃO**.
- Evidência: log do restore + resultado dos testes de integração pós-restore.

## 5. Disaster Recovery

- Procedimento, ordem de restauração e dependências: a detalhar com a decisão de hospedagem (AMB-02).
- Bloqueado por: DB-02 (Supabase), AMB-02 (hospedagem), RPO/RTO.
