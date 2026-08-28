# VITALOOP 1.3
## DOCUMENTO 2 — Blueprint Técnico
### Especificação Técnica, Arquitetural, Dados e Segurança

**Versão:** 1.0  
**Data:** 19/08/2026  
**Documento:** 2 de 3  
**Dependência:** Documento 1 — Blueprint Funcional e Clínico  
**Finalidade:** definir COMO o Vitaloop 1.3 deverá ser construído.

---

# 0. PRINCÍPIOS TÉCNICOS OBRIGATÓRIOS

1. O Documento 1 define o comportamento funcional; este documento define sua realização técnica.
2. O código do v1.2 é evidência para migração, não especificação.
3. Nenhuma funcionalidade clínica crítica poderá depender de mock, localStorage ou estado exclusivamente de frontend.
4. Banco, domínio e API deverão possuir uma única interpretação das regras.
5. Segurança não poderá depender apenas do frontend.
6. Toda operação clínica relevante deverá possuir autoria, temporalidade, contexto e rastreabilidade.
7. Registros clínicos liberados deverão ser imutáveis ou versionados; correções deverão ser aditivas e auditáveis.
8. Operações críticas deverão ser transacionais, idempotentes quando aplicável e protegidas contra concorrência.
9. Toda tabela clínica deverá possuir estratégia explícita de retenção, auditoria e integridade.
10. Nenhum requisito do Documento 1 poderá ser marcado como concluído apenas porque a tela existe.
11. Toda alteração estrutural deverá ser migrável e reversível quando tecnicamente possível.
12. O sistema deverá ser projetado para produção real de uma UPA 24h.

---

# 1. ARQUITETURA GERAL

Arquitetura alvo:

```text
┌──────────────────────────────────────────┐
│              CLIENTE WEB                 │
│ React + TypeScript + UI + estado         │
└────────────────────┬─────────────────────┘
                     │ HTTPS
┌────────────────────▼─────────────────────┐
│              API / APPLICATION           │
│ Auth • RBAC • casos de uso • validação   │
│ transações • idempotência • eventos      │
└───────────────┬───────────────┬──────────┘
                │               │
        ┌───────▼──────┐  ┌────▼─────────┐
        │ PostgreSQL   │  │ Event/RT     │
        │ domínio      │  │ realtime     │
        │ auditoria    │  │ notificações │
        └──────────────┘  └──────────────┘
                │
        ┌───────▼─────────────────────────┐
        │ Documentos • PDF • Storage      │
        └─────────────────────────────────┘
```

O domínio clínico deverá ficar independente da camada de apresentação.

---

# 2. STACK TECNOLÓGICA

## 2.1 Base recomendada

- Node.js >= 20 LTS.
- TypeScript.
- PostgreSQL.
- React + TypeScript para frontend.
- API HTTP/JSON.
- Docker.
- GitHub Actions.
- Testes unitários, integração, SQL/RLS e E2E.

O v1.2 já utiliza Node >=20, TypeScript, PostgreSQL (`pg`), workspaces e scripts de verificação/migração/testes; o v1.3 deverá preservar os pontos tecnicamente bons, mas poderá reorganizá-los quando necessário. fileciteturn21file0

## 2.2 Supabase

Supabase deverá ser tratado como camada de infraestrutura/operação PostgreSQL quando efetivamente adotado.

A regra de negócio não deverá depender de APIs proprietárias do Supabase de maneira que impeça operação/teste local do domínio.

Se Supabase for mantido:

- PostgreSQL permanece fonte de verdade;
- RLS deve ser explicitamente modelado;
- Storage deverá ser segregado;
- Auth deverá ter contrato definido;
- Realtime deverá ser limitado aos casos que realmente necessitam de atualização ao vivo.

---

# 3. ESTRUTURA DE MONOREPO

Estrutura alvo:

```text
vitaloop-1.3/
├── apps/
│   ├── web/
│   └── api/
├── packages/
│   ├── domain/
│   ├── validation/
│   ├── auth/
│   ├── database/
│   ├── documents/
│   ├── clinical/
│   ├── events/
│   ├── audit/
│   ├── shared/
│   └── config/
├── db/
│   ├── migrations/
│   ├── seeds/
│   ├── functions/
│   ├── views/
│   └── tests/
├── tests/
│   ├── integration/
│   ├── e2e/
│   └── security/
├── docs/
├── scripts/
├── docker/
├── .github/workflows/
├── package.json
├── tsconfig.json
└── README.md
```

Regra: dependências deverão apontar para baixo; `domain` não poderá depender de React, HTTP ou banco.

---

# 4. FRONTEND

Frontend deverá possuir:

- rotas protegidas;
- contexto de usuário;
- contexto institucional;
- contexto do paciente;
- contexto do atendimento;
- controle de permissões;
- formulários estruturados;
- validação client-side apenas como primeira barreira;
- tratamento de erros de API;
- estados de carregamento;
- estados vazios;
- estados de concorrência;
- confirmação para ações destrutivas/irreversíveis;
- acessibilidade;
- responsividade;
- timeline;
- dashboards por perfil.

A UI deverá refletir estados reais retornados pelo domínio.

---

# 5. BACKEND

O backend deverá organizar:

1. autenticação;
2. autorização;
3. validação;
4. casos de uso;
5. regras clínicas;
6. transações;
7. persistência;
8. auditoria;
9. eventos;
10. respostas HTTP.

Controllers não deverão conter regras clínicas complexas.

---

# 6. POSTGRESQL

