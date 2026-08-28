# VITALOOP 1.3 — Documento 4
## Protocolo de Execução, Governança, Controle de Mudanças e Conclusão do Desenvolvimento

**Finalidade:** estabelecer as regras obrigatórias para utilização dos Documentos 1, 2 e 3 durante a construção do Vitaloop 1.3, evitando implementação parcial, perda de requisitos, regressões, alterações não rastreadas e declarações prematuras de conclusão.

---

# 1. Função deste documento

Este documento não substitui os Documentos 1, 2 ou 3.

Ele determina **como o agente de desenvolvimento deve executar o projeto utilizando os três documentos como fonte normativa**.

Hierarquia documental:

1. **Documento 1 — Blueprint Funcional e Clínico:** define O QUE o sistema deve fazer.
2. **Documento 2 — Blueprint Técnico:** define COMO o sistema deve ser construído.
3. **Documento 3 — Matriz de Rastreabilidade, Implementação, Testes e Homologação:** define COMO comprovar a implementação.
4. **Documento 4 — Protocolo de Execução e Governança:** define COMO executar, controlar, validar e encerrar o trabalho.

---

# 2. Regra fundamental

Nenhum requisito poderá ser considerado concluído somente porque:

- existe uma tela;
- existe um componente;
- existe uma tabela;
- existe um endpoint;
- existe uma migration;
- existe um botão;
- existe um formulário;
- existe código aparentemente funcional.

Uma funcionalidade somente poderá ser considerada **IMPLEMENTADA** quando sua cadeia estiver comprovada:

**REQUISITO → MÓDULO → BANCO → API → FRONTEND → RBAC → AUDITORIA → TESTE → EVIDÊNCIA → ACEITE**

Quando algum componente aplicável estiver ausente, o requisito permanecerá pendente.

---

# 3. Leitura obrigatória antes da implementação

Antes de modificar o código, o agente deverá:

1. Ler integralmente os Documentos 1, 2, 3 e 4.
2. Inspecionar o repositório atual.
3. Identificar arquitetura existente.
4. Identificar stack real.
5. Identificar banco e migrations existentes.
6. Identificar autenticação.
7. Identificar RBAC/RLS.
8. Identificar módulos existentes.
9. Identificar componentes frontend.
10. Identificar APIs/services existentes.
11. Identificar testes existentes.
12. Identificar dívida técnica relevante.
13. Comparar o estado atual com os requisitos do Vitaloop 1.3.
14. Criar um diagnóstico inicial antes de iniciar alterações.

Não deverá assumir que uma funcionalidade existe apenas porque existe um arquivo ou componente com nome correspondente.

---

# 4. Fonte da verdade

A existência de código não substitui a especificação.

Em caso de dúvida:

- requisito clínico/funcional → Documento 1;
- requisito técnico/arquitetural → Documento 2;
- rastreabilidade/teste/aceite → Documento 3;
- processo de execução e controle → Documento 4.

Quando houver conflito entre documentos, o agente **não deverá escolher silenciosamente**.

Deverá:

1. registrar o conflito;
2. identificar os documentos envolvidos;
3. explicar o impacto;
4. propor solução;
5. aguardar decisão quando a alteração puder mudar comportamento clínico, segurança, dados ou arquitetura.

---

# 5. Regra contra implementação parcial

Uma funcionalidade não poderá ser marcada como concluída se apenas parte de sua cadeia estiver implementada.

Exemplo:

Se houver:

- tela ✓
- banco ✓
- API ✓
- RBAC ✗
- auditoria ✗
- teste ✗

o requisito deverá permanecer:

**PENDENTE / INCOMPLETO**

Nunca:

**CONCLUÍDO**

---

# 6. Ordem obrigatória de construção

A implementação deverá respeitar a ordem macro definida no Documento 3:

1. Fundamentos
2. Identidade e segurança
3. Cadastro e identidade do paciente
4. Atendimento
5. Recepção e filas
6. Triagem
7. Atendimento médico
8. Enfermagem
9. Prescrição e medicamentos
10. Exames e procedimentos
11. Leitos e observação
12. Desfechos
13. Documentos clínicos
14. Segurança do paciente
15. Gestão
16. SUS / AIH / regulação
17. Integrações
18. Segurança técnica
19. Qualidade
20. Produção
21. Homologação

