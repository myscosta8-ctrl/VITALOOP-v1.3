# ADR-0003 — Provedor de autenticação e separação identidade × autorização × need-to-know

- **Status:** Aceito (técnico, reversível na fronteira) — decisão AUT-01 da Fase 0A.
- **Data:** 2026-08-19
- **Fase:** 1 — Identidade e Segurança
- **Contexto normativo:** Documento 1 §5–§10; Documento 2 §20–§28; Documento 4 §12–§16.

## Decisão

1. **Credenciais delegadas ao Supabase Auth (GoTrue).** Senha (hash/armazenamento),
   recuperação de senha, alteração de senha, e-mail e MFA/TOTP são responsabilidade do
   Supabase Auth. **Não** construímos mecanismo paralelo de senha (evita "mecanismo
   paralelo inseguro", Doc 4 §37). Isso satisfa Doc 2 §25/§26/§27 sem reimplementar hashing.
2. **Identidade institucional e autorização no schema `app`.** `auth.users.id` (Supabase)
   liga-se a `app.users.auth_subject`. A partir daí, a **identidade institucional**,
   **profissão**, **vínculo**, **papéis (RBAC)**, **permissões**, **escopo** e
   **need-to-know** vivem em `app` e são a fonte de autorização — nunca o `auth.uid()` sozinho.
3. **Três camadas distintas (Doc 4 §12/§13):**
   `Autenticação` (quem é) → `RBAC` (o que pode fazer) → `Need-to-Know` (pode acessar
   ESTE recurso/contexto). São avaliadas separadamente e todas auditáveis.
4. **Sessão institucional** (`app.sessions`) é registro próprio para revogação/expiração/
   dispositivo, complementar ao JWT do Supabase.

## O que permanece PENDENTE (não inventado)

- **Política de senha institucional** (tamanho/complexidade/expiração) — configurada no
  Supabase Auth (dashboard) — **NÃO DEFINIDO — NECESSITA DECISÃO**.
- **MFA obrigatório e para quais perfis** (MFA-01/03) — **NÃO DEFINIDO — NECESSITA DECISÃO**.
- **Verificação de JWT do Supabase na API** requer o segredo/JWKS do projeto em variável de
  ambiente — ainda **não presente no ambiente** (sem credencial). Interface pronta; ativação pendente.
- **TTL de sessão, limiares de bloqueio, duração de break-glass**: há *defaults técnicos de
  segurança* (baseline), com **override institucional pendente** em `app.security_settings`.

## Consequências

- Sem armazenamento de senha no nosso banco; superfície de credencial reduzida.
- A autorização é testável no banco (RLS + funções) independentemente do provedor de token.
- Reversível na fronteira: trocar o provedor de token não afeta o núcleo de autorização.