PostgreSQL será a fonte de verdade transacional.

Requisitos:

- UTF-8;
- timezone consistente;
- UUID para entidades externas/identificáveis;
- `timestamptz` para eventos;
- `numeric` quando precisão decimal for necessária;
- `jsonb` somente para dados realmente variáveis;
- constraints no banco;
- foreign keys;
- índices;
- unique constraints;
- check constraints;
- transações;
- RLS quando adotado.

---

# 7. SUPABASE, SE MANTIDO

Caso mantido:

- Auth não deverá substituir autorização clínica;
- RLS deverá refletir contexto institucional;
- Storage deverá usar buckets privados;
- links de arquivos deverão ser temporários/assinados quando necessário;
- Realtime deverá publicar somente eventos autorizados;
- service role nunca poderá ser exposta ao frontend;
- migrations deverão permanecer versionadas no repositório.

---

# 8. MODELO DE DADOS COMPLETO

O modelo deverá ser relacional e orientado a entidades clínicas.

Convenções:

- PK: `id uuid`;
- timestamps: `created_at`, `updated_at`;
- autoria: `created_by`, `updated_by`;
- entidades clínicas: `patient_id`, `encounter_id` quando aplicável;
- registros liberados: `status`, `signed_at`, `signed_by`;
- exclusão lógica somente onde necessária;
- histórico clínico não deverá ser apagado fisicamente por operação comum.

---

# 9. TODAS AS TABELAS — CATÁLOGO ALVO

As tabelas abaixo constituem o modelo-alvo funcional. O Documento 2 poderá ser refinado durante a revisão do esquema do v1.2, mas nenhuma tabela necessária ao Documento 1 deverá ficar sem representação.

## 9.1 Identidade e instituição

### `institutions`
`id`, `code`, `name`, `cnpj`, `status`, `created_at`, `updated_at`

### `units`
`id`, `institution_id`, `code`, `name`, `type`, `status`, `created_at`, `updated_at`

### `sectors`
`id`, `unit_id`, `code`, `name`, `sector_type`, `status`, `created_at`, `updated_at`

### `users`
`id`, `auth_subject`, `username`, `name`, `email`, `cpf`, `status`, `last_login_at`, `created_at`, `updated_at`

### `professional_profiles`
`id`, `user_id`, `professional_type`, `registration_type`, `registration_number`, `registration_uf`, `status`

### `roles`
`id`, `code`, `name`, `description`, `status`

### `permissions`
`id`, `code`, `name`, `description`, `resource`, `action`

### `user_roles`
`user_id`, `role_id`, `institution_id`, `unit_id`, `sector_id`, `valid_from`, `valid_until`, `status`

### `role_permissions`
`role_id`, `permission_id`, `scope`

### `access_policies`
`id`, `code`, `resource`, `action`, `scope_type`, `condition_definition`, `status`

---

# 10. TODAS AS COLUNAS — REGRAS GERAIS

Toda coluna deverá ter:

- tipo;
- nulabilidade;
- default;
- regra de validação;
- significado;
- origem;
- proteção;
- retenção.

Campos clínicos críticos não deverão aceitar valores arbitrários somente porque PostgreSQL permite.

---

# 11. TIPOS

Tipos deverão ser definidos como enums ou tabelas de domínio conforme necessidade de versionamento.

Exemplos:

- `user_status`;
- `encounter_status`;
- `triage_status`;
- `risk_level`;
- `queue_status`;
- `bed_status`;
- `prescription_status`;
- `medication_status`;
- `document_status`;
- `transfer_status`;
- `discharge_type`;
- `audit_action`;
- `break_glass_status`.

Catálogos clínicos versionáveis deverão preferir tabelas.

---

# 12. CONSTRAINTS

Obrigatórias quando aplicáveis:

- `NOT NULL`;
- `CHECK`;
- `FOREIGN KEY`;
- `UNIQUE`;
- exclusividade condicional;
- limites numéricos;
- datas coerentes;
- status válidos.

Exemplos:

- nascimento não pode estar no futuro;
- dose não pode ser negativa;
- leito não pode possuir duas ocupações ativas;
- encerramento não pode preceder abertura;
- `signed_at` exige assinatura válida;
- administração exige item prescrito quando a regra exigir.

---

# 13. FOREIGN KEYS

Relacionamentos clínicos deverão ser explícitos.

Exemplo:

```text
patient
 └── encounter
      ├── triage
      ├── clinical_notes
      ├── prescriptions
      ├── exams
      ├── procedures
      ├── bed_movements
      └── outcomes
```

Nenhum registro clínico deverá depender apenas de IDs soltos sem FK quando a relação for estrutural.

---

# 14. ÍNDICES

Índices obrigatórios deverão considerar:

- `patient_id`;
- `encounter_id`;
- `sector_id`;
- `bed_id`;
- `created_at`;
- `event_at`;
- status;
- filas;
- auditoria;
- documentos;
- prescrições;
- administração;
- buscas por identificadores.

Índices compostos deverão ser criados para consultas reais de produção.

---

# 15. UNIQUE CONSTRAINTS

Exemplos:

- CPF/CNS conforme regra institucional;
- código institucional;
- identificação de leito dentro do setor;
- username;
- registros profissionais;
- identificadores externos;
- idempotency key por escopo;
- códigos de catálogos.

Não usar `UNIQUE` indiscriminadamente em campos que podem legitimamente se repetir.

---

# 16. TRIGGERS

Triggers deverão ser reservados para integridade que realmente pertence ao banco.