Uma fase não deverá ser considerada encerrada enquanto seus requisitos críticos e dependências não estiverem resolvidos.

---

# 7. Dependências

Antes de implementar qualquer módulo, o agente deverá verificar:

- dependências funcionais;
- dependências de banco;
- dependências de API;
- dependências de autenticação;
- dependências de RBAC;
- dependências de RLS;
- dependências de eventos;
- dependências de Timeline;
- dependências de auditoria;
- dependências de estados;
- dependências de integrações.

Não deverá criar soluções duplicadas para funções que já existem no núcleo do sistema.

---

# 8. Inspeção antes de criar arquivos

Antes de criar qualquer arquivo, o agente deverá procurar:

- componente equivalente;
- serviço equivalente;
- hook equivalente;
- função equivalente;
- tabela equivalente;
- endpoint equivalente;
- migration equivalente;
- tipo/interface equivalente;
- validação equivalente;
- política RLS equivalente;
- teste equivalente.

Se existir implementação reaproveitável, deverá avaliar reutilização antes de duplicação.

---

# 9. Regra de não duplicação

Não criar:

- tabelas duplicadas;
- serviços duplicados;
- componentes duplicados;
- funções duplicadas;
- regras de negócio duplicadas;
- estados paralelos para a mesma entidade;
- fontes concorrentes da verdade.

Quando uma duplicação for necessária, deverá ser registrada e justificada.

---

# 10. Controle de banco de dados

Toda alteração de banco deverá ser rastreável.

Para cada alteração, registrar:

- migration;
- tabelas afetadas;
- colunas;
- tipos;
- constraints;
- foreign keys;
- índices;
- unique constraints;
- triggers;
- functions;
- views;
- RLS;
- impacto sobre dados existentes;
- estratégia de rollback.

Nenhuma alteração estrutural deverá ser feita somente pelo frontend.

---

# 11. Controle de integridade

Regras críticas não deverão depender exclusivamente da interface.

Quando aplicável, deverão existir garantias no banco e/ou backend para:

- unicidade;
- integridade referencial;
- estados válidos;
- transições válidas;
- concorrência;
- idempotência;
- auditoria;
- autorização;
- consistência temporal.

---

# 12. RBAC e RLS

Toda função protegida deverá ser analisada em múltiplas camadas:

**Autenticação → Identidade → RBAC → Necessidade de saber → RLS → Auditoria**

Não considerar seguro apenas esconder botão no frontend.

Uma ação não autorizada deverá continuar bloqueada mesmo que:

- o usuário manipule a interface;
- chame diretamente a API;
- altere parâmetros;
- tente acessar outro ID;
- tente modificar uma requisição;
- tente utilizar endpoint diretamente.

---

# 13. Necessidade de saber

O acesso deverá considerar, quando aplicável:

- usuário;
- profissão;
- função;
- setor;
- vínculo institucional;
- paciente;
- atendimento;
- contexto assistencial;
- finalidade do acesso.

A existência de permissão genérica não deverá significar acesso irrestrito a todos os prontuários.

---

# 14. Break-glass

Acesso excepcional deverá:

1. exigir autorização compatível com a política definida;
2. registrar usuário;
3. registrar paciente;
4. registrar data/hora;
5. registrar motivo;
6. registrar contexto;
7. registrar escopo;
8. registrar resultado;
9. ser auditável;
10. não apagar o histórico do acesso.

---

# 15. Identidade real do usuário

Ações clínicas e administrativas relevantes deverão ser atribuídas a uma identidade autenticada real.

Evitar:

- usuário genérico;
- conta compartilhada;
- autoria fictícia;
- identificação somente pelo frontend.

O sistema deverá preservar a autoria das ações.

---

# 16. Auditoria

A auditoria deverá registrar, conforme aplicabilidade:

- quem;
- quando;
- o quê;
- onde;
- sobre qual entidade;
- qual ação;
- resultado;
- origem;
- motivo;
- antes/depois quando necessário;
- correlação da operação.

Eventos de segurança e acesso negado também deverão ser auditáveis quando previstos.

---

