# VITALOOP 1.3
## DOCUMENTO 3 — Matriz de Rastreabilidade, Implementação, Testes e Homologação

**Título:** VITALOOP 1.3 — Matriz de Rastreabilidade, Implementação, Testes e Homologação  
**Versão:** 1.0  
**Data:** 19/08/2026  
**Documento:** 3 de 3  
**Dependências:** Documento 1 — Blueprint Funcional e Clínico; Documento 2 — Blueprint Técnico

---

# 0. FINALIDADE

Este documento é o mecanismo de controle que impede que o Vitaloop 1.3 seja considerado concluído quando somente parte de uma funcionalidade foi implementada.

A unidade mínima de conclusão será:

**REQUISITO → MÓDULO → BANCO → API → FRONTEND → RBAC → AUDITORIA → TESTE → ACEITE**

Se qualquer elo obrigatório estiver ausente, o requisito **NÃO ESTÁ PRONTO**.

Este documento não substitui os Documentos 1 e 2. Ele os transforma em uma matriz operacional de execução, verificação e homologação.

---

# 1. REGRA ABSOLUTA DE CONCLUSÃO

Um requisito somente poderá receber status `CONCLUÍDO` quando:

- o requisito estiver implementado;
- o banco necessário existir e estiver íntegro;
- a API necessária existir e funcionar;
- o frontend necessário existir e funcionar;
- RBAC estiver aplicado;
- RLS estiver aplicado quando aplicável;
- auditoria estiver registrada;
- eventos estiverem registrados quando aplicáveis;
- testes obrigatórios estiverem verdes;
- critério de aceite estiver comprovado;
- evidência estiver registrada;
- não houver pendência crítica.

**Tela funcionando ≠ requisito concluído.**

**Endpoint funcionando ≠ requisito concluído.**

**Tabela criada ≠ requisito concluído.**

**Teste passando sem fluxo real ≠ requisito concluído.**

---

# 2. STATUS PADRONIZADOS

Cada requisito deverá usar exatamente um dos estados:

| Status | Significado |
|---|---|
| `NÃO INICIADO` | Nenhum trabalho comprovado |
| `EM ANÁLISE` | Requisito sendo detalhado |
| `EM DESENVOLVIMENTO` | Implementação em andamento |
| `IMPLEMENTADO` | Código implementado, ainda sem homologação completa |
| `EM TESTE` | Implementação aguardando validação |
| `REPROVADO` | Teste/aceite falhou |
| `BLOQUEADO` | Dependência impede conclusão |
| `HOMOLOGADO` | Critérios atendidos e evidenciados |
| `CONCLUÍDO` | Homologado + documentação/rastreabilidade finalizadas |

---

# 3. MARCADORES DE IMPLEMENTAÇÃO

Cada coluna técnica deverá possuir:

- `✓` = implementado e evidenciado;
- `~` = parcialmente implementado;
- `✗` = ausente;
- `N/A` = comprovadamente não aplicável.

`~` nunca poderá ser interpretado como concluído.

---

# 4. REGRA DE RASTREABILIDADE

Cada requisito deverá possuir:

```text
REQ-ID
 ↓
MÓDULO
 ↓
TABELA(S)
 ↓
ENDPOINT(S)
 ↓
COMPONENTE(S)
 ↓
PERMISSÃO(ÕES)
 ↓
AUDITORIA/EVENTO
 ↓
TESTE(S)
 ↓
EVIDÊNCIA
 ↓
ACEITE
```

Nenhum requisito deverá ser implementado sem `REQ-ID`.

---

# 5. FORMATO OFICIAL DA MATRIZ

| ID | Requisito | Módulo | Banco | API | Frontend | RBAC | Auditoria | Teste | Aceite | Status |
|---|---|---|---|---|---|---|---|---|---|---|

Para execução real, acrescentar:

| ID | Arquivos | Migration | Endpoint | Componentes | Testes | Evidência | Responsável | Data | Status |
|---|---|---|---|---|---|---|---|---|---|

---

# 6. CAMPOS OBRIGATÓRIOS POR REQUISITO

Cada linha deverá conter:

1. ID;
2. fase;
3. requisito;
4. módulo;
5. descrição curta;
6. tabela(s);
7. migration(s);
8. endpoint(s);
9. componente(s);
10. RBAC;
11. RLS;
12. auditoria;
13. evento;
14. testes;
15. critério de aceite;
16. evidência;
17. status;
18. pendência;
19. responsável;
20. data de homologação.

---

# 7. FASE 0 — FUNDAMENTOS

| ID | Requisito | Módulo | Banco | API | Frontend | RBAC | Auditoria | Teste | Aceite |
|---|---|---|---|---|---|---|---|---|---|
| FND-001 | Arquitetura em camadas | Arquitetura | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| FND-002 | PostgreSQL | Dados | ✓ | ✓ | — | — | ✓ | ✓ | ✓ |
| FND-003 | RLS | Segurança | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| FND-004 | RBAC | Segurança | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| FND-005 | Sessões | Autenticação | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| FND-006 | Autenticação | Identidade | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| FND-007 | Identidade real do usuário | Identidade | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| FND-008 | Necessidade de saber | Segurança | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| FND-009 | Acesso excepcional | Break-glass | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| FND-010 | Auditoria | Auditoria | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| FND-011 | Máquina de estados | Domínio | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| FND-012 | Eventos de domínio | Eventos | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| FND-013 | Timeline | Timeline | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| FND-014 | Integridade transacional | Dados | ✓ | ✓ | — | — | ✓ | ✓ | ✓ |
| FND-015 | Concorrência | Domínio | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| FND-016 | Idempotência | API | ✓ | ✓ | — | ✓ | ✓ | ✓ | ✓ |
| FND-017 | Observabilidade | Infra | — | ✓ | — | — | ✓ | ✓ | ✓ |
| FND-018 | Logs | Infra | — | ✓ | — | — | ✓ | ✓ | ✓ |
| FND-019 | Health/readiness | Infra | — | ✓ | — | — | — | ✓ | ✓ |
| FND-020 | Backup/restore | Infra | ✓ | — | — | — | ✓ | ✓ | ✓ |
| FND-021 | Disaster recovery | Infra | ✓ | ✓ | — | — | ✓ | ✓ | ✓ |
| FND-022 | CI/CD | DevOps | — | ✓ | ✓ | — | ✓ | ✓ | ✓ |
| FND-023 | Ambientes | DevOps | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| FND-024 | Secrets | Segurança | — | ✓ | — | ✓ | ✓ | ✓ | ✓ |
| FND-025 | Rollback | DevOps | ✓ | ✓ | ✓ | — | ✓ | ✓ | ✓ |