Usos possíveis:

- `updated_at`;
- auditoria técnica de alterações;
- validações invariantes;
- proteção de documentos assinados;
- manutenção de projeções simples.

Regras clínicas complexas deverão permanecer no domínio transacional, salvo necessidade explícita de constraint no banco.

---

# 17. FUNCTIONS

Functions PostgreSQL poderão implementar:

- cálculos;
- validações invariantes;
- consultas seguras;
- agregações;
- operações atômicas específicas.

Não duplicar a mesma regra em função SQL e TypeScript sem contrato claro.

---

# 18. VIEWS

Views deverão ser usadas para:

- ocupação atual;
- filas;
- timeline;
- indicadores;
- dashboards;
- relatórios;
- auditoria.

Views de leitura não poderão ser tratadas como fonte primária de verdade.

---

# 19. RLS

Quando RLS for utilizado:

- negar por padrão;
- permitir por contexto;
- validar identidade;
- validar instituição/unidade/setor;
- considerar papel;
- considerar necessidade de saber;
- impedir acesso cruzado.

RLS deverá ser testado diretamente no banco.

---

# 20. RBAC

RBAC deverá separar:

```text
Usuário
 → papel
 → permissão
 → escopo
 → contexto
 → ato profissional
```

A autorização final deverá considerar todas as dimensões relevantes.

---

# 21. MATRIZ DE PERMISSÕES

Matriz mínima:

| Recurso | Administrativo | Técnico | Enfermeiro | Médico | Multi | Coordenação | Direção | Auditoria |
|---|---|---|---|---|---|---|---|---|
| Cadastro | C/R/U conforme escopo | R | R | R | R | R/U | R/U | R |
| Triagem | R | R* | C/U | R | R | R/U | R | R |
| Evolução médica | R | — | R | C/U | R | R | R | R |
| Evolução enfermagem | R | R* | C/U | R | R | R/U | R | R |
| Prescrição médica | — | — | — | C/U | conforme competência | R | R | R |
| Administração | — | C/U | C/U | R | — | R/U | R | R |
| Leitos | C/U | R/U conforme função | R/U | R | R | C/U | R/U | R |
| Auditoria | — | — | — | — | — | R | R | R |
| Break-glass | — | conforme política | conforme política | conforme política | conforme política | conforme política | conforme política | R |

`*` significa somente quando a competência e política institucional autorizarem.

A matriz definitiva deverá ser detalhada no Documento 3 e validada contra a legislação/competência profissional aplicável.

---

# 22. POLÍTICAS DE ACESSO

Toda requisição deverá ser avaliada por:

1. identidade;
2. sessão;
3. papel;
4. permissão;
5. escopo;
6. contexto;
7. necessidade de saber;
8. competência profissional;
9. estado do recurso;
10. eventual break-glass.

---

# 23. BREAK-GLASS

Implementação alvo:

```text
solicitação
 → autenticação
 → justificativa obrigatória
 → autorização excepcional
 → concessão temporária
 → auditoria
 → encerramento
```

Deverá existir tabela:

`break_glass_access(id, user_id, patient_id, encounter_id, reason, justification, granted_at, expires_at, revoked_at, status, audit_id)`.

---

# 24. SESSÕES

Sessão deverá possuir:

- identificador;
- usuário;
- criação;
- expiração;
- revogação;
- último uso;
- dispositivo/contexto quando permitido;
- IP/metadata de segurança conforme política.

Logout deverá invalidar sessão/revogar credencial quando aplicável.

---

# 25. AUTENTICAÇÃO

Deverá existir:

- login real;
- senha armazenada com hash seguro;
- política de senha;
- expiração/revogação;
- proteção contra brute force;
- sessão segura;
- cookies seguros quando aplicáveis;
- CSRF quando arquitetura exigir;
- não exposição de segredos.

---

# 26. RECUPERAÇÃO DE SENHA

Fluxo:

```text
solicitar
 → validar identidade sem revelar existência indevida
 → token temporário
 → redefinir
 → invalidar tokens anteriores
 → registrar auditoria
```

Tokens deverão possuir expiração e uso único.

---

# 27. MFA, SE ADOTADO

Se adotado:

- TOTP ou método institucional aprovado;
- códigos de recuperação;
- enrollment auditado;
- reset controlado;
- proteção contra replay.

MFA deverá ser exigível para perfis de maior privilégio se a política institucional determinar.

---

# 28. RATE LIMITING

Deverá existir por:

- IP;
- usuário;
- endpoint;
- ação sensível.

Especial atenção:

- login;
- recuperação de senha;
- busca;
- break-glass;
- APIs administrativas;
- geração de PDF;
- upload.

---

# 29. API COMPLETA

A API deverá ser organizada por domínio.

Prefixo recomendado:

`/api/v1`

Recursos:

- `/auth`
- `/users`
- `/patients`
- `/encounters`
- `/reception`
- `/triage`
- `/risk-classifications`
- `/queues`
- `/clinical-notes`
- `/diagnoses`
- `/vitals`
- `/scales`
- `/pain`
- `/glucose`
- `/fluid-balance`
- `/prescriptions`
- `/schedules`
- `/medication-administrations`
- `/medication-checks`
- `/exams`
- `/procedures`
- `/consultations`
- `/observation`
- `/beds`
- `/bed-movements`
- `/transfers`
- `/regulation`
- `/admissions`
- `/discharges`
- `/documents`
- `/signatures`
- `/timeline`
- `/pharmacy`
- `/aihs`
- `/safety-events`
- `/notifications`
- `/alerts`
- `/reports`
- `/dashboards`
- `/audit`
- `/break-glass`.