# 17. Imutabilidade clínica

Registros clínicos assinados ou finalizados não deverão ser silenciosamente sobrescritos.

Quando correção for permitida:

1. preservar o original;
2. registrar correção;
3. registrar autor;
4. registrar data/hora;
5. registrar justificativa quando exigida;
6. manter rastreabilidade.

---

# 18. Máquina de estados

Entidades com ciclo de vida deverão possuir estados explícitos.

Exemplos:

- atendimento;
- fila;
- triagem;
- prescrição;
- medicamento;
- administração;
- leito;
- internação;
- alta;
- documento.

Toda transição deverá possuir:

**Estado atual → ação → pré-condição → novo estado → autor → timestamp → evento → auditoria**

Transições inválidas deverão ser rejeitadas.

---

# 19. Eventos de domínio

Eventos relevantes deverão ser identificáveis e rastreáveis.

Exemplos:

- paciente cadastrado;
- atendimento aberto;
- triagem registrada;
- classificação alterada;
- paciente chamado;
- prescrição criada;
- prescrição assinada;
- medicamento administrado;
- leito ocupado;
- transferência realizada;
- alta registrada;
- documento assinado.

Eventos deverão alimentar, quando aplicável:

- Timeline;
- auditoria;
- notificações;
- filas;
- indicadores;
- integrações.

---

# 20. Timeline

A Timeline deverá representar eventos clínicos e administrativos relevantes de forma consistente.

Não deverá ser uma segunda fonte independente de dados clínicos.

Ela deverá consumir eventos/registros oficiais.

Deverá preservar:

- ordem temporal;
- autoria;
- contexto;
- tipo;
- origem;
- relação com atendimento;
- relação com paciente.

---

# 21. Concorrência

Operações críticas deverão considerar concorrência.

Exemplos:

- dois usuários ocupando o mesmo leito;
- dois usuários alterando o mesmo atendimento;
- duas administrações do mesmo medicamento;
- duas mudanças de estado;
- duas chamadas de fila;
- duas transferências.

O sistema deverá impedir inconsistências decorrentes de operações simultâneas.

---

# 22. Idempotência

Operações que possam ser repetidas por:

- duplo clique;
- retry;
- timeout;
- atualização da página;
- falha de rede;
- repetição de requisição;

deverão ser analisadas quanto à idempotência.

Não poderá ocorrer duplicação de eventos clínicos ou administrativos críticos por repetição acidental.

---

# 23. APIs

Toda API criada ou alterada deverá possuir:

- identificação;
- finalidade;
- método;
- autenticação;
- autorização;
- request;
- response;
- validação;
- erros;
- códigos HTTP;
- transação;
- auditoria;
- comportamento em repetição;
- comportamento em concorrência.

---

# 24. Frontend

Toda tela funcional deverá ser analisada quanto a:

- estados de carregamento;
- estados vazios;
- erros;
- sucesso;
- permissões;
- validações;
- feedback;
- concorrência;
- atualização em tempo real quando necessária;
- acessibilidade;
- responsividade;
- proteção contra ações indevidas.

Uma tela visualmente pronta não significa módulo pronto.

---

# 25. Formulários

Todo formulário deverá definir:

- campos;
- obrigatoriedade;
- formato;
- limites;
- valores válidos;
- dependências;
- mensagens de erro;
- permissões;
- estados;
- confirmação;
- cancelamento;
- persistência;
- auditoria.

---

# 26. Alterações de código

Toda alteração relevante deverá responder:

1. Qual requisito motivou a alteração?
2. Qual módulo foi afetado?
3. Quais arquivos foram alterados?
4. Quais arquivos foram criados?
5. Quais arquivos foram removidos?
6. Houve alteração de banco?
7. Houve alteração de API?
8. Houve alteração de RBAC/RLS?
9. Houve alteração de auditoria?
10. Quais testes foram executados?
11. Houve regressão?
12. Qual evidência comprova o resultado?

---

# 27. Registro de mudanças

Ao final de cada unidade de trabalho, gerar registro contendo:

- ID(s) dos requisitos;
- descrição;
- arquivos criados;
- arquivos modificados;
- arquivos removidos;
- migrations;
- tabelas afetadas;
- endpoints;
- componentes;
- permissões;
- auditoria;
- testes;
- evidências;
- pendências;
- riscos;
- decisões tomadas.