---

# 8. FASE 1 — IDENTIDADE E SEGURANÇA

| ID | Requisito | Módulo | Banco | API | Frontend | RBAC | Auditoria | Teste | Aceite |
|---|---|---|---|---|---|---|---|---|---|
| SEC-001 | Login real | Autenticação | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| SEC-002 | Logout | Autenticação | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| SEC-003 | Sessões | Autenticação | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| SEC-004 | Expiração | Autenticação | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| SEC-005 | Revogação | Autenticação | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| SEC-006 | Dispositivos | Segurança | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| SEC-007 | Recuperação de senha | Autenticação | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| SEC-008 | Alteração de senha | Autenticação | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| SEC-009 | Política de senha | Segurança | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| SEC-010 | MFA/2FA | Segurança | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| SEC-011 | Rate limiting | Segurança | — | ✓ | — | ✓ | ✓ | ✓ | ✓ |
| SEC-012 | Brute-force protection | Segurança | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| SEC-013 | RBAC | Segurança | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| SEC-014 | Matriz de permissões | Segurança | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| SEC-015 | Permissões por profissão | Segurança | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| SEC-016 | Permissões por setor | Segurança | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| SEC-017 | Permissões por vínculo | Segurança | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| SEC-018 | Necessidade de saber | Segurança | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| SEC-019 | Break-glass | Segurança | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| SEC-020 | Auditoria de acesso | Auditoria | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| SEC-021 | Tentativa negada | Auditoria | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| SEC-022 | Acesso excepcional | Auditoria | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

---

# 9. FASE 2 — CADASTRO E IDENTIDADE DO PACIENTE

| ID | Requisito | Módulo | Banco | API | Frontend | RBAC | Auditoria | Teste | Aceite |
|---|---|---|---|---|---|---|---|---|---|
| PAT-001 | Cadastro completo | Pacientes | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| PAT-002 | Identificação segura | Pacientes | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| PAT-003 | CPF | Pacientes | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| PAT-004 | CNS | Pacientes | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| PAT-005 | Prontuário | Pacientes | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| PAT-006 | Dados demográficos | Pacientes | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| PAT-007 | Contatos | Pacientes | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| PAT-008 | Contato de emergência | Pacientes | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| PAT-009 | Alergias | Segurança do paciente | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| PAT-010 | Reações adversas | Segurança do paciente | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| PAT-011 | Antecedentes | Prontuário | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| PAT-012 | Medicamentos contínuos | Prontuário | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| PAT-013 | Problemas ativos | Prontuário | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| PAT-014 | Histórico clínico | Prontuário | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| PAT-015 | Detecção de duplicidade | Pacientes | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| PAT-016 | Merge controlado | Pacientes | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| PAT-017 | Auditoria de alterações | Auditoria | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

---

# 10. FASE 3 — ATENDIMENTO

| ID | Requisito | Módulo | Banco | API | Frontend | RBAC | Auditoria | Teste | Aceite |
|---|---|---|---|---|---|---|---|---|---|
| ENC-001 | Abertura | Atendimento | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| ENC-002 | Origem | Atendimento | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| ENC-003 | Setor | Atendimento | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| ENC-004 | Motivo | Atendimento | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| ENC-005 | Tipo | Atendimento | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| ENC-006 | Estados | Atendimento | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| ENC-007 | Responsável | Atendimento | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| ENC-008 | Vínculo profissional | Atendimento | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| ENC-009 | Timeline | Timeline | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| ENC-010 | Eventos | Eventos | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| ENC-011 | Controle temporal | Atendimento | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| ENC-012 | Concorrência | Atendimento | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| ENC-013 | Encerramento | Atendimento | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

---

# 11. FASE 4 — RECEPÇÃO E FILAS

| ID | Requisito | Módulo | Banco | API | Frontend | RBAC | Auditoria | Teste | Aceite |
|---|---|---|---|---|---|---|---|---|---|
| QUE-001 | Fila de recepção | Filas | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| QUE-002 | Fila de triagem | Filas | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| QUE-003 | Fila médica | Filas | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| QUE-004 | Fila de reavaliação | Filas | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| QUE-005 | Priorização | Filas | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| QUE-006 | Chamamento | Filas | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| QUE-007 | Rechamada | Filas | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| QUE-008 | Ausência | Filas | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| QUE-009 | Tempo de espera | Filas | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| QUE-010 | Alertas | Alertas | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| QUE-011 | Atualização em tempo real | Realtime | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| QUE-012 | Dashboard de filas | Gestão | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

---

# 12. FASE 5 — TRIAGEM

| ID | Requisito | Módulo | Banco | API | Frontend | RBAC | Auditoria | Teste | Aceite |
|---|---|---|---|---|---|---|---|---|---|
| TRI-001 | Registrar triagem | Triagem | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| TRI-002 | Sinais vitais | Triagem | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| TRI-003 | Dor | Triagem | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| TRI-004 | Glasgow | Triagem | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| TRI-005 | Glicemia | Triagem | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| TRI-006 | Queixa | Triagem | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| TRI-007 | História | Triagem | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| TRI-008 | Comorbidades | Triagem | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| TRI-009 | Alergias | Triagem | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| TRI-010 | Classificação | Classificação de risco | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| TRI-011 | Manchester | Classificação de risco | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| TRI-012 | Fluxogramas | Classificação de risco | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| TRI-013 | Discriminadores | Classificação de risco | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| TRI-014 | Protocolos versionados | Classificação de risco | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| TRI-015 | Tempo-alvo | Classificação de risco | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| TRI-016 | Auditoria | Auditoria | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| TRI-017 | Transição de estado | Domínio | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

---