---

# 30. TODOS OS ENDPOINTS — PADRÃO

Cada recurso deverá possuir, quando aplicável:

```text
GET    /resource
GET    /resource/:id
POST   /resource
PATCH  /resource/:id
POST   /resource/:id/actions/:action
GET    /resource/:id/history
```

Operações clínicas não deverão ser modeladas como simples `PATCH status` quando representam transição de domínio.

Exemplo:

`POST /encounters/:id/discharge`

é preferível a:

`PATCH /encounters/:id {status:"DISCHARGED"}`.

---

# 31. REQUEST/RESPONSE

Todos os endpoints deverão possuir contratos versionados.

Resposta de sucesso:

```json
{
  "data": {},
  "meta": {},
  "requestId": "..."
}
```

Erro:

```json
{
  "error": {
    "code": "CLINICAL_VALIDATION_ERROR",
    "message": "Descrição segura",
    "details": [],
    "requestId": "..."
  }
}
```

Não retornar stack trace ao cliente.

---

# 32. CÓDIGOS HTTP

Usar:

- `200` sucesso;
- `201` criado;
- `202` aceito assíncrono;
- `204` sem conteúdo;
- `400` requisição inválida;
- `401` não autenticado;
- `403` não autorizado;
- `404` não encontrado;
- `409` conflito;
- `422` regra/validação de domínio;
- `429` rate limit;
- `500` erro interno;
- `503` indisponibilidade.

---

# 33. VALIDAÇÕES

Validação deverá existir em três camadas:

1. frontend para UX;
2. API/schema para contrato;
3. domínio/banco para integridade.

Nenhuma validação crítica poderá existir somente no frontend.

---

# 34. ERROS

Erros deverão possuir códigos estáveis.

Categorias:

- `AUTH_*`
- `ACCESS_*`
- `VALIDATION_*`
- `CLINICAL_*`
- `CONFLICT_*`
- `STATE_*`
- `NOT_FOUND_*`
- `RATE_LIMIT_*`
- `INTERNAL_*`.

Mensagens não deverão expor PII ou detalhes de segurança.

---

# 35. TRANSAÇÕES

Operações críticas deverão ser atômicas.

Exemplos:

### Alta
```text
validar
 → registrar desfecho
 → encerrar atendimento
 → liberar leito
 → finalizar pendências conforme regra
 → auditar
 → commit
```

### Transferência
```text
validar origem/destino
 → bloquear recursos
 → criar movimento
 → atualizar ocupação
 → gerar evento
 → auditar
 → commit
```

---

# 36. MÁQUINA DE ESTADOS

Estados deverão ser definidos no domínio.

Exemplo atendimento:

```text
OPEN
 → IN_TRIAGE
 → CLASSIFIED
 → WAITING
 → IN_CARE
 → OBSERVATION
 → ADMITTED
 → TRANSFERRED
 → DISCHARGED
 → EVASION
 → DECEASED
```

Nem toda transição será permitida de todo estado.

Toda transição deverá possuir:

- estado origem;
- estado destino;
- ator;
- permissão;
- pré-condição;
- evento;
- auditoria.

---

# 37. EVENTOS DE DOMÍNIO

Eventos mínimos:

- `PatientRegistered`
- `EncounterOpened`
- `TriageCompleted`
- `RiskClassified`
- `PatientQueued`
- `CareStarted`
- `ClinicalNoteSigned`
- `PrescriptionCreated`
- `PrescriptionSigned`
- `MedicationScheduled`
- `MedicationAdministered`
- `MedicationChecked`
- `ExamRequested`
- `ExamResultReleased`
- `BedOccupied`
- `BedReleased`
- `PatientTransferred`
- `AdmissionConfirmed`
- `DischargeCompleted`
- `EvasionRecorded`
- `DeathRecorded`
- `DocumentSigned`
- `BreakGlassUsed`.

Eventos deverão possuir ID único e timestamp.

---

# 38. TIMELINE

A timeline deverá ser construída a partir de eventos clínicos persistidos.

Não criar uma segunda fonte de verdade manual.

Cada evento deverá conter:

- `event_id`;
- tipo;
- paciente;
- atendimento;
- ator;
- timestamp do evento;
- timestamp do registro;
- payload mínimo;
- referência ao recurso.

---

# 39. AUDITORIA

Tabela-alvo:

`audit_events`

Campos:

`id`, `actor_user_id`, `action`, `resource_type`, `resource_id`, `patient_id`, `encounter_id`, `occurred_at`, `request_id`, `ip_hash/metadata conforme política`, `before_data`, `after_data`, `reason`, `severity`.

Dados de auditoria deverão possuir retenção e proteção próprias.

---

# 40. DOCUMENTOS

Modelo:

### `clinical_documents`
`id`, `patient_id`, `encounter_id`, `document_type`, `author_id`, `status`, `version`, `content_json`, `content_text`, `created_at`, `signed_at`, `signed_by`, `supersedes_id`

### `document_versions`
`id`, `document_id`, `version`, `content`, `created_by`, `created_at`, `reason`

### `document_files`
`id`, `document_id`, `storage_key`, `mime_type`, `sha256`, `size_bytes`, `created_at`

---

# 41. ASSINATURA

Assinatura deverá ser entidade separada quando necessário:

`document_signatures(id, document_id, signer_id, signer_role, signed_at, signature_method, integrity_hash, status)`.

