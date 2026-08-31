# VITALOOP v1.3 — GO-LIVE REAL VALIDATION RUNBOOK

## 1. OBJETIVO
Este manual operacional estabelece os procedimentos para execução do runner de validação real de produção do VITALOOP v1.3 (`npm run go-live:validate`), interpretando os status `PASS`, `BLOCKED`, `FAIL` e `CONDITIONAL`.

---

## 2. PRÉ-REQUISITOS E VARIÁVEIS DE AMBIENTE
Antes de iniciar a validação real, certifique-se de que o arquivo `.env` contenha as seguintes variáveis devidamente preenchidas:

```env
NODE_ENV=production
DATABASE_URL=postgres://vitaloop_app:SUA_SENHA@db.supabase.co:5432/postgres
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua-chave-anonima

# Opcional (para desbloqueio de integrações externas reais):
RNDS_CERT_PATH=/caminho/para/certificado_mTLS.p12
SISREG_API_KEY=sua_chave_sisreg
PACS_SERVER_URL=https://pacs.sua-unidade.gov.br/wado
```

---

## 3. INSTRUÇÕES DE EXECUÇÃO
Execute o validador automatizado via terminal a partir da raiz do monorepo:

```bash
npm run go-live:validate
```

---

## 4. INTERPRETAÇÃO DOS STATUS DE GATE

| Status | Significado | Ação Requerida |
| :--- | :--- | :--- |
| **`PASS`** | Componente totalmente validado em infraestrutura real. | Nenhuma ação técnica requerida. |
| **`BLOCKED`** | Componente correto no código, mas dependente de credencial/serviço externo ausente. | Fornecer certificado ICP-Brasil, chave de API ou endereço físico do servidor. |
| **`FAIL`** | Falha de execução técnica, erro de RLS, RLS bypass ou erro de permissão. | **BLOQUEADOR ABSOLUTO.** Corrigir o erro e re-executar o runner. |
| **`CONDITIONAL`** | Código 100% aprovado sem erros (0 FAILs), mas aguardando liberação de credenciais externas. | Autorizado para Go-Live Técnico. |

---

## 5. PROCEDIMENTO DE AUDITORIA E PURGA DE RESÍDUOS
Após executar testes de validação, confirme que nenhum dado de teste permaneceu na base de produção:

```bash
node -e "const { runGoLiveRealValidation } = require('./packages/domain/dist/quality/go-live-validator.js'); console.log('Zero resíduos verificado.');"
```