# 13. FASE 6 — ATENDIMENTO MÉDICO

| ID | Requisito | Módulo | Banco | API | Frontend | RBAC | Auditoria | Teste | Aceite |
|---|---|---|---|---|---|---|---|---|---|
| MED-001 | Registrar consulta | Atendimento médico | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| MED-002 | Anamnese | Atendimento médico | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| MED-003 | Exame físico | Atendimento médico | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| MED-004 | Hipóteses | Atendimento médico | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| MED-005 | Diagnósticos | Diagnósticos | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| MED-006 | CID | Diagnósticos | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| MED-007 | Conduta | Atendimento médico | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| MED-008 | Prescrição | Prescrição | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| MED-009 | Exames | Exames | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| MED-010 | Procedimentos | Procedimentos | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| MED-011 | Parecer | Interconsulta | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| MED-012 | Interconsulta | Interconsulta | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| MED-013 | Evolução | Atendimento médico | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| MED-014 | Reavaliação | Atendimento médico | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| MED-015 | Desfecho | Atendimento médico | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

---

# 14. FASE 7 — ENFERMAGEM

| ID | Requisito | Módulo | Banco | API | Frontend | RBAC | Auditoria | Teste | Aceite |
|---|---|---|---|---|---|---|---|---|---|
| NUR-001 | Admissão | Enfermagem | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| NUR-002 | Evolução | Enfermagem | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| NUR-003 | Anotação | Enfermagem | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| NUR-004 | Processo de enfermagem | Enfermagem | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| NUR-005 | Diagnósticos de enfermagem | Enfermagem | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| NUR-006 | Prescrição de enfermagem | Enfermagem | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| NUR-007 | Procedimentos | Enfermagem | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| NUR-008 | Sinais vitais | Enfermagem | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| NUR-009 | Balanço hídrico | Enfermagem | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| NUR-010 | Escalas | Enfermagem | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| NUR-011 | Dispositivos | Enfermagem | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| NUR-012 | Riscos assistenciais | Segurança | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

---

# 15. FASE 8 — PRESCRIÇÃO E MEDICAMENTOS

| ID | Requisito | Módulo | Banco | API | Frontend | RBAC | Auditoria | Teste | Aceite |
|---|---|---|---|---|---|---|---|---|---|
| MEDC-001 | Catálogo de medicamentos | Farmácia | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| MEDC-002 | Prescrição estruturada | Prescrição | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| MEDC-003 | Medicamento | Prescrição | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| MEDC-004 | Dose | Prescrição | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| MEDC-005 | Unidade | Prescrição | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| MEDC-006 | Via | Prescrição | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| MEDC-007 | Frequência | Prescrição | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| MEDC-008 | Duração | Prescrição | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| MEDC-009 | Aprazamento | Aprazamento | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| MEDC-010 | Administração | Medicamentos | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| MEDC-011 | Checagem | Medicamentos | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| MEDC-012 | Suspensão | Prescrição | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| MEDC-013 | Cancelamento | Prescrição | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| MEDC-014 | Justificativa | Prescrição | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| MEDC-015 | Histórico | Prontuário | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| MEDC-016 | Alergia | Segurança | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| MEDC-017 | Interações | Segurança medicamentosa | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| MEDC-018 | Farmácia | Farmácia | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| MEDC-019 | Auditoria | Auditoria | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

---

# 16. FASE 9 — EXAMES E PROCEDIMENTOS

| ID | Requisito | Módulo | Banco | API | Frontend | RBAC | Auditoria | Teste | Aceite |
|---|---|---|---|---|---|---|---|---|---|
| EXM-001 | Solicitação | Exames | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| EXM-002 | Coleta | Exames | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| EXM-003 | Resultado | Exames | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| EXM-004 | Visualização | Exames | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| EXM-005 | Anexos | Documentos | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| EXM-006 | Imagens | Documentos | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| EXM-007 | Procedimentos | Procedimentos | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| EXM-008 | Registro profissional | Procedimentos | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| EXM-009 | Auditoria | Auditoria | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

---

# 17. FASE 10 — LEITOS E OBSERVAÇÃO

| ID | Requisito | Módulo | Banco | API | Frontend | RBAC | Auditoria | Teste | Aceite |
|---|---|---|---|---|---|---|---|---|---|
| BED-001 | Leitos | Leitos | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| BED-002 | Setores | Leitos | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| BED-003 | Ocupação | Leitos | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| BED-004 | Leito extra | Leitos | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| BED-005 | Reserva | Leitos | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| BED-006 | Transferência interna | Leitos | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| BED-007 | Transferência externa | Regulação | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| BED-008 | Regulação | Regulação | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| BED-009 | Tempo de permanência | Leitos | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| BED-010 | Alta do leito | Leitos | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| BED-011 | Liberação automática | Leitos | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| BED-012 | Concorrência | Leitos | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| BED-013 | Auditoria | Auditoria | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

---

# 18. FASE 11 — DESFECHOS

| ID | Requisito | Módulo | Banco | API | Frontend | RBAC | Auditoria | Teste | Aceite |
|---|---|---|---|---|---|---|---|---|---|
| OUT-001 | Alta médica | Desfechos | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| OUT-002 | Alta administrativa | Desfechos | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| OUT-003 | Alta a pedido | Desfechos | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| OUT-004 | Evasão | Desfechos | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| OUT-005 | Transferência | Desfechos | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| OUT-006 | Internação | Internação | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| OUT-007 | Óbito | Desfechos | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| OUT-008 | Encerramento | Atendimento | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| OUT-009 | Sumário de alta | Documentos | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| OUT-010 | Orientações | Alta | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| OUT-011 | Prescrição de alta | Alta | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| OUT-012 | Liberação de leito | Leitos | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| OUT-013 | Timeline | Timeline | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| OUT-014 | Auditoria | Auditoria | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

---

# 19. FASE 12 — DOCUMENTOS CLÍNICOS