Assinar deverá:

1. validar autorização;
2. congelar versão;
3. gerar hash;
4. registrar assinatura;
5. auditar;
6. emitir evento.

---

# 42. PDF

Pipeline:

```text
documento liberado
 → renderização determinística
 → geração PDF
 → hash
 → armazenamento privado
 → vínculo ao documento
 → auditoria
```

PDF deverá ser reprodutível e versionado.

---

# 43. PRESCRIÇÃO

Tabelas-alvo:

`prescriptions`  
`prescription_items`  
`prescription_schedules`  
`prescription_events`

Regras:

- prescrição pertence ao atendimento;
- item possui autoria;
- item possui status;
- alteração de prescrição liberada gera nova versão;
- não alterar silenciosamente prescrição histórica.

---

# 44. APRAZAMENTO

`prescription_schedules` deverá conter:

`id`, `prescription_item_id`, `scheduled_at`, `sequence`, `status`, `scheduled_by`, `created_at`, `updated_at`.

Alterações deverão gerar evento.

---

# 45. ADMINISTRAÇÃO DE MEDICAMENTOS

Tabelas:

`medication_administrations`  
`medication_checks`

Administração:

`id`, `prescription_item_id`, `patient_id`, `encounter_id`, `scheduled_at`, `administered_at`, `dose`, `unit`, `route`, `status`, `administered_by`, `reason`, `created_at`.

Checagem deverá estar vinculada à administração ou item agendado conforme o fluxo definido.

---

# 46. FILAS EM TEMPO REAL

Filas deverão possuir fonte transacional no banco.

Realtime deverá apenas distribuir mudanças.

Nunca usar canal realtime como fonte única de estado.

Cada cliente deverá:

1. carregar estado atual;
2. assinar eventos;
3. reconciliar eventos;
4. refazer consulta quando detectar lacuna.

---

# 47. CONCORRÊNCIA

Mecanismos:

- unique constraints;
- transações;
- row-level locks;
- optimistic concurrency;
- version fields;
- serialização de operações críticas.

Exemplo de ocupação:

```text
SELECT ... FOR UPDATE
 → validar leito livre
 → ocupar
 → commit
```

---

# 48. IDEMPOTÊNCIA

Endpoints de criação/ações críticas deverão aceitar:

`Idempotency-Key`.

A chave deverá ser única por usuário/cliente/operação conforme escopo.

Aplicações:

- prescrição;
- administração;
- transferência;
- alta;
- documentos;
- assinaturas;
- geração de AIH;
- notificações.

---

# 49. CACHE

Cache somente para dados apropriados:

- catálogos;
- configurações;
- listas pouco mutáveis;
- dados de leitura.

Nunca cachear de forma insegura:

- autorização;
- ocupação sem reconciliação;
- administração de medicamentos;
- estados clínicos críticos.

---

# 50. PERFORMANCE

Metas deverão ser mensuradas.

Objetivos iniciais:

- consultas comuns < 300 ms no backend em condições normais;
- ações transacionais críticas < 500 ms quando não dependentes de serviços externos;
- dashboards pesados assíncronos/cacheados;
- PDF fora do caminho síncrono quando pesado;
- paginação obrigatória em listas extensas;
- timeline incremental.

As metas deverão ser validadas com carga realista.

---

# 51. SEGURANÇA

Controles mínimos:

- TLS;
- secrets fora do código;
- hashing seguro;
- RBAC;
- RLS;
- least privilege;
- validação server-side;
- rate limiting;
- proteção de sessão;
- logs de segurança;
- auditoria;
- dependências atualizadas;
- headers de segurança;
- CSP quando aplicável;
- upload seguro;
- validação de MIME/tamanho;
- proteção contra IDOR.

---

# 52. LGPD

O sistema deverá aplicar:

- minimização;
- finalidade;
- necessidade;
- controle de acesso;
- rastreabilidade;
- retenção;
- descarte conforme política;
- proteção de dados sensíveis;
- segregação de ambientes;
- não utilização de produção em desenvolvimento sem anonimização/autorização.

---

# 53. LOGS

Logs deverão separar:

### Aplicação
erros e eventos operacionais.

### Segurança
login, falhas, autorização, break-glass.

### Auditoria clínica
ações sobre prontuário.

### Infraestrutura
processos, banco, container, sistema.

Logs não deverão armazenar dados clínicos desnecessários.

---

# 54. OBSERVABILIDADE

Deverão existir:

- logs estruturados;
- métricas;
- tracing quando possível;
- request ID;
- correlação entre API, banco e eventos;
- health checks;
- readiness;
- liveness;
- alertas.

---

# 55. BACKUP

Deverá existir:

- backup automático;
- backup lógico quando necessário;
- backup físico conforme infraestrutura;
- criptografia;
- retenção;
- cópia fora do ambiente primário;
- teste de restauração.

Backup sem teste de restauração não será considerado validado.

---

# 56. DISASTER RECOVERY

Deverão ser definidos:

- RPO;
- RTO;
- responsável;
- procedimento;
- dependências;
- ordem de restauração;
- validação pós-restauração.

Os valores institucionais definitivos permanecem decisão pendente.

---

# 57. CI/CD

Pipeline mínimo:

```text
commit
 → lint
 → typecheck
 → unit tests
 → integration tests
 → SQL tests
 → RLS tests
 → build
 → security checks
 → artifact
 → deploy staging
 → smoke
 → aprovação
 → production
```

Deploy de produção deverá ser rastreável ao commit.