---

# 28. Regra de não apagar código

Não remover código funcional apenas para simplificar a implementação.

Antes de remover:

1. identificar dependências;
2. verificar uso;
3. verificar impacto;
4. verificar requisitos;
5. verificar testes;
6. registrar a decisão.

Código obsoleto deverá ser removido somente quando houver justificativa e segurança de regressão.

---

# 29. Regra de regressão

Toda alteração deverá verificar impacto sobre funcionalidades previamente homologadas.

Uma nova implementação não poderá quebrar:

- autenticação;
- RBAC;
- RLS;
- cadastro;
- atendimento;
- prontuário;
- Timeline;
- prescrição;
- leitos;
- documentos;
- auditoria;
- relatórios;
- integrações;
- demais módulos já homologados.

---

# 30. Testes obrigatórios

Quando aplicável, executar:

- testes unitários;
- integração;
- banco;
- RLS;
- RBAC;
- API;
- E2E;
- UI;
- concorrência;
- idempotência;
- segurança;
- regressão;
- PDF;
- impressão;
- acessibilidade;
- carga;
- backup;
- restore.

Testes positivos não são suficientes.

Também deverão existir testes negativos.

---

# 31. Testes negativos

Testar explicitamente:

- usuário sem permissão;
- acesso a paciente indevido;
- acesso a atendimento indevido;
- IDOR/BOLA;
- alteração de dados de terceiros;
- transição de estado inválida;
- duplicação;
- concorrência;
- requisição repetida;
- payload inválido;
- campos ausentes;
- dados fora do limite;
- sessão expirada;
- usuário revogado;
- acesso excepcional inválido.

---

# 32. Evidência

Todo requisito relevante deverá possuir evidência verificável.

Exemplos:

- resultado de teste;
- screenshot;
- log;
- resposta de API;
- consulta de banco;
- execução E2E;
- registro de auditoria;
- PDF gerado;
- teste de permissão;
- teste de concorrência.

Não aceitar apenas:

> "funciona".

---

# 33. Critério de conclusão de requisito

Status possíveis:

- NÃO INICIADO
- EM ANÁLISE
- EM DESENVOLVIMENTO
- IMPLEMENTADO
- TESTADO
- COM PENDÊNCIA
- BLOQUEADO
- REPROVADO
- HOMOLOGADO
- CONCLUÍDO

Regra:

**IMPLEMENTADO ≠ CONCLUÍDO**

Somente **HOMOLOGADO/CONCLUÍDO** representa requisito aceito.

---

# 34. Critério de conclusão de módulo

Um módulo somente poderá ser considerado concluído quando:

- requisitos implementados;
- banco validado;
- API validada;
- frontend validado;
- RBAC validado;
- RLS validado quando aplicável;
- auditoria validada;
- estados validados;
- concorrência analisada;
- testes concluídos;
- regressão executada;
- documentação atualizada;
- pendências críticas = zero;
- aceite registrado.

---

# 35. Critério de conclusão de fase

Uma fase somente poderá ser encerrada quando:

1. todos os requisitos obrigatórios estiverem rastreados;
2. todos os componentes necessários estiverem implementados;
3. testes obrigatórios estiverem executados;
4. falhas críticas estiverem resolvidas;
5. regressão estiver validada;
6. documentação estiver atualizada;
7. matriz do Documento 3 estiver atualizada;
8. evidências estiverem disponíveis;
9. riscos remanescentes estiverem registrados;
10. a fase estiver formalmente marcada como homologada.

---

# 36. Bloqueadores

São bloqueadores, entre outros:

- perda de dados;
- acesso indevido a prontuário;
- bypass de RLS;
- bypass de RBAC;
- autoria clínica incorreta;
- alteração silenciosa de registro clínico;
- duplicação de administração de medicamento;
- inconsistência de leito;
- inconsistência de estado;
- falha grave de auditoria;
- quebra de autenticação;
- exposição de dados sensíveis;
- corrupção de dados;
- falha de backup/restore crítico.

Um bloqueador impede homologação.

---