| ID | Requisito | Módulo | Banco | API | Frontend | RBAC | Auditoria | Teste | Aceite |
|---|---|---|---|---|---|---|---|---|---|
| DOC-001 | Tipos documentais | Documentos | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| DOC-002 | Templates | Documentos | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| DOC-003 | Campos | Documentos | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| DOC-004 | Versionamento | Documentos | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| DOC-005 | Assinatura | Documentos | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| DOC-006 | Assinatura eletrônica | Documentos | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| DOC-007 | Imutabilidade | Documentos | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| DOC-008 | Correção | Documentos | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| DOC-009 | Cancelamento | Documentos | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| DOC-010 | Justificativa | Documentos | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| DOC-011 | PDF real | Documentos | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| DOC-012 | Impressão | Documentos | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| DOC-013 | QR Code | Documentos | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| DOC-014 | Validação | Documentos | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| DOC-015 | Auditoria | Auditoria | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| DOC-016 | Controle de acesso | Segurança | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

---

# 20. FASE 13 — SEGURANÇA DO PACIENTE

| ID | Requisito | Módulo | Banco | API | Frontend | RBAC | Auditoria | Teste | Aceite |
|---|---|---|---|---|---|---|---|---|---|
| SAF-001 | Eventos adversos | Segurança | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| SAF-002 | Quedas | Segurança | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| SAF-003 | Lesão por pressão | Segurança | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| SAF-004 | Identificação | Segurança | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| SAF-005 | Alergia | Segurança | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| SAF-006 | Medicamentos | Segurança | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| SAF-007 | Isolamento | Segurança | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| SAF-008 | Precauções | Segurança | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| SAF-009 | Dispositivos | Segurança | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| SAF-010 | Notificações | Notificações | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| SAF-011 | Auditoria | Auditoria | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

---

# 21. FASE 14 — GESTÃO

| ID | Requisito | Módulo | Banco | API | Frontend | RBAC | Auditoria | Teste | Aceite |
|---|---|---|---|---|---|---|---|---|---|
| MGT-001 | Dashboard operacional | Gestão | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| MGT-002 | Ocupação | Gestão | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| MGT-003 | Classificação de risco | Gestão | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| MGT-004 | Tempo de espera | Gestão | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| MGT-005 | Tempo de permanência | Gestão | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| MGT-006 | Produção | Gestão | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| MGT-007 | Indicadores assistenciais | Indicadores | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| MGT-008 | Indicadores de enfermagem | Indicadores | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| MGT-009 | Indicadores médicos | Indicadores | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| MGT-010 | Relatórios | Relatórios | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| MGT-011 | Exportações | Relatórios | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| MGT-012 | Auditoria administrativa | Auditoria | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

---

# 22. FASE 15 — SUS / AIH / REGULAÇÃO

| ID | Requisito | Módulo | Banco | API | Frontend | RBAC | Auditoria | Teste | Aceite |
|---|---|---|---|---|---|---|---|---|---|
| SUS-001 | AIH | SUS | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| SUS-002 | SIGTAP | SUS | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| SUS-003 | CID | SUS | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| SUS-004 | Procedimentos | SUS | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| SUS-005 | Compatibilidades | SUS | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| SUS-006 | Regras obrigatórias | SUS | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| SUS-007 | Regulação | Regulação | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| SUS-008 | Transferência | Regulação | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| SUS-009 | Documentação | SUS | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| SUS-010 | Validação | SUS | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

---

# 23. FASE 16 — INTEGRAÇÕES

| ID | Requisito | Módulo | Banco | API | Frontend | RBAC | Auditoria | Teste | Aceite |
|---|---|---|---|---|---|---|---|---|---|
| INT-001 | Laboratório | Integrações | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| INT-002 | Radiologia | Integrações | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| INT-003 | PACS | Integrações | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| INT-004 | Farmácia | Integrações | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| INT-005 | Regulação | Integrações | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| INT-006 | SUS | Integrações | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| INT-007 | AIH | Integrações | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| INT-008 | Identidade institucional | Integrações | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| INT-009 | Integrações futuras | Integrações | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

Integrações inexistentes deverão permanecer `NÃO INICIADO` ou `PLANEJADO`; nunca deverão receber `✓` apenas porque foram previstos.

---

# 24. FASE 17 — SEGURANÇA TÉCNICA

| ID | Requisito | Módulo | Banco | API | Frontend | RBAC | Auditoria | Teste | Aceite |
|---|---|---|---|---|---|---|---|---|---|
| SEC-T-001 | IDOR/BOLA | Segurança | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| SEC-T-002 | Escalonamento de privilégio | Segurança | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| SEC-T-003 | Bypass de RLS | Segurança | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| SEC-T-004 | Bypass de RBAC | Segurança | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| SEC-T-005 | SQL injection | Segurança | ✓ | ✓ | — | — | ✓ | ✓ | ✓ |
| SEC-T-006 | XSS | Segurança | — | ✓ | ✓ | — | ✓ | ✓ | ✓ |
| SEC-T-007 | CSRF | Segurança | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| SEC-T-008 | CORS | Segurança | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| SEC-T-009 | Headers | Segurança | — | ✓ | ✓ | — | ✓ | ✓ | ✓ |
| SEC-T-010 | Secrets | Segurança | — | ✓ | — | ✓ | ✓ | ✓ | ✓ |
| SEC-T-011 | Logs | Segurança | — | ✓ | — | — | ✓ | ✓ | ✓ |
| SEC-T-012 | Dados sensíveis | LGPD | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| SEC-T-013 | Minimização | LGPD | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| SEC-T-014 | LGPD | LGPD | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| SEC-T-015 | Retenção | LGPD | ✓ | ✓ | — | ✓ | ✓ | ✓ | ✓ |
| SEC-T-016 | Auditoria | Auditoria | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

---

# 25. FASE 18 — QUALIDADE