---

# 58. DOCKER

Containers deverão:

- possuir imagem mínima;
- rodar sem root quando possível;
- possuir healthcheck;
- possuir limites;
- não embutir secrets;
- possuir versionamento;
- produzir logs para stdout/stderr.

---

# 59. AMBIENTES

Separar:

- local;
- teste;
- staging;
- produção.

Bancos deverão ser separados.

Nunca compartilhar credenciais de produção com desenvolvimento.

---

# 60. SECRETS

Secrets deverão estar em:

- secret manager;
- GitHub Actions Secrets;
- variáveis de ambiente protegidas;
- serviço equivalente.

Nunca:

- Git;
- frontend;
- bundle;
- documentação pública;
- logs.

Rotação deverá ser possível.

---

# 61. DEPLOY

Deploy deverá possuir:

- versão;
- commit;
- migration plan;
- health check;
- smoke test;
- observabilidade;
- aprovação quando necessária.

Migrations incompatíveis deverão seguir estratégia expand/contract.

---

# 62. ROLLBACK

Rollback deverá contemplar:

- aplicação;
- configuração;
- feature flags;
- migrations compatíveis;
- banco.

Não executar rollback destrutivo de banco sem procedimento específico.

Mudanças irreversíveis deverão possuir plano de recuperação.

---

# 63. MONITORAMENTO

Monitorar:

- disponibilidade;
- latência;
- erro HTTP;
- banco;
- conexões;
- CPU;
- memória;
- armazenamento;
- filas;
- jobs;
- PDF;
- autenticação;
- falhas de autorização;
- break-glass;
- backups;
- restaurações;
- integrações;
- eventos críticos.

Alertas de produção deverão possuir severidade:

- P1 crítico;
- P2 alto;
- P3 moderado;
- P4 baixo.

---

# 64. MODELO DE DADOS CLÍNICO — TABELAS ADICIONAIS

## `patients`
`id`, `medical_record_number`, `full_name`, `social_name`, `mother_name`, `birth_date`, `sex`, `cpf`, `cns`, `rg`, `phone`, `address`, `city`, `state`, `status`, `created_at`, `updated_at`

## `patient_contacts`
`id`, `patient_id`, `name`, `relationship`, `phone`, `is_emergency`, `created_at`, `updated_at`

## `patient_allergies`
`id`, `patient_id`, `substance`, `reaction`, `severity`, `status`, `recorded_by`, `recorded_at`

## `encounters`
`id`, `patient_id`, `unit_id`, `origin`, `encounter_type`, `status`, `opened_at`, `closed_at`, `opened_by`, `closed_by`, `current_sector_id`

## `reception_records`
`id`, `encounter_id`, `operator_id`, `complaint`, `origin`, `accompanying_person`, `recorded_at`

## `triages`
`id`, `encounter_id`, `professional_id`, `status`, `complaint`, `onset`, `observations`, `started_at`, `completed_at`

## `risk_classifications`
`id`, `triage_id`, `protocol`, `protocol_version`, `priority`, `color`, `discriminator`, `classified_by`, `classified_at`, `reason_for_reclassification`, `supersedes_id`

## `queues`
`id`, `queue_type`, `sector_id`, `status`, `created_at`

## `queue_entries`
`id`, `queue_id`, `encounter_id`, `priority`, `entered_at`, `called_at`, `started_at`, `ended_at`, `status`

## `clinical_notes`
`id`, `encounter_id`, `patient_id`, `author_id`, `note_type`, `content`, `status`, `created_at`, `signed_at`, `signed_by`, `supersedes_id`

## `diagnoses`
`id`, `encounter_id`, `patient_id`, `diagnosis_type`, `cid_code`, `description`, `status`, `is_primary`, `recorded_by`, `recorded_at`

## `vital_signs`
`id`, `encounter_id`, `patient_id`, `temperature`, `heart_rate`, `respiratory_rate`, `systolic_bp`, `diastolic_bp`, `spo2`, `weight`, `height`, `recorded_at`, `recorded_by`

## `clinical_scale_assessments`
`id`, `encounter_id`, `patient_id`, `scale_code`, `scale_version`, `answers_json`, `score`, `assessed_by`, `assessed_at`

## `pain_assessments`
`id`, `encounter_id`, `patient_id`, `scale`, `score`, `location`, `characteristics`, `onset`, `assessed_by`, `assessed_at`

## `glasgow_assessments`
`id`, `encounter_id`, `patient_id`, `eye_score`, `verbal_score`, `motor_score`, `total_score`, `assessed_by`, `assessed_at`

## `glucose_measurements`
`id`, `encounter_id`, `patient_id`, `value`, `unit`, `context`, `measured_at`, `measured_by`

## `fluid_balance_entries`
`id`, `encounter_id`, `patient_id`, `entry_type`, `category`, `volume_ml`, `occurred_at`, `recorded_by`, `notes`

## `fluid_balance_periods`
`id`, `encounter_id`, `start_at`, `end_at`, `total_input_ml`, `total_output_ml`, `balance_ml`, `calculated_at`

## `prescriptions`
`id`, `encounter_id`, `patient_id`, `prescriber_id`, `prescription_type`, `status`, `version`, `started_at`, `ended_at`, `signed_at`, `signed_by`

## `prescription_items`
`id`, `prescription_id`, `item_type`, `catalog_id`, `description`, `dose`, `unit`, `route`, `frequency`, `duration`, `dilution`, `rate`, `instructions`, `status`