# 37. Requisitos novos

Requisitos descobertos durante o desenvolvimento deverão ser classificados:

- já previsto;
- melhoria;
- correção;
- requisito ausente;
- requisito conflitante;
- requisito crítico de segurança;
- requisito crítico clínico.

Nenhum requisito novo deverá simplesmente ser implementado e desaparecer do controle documental.

Deverá receber:

- ID;
- descrição;
- justificativa;
- impacto;
- dependências;
- módulo;
- banco/API/frontend quando aplicável;
- RBAC;
- auditoria;
- testes;
- aceite.

---

# 38. Mudanças de escopo

Não alterar silenciosamente o escopo.

Qualquer mudança significativa deverá registrar:

- motivo;
- requisito afetado;
- impacto;
- risco;
- arquivos afetados;
- banco;
- API;
- frontend;
- testes;
- documentação.

---

# 39. Decisões arquiteturais

Decisões que alterem significativamente:

- arquitetura;
- banco;
- autenticação;
- autorização;
- RLS;
- eventos;
- Timeline;
- documentos;
- assinaturas;
- integrações;
- segurança;

deverão ser registradas como decisão arquitetural.

---

# 40. Proteção contra "mock funcional"

Não considerar pronto:

- dado hardcoded;
- mock;
- JSON local;
- botão sem persistência;
- formulário que não salva;
- endpoint fake;
- resposta simulada;
- dashboard com números fictícios;
- Timeline independente;
- permissão somente visual;
- integração simulada.

Se um mock for usado temporariamente, deverá ser identificado como:

**MOCK / NÃO HOMOLOGADO**

---

# 41. Proteção contra "tela órfã"

Toda tela funcional deverá estar ligada à cadeia correspondente:

**Tela → estado → serviço/API → banco → regra → permissão → auditoria → teste**

Uma tela sem backend real não deverá ser marcada como concluída.

---

# 42. Proteção contra "backend órfão"

Todo endpoint deverá possuir:

- consumidor conhecido;
- regra de autorização;
- validação;
- tratamento de erro;
- persistência quando aplicável;
- auditoria quando aplicável;
- teste.

Endpoints sem finalidade definida deverão ser revisados.

---

# 43. Proteção contra "tabela órfã"

Toda tabela deverá possuir:

- finalidade;
- relacionamento;
- regras;
- RLS quando aplicável;
- índices adequados;
- auditoria quando necessária;
- consumidor;
- migrations;
- testes quando aplicável.

---

# 44. Segurança de produção

Antes do go-live verificar:

- secrets fora do código;
- usuário de banco adequado;
- RLS ativo;
- políticas revisadas;
- CORS;
- headers;
- rate limiting;
- logs;
- monitoramento;
- backup;
- restore;
- criptografia;
- retenção;
- exposição de dados;
- endpoints administrativos;
- permissões privilegiadas.

---

# 45. CI/CD

O pipeline deverá, conforme arquitetura:

1. instalar dependências;
2. executar lint;
3. executar testes;
4. validar build;
5. validar migrations;
6. executar testes de segurança relevantes;
7. impedir deploy quando gates críticos falharem.

---

# 46. Migrations

Migrations deverão ser:

- versionadas;
- ordenadas;
- reproduzíveis;
- revisáveis;
- aplicáveis em ambiente limpo quando possível;
- compatíveis com estratégia de rollback;
- acompanhadas de impacto.

Nunca depender de alteração manual não documentada para que o sistema funcione.

---

# 47. Ambientes

Separar adequadamente:

- desenvolvimento;
- teste;
- homologação;
- produção.

Dados reais não deverão ser utilizados em ambientes inadequados sem controles e justificativa.

---

# 48. Checklist antes de declarar qualquer etapa concluída

Confirmar:

- [ ] requisito identificado;
- [ ] especificação consultada;
- [ ] dependências verificadas;
- [ ] banco implementado;
- [ ] API implementada;
- [ ] frontend implementado;
- [ ] RBAC implementado;
- [ ] RLS implementado quando aplicável;
- [ ] auditoria implementada;
- [ ] estados implementados;
- [ ] eventos implementados;
- [ ] concorrência analisada;
- [ ] idempotência analisada;
- [ ] testes positivos;
- [ ] testes negativos;
- [ ] testes de regressão;
- [ ] evidências;
- [ ] documentação;
- [ ] matriz atualizada;
- [ ] pendências registradas;
- [ ] aceite.