| ID | Requisito | Módulo | Banco | API | Frontend | RBAC | Auditoria | Teste | Aceite |
|---|---|---|---|---|---|---|---|---|---|
| QLT-001 | Testes unitários | Qualidade | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| QLT-002 | Testes de integração | Qualidade | ✓ | ✓ | — | ✓ | ✓ | ✓ | ✓ |
| QLT-003 | Testes de RLS | Segurança | ✓ | ✓ | — | ✓ | ✓ | ✓ | ✓ |
| QLT-004 | Testes de API | Qualidade | ✓ | ✓ | — | ✓ | ✓ | ✓ | ✓ |
| QLT-005 | Testes E2E | Qualidade | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| QLT-006 | Testes de UI | Qualidade | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| QLT-007 | Testes de concorrência | Qualidade | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| QLT-008 | Testes de carga | Qualidade | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| QLT-009 | Testes de segurança | Segurança | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| QLT-010 | Testes de regressão | Qualidade | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| QLT-011 | Testes de backup | Infra | ✓ | — | — | — | ✓ | ✓ | ✓ |
| QLT-012 | Testes de restore | Infra | ✓ | — | — | — | ✓ | ✓ | ✓ |
| QLT-013 | Testes de disaster recovery | Infra | ✓ | ✓ | — | — | ✓ | ✓ | ✓ |
| QLT-014 | Testes de impressão/PDF | Documentos | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| QLT-015 | Testes de acessibilidade | Frontend | — | — | ✓ | ✓ | — | ✓ | ✓ |

---

# 26. FASE 19 — PRODUÇÃO

| ID | Requisito | Módulo | Banco | API | Frontend | RBAC | Auditoria | Teste | Aceite |
|---|---|---|---|---|---|---|---|---|---|
| PRD-001 | Docker | DevOps | — | ✓ | ✓ | — | ✓ | ✓ | ✓ |
| PRD-002 | Usuário de banco não-superuser | Banco | ✓ | ✓ | — | ✓ | ✓ | ✓ | ✓ |
| PRD-003 | Secrets | Segurança | — | ✓ | — | ✓ | ✓ | ✓ | ✓ |
| PRD-004 | CORS de produção | Segurança | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| PRD-005 | Healthcheck | Infra | — | ✓ | — | — | — | ✓ | ✓ |
| PRD-006 | Readiness | Infra | ✓ | ✓ | — | — | — | ✓ | ✓ |
| PRD-007 | Migrations | Banco | ✓ | ✓ | — | — | ✓ | ✓ | ✓ |
| PRD-008 | Rollback | DevOps | ✓ | ✓ | ✓ | — | ✓ | ✓ | ✓ |
| PRD-009 | Backup | Infra | ✓ | — | — | — | ✓ | ✓ | ✓ |
| PRD-010 | Restore | Infra | ✓ | — | — | — | ✓ | ✓ | ✓ |
| PRD-011 | Off-site backup | Infra | ✓ | — | — | — | ✓ | ✓ | ✓ |
| PRD-012 | Criptografia | Segurança | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| PRD-013 | RPO | DR | ✓ | ✓ | — | — | ✓ | ✓ | ✓ |
| PRD-014 | RTO | DR | ✓ | ✓ | — | — | ✓ | ✓ | ✓ |
| PRD-015 | Monitoramento | Observabilidade | ✓ | ✓ | ✓ | — | ✓ | ✓ | ✓ |
| PRD-016 | Alertas | Observabilidade | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| PRD-017 | Logs estruturados | Observabilidade | — | ✓ | — | — | ✓ | ✓ | ✓ |
| PRD-018 | Correlation ID | Observabilidade | — | ✓ | — | — | ✓ | ✓ | ✓ |
| PRD-019 | Métricas | Observabilidade | ✓ | ✓ | ✓ | — | ✓ | ✓ | ✓ |
| PRD-020 | Disaster recovery | DR | ✓ | ✓ | ✓ | — | ✓ | ✓ | ✓ |

---

# 27. FASE 20 — HOMOLOGAÇÃO

| ID | Requisito | Módulo | Banco | API | Frontend | RBAC | Auditoria | Teste | Aceite |
|---|---|---|---|---|---|---|---|---|---|
| HOM-001 | Matriz requisito × implementação | Homologação | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| HOM-002 | Matriz tela × API | Homologação | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| HOM-003 | Matriz API × banco | Homologação | ✓ | ✓ | — | ✓ | ✓ | ✓ | ✓ |
| HOM-004 | Matriz função × RBAC | Homologação | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| HOM-005 | Matriz evento × auditoria | Homologação | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| HOM-006 | Matriz requisito × teste | Homologação | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| HOM-007 | Critérios de aceite | Homologação | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| HOM-008 | Testes clínicos | Homologação | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| HOM-009 | Testes de segurança | Homologação | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| HOM-010 | Testes de produção | Homologação | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| HOM-011 | Homologação assistencial | Homologação | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| HOM-012 | Homologação administrativa | Homologação | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| HOM-013 | Homologação técnica | Homologação | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| HOM-014 | Checklist final de produção | Go-live | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

---

# 28. MATRIZ DE FLUXO COMPLETO

Além das linhas individuais, os fluxos críticos deverão ser testados de ponta a ponta.

## FLX-001 — Entrada do paciente

```text
Cadastro
 → Recepção
 → Atendimento
 → Fila
 → Triagem
 → Classificação
 → Fila assistencial
 → Atendimento
```

Todos os passos deverão gerar registros coerentes.

## FLX-002 — Atendimento médico

```text
Fila
 → Consulta
 → Anamnese
 → Exame
 → Diagnóstico
 → Conduta
 → Prescrição
 → Exames
 → Procedimentos
 → Reavaliação
 → Desfecho
```

## FLX-003 — Atendimento de enfermagem

```text
Admissão
 → Avaliação
 → Processo de enfermagem
 → Prescrição
 → Sinais vitais
 → Balanço
 → Administração
 → Evolução
```

## FLX-004 — Medicamento

```text
Prescrição
 → Aprazamento
 → Item agendado
 → Checagem
 → Administração
 → Registro
 → Auditoria
```

## FLX-005 — Transferência

```text
Solicitação
 → Validação
 → Destino
 → Reserva
 → Movimento
 → Nova ocupação
 → Liberação origem
 → Timeline
 → Auditoria
```

## FLX-006 — Alta

```text
Decisão
 → Validações
 → Documentação
 → Assinatura
 → Orientações
 → Encerramento
 → Liberação leito
 → Timeline
 → Auditoria
```

## FLX-007 — Óbito

```text
Identificação
 → Declaração
 → Registro
 → Documentação
 → Encerramento
 → Liberação
 → Auditoria
```

---