## `prescription_schedules`
`id`, `prescription_item_id`, `scheduled_at`, `sequence`, `status`, `scheduled_by`

## `medication_administrations`
`id`, `prescription_item_id`, `patient_id`, `encounter_id`, `scheduled_at`, `administered_at`, `dose`, `unit`, `route`, `status`, `administered_by`, `reason`

## `medication_checks`
`id`, `medication_administration_id`, `checked_by`, `checked_at`, `status`, `reason`

## `exam_requests`
`id`, `encounter_id`, `patient_id`, `requested_by`, `exam_type`, `priority`, `justification`, `status`, `requested_at`

## `exam_results`
`id`, `exam_request_id`, `result_text`, `result_structured`, `released_by`, `released_at`, `status`

## `procedures`
`id`, `encounter_id`, `patient_id`, `procedure_type`, `performed_by`, `performed_at`, `result`, `complications`, `status`

## `consultation_requests`
`id`, `encounter_id`, `requested_by`, `specialty`, `priority`, `reason`, `status`, `requested_at`

## `consultation_responses`
`id`, `consultation_request_id`, `professional_id`, `response`, `responded_at`, `status`

## `observation_stays`
`id`, `encounter_id`, `sector_id`, `bed_id`, `started_at`, `ended_at`, `status`

## `beds`
`id`, `sector_id`, `code`, `bed_type`, `status`, `is_extra`, `extra_reason`, `opened_at`, `closed_at`

## `bed_occupancies`
`id`, `bed_id`, `patient_id`, `encounter_id`, `occupied_at`, `released_at`, `status`

## `bed_movements`
`id`, `encounter_id`, `patient_id`, `from_bed_id`, `to_bed_id`, `requested_by`, `approved_by`, `moved_at`, `reason`, `status`

## `external_transfers`
`id`, `encounter_id`, `patient_id`, `destination`, `reason`, `regulation_id`, `transport`, `status`, `requested_at`, `completed_at`

## `regulation_requests`
`id`, `encounter_id`, `requested_by`, `specialty`, `priority`, `destination`, `status`, `requested_at`, `updated_at`

## `admissions`
`id`, `encounter_id`, `patient_id`, `decision_by`, `sector_id`, `bed_id`, `admitted_at`, `status`, `aih_id`

## `outcomes`
`id`, `encounter_id`, `patient_id`, `outcome_type`, `reason`, `professional_id`, `occurred_at`, `status`

## `discharges`
`id`, `encounter_id`, `outcome_id`, `discharge_type`, `diagnosis_final`, `instructions`, `return_guidance`, `responsible_id`, `signed_at`

## `evasion_records`
`id`, `encounter_id`, `patient_id`, `last_seen_at`, `sector_id`, `circumstances`, `actions_taken`, `recorded_by`, `recorded_at`

## `death_records`
`id`, `encounter_id`, `patient_id`, `declared_by`, `declared_at`, `circumstances`, `destination`, `status`

## `pharmacy_items`
`id`, `catalog_id`, `description`, `unit`, `stock_quantity`, `status`

## `dispensations`
`id`, `prescription_item_id`, `patient_id`, `encounter_id`, `item_id`, `quantity`, `dispensed_by`, `dispensed_at`, `status`

## `aihs`
`id`, `encounter_id`, `patient_id`, `code`, `status`, `data_json`, `created_by`, `updated_at`

## `safety_events`
`id`, `patient_id`, `encounter_id`, `event_type`, `severity`, `description`, `reported_by`, `reported_at`, `status`, `investigation`

## `notifications`
`id`, `recipient_id`, `type`, `severity`, `title`, `message`, `resource_type`, `resource_id`, `read_at`, `created_at`

## `alerts`
`id`, `patient_id`, `encounter_id`, `alert_type`, `severity`, `condition`, `status`, `created_at`, `resolved_at`, `resolved_by`

## `domain_events`
`id`, `event_type`, `aggregate_type`, `aggregate_id`, `patient_id`, `encounter_id`, `payload`, `occurred_at`, `created_at`, `request_id`

## `idempotency_keys`
`id`, `key`, `scope`, `actor_id`, `request_hash`, `response_status`, `response_body`, `created_at`, `expires_at`

---

# 65. REGRAS DE MIGRATION

Migrations deverão:

- ser numeradas;
- ser pequenas;
- ser determinísticas;
- possuir rollback quando seguro;
- não apagar dados clínicos;
- possuir testes;
- ser executáveis em ambiente limpo;
- ser executáveis sobre base existente quando compatíveis.

Para mudanças incompatíveis:

```text
expand
 → migrar dados
 → alterar aplicação
 → validar
 → contract
```

---

# 66. SEED E DADOS DE TESTE

Seeds deverão:

- ser explicitamente identificados como dados de teste;
- nunca conter dados reais;
- produzir dados determinísticos;
- não habilitar bypass de segurança;
- permitir reset do ambiente.

Usuários de demonstração deverão possuir permissões mínimas.

---

# 67. SEGURANÇA DE ARQUIVOS

Uploads deverão:

- validar extensão;
- validar MIME real;
- limitar tamanho;
- gerar nome interno;
- armazenar fora do diretório público;
- possuir hash;
- possuir antivírus quando aplicável;
- possuir autorização de download;
- possuir auditoria.

---

# 68. INTEGRAÇÕES

Integrações externas deverão possuir:

- adaptador;
- timeout;
- retry controlado;
- circuit breaker quando necessário;
- idempotência;
- auditoria;
- tratamento de indisponibilidade;
- status da integração.