---

# 49. Auditoria cruzada obrigatória

Ao final de cada fase, executar três auditorias:

### Auditoria A — Documento → Código

Verificar se tudo que foi especificado existe no código.

### Auditoria B — Código → Documento

Verificar se existem funcionalidades relevantes no código que não estão documentadas.

### Auditoria C — Código → Comportamento

Verificar se aquilo que existe realmente funciona conforme especificado.

Nenhuma das três auditorias poderá ser omitida.

---

# 50. Auditoria de completude

Ao final do projeto, comparar:

**Documento 1 × Documento 2 × Documento 3 × Código × Banco × APIs × Frontend × Testes × Auditoria**

O objetivo é identificar:

- requisito sem código;
- código sem requisito;
- tabela sem requisito;
- API sem requisito;
- tela sem requisito;
- requisito sem teste;
- requisito sem auditoria;
- função sem RBAC;
- dado sem RLS;
- evento sem Timeline quando aplicável;
- módulo parcialmente implementado.

---

# 51. Relatório obrigatório ao final de cada fase

O agente deverá produzir:

1. fase concluída;
2. requisitos concluídos;
3. requisitos pendentes;
4. requisitos bloqueados;
5. arquivos criados;
6. arquivos alterados;
7. arquivos removidos;
8. migrations;
9. tabelas afetadas;
10. APIs;
11. componentes;
12. RBAC/RLS;
13. auditoria;
14. testes executados;
15. testes falhos;
16. evidências;
17. regressões;
18. riscos;
19. decisões;
20. débitos técnicos;
21. próximos requisitos.

---

# 52. Relatório final do Vitaloop 1.3

Antes do go-live, produzir um relatório contendo:

- cobertura total dos requisitos;
- cobertura por módulo;
- cobertura por fase;
- cobertura de testes;
- cobertura de RBAC;
- cobertura de RLS;
- cobertura de auditoria;
- cobertura de Timeline;
- cobertura de APIs;
- cobertura de banco;
- cobertura de frontend;
- segurança;
- performance;
- backup;
- restore;
- disaster recovery;
- pendências;
- riscos;
- débitos técnicos;
- itens não implementados;
- itens deliberadamente fora do escopo;
- resultado da homologação;
- recomendação de go-live.

---

# 53. Regra final de "pronto"

O agente **NÃO deverá declarar**:

- "projeto concluído";
- "módulo concluído";
- "fase concluída";
- "sistema pronto";

somente com base em compilação ou ausência de erros aparentes.

A declaração deverá ser baseada na matriz e nas evidências.

Regra:

> **SEM RASTREABILIDADE + SEM TESTE + SEM EVIDÊNCIA + SEM ACEITE = NÃO CONCLUÍDO.**

---

# 54. Regra de ouro do Vitaloop 1.3

O objetivo não é produzir a maior quantidade de código.

O objetivo é produzir um sistema em que seja possível responder, para cada requisito:

> **Onde está implementado?**
>
> **Como funciona?**
>
> **Quem pode executar?**
>
> **Quem não pode executar?**
>
> **Onde os dados são armazenados?**
>
> **Qual API executa?**
>
> **Qual evento é gerado?**
>
> **Como é auditado?**
>
> **Como foi testado?**
>
> **Qual evidência comprova?**
>
> **Qual é o critério de aceite?**
>
> **Quem homologou?**

Se essas perguntas não puderem ser respondidas, o requisito não deverá ser considerado concluído.

---

# 55. Encerramento

Os quatro documentos deverão ser tratados como um único sistema documental:

**DOCUMENTO 1 — O QUE**

↓

**DOCUMENTO 2 — COMO**

↓

**DOCUMENTO 3 — COMO COMPROVAR**

↓

**DOCUMENTO 4 — COMO EXECUTAR E CONTROLAR**

A implementação do Vitaloop 1.3 deverá seguir essa cadeia durante todo o ciclo de desenvolvimento.

**Fim do Documento 4.**