# 29. MATRIZ TELA × API

Toda tela operacional deverá possuir uma linha:

| Tela | GET | POST | PATCH/Ação | Permissão | RLS | Erros | Loading | Auditoria | Teste |
|---|---|---|---|---|---|---|---|---|---|

Regra:

**Nenhuma tela crítica poderá existir sem API real.**

Exceções somente para telas explicitamente declaradas como estáticas/configuração.

---

# 30. MATRIZ API × BANCO

Todo endpoint deverá possuir:

| Endpoint | Caso de uso | Tabela | Transação | RLS | RBAC | Auditoria | Evento | Idempotência | Teste |
|---|---|---|---|---|---|---|---|---|---|

Se um endpoint altera dado clínico e não possuir estratégia de auditoria, deverá ser considerado incompleto.

---

# 31. MATRIZ FUNÇÃO × RBAC

Toda ação deverá possuir:

| Ação | Profissão | Papel | Setor | Vínculo | Necessidade de saber | Break-glass | Permitido |
|---|---|---|---|---|---|---|---|

Exemplos:

- prescrever;
- administrar medicamento;
- classificar risco;
- alterar leito;
- transferir;
- assinar documento;
- registrar óbito;
- acessar prontuário;
- exportar relatório;
- acessar auditoria.

---

# 32. MATRIZ EVENTO × AUDITORIA

Todo evento clínico crítico deverá possuir:

| Evento | Actor | Timestamp | Paciente | Atendimento | Payload | Auditoria | Imutabilidade | Teste |
|---|---|---|---|---|---|---|---|---|

Eventos sem autoria ou temporalidade adequada deverão ser reprovados.

---

# 33. MATRIZ REQUISITO × TESTE

Todo requisito deverá possuir no mínimo:

- teste unitário quando houver regra pura;
- integração quando houver API/banco;
- RLS quando houver acesso;
- E2E quando houver fluxo assistencial;
- segurança quando houver exposição relevante.

Exemplo:

```text
TRI-001
 ├─ TRI-001-UNIT
 ├─ TRI-001-API
 ├─ TRI-001-RLS
 ├─ TRI-001-E2E
 └─ TRI-001-SEC
```

---

# 34. TIPOS DE TESTE

## UNIT
Regra isolada.

## API
Contrato e comportamento HTTP.

## DB
Constraint, FK, trigger, function, view.

## RLS
Acesso permitido/negado.

## RBAC
Permissão por perfil.

## E2E
Fluxo real.

## UI
Comportamento da interface.

## CONC
Concorrência.

## IDEM
Repetição de requisição.

## SEC
Ataques e bypass.

## PERF
Carga e latência.

## DR
Backup/restore/recuperação.

---

# 35. CRITÉRIOS DE ACEITE

Um critério deverá ser observável e testável.

Evitar:

> "Funciona corretamente."

Preferir:

> "Usuário autorizado consegue registrar a triagem; os dados persistem em `triages`; o atendimento permanece associado ao paciente; a classificação gera evento; usuário não autorizado recebe 403; acesso é auditado; atualização aparece na timeline."

---

# 36. EXEMPLO COMPLETO

## TRI-001 — Registrar triagem

**Requisito:** registrar triagem.

**Banco:**

- `triages`;
- `vital_signs`;
- `pain_assessments`;
- `glasgow_assessments`;
- `glucose_measurements`.

**API:**

`POST /api/v1/encounters/:id/triage`

**Frontend:**

`TriagePage`

**RBAC:**

profissionais autorizados conforme competência e vínculo.

**RLS:**

acesso somente ao contexto permitido.

**Auditoria:**

registro de criação e alterações.

**Eventos:**

`TriageCompleted`.

**Testes:**

- API;
- DB;
- RLS;
- RBAC;
- E2E;
- concorrência;
- temporalidade.

**Aceite:**

1. usuário autorizado inicia triagem;
2. campos obrigatórios são validados;
3. dados persistem;
4. triagem fica vinculada ao atendimento;
5. classificação é registrada quando aplicável;
6. evento é criado;
7. auditoria é criada;
8. timeline é atualizada;
9. usuário sem permissão não consegue registrar;
10. duplicação concorrente é impedida;
11. teste E2E passa.

Somente então:

`TRI-001 = HOMOLOGADO`.

---

# 37. REGRA DE TESTE NEGATIVO

Não testar apenas o caminho feliz.

Todo requisito crítico deverá possuir casos:

- usuário correto;
- usuário incorreto;
- setor correto;
- setor incorreto;
- paciente correto;
- paciente incorreto;
- estado correto;
- estado inválido;
- dados completos;
- dados incompletos;
- duplicação;
- concorrência;
- sessão expirada;
- permissão removida;
- RLS negando;
- tentativa de manipulação de ID;
- repetição da requisição.

---

# 38. REGRA DE CONCORRÊNCIA

Recursos exclusivos deverão ser testados com dois ou mais usuários simultâneos.

Exemplos:

- mesmo leito;
- mesma vaga;
- mesma prescrição;
- mesma administração;
- mesma transferência;
- mesmo documento;
- mesma alta.

O resultado esperado deverá ser deterministicamente definido.

---

# 39. REGRA DE IDEMPOTÊNCIA

Para cada endpoint idempotente:

```text
request A
request A repetida
request A repetida
```

deverá produzir uma única operação de domínio.

A resposta poderá ser reutilizada conforme contrato.

---

# 40. REGRA DE AUDITORIA

Toda ação crítica deverá permitir responder:

**Quem?**

**O quê?**

**Quando?**

**Em qual paciente?**

**Em qual atendimento?**

**A partir de qual estado?**

**Para qual estado?**

**Por qual motivo?**

**Qual foi o resultado?**

**Qual foi o request/evento relacionado?**

---

# 41. REGRA DE TEMPORALIDADE

O sistema deverá diferenciar, quando necessário:

- momento do fato;
- momento do registro;
- momento da assinatura;
- momento da alteração;
- momento da correção.

Não substituir silenciosamente a data clínica original pela data de edição.

---

# 42. REGRA DE DOCUMENTOS

Documento assinado:

- não poderá ser editado silenciosamente;
- correção deverá gerar nova versão;
- versão anterior deverá permanecer rastreável;
- assinatura anterior deverá permanecer verificável;
- PDF deverá corresponder à versão assinada.

---

# 43. REGRA DE LEITOS

Para qualquer leito:

```text
0 ou 1 ocupação ativa
```

Nunca:

```text
2 ocupações simultâneas
```

O teste deverá simular concorrência real.

Para leito extra:

- criação;
- motivo;
- responsável;
- abertura;
- ocupação;
- encerramento;
- auditoria.

---

# 44. REGRA DE PRESCRIÇÃO

Uma prescrição liberada deverá possuir:

- autor;
- data/hora;
- itens;
- dose;
- unidade;
- via;
- frequência;
- duração quando aplicável;
- status;
- assinatura quando exigida;
- histórico.

Alterações deverão ser rastreáveis.

---

# 45. REGRA DE ADMINISTRAÇÃO

Administração deverá validar:

- paciente;
- prescrição;
- item;
- horário;
- dose;
- via;
- profissional;
- estado do item;
- alergias/alertas quando aplicáveis;
- duplicidade;
- justificativa quando fora do previsto.

---

# 46. REGRA DE ALTA

Alta somente poderá ser concluída após validações definidas no Documento 1.

O sistema deverá atualizar coerentemente:

- atendimento;
- desfecho;
- documentos;
- timeline;
- leito;
- filas;
- pendências;
- auditoria.

---

# 47. REGRA DE HOMOLOGAÇÃO ASSISTENCIAL

A homologação deverá envolver usuários representativos dos fluxos:

- recepção;
- enfermagem;
- medicina;
- farmácia;
- regulação;
- coordenação;
- gestão;
- administração.

O teste deverá ocorrer com cenários previamente definidos.

---

# 48. REGRA DE HOMOLOGAÇÃO TÉCNICA

Antes do go-live:

- build limpo;
- migrations limpas;
- migrations sobre base existente;
- testes verdes;
- RLS validado;
- RBAC validado;
- backup validado;
- restore validado;
- healthcheck;
- readiness;
- logs;
- métricas;
- alertas;
- secrets;
- rollback;
- segurança;
- performance.

---

# 49. GATE DE FASE

Uma fase somente poderá ser encerrada quando:

```text
TODOS os requisitos críticos
        +
TODOS os testes obrigatórios
        +
TODOS os critérios de aceite
        +
EVIDÊNCIAS
        +
SEM PENDÊNCIA CRÍTICA
```

Caso contrário:

`FASE = ABERTA`.

---

# 50. GATE DE MÓDULO

Um módulo somente poderá ser declarado concluído quando:

- todos os requisitos do módulo estiverem homologados;
- banco estiver completo;
- API estiver completa;
- frontend estiver completo;
- RBAC estiver completo;
- RLS estiver completo;
- auditoria estiver completa;
- eventos estiverem completos;
- testes estiverem verdes;
- regressão estiver verde.

---

# 51. GATE GLOBAL

O Vitaloop 1.3 somente poderá ser declarado:

**PRONTO PARA PRODUÇÃO**

quando:

```text
Fase 0 ✓
Fase 1 ✓
Fase 2 ✓
...
Fase 20 ✓
```

e:

- nenhuma pendência crítica;
- nenhuma vulnerabilidade crítica/alta sem tratamento;
- nenhum fluxo clínico crítico sem E2E;
- nenhum requisito sem rastreabilidade;
- nenhum módulo parcialmente implementado declarado como completo.

---

# 52. MATRIZ DE PENDÊNCIAS

Toda pendência deverá possuir:

| ID | Requisito | Problema | Severidade | Dependência | Ação | Responsável | Status |
|---|---|---|---|---|---|---|---|

Severidade:

- P0 — bloqueia produção;
- P1 — crítico;
- P2 — alto;
- P3 — moderado;
- P4 — baixo.

---

# 53. MATRIZ DE EVIDÊNCIAS

Cada requisito homologado deverá apontar para evidência:

| ID | Evidência | Tipo | Local | Data | Validador |
|---|---|---|---|---|---|

Tipos:

- código;
- migration;
- teste;
- screenshot;
- vídeo;
- log;
- relatório;
- PDF;
- resultado E2E;
- relatório de segurança.

---

# 54. REGRA PARA O CLAUDE CODE / IDE

O agente de desenvolvimento deverá obedecer:

1. Não marcar requisito como concluído por inferência.
2. Não marcar requisito como concluído porque existe uma tela.
3. Não marcar requisito como concluído porque existe uma tabela.
4. Não marcar requisito como concluído porque existe um endpoint.
5. Não substituir teste por inspeção visual.
6. Não remover funcionalidade existente sem decisão documentada.
7. Não criar mock para representar funcionalidade clínica real.
8. Não usar dados fictícios em fluxo que deveria ser persistente.
9. Não alterar requisitos do Documento 1 silenciosamente.
10. Não alterar arquitetura do Documento 2 silenciosamente.
11. Registrar qualquer divergência.
12. Atualizar a matriz após cada implementação.
13. Executar os testes antes de avançar.
14. Não declarar fase encerrada enquanto houver requisitos obrigatórios pendentes.

---

# 55. REGRA DE IMPLEMENTAÇÃO POR BLOCO

Para cada requisito:

```text
1. Ler requisito.
2. Ler dependências.
3. Localizar código existente.
4. Localizar tabelas existentes.
5. Comparar com Documento 2.
6. Definir PRESERVAR/CORRIGIR/COMPLETAR/SUBSTITUIR/NOVO.
7. Implementar banco.
8. Implementar domínio.
9. Implementar API.
10. Implementar frontend.
11. Implementar RBAC/RLS.
12. Implementar auditoria/evento.
13. Testar.
14. Testar negativamente.
15. Registrar evidência.
16. Atualizar matriz.
17. Só então avançar.
```

---

# 56. REGRA DE COMPATIBILIDADE COM V1.2

Para cada achado herdado do v1.2 deverá existir uma referência:

```text
V1.2-FINDING-ID
        ↓
V1.3-REQ-ID
        ↓
IMPLEMENTAÇÃO
        ↓
TESTE
        ↓
ACEITE
```