Nenhuma integração externa poderá bloquear indefinidamente uma transação clínica.

---

# 69. FEATURE FLAGS

Feature flags poderão controlar:

- funcionalidades em implantação;
- migrações graduais;
- módulos experimentais;
- rollout.

Feature flag não deverá ser usada para burlar autorização.

Toda flag deverá possuir:

- código;
- descrição;
- proprietário;
- estado por ambiente;
- data de revisão.

---

# 70. TESTES TÉCNICOS OBRIGATÓRIOS

Cada módulo crítico deverá possuir:

### Unitários
Regras puras de domínio.

### Integração
API + banco.

### SQL
Constraints, functions, triggers.

### RLS
Permissões reais por usuário/contexto.

### E2E
Fluxo completo.

### Concorrência
Operações simultâneas.

### Idempotência
Repetição da mesma requisição.

### Segurança
IDOR, escalada de privilégio, sessão, break-glass.

---

# 71. CHECKLIST TÉCNICO DE ACEITE

Antes de declarar qualquer módulo concluído:

- [ ] tabela criada;
- [ ] colunas documentadas;
- [ ] FK;
- [ ] constraints;
- [ ] índices;
- [ ] RLS;
- [ ] RBAC;
- [ ] API;
- [ ] validação;
- [ ] transação;
- [ ] auditoria;
- [ ] eventos;
- [ ] frontend;
- [ ] loading;
- [ ] erro;
- [ ] concorrência;
- [ ] idempotência;
- [ ] teste unitário;
- [ ] teste integração;
- [ ] teste RLS;
- [ ] teste E2E;
- [ ] documentação;
- [ ] critério do Documento 1 atendido.

---

# 72. COMPATIBILIDADE E MIGRAÇÃO DO V1.2

A migração deverá ocorrer por inventário.

Para cada artefato existente:

```text
PRESERVAR
CORRIGIR
COMPLETAR
SUBSTITUIR
DESCARTAR
NOVO
```

Não copiar todo o código do v1.2 para o v1.3 indiscriminadamente.

O inventário deverá abranger:

- tabelas;
- migrations;
- endpoints;
- componentes;
- páginas;
- hooks;
- services;
- domínio;
- testes;
- scripts;
- documentos;
- assets;
- configurações.

---

# 73. DEFINITION OF DONE TÉCNICO

O Vitaloop 1.3 só estará tecnicamente concluído quando:

1. arquitetura documentada;
2. modelo de dados validado;
3. migrations reproduzíveis;
4. constraints implementadas;
5. RLS testado;
6. RBAC testado;
7. API documentada;
8. contratos versionados;
9. máquinas de estado implementadas;
10. transações críticas protegidas;
11. idempotência implementada onde necessária;
12. auditoria implementada;
13. eventos implementados;
14. documentos e assinaturas íntegros;
15. PDF real;
16. realtime reconciliável;
17. backups testados;
18. observabilidade disponível;
19. CI/CD verde;
20. segurança validada;
21. staging validado;
22. rollback testado;
23. nenhum segredo versionado;
24. nenhum fluxo clínico crítico baseado em mock;
25. todos os requisitos do Documento 1 rastreados no Documento 3.

---

# 74. REGRA FINAL DE IMPLEMENTAÇÃO

O Claude Code não deverá interpretar este documento como autorização para implementar tudo de uma vez.

A implementação deverá seguir:

```text
Documento 1
    ↓
Documento 2
    ↓
inventário do v1.2
    ↓
plano de migração
    ↓
módulo
    ↓
banco
    ↓
domínio
    ↓
API
    ↓
frontend
    ↓
testes
    ↓
auditoria
    ↓
aceite
```

Nenhuma etapa deverá ser pulada para acelerar a construção.

---

# 75. REGRA DE NÃO-REGRESSÃO

Qualquer funcionalidade correta identificada no v1.2 deverá:

- permanecer disponível;
- ou ser substituída por equivalente superior;
- ou possuir decisão explícita de remoção.

Nenhuma funcionalidade poderá desaparecer simplesmente porque uma nova arquitetura foi criada.

---

# 76. REGRA DE RASTREABILIDADE

Todo requisito do Documento 1 deverá possuir:

`Requirement ID → Technical Design → Table/API/Component → Test → Evidence → Status`

Exemplo:

```text
BED-001
 ↓
bed_occupancies
 ↓
POST /beds/:id/occupy
 ↓
BedOccupancyService
 ↓
RLS + transaction test
 ↓
E2E
 ↓
HOMOLOGADO
```

---

# 77. GATE TÉCNICO ANTES DO DOCUMENTO 3

O Documento 3 somente deverá ser produzido após este documento estar aprovado e após o modelo técnico ter sido confrontado com o código real do v1.2.

O Documento 3 será responsável por transformar esta especificação em uma matriz operacional de:

**requisito → implementação → arquivo → teste → evidência → aceite → status.**

---

# 78. CONCLUSÃO

Este documento define a arquitetura técnica, modelo de dados, segurança, APIs, transações, eventos, documentos, infraestrutura e operação necessários para transformar o Blueprint Funcional e Clínico do Vitaloop 1.3 em um sistema real.

A regra central é:

> **Nenhuma tela, endpoint ou tabela isolada constitui uma funcionalidade concluída.**

Uma funcionalidade clínica somente estará completa quando existir coerência entre:

**interface → API → domínio → banco → segurança → auditoria → eventos → histórico → testes.**

**FIM DO DOCUMENTO 2**