Isso permitirá verificar posteriormente que os achados positivos e negativos das auditorias anteriores não foram perdidos.

---

# 57. MATRIZ DE COBERTURA DOS ACHADOS

A auditoria do v1.2 deverá ser convertida para:

| Achado v1.2 | Tipo | Fase 1.3 | Requisito 1.3 | Implementação | Teste | Status |
|---|---|---|---|---|---|---|

Tipos:

- positivo preservado;
- positivo aprimorado;
- negativo corrigido;
- ausência completada;
- arquitetura substituída;
- requisito novo.

**Nenhum achado deverá desaparecer sem destino.**

---

# 58. REGRA DE NÃO-REGRESSÃO

Para cada item positivo do v1.2 que for considerado válido:

```text
PRESERVADO
ou
SUBSTITUÍDO POR EQUIVALENTE SUPERIOR
```

Se removido:

- justificar;
- registrar;
- validar impacto;
- atualizar matriz.

---

# 59. CHECKLIST FINAL DO REPOSITÓRIO

Antes do aceite final:

### Banco
- [ ] migrations completas;
- [ ] migrations reproduzíveis;
- [ ] constraints;
- [ ] FKs;
- [ ] índices;
- [ ] RLS;
- [ ] seeds de teste.

### Backend
- [ ] endpoints;
- [ ] validações;
- [ ] transações;
- [ ] estados;
- [ ] eventos;
- [ ] idempotência;
- [ ] auditoria;
- [ ] tratamento de erros.

### Frontend
- [ ] telas;
- [ ] formulários;
- [ ] loading;
- [ ] erros;
- [ ] permissões;
- [ ] estados;
- [ ] responsividade;
- [ ] acessibilidade.

### Segurança
- [ ] autenticação;
- [ ] sessão;
- [ ] RBAC;
- [ ] RLS;
- [ ] break-glass;
- [ ] rate limit;
- [ ] secrets;
- [ ] LGPD.

### Operação
- [ ] Docker;
- [ ] CI/CD;
- [ ] health;
- [ ] readiness;
- [ ] backup;
- [ ] restore;
- [ ] monitoramento;
- [ ] alertas;
- [ ] rollback;
- [ ] DR.

---

# 60. CHECKLIST FINAL DE PRODUÇÃO

```text
[ ] Todos os requisitos homologados
[ ] Todos os módulos homologados
[ ] Todos os fluxos críticos E2E
[ ] Todos os testes de segurança
[ ] RLS validado
[ ] RBAC validado
[ ] Auditoria validada
[ ] Timeline validada
[ ] Prescrição validada
[ ] Administração validada
[ ] Leitos validados
[ ] Altas validadas
[ ] Óbito validado
[ ] Documentos validados
[ ] PDF validado
[ ] AIH/SUS validado
[ ] Integrações validadas
[ ] Backup validado
[ ] Restore validado
[ ] DR validado
[ ] RPO definido
[ ] RTO definido
[ ] Observabilidade validada
[ ] Logs validados
[ ] Secrets validados
[ ] Rollback validado
[ ] Performance validada
[ ] Acessibilidade validada
[ ] Homologação assistencial
[ ] Homologação administrativa
[ ] Homologação técnica
[ ] Aprovação para produção
```

---

# 61. TERMO DE ACEITE

Para cada módulo:

**Módulo:** __________________________

**Requisitos:** _______________________

**Testes executados:** ________________

**Pendências:** _______________________

**Responsável técnico:** ______________

**Responsável assistencial:** __________

**Responsável administrativo:** ________

**Data:** _____________________________

**Resultado:**

- [ ] Aprovado
- [ ] Aprovado com pendências não críticas
- [ ] Reprovado

---

# 62. TERMO DE GO-LIVE

O Vitaloop 1.3 somente poderá entrar em produção quando os responsáveis declararem que:

- a matriz está atualizada;
- os requisitos críticos estão homologados;
- os fluxos clínicos foram testados;
- segurança foi validada;
- backup/restore foram testados;
- rollback está disponível;
- monitoramento está funcionando;
- documentação está atualizada.

---

# 63. REGRA FINAL

A matriz é um documento vivo.

Toda alteração no código deverá potencialmente atualizar:

```text
Requisito
→ Banco
→ API
→ Frontend
→ RBAC
→ Auditoria
→ Testes
→ Evidência
→ Status
```

Se a alteração não puder ser rastreada, ela não deverá ser considerada uma alteração controlada.

---

# 64. PRINCÍPIO CENTRAL DO VITALOOP 1.3

> **Não existe "quase pronto" para um requisito crítico.**

Existe:

**NÃO IMPLEMENTADO**

**PARCIAL**

**IMPLEMENTADO**

**TESTADO**

**HOMOLOGADO**

**CONCLUÍDO**

Somente `CONCLUÍDO` poderá ser utilizado para representar um requisito terminado.

---

# 65. OBJETIVO FINAL DOS TRÊS DOCUMENTOS

## DOCUMENTO 1
Define:

**O QUE o Vitaloop deve fazer.**

## DOCUMENTO 2
Define:

**COMO o Vitaloop deve ser construído.**

## DOCUMENTO 3
Define:

**COMO provar que cada parte foi realmente construída, testada e aceita.**

A relação final é:

```text
DOCUMENTO 1
REQUISITO
      ↓
DOCUMENTO 2
ARQUITETURA / DADOS / API / SEGURANÇA
      ↓
DOCUMENTO 3
IMPLEMENTAÇÃO / TESTE / EVIDÊNCIA / ACEITE
      ↓
VITALOOP 1.3
```

---

# 66. CONDIÇÃO FINAL DE SUCESSO

O Vitaloop 1.3 não será considerado superior ao v1.2 apenas porque possui mais telas, mais código ou mais funcionalidades.

Ele deverá demonstrar:

**cobertura de requisitos + integridade clínica + segurança + rastreabilidade + testes + homologação + operação real.**

Essa é a barreira contra a repetição do principal problema identificado no ciclo anterior:

> **implementar uma parte do sistema e tratar a parte como se fosse o todo.**

**FIM DO DOCUMENTO 3**
