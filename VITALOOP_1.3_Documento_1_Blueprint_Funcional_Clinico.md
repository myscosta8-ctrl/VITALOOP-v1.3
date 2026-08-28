# VITALOOP 1.3

## Documento 1 --- Blueprint Funcional e Clínico

### Especificação Funcional, Clínica e de Requisitos

**Versão:** 1.0\
**Data:** 19/08/2026\
**Status:** Documento-base para especificação do Vitaloop 1.3\
**Finalidade:** definir O QUE o Vitaloop 1.3 deve ser e como seus fluxos
clínicos e administrativos devem se comportar.

------------------------------------------------------------------------

# 0. DIRETRIZES OBRIGATÓRIAS

## 0.1 Natureza deste documento

Este documento é a especificação funcional e clínica do Vitaloop 1.3.
Ele não define implementação detalhada de código, banco, framework ou
infraestrutura. Esses elementos serão definidos no Documento 2.

## 0.2 Relação com o Vitaloop 1.2

O repositório Vitaloop v1.2 será tratado como **fonte de evidência do
estado existente**, não como especificação do produto.

A especificação do 1.3 deverá:

-   preservar capacidades corretas existentes;
-   corrigir comportamentos inadequados;
-   substituir estruturas frágeis;
-   incorporar funcionalidades ausentes;
-   evitar regressões;
-   não assumir que algo existente no código está correto apenas porque
    existe;
-   não excluir uma capacidade existente sem decisão explícita.

O v1.2 possui atualmente arquitetura de monorepo, API, frontend,
migrations, RBAC/RLS, máquinas de estado, autenticação, documentos,
leitos, transferências/desfechos, farmácia/SUS, segurança do paciente,
testes e documentos institucionais de referência. Esses elementos foram
considerados como evidência para a construção deste blueprint.

## 0.3 Regra de completude

Nenhuma funcionalidade será considerada funcionalmente especificada se
não possuir, quando aplicável:

**Ator → pré-condição → objetivo → interface/tela → campos → regras →
estados → resultado → permissões → auditoria → eventos → exceções →
critérios de aceite.**

## 0.4 Regra de não-presunção

Quando uma regra clínica, institucional ou operacional depender de
decisão da UPA, legislação, protocolo oficial ou política institucional
ainda não definida, ela deverá ser explicitamente marcada como **DECISÃO
PENDENTE**, nunca inventada pelo agente de desenvolvimento.

## 0.5 Regra de dados reais

Dados clínicos demonstrativos, usuários fictícios, pacientes mockados ou
tokens de demonstração não podem representar a implementação final.

## 0.6 Fonte de verdade

Para o produto:

1.  requisito aprovado;
2.  regra clínica/negócio aprovada;
3.  especificação técnica;
4.  implementação;
5.  testes;
6.  homologação.

O código não pode redefinir silenciosamente o requisito.

------------------------------------------------------------------------

# 1. VISÃO GERAL DO VITALOOP 1.3

O Vitaloop 1.3 deverá ser um **Prontuário Eletrônico do Paciente (PEP)
orientado ao fluxo assistencial de uma UPA 24h**, integrando
atendimento, paciente, classificação de risco, assistência médica,
enfermagem e multiprofissional, prescrição, administração de
medicamentos, exames, procedimentos, leitos, observação, transferências,
regulação, desfechos, documentos, auditoria e indicadores.

O sistema deverá funcionar como uma plataforma clínica única, na qual
cada ação relevante produza informação rastreável e coerente com o ciclo
de vida do paciente.

O sistema deverá priorizar:

-   segurança do paciente;
-   continuidade do cuidado;
-   integridade do prontuário;
-   rastreabilidade;
-   segregação de funções;
-   necessidade de saber;
-   eficiência operacional;
-   redução de duplicidade de registros;
-   consistência entre frontend, domínio e persistência;
-   capacidade de auditoria;
-   operação em tempo real onde necessária.

------------------------------------------------------------------------

# 2. OBJETIVOS DO SISTEMA

## 2.1 Objetivos principais

1.  Centralizar o prontuário do paciente.
2.  Registrar toda assistência relevante.
3.  Permitir continuidade do cuidado entre profissionais.
4.  Organizar o fluxo da UPA.
5.  Controlar filas e tempos assistenciais.
6.  Controlar leitos e ocupação.
7.  Estruturar prescrição e administração de medicamentos.
8.  Produzir documentos clínicos confiáveis.
9.  Garantir rastreabilidade de ações.
10. Aplicar controle de acesso por função e contexto.
11. Apoiar segurança do paciente.
12. Produzir indicadores assistenciais e operacionais.
13. Reduzir registros paralelos e informações desconectadas.
14. Permitir auditoria retrospectiva completa.
15. Preparar o sistema para integração com serviços externos.

------------------------------------------------------------------------

# 3. ESCOPO

O escopo funcional compreende:

-   identidade e autenticação;
-   usuários e perfis;
-   cadastro de pacientes;
-   atendimento;
-   recepção;
-   acolhimento;
-   triagem;
-   classificação de risco;
-   filas;
-   atendimento médico;
-   atendimento de enfermagem;
-   atendimento multiprofissional;
-   diagnósticos;
-   CID;
-   sinais vitais;
-   escalas;
-   dor;
-   Glasgow;
-   glicemia;
-   balanço hídrico;
-   prescrição médica;
-   prescrição de enfermagem;
-   aprazamento;
-   administração;
-   checagem;
-   exames;
-   procedimentos;
-   pareceres;
-   interconsultas;
-   observação;
-   leitos;
-   leitos extras;
-   ocupação;
-   transferências;
-   regulação;
-   internação;
-   desfechos;
-   documentos;
-   assinaturas;
-   timeline;
-   impressão;
-   PDF;
-   farmácia;
-   AIH/SUS;
-   segurança do paciente;
-   indicadores;
-   relatórios;
-   dashboards;
-   notificações;
-   alertas;
-   histórico;
-   rastreabilidade;
-   regras temporais;
-   concorrência;
-   consistência clínica.

------------------------------------------------------------------------

# 4. LIMITES DO SISTEMA

O Vitaloop não deverá:

-   substituir julgamento clínico profissional;
-   prescrever automaticamente sem ato profissional autorizado;
-   criar diagnóstico clínico automaticamente como fato;
-   alterar registro clínico histórico silenciosamente;
-   permitir exclusão destrutiva de registro clínico que deva ser
    preservado;
-   permitir que a interface contorne autorização do backend;
-   permitir que um perfil execute ato fora de sua competência;
-   usar dados fictícios como fluxo definitivo;
-   assumir protocolos clínicos sem fonte aprovada;
-   considerar documento apenas visualmente pronto como documento
    clinicamente válido.

------------------------------------------------------------------------

# 5. PERFIS DE USUÁRIOS

Os perfis conceituais deverão incluir, no mínimo:

### Administrativo

-   recepção;
-   cadastro;
-   operação administrativa;
-   funções administrativas autorizadas.

### Enfermagem

-   enfermeiro;
-   técnico de enfermagem.

### Médico

-   médico assistencial;
-   médico responsável por desfecho, quando aplicável.

### Multiprofissional

Perfis profissionais adicionais deverão ser suportados sem alterar a
arquitetura conceitual, incluindo profissionais habilitados conforme uso
institucional.

### Coordenação

-   coordenação de enfermagem;
-   coordenação assistencial;
-   coordenação administrativa, quando aplicável.

### Direção

-   direção técnica;
-   direção administrativa;
-   gestão institucional.

### Auditoria

Perfil destinado à consulta e auditoria conforme política institucional.

### TI/Administração do sistema

Gestão técnica do sistema, sem concessão automática de privilégio
clínico.

------------------------------------------------------------------------

# 6. HIERARQUIA INSTITUCIONAL

O sistema deverá representar, conceitualmente:

**Instituição → unidade → setor → ambiente/leito → profissional →
vínculo/função.**

O acesso deverá poder considerar:

-   unidade;
-   setor;
-   profissão;
-   função;
-   vínculo;
-   escala/lotação, quando adotado;
-   atendimento;
-   contexto assistencial.

A existência de permissão global não deverá implicar acesso irrestrito
ao prontuário.

------------------------------------------------------------------------

# 7. RBAC CONCEITUAL

O controle deverá separar:

-   identidade;
-   papel;
-   permissão;
-   escopo;
-   contexto;
-   ato profissional.

Exemplos conceituais:

-   visualizar paciente;
-   visualizar atendimento;
-   registrar triagem;
-   registrar evolução médica;
-   registrar evolução de enfermagem;
-   prescrever;
-   aprazar;
-   administrar;
-   checar medicamento;
-   solicitar exame;
-   registrar resultado;
-   movimentar leito;
-   transferir;
-   encerrar atendimento;
-   assinar documento;
-   imprimir;
-   acessar auditoria;
-   utilizar acesso excepcional.

A interface poderá ocultar funções sem autorização, mas a segurança
definitiva deverá existir no servidor/domínio.

------------------------------------------------------------------------

# 8. NECESSIDADE DE SABER

O acesso ao prontuário deverá ser limitado ao mínimo necessário para a
função e contexto.

Deverá existir distinção entre:

-   usuário autenticado;
-   usuário autorizado;
-   usuário autorizado naquele contexto;
-   usuário autorizado para aquele ato profissional.

A busca por paciente não deverá conceder automaticamente acesso
irrestrito ao prontuário.

------------------------------------------------------------------------

# 9. ACESSO EXCEPCIONAL / BREAK-GLASS

Deverá existir fluxo específico para acesso excepcional.

### Ator

Profissional autorizado conforme política institucional.

### Pré-condição

Usuário autenticado e motivo excepcional legítimo.

### Campos mínimos

-   paciente;
-   motivo;
-   justificativa;
-   data/hora;
-   usuário;
-   contexto;
-   duração, quando aplicável.

### Regras

-   acesso excepcional não substitui permissão normal;
-   justificativa obrigatória;
-   acesso temporário quando aplicável;
-   registro de auditoria obrigatório;
-   uso não poderá ser silencioso;
-   acesso indevido deverá ser identificável.

### Aceite

Todo acesso excepcional deverá ser identificável posteriormente por
paciente, usuário, data/hora e justificativa.

------------------------------------------------------------------------

# 10. AUDITORIA CLÍNICA

O sistema deverá registrar, no mínimo:

-   login;
-   logout;
-   tentativa de acesso;
-   acesso negado;
-   visualização de prontuário;
-   criação;
-   alteração;
-   assinatura;
-   impressão;
-   download;
-   cancelamento;
-   correção;
-   acesso excepcional;
-   alteração de permissões;
-   movimentação de leito;
-   transferência;
-   prescrição;
-   aprazamento;
-   administração;
-   checagem;
-   desfecho.

A auditoria clínica deverá ser:

-   rastreável;
-   protegida contra alteração indevida;
-   associada ao usuário;
-   associada ao contexto;
-   temporalmente ordenável;
-   vinculável ao paciente/atendimento quando aplicável.

------------------------------------------------------------------------

# 11. CADASTRO DO PACIENTE

## Atores

Recepção e perfis autorizados.

## Pré-condição

Usuário autenticado e autorizado.

## Dados

O cadastro deverá suportar, conforme aplicabilidade:

-   nome completo;
-   nome social;
-   nome da mãe;
-   data de nascimento;
-   sexo;
-   CPF;
-   CNS;
-   RG;
-   telefone;
-   endereço;
-   município;
-   estado;
-   contatos;
-   contato de emergência;
-   informações administrativas necessárias;
-   alergias;
-   observações de identificação.

## Regras

-   validação de identificadores;
-   prevenção de duplicidade;
-   confirmação antes de criar provável duplicado;
-   nenhuma informação clínica deve ser inventada por default;
-   alergia não deve assumir "nega" sem registro explícito.

## Aceite

O cadastro deve persistir os dados relevantes coletados e permitir
rastrear alterações.

------------------------------------------------------------------------

# 12. IDENTIFICAÇÃO DO PACIENTE

Deverá existir identificação inequívoca do paciente.

O cabeçalho clínico deverá permitir visualizar, conforme política:

-   nome;
-   nome social;
-   prontuário;
-   CPF/CNS conforme autorização;
-   nascimento/idade;
-   sexo;
-   mãe;
-   alergias;
-   atendimento atual;
-   setor;
-   leito;
-   classificação de risco;
-   status assistencial.

Deverá existir prevenção de identificação incorreta durante ações
clínicas.

------------------------------------------------------------------------

# 13. ATENDIMENTO

O atendimento deverá representar o episódio assistencial.

### Abertura

Registrar:

-   paciente;
-   data/hora;
-   origem;
-   tipo;
-   motivo;
-   setor;
-   profissional/responsável quando aplicável.

### Estados

O ciclo deverá ser formalmente definido e consistente em todos os
módulos. Estados não poderão ser alterados diretamente por uma tela sem
obedecer às transições autorizadas.

### Resultado

O atendimento deverá produzir timeline, vínculo assistencial e estado
atual.

### Aceite

Frontend, API e domínio deverão utilizar o mesmo contrato conceitual
para abertura e encerramento.

------------------------------------------------------------------------

# 14. RECEPÇÃO

Deverá permitir:

-   localizar paciente;
-   cadastrar paciente;
-   confirmar identidade;
-   abrir atendimento;
-   identificar prioridade administrativa;
-   direcionar para acolhimento/triagem;
-   visualizar fila pertinente;
-   registrar dados administrativos;
-   evitar duplicidade.

------------------------------------------------------------------------

# 15. ACOLHIMENTO

Deverá representar a entrada assistencial anterior à classificação de
risco quando aplicável.

Deverá registrar:

-   queixa inicial;
-   origem;
-   acompanhante;
-   condição aparente;
-   necessidade imediata identificada;
-   encaminhamento.

O acolhimento não deverá substituir a classificação de risco.

------------------------------------------------------------------------

# 16. TRIAGEM

### Ator

Enfermeiro ou profissional autorizado pela política institucional.

### Pré-condições

Paciente e atendimento válidos.

### Campos

Conforme protocolo institucional:

-   queixa principal;
-   início/evolução;
-   sinais vitais;
-   dor;
-   Glasgow quando indicado;
-   glicemia quando indicada;
-   alergias;
-   condições clínicas relevantes;
-   discriminadores;
-   prioridade;
-   classificação;
-   observações.

### Regras

-   triagem deve estar vinculada ao atendimento;
-   deve possuir data/hora e profissional;
-   alterações posteriores devem ser rastreáveis;
-   classificação deve respeitar protocolo configurado;
-   não permitir fechamento incompleto.

### Aceite

A triagem concluída deve encaminhar o paciente ao fluxo correspondente.

------------------------------------------------------------------------

# 17. CLASSIFICAÇÃO DE RISCO

O sistema deverá suportar protocolo de classificação de risco
configurável e versionável.

Para Manchester, quando oficialmente adotado, deverá suportar:

-   fluxograma;
-   discriminador;
-   prioridade;
-   cor;
-   tempo-alvo;
-   versão do protocolo;
-   profissional;
-   data/hora.

A classificação deverá ser preservada como evento histórico mesmo quando
houver reclassificação.

Reclassificação deverá possuir motivo e autoria.

------------------------------------------------------------------------

# 18. FILAS ASSISTENCIAIS

Deverão existir, conforme fluxo institucional:

-   recepção;
-   triagem;
-   atendimento médico;
-   reavaliação;
-   observação;
-   outros fluxos configuráveis.

Cada fila deverá possuir:

-   status;
-   prioridade;
-   horário de entrada;
-   tempo de espera;
-   posição/prioridade;
-   setor;
-   paciente;
-   atendimento;
-   evento de chamamento quando aplicável.

Deverá haver atualização consistente e, quando necessária, em tempo
real.

------------------------------------------------------------------------

# 19. ATENDIMENTO MÉDICO

Deverá contemplar:

-   identificação;
-   motivo/queixa;
-   história clínica;
-   antecedentes;
-   medicamentos;
-   alergias;
-   exame físico;
-   sinais vitais;
-   hipóteses;
-   diagnósticos;
-   CID;
-   conduta;
-   exames;
-   procedimentos;
-   prescrição;
-   evolução;
-   intercorrência;
-   reavaliação;
-   desfecho.

Cada registro deverá identificar profissional e data/hora.

------------------------------------------------------------------------

# 20. ATENDIMENTO DE ENFERMAGEM

Deverá contemplar:

-   admissão de enfermagem;
-   histórico;
-   avaliação;
-   diagnóstico de enfermagem;
-   planejamento;
-   prescrição de enfermagem;
-   evolução;
-   anotação;
-   procedimentos;
-   escalas;
-   riscos;
-   dispositivos;
-   balanço hídrico;
-   sinais vitais;
-   intercorrências;
-   transferência;
-   passagem de plantão.

O fluxo deverá respeitar competências profissionais.

------------------------------------------------------------------------

# 21. ATENDIMENTO MULTIPROFISSIONAL

Deverá permitir registros de profissionais habilitados sem forçar o uso
de campos médicos ou de enfermagem.

Cada profissão deverá possuir:

-   tipo de registro;
-   campos específicos;
-   permissões;
-   assinatura;
-   auditoria;
-   vinculação ao atendimento.

------------------------------------------------------------------------

# 22. DIAGNÓSTICOS

Deverão existir:

-   hipótese diagnóstica;
-   diagnóstico principal;
-   diagnósticos secundários;
-   diagnóstico de enfermagem, quando aplicável;
-   situação do diagnóstico;
-   autoria;
-   data/hora.

Alterações deverão preservar histórico.

------------------------------------------------------------------------

# 23. CID

O sistema deverá suportar:

-   busca;
-   seleção;
-   descrição;
-   versão do catálogo;
-   diagnóstico principal/secundário;
-   associação ao atendimento;
-   validações de preenchimento;
-   regras de sensibilidade quando aplicáveis.

CIDs sensíveis deverão respeitar política institucional e controle de
acesso.

------------------------------------------------------------------------

# 24. SINAIS VITAIS

Deverão suportar, conforme necessidade:

-   temperatura;
-   frequência cardíaca;
-   frequência respiratória;
-   pressão arterial;
-   saturação;
-   peso;
-   altura;
-   glicemia;
-   escala de dor;
-   outros parâmetros configuráveis.

Cada medição deverá possuir:

-   valor;
-   unidade;
-   data/hora;
-   profissional;
-   contexto;
-   observação quando aplicável.

Deverá existir histórico e tendência.

------------------------------------------------------------------------

# 25. ESCALAS CLÍNICAS

As escalas deverão ser:

-   identificáveis;
-   versionáveis;
-   preenchidas por profissional autorizado;
-   compostas por itens estruturados;
-   calculadas quando aplicável;
-   auditáveis;
-   vinculadas ao paciente/atendimento.

Não deverão ser reduzidas a texto livre quando o resultado possuir
estrutura clínica.

------------------------------------------------------------------------

# 26. DOR

Deverá suportar escala institucional definida, incluindo, quando
aplicável:

-   intensidade;
-   localização;
-   característica;
-   início;
-   fatores associados;
-   intervenção;
-   reavaliação.

A reavaliação deverá permitir comparar resultado antes/depois da
intervenção.

------------------------------------------------------------------------

# 27. GLASGOW

Deverá possuir registro estruturado de:

-   abertura ocular;
-   resposta verbal;
-   resposta motora;
-   pontuação;
-   data/hora;
-   profissional.

O resultado deverá ser calculado pelo sistema quando aplicável.

------------------------------------------------------------------------

# 28. GLICEMIA

Deverá registrar:

-   valor;
-   unidade;
-   método/contexto quando necessário;
-   data/hora;
-   relação com alimentação quando aplicável;
-   profissional;
-   intervenção decorrente quando houver.

Valores críticos deverão poder gerar alerta conforme protocolo
configurado.

------------------------------------------------------------------------

# 29. BALANÇO HÍDRICO

Deverá registrar entradas e saídas estruturadas.

### Entradas

-   via oral;
-   enteral;
-   parenteral;
-   medicamentos/soluções quando aplicável;
-   outros.

### Saídas

-   diurese;
-   drenos;
-   vômitos;
-   perdas;
-   outros.

Deverá calcular:

-   total de entradas;
-   total de saídas;
-   saldo;
-   período;
-   acumulado.

O sistema deverá preservar lançamentos e permitir correção rastreável.

------------------------------------------------------------------------

# 30. PRESCRIÇÃO MÉDICA

A prescrição deverá ser estruturada.

Cada item deverá permitir, conforme medicamento:

-   medicamento;
-   apresentação;
-   dose;
-   unidade;
-   via;
-   frequência;
-   horário;
-   duração;
-   início;
-   fim;
-   diluição;
-   velocidade;
-   observação;
-   condição;
-   prioridade;
-   profissional prescritor.

Não utilizar texto livre como substituto de campos estruturados
essenciais.

------------------------------------------------------------------------

# 31. PRESCRIÇÃO DE ENFERMAGEM

Deverá suportar:

-   cuidado;
-   frequência;
-   horário;
-   duração;
-   prioridade;
-   observação;
-   responsável;
-   relação com diagnóstico/plano quando aplicável.

Deverá existir distinção entre prescrição médica e de enfermagem.

------------------------------------------------------------------------

# 32. APRAZAMENTO

O aprazamento deverá ser uma ação estruturada.

Deverá registrar:

-   item prescrito;
-   horários;
-   profissional;
-   data/hora;
-   alterações;
-   justificativa quando aplicável.

Não deverá ser armazenado somente como texto dentro de instruções.

Alterações deverão gerar histórico.

------------------------------------------------------------------------

# 33. ADMINISTRAÇÃO DE MEDICAMENTOS

Deverá existir fluxo:

**Prescrição → aprazamento → disponibilidade → administração →
checagem.**

A administração deverá registrar:

-   paciente;
-   medicamento;
-   dose;
-   via;
-   horário previsto;
-   horário realizado;
-   profissional;
-   situação;
-   justificativa em caso de não administração.

------------------------------------------------------------------------

# 34. CHECAGEM

Deverá registrar:

-   item;
-   paciente;
-   horário;
-   profissional;
-   resultado;
-   motivo de não checagem quando aplicável;
-   data/hora.

A checagem não deverá poder ser falsificada retroativamente sem
rastreabilidade.

------------------------------------------------------------------------

# 35. EXAMES

Deverá suportar:

-   solicitação;
-   prioridade;
-   justificativa;
-   material;
-   coleta;
-   status;
-   resultado;
-   validação;
-   visualização;
-   anexos.

O resultado deverá ser vinculado ao atendimento e ao paciente.

------------------------------------------------------------------------

# 36. PROCEDIMENTOS

Deverão possuir:

-   tipo;
-   indicação;
-   profissional;
-   data/hora;
-   materiais relevantes;
-   resultado;
-   intercorrências;
-   evolução;
-   assinatura;
-   auditoria.

------------------------------------------------------------------------

# 37. PARECERES

Deverá permitir:

-   solicitação;
-   especialidade;
-   prioridade;
-   justificativa;
-   profissional solicitante;
-   profissional responsável;
-   status;
-   resposta;
-   data/hora;
-   assinatura.

------------------------------------------------------------------------

# 38. INTERCONSULTAS

Deverá existir fluxo multiprofissional estruturado.

Estados mínimos conceituais:

**solicitada → recebida → em avaliação → respondida → encerrada.**

A consulta deverá permanecer rastreável no prontuário.

------------------------------------------------------------------------

# 39. OBSERVAÇÃO

Deverá permitir acompanhamento contínuo.

Deverá registrar:

-   setor;
-   leito;
-   entrada;
-   evolução;
-   sinais vitais;
-   prescrição;
-   administração;
-   exames;
-   intercorrências;
-   reavaliações;
-   saída.

O tempo de permanência deverá ser calculável.

------------------------------------------------------------------------

# 40. LEITOS

O sistema deverá representar leitos físicos reais da unidade.

Cada leito deverá possuir:

-   setor;
-   identificação;
-   tipo;
-   status;
-   características;
-   ocupação;
-   paciente;
-   atendimento;
-   eventos.

Não deverá existir dupla ocupação simultânea.

------------------------------------------------------------------------

# 41. LEITOS EXTRAS

Deverá existir mecanismo específico para abertura de leito extra.

O leito extra deverá:

-   estar associado ao setor;
-   possuir identificação;
-   registrar motivo;
-   registrar abertura;
-   possuir responsável;
-   possuir status;
-   ser encerrável;
-   produzir auditoria.

A interface deverá permitir abertura de leito extra no contexto visual
do último leito/setor, sem criar uma coluna ou campo físico artificial
separado da estrutura de leitos.

------------------------------------------------------------------------

# 42. OCUPAÇÃO

Deverá existir visão operacional da ocupação.

Indicadores:

-   livres;
-   ocupados;
-   reservados;
-   manutenção/bloqueados;
-   extras;
-   desativados;
-   pacientes por leito.

A ocupação deverá refletir o estado real do banco.

------------------------------------------------------------------------

# 43. TRANSFERÊNCIA INTERNA

Deverá permitir:

-   origem;
-   destino;
-   motivo;
-   profissional solicitante;
-   responsável;
-   paciente;
-   atendimento;
-   leito origem;
-   leito destino;
-   data/hora;
-   confirmação.

Deverá haver prevenção de transferência concorrente.

------------------------------------------------------------------------

# 44. TRANSFERÊNCIA EXTERNA

Deverá registrar:

-   instituição destino;
-   motivo;
-   regulação;
-   condições clínicas;
-   transporte;
-   acompanhante/profissional quando aplicável;
-   documentação;
-   data/hora;
-   aceite do destino quando aplicável.

------------------------------------------------------------------------

# 45. REGULAÇÃO

Deverá permitir:

-   solicitação;
-   prioridade;
-   especialidade;
-   destino pretendido;
-   documentos;
-   status;
-   contatos;
-   respostas;
-   transferência;
-   cancelamento;
-   histórico.

------------------------------------------------------------------------

# 46. INTERNAÇÃO

A internação deverá ser um fluxo formal.

Deverá registrar:

-   decisão médica;
-   diagnóstico;
-   setor destino;
-   leito;
-   data/hora;
-   responsável;
-   documentos necessários;
-   AIH quando aplicável;
-   continuidade assistencial.

A abertura de internação não poderá ser apenas mudança visual de status.

------------------------------------------------------------------------

# 47. ALTA MÉDICA

Deverá exigir ato médico autorizado.

Deverá contemplar:

-   diagnóstico final;
-   condições;
-   conduta;
-   orientações;
-   medicamentos;
-   retorno;
-   documentos;
-   sumário de alta;
-   assinatura;
-   data/hora.

A alta deverá encerrar corretamente o episódio assistencial e liberar
recursos vinculados.

------------------------------------------------------------------------

# 48. ALTA ADMINISTRATIVA

Deverá existir somente para situações autorizadas pela política
institucional.

Deverá possuir:

-   motivo;
-   responsável;
-   justificativa;
-   data/hora;
-   auditoria.

Não deverá substituir alta médica quando esta for necessária.

------------------------------------------------------------------------

# 49. ALTA A PEDIDO

Deverá registrar:

-   solicitação do paciente/responsável;
-   avaliação profissional;
-   orientação de riscos;
-   documentação;
-   assinatura;
-   data/hora;
-   responsável.

------------------------------------------------------------------------

# 50. EVASÃO

Deverá possuir fluxo específico.

Deverá registrar:

-   último momento em que paciente foi visto;
-   setor/leito;
-   profissionais;
-   circunstâncias;
-   comunicação;
-   medidas tomadas;
-   responsável;
-   data/hora;
-   auditoria.

------------------------------------------------------------------------

# 51. ÓBITO

Deverá possuir fluxo específico e protegido.

Deverá registrar, conforme legislação e política institucional:

-   constatação;
-   profissional;
-   data/hora;
-   circunstâncias;
-   documentação;
-   identificação;
-   comunicação;
-   destino;
-   encerramento assistencial.

Nenhum fluxo de óbito poderá ser reduzido a simples alteração de status.

------------------------------------------------------------------------

# 52. DOCUMENTOS CLÍNICOS

O sistema deverá suportar documentos como entidades clínicas formais.

Cada documento deverá possuir:

-   tipo;
-   paciente;
-   atendimento;
-   autor;
-   profissão;
-   conteúdo estruturado;
-   status;
-   versão;
-   data/hora;
-   assinatura;
-   histórico;
-   impressão;
-   PDF;
-   auditoria.

Documentos liberados deverão possuir proteção contra alteração
silenciosa.

------------------------------------------------------------------------

# 53. ASSINATURAS

A assinatura deverá:

-   identificar usuário;
-   identificar profissão;
-   identificar documento;
-   registrar data/hora;
-   proteger a integridade do documento;
-   impedir atribuição falsa;
-   permitir validação posterior.

A criação do documento não deverá equivaler automaticamente à
assinatura.

------------------------------------------------------------------------

# 54. TIMELINE

A timeline deverá consolidar cronologicamente:

-   atendimento;
-   triagem;
-   classificação;
-   evolução;
-   sinais vitais;
-   prescrições;
-   aprazamentos;
-   administrações;
-   exames;
-   procedimentos;
-   documentos;
-   transferências;
-   leitos;
-   intercorrências;
-   desfechos;
-   eventos relevantes.

Deverá permitir:

-   filtro por tipo;
-   período;
-   profissão;
-   evento;
-   carregamento progressivo quando necessário.

------------------------------------------------------------------------

# 55. IMPRESSÃO

A impressão deverá produzir documento institucional.

Deverá respeitar:

-   identidade institucional;
-   paciente;
-   prontuário;
-   documento;
-   autor;
-   data/hora;
-   paginação;
-   cabeçalho;
-   rodapé;
-   segurança de dados.

Cada impressão relevante deverá poder ser auditada.

------------------------------------------------------------------------

# 56. PDF

O sistema deverá gerar PDF real quando o documento exigir PDF.

O PDF deverá:

-   refletir conteúdo liberado;
-   preservar identidade institucional;
-   possuir paginação;
-   possuir identificação do documento;
-   preservar integridade;
-   não expor dados além da autorização;
-   permitir validação.

HTML não deverá ser tratado como substituto de PDF quando o requisito
for PDF.

------------------------------------------------------------------------

# 57. FARMÁCIA

Deverá suportar, conforme escopo institucional:

-   medicamentos;
-   itens prescritos;
-   disponibilidade;
-   dispensação;
-   devolução;
-   baixa;
-   rastreabilidade;
-   relação com prescrição;
-   relação com administração;
-   auditoria.

------------------------------------------------------------------------

# 58. AIH/SUS

Deverá suportar:

-   dados necessários à AIH;
-   diagnóstico;
-   procedimentos;
-   profissional;
-   estabelecimento;
-   documentos;
-   validações;
-   status;
-   exportação/integração quando aplicável.

SIGTAP e demais catálogos deverão ser tratados como dados versionáveis,
não regras permanentes codificadas na interface.

------------------------------------------------------------------------

# 59. SEGURANÇA DO PACIENTE

Deverá contemplar, conforme política:

-   identificação correta;
-   alergias;
-   medicamentos;
-   quedas;
-   lesão por pressão;
-   riscos;
-   isolamento;
-   precauções;
-   dispositivos;
-   eventos adversos;
-   notificações;
-   investigação;
-   ações corretivas;
-   auditoria.

------------------------------------------------------------------------

# 60. INDICADORES

O sistema deverá permitir indicadores como:

-   atendimentos;
-   classificação de risco;
-   tempo de espera;
-   tempo até atendimento;
-   tempo de permanência;
-   ocupação;
-   desfechos;
-   transferências;
-   internações;
-   evasões;
-   óbitos;
-   produção médica;
-   produção de enfermagem;
-   administração de medicamentos;
-   eventos de segurança.

Indicadores deverão possuir definição formal e fonte de dados
identificável.

------------------------------------------------------------------------

# 61. RELATÓRIOS

Deverão existir relatórios:

-   clínicos;
-   assistenciais;
-   administrativos;
-   operacionais;
-   epidemiológicos quando aplicável;
-   segurança;
-   auditoria.

Relatórios deverão respeitar permissões e minimização de dados.

------------------------------------------------------------------------

# 62. DASHBOARDS

Deverão existir visões específicas por perfil.

### Operacional

-   filas;
-   ocupação;
-   pacientes;
-   tempos.

### Assistencial

-   classificação;
-   evolução;
-   pacientes críticos;
-   pendências.

### Gestão

-   indicadores;
-   produção;
-   ocupação;
-   desfechos.

### Auditoria

-   acessos;
-   alterações;
-   exceções;
-   documentos;
-   eventos.

------------------------------------------------------------------------

# 63. NOTIFICAÇÕES

Deverão existir notificações internas para eventos relevantes, como:

-   paciente aguardando;
-   prioridade elevada;
-   exame disponível;
-   parecer pendente;
-   prescrição pendente;
-   medicamento pendente;
-   transferência;
-   leito disponível;
-   alerta operacional.

Notificações não substituem registro clínico.

------------------------------------------------------------------------

# 64. ALERTAS

Alertas poderão ser:

-   clínicos;
-   temporais;
-   operacionais;
-   medicamentosos;
-   segurança;
-   administrativos.

Deverão possuir:

-   origem;
-   gravidade;
-   destinatário;
-   condição;
-   data/hora;
-   status;
-   resolução.

Alertas não deverão criar diagnóstico automaticamente.

------------------------------------------------------------------------

# 65. HISTÓRICO

O histórico deverá preservar:

-   versões;
-   alterações;
-   autores;
-   datas;
-   justificativas;
-   estados anteriores;
-   estados posteriores.

Correção de informação clínica deverá gerar novo evento ou versão,
conforme regra definida, e não apagar silenciosamente o passado.

------------------------------------------------------------------------

# 66. RASTREABILIDADE

Qualquer ação clínica relevante deverá poder ser rastreada por:

**quem → o quê → quando → onde/contexto → em qual paciente → em qual
atendimento → resultado.**

Quando houver alteração:

**valor anterior → valor novo → motivo → autor.**

------------------------------------------------------------------------

# 67. REGRAS TEMPORAIS

O sistema deverá tratar explicitamente:

-   data/hora do evento;
-   data/hora do registro;
-   tempo de espera;
-   tempo de permanência;
-   duração de prescrição;
-   horário de administração;
-   tempo-alvo da classificação;
-   validade de acesso excepcional;
-   expiração de sessão;
-   períodos de observação.

O sistema não deverá confundir horário do fato com horário de
lançamento.

------------------------------------------------------------------------

# 68. REGRAS DE CONCORRÊNCIA

Operações críticas deverão impedir inconsistências simultâneas.

Exemplos:

-   dois usuários ocupando o mesmo leito;
-   dois leitos para o mesmo atendimento;
-   duas altas simultâneas;
-   duas transferências simultâneas;
-   duas administrações duplicadas;
-   duas alterações incompatíveis do mesmo documento.

O usuário deverá receber resposta clara quando uma operação concorrente
for rejeitada.

------------------------------------------------------------------------

# 69. REGRAS DE CONSISTÊNCIA CLÍNICA

O sistema deverá garantir, no mínimo:

1.  paciente inexistente não possui atendimento;
2.  atendimento inexistente não possui registro clínico;
3.  registro clínico deve identificar autor;
4.  documento liberado não pode ser alterado silenciosamente;
5.  medicamento administrado deve estar relacionado a prescrição válida
    quando a regra exigir;
6.  checagem deve estar relacionada à administração;
7.  leito ocupado deve possuir vínculo válido;
8.  encerramento deve liberar recursos associados;
9.  alta não pode ocorrer por caminho sem autorização;
10. desfecho deve possuir profissional e motivo quando exigidos;
11. reclassificação deve preservar histórico;
12. acesso excepcional deve ser auditado;
13. dados clínicos não devem ser criados por defaults clínicos falsos;
14. estados devem obedecer às máquinas de estado;
15. operações críticas devem ser atômicas.

------------------------------------------------------------------------

# 70. CRITÉRIOS DE ACEITE DE CADA MÓDULO

## 70.1 Critério universal

Um módulo somente poderá ser considerado **CONCLUÍDO** quando:

-   fluxo funcional especificado;
-   atores definidos;
-   pré-condições implementadas;
-   campos definidos;
-   validações definidas;
-   estados definidos;
-   permissões definidas;
-   necessidade de saber definida;
-   auditoria definida;
-   eventos definidos;
-   exceções definidas;
-   persistência definida no Documento 2;
-   API definida no Documento 2;
-   interface definida no Documento 2;
-   testes definidos no Documento 3;
-   critérios de aceite aprovados;
-   fluxo ponta a ponta validado.

## 70.2 Critério de não conclusão

Não será considerado concluído apenas porque:

-   a tela existe;
-   o botão funciona;
-   o formulário salva localmente;
-   existe tabela no banco;
-   existe endpoint;
-   existe migration;
-   existe componente;
-   o TypeScript compila;
-   o teste unitário passa.

## 70.3 Critério ponta a ponta

Para cada funcionalidade crítica deverá existir comprovação:

**usuário autorizado → interface → API → domínio → persistência →
auditoria → retorno → visualização histórica.**

## 70.4 Critério de segurança

Nenhum módulo clínico será considerado concluído se:

-   autorização existir somente no frontend;
-   houver bypass do RBAC;
-   houver bypass do escopo contextual;
-   dados sensíveis forem expostos sem necessidade;
-   alteração histórica puder ocorrer sem rastreabilidade.

## 70.5 Critério de continuidade

Nenhum módulo deverá quebrar o fluxo anterior ou posterior do paciente.

Exemplo:

**recepção → acolhimento → triagem → classificação → fila → médico →
prescrição → enfermagem → administração → observação → desfecho.**

## 70.6 Critério de regressão

Capacidades corretas do Vitaloop 1.2 deverão permanecer disponíveis no
1.3, salvo decisão explícita documentada.

------------------------------------------------------------------------

# 71. FLUXO ASSISTENCIAL GLOBAL OBRIGATÓRIO

O Vitaloop 1.3 deverá ser capaz de representar, de forma coerente:

**Paciente** → identificação → recepção → atendimento → acolhimento →
triagem → classificação de risco → fila → atendimento
médico/enfermagem/multiprofissional → diagnóstico → exames/procedimentos
→ prescrição → aprazamento → administração → reavaliação →
observação/leito → transferência/regulação/internação →
alta/transferência/evasão/óbito → encerramento → documentos → timeline →
auditoria.

Cada transição deverá produzir os eventos e atualizações necessários.

------------------------------------------------------------------------

# 72. REQUISITOS TRANSVERSAIS OBRIGATÓRIOS

Todos os módulos deverão considerar:

-   autenticação;
-   autorização;
-   necessidade de saber;
-   auditoria;
-   identificação do paciente;
-   data/hora;
-   autoria;
-   integridade;
-   histórico;
-   concorrência;
-   consistência;
-   tratamento de erro;
-   acessibilidade;
-   usabilidade;
-   responsividade;
-   segurança;
-   LGPD;
-   indicadores quando aplicável.

------------------------------------------------------------------------

# 73. DECISÕES PENDENTES

O agente de desenvolvimento não deverá inventar respostas para os
seguintes pontos. Devem ser definidos antes da implementação
correspondente:

1.  política definitiva de terceiro dispositivo;
2.  política institucional de break-glass;
3.  protocolo oficial de classificação de risco;
4.  versão/fonte oficial do Manchester;
5.  tempos-alvo institucionais;
6.  regras de CID sensível;
7.  regras AIH/SIGTAP;
8.  regras de internação da unidade;
9.  regras de alta administrativa;
10. regras de evasão;
11. regras de óbito;
12. regras de transferência/regulação;
13. catálogo oficial de medicamentos;
14. política de assinatura digital;
15. política de retenção documental;
16. RPO;
17. RTO;
18. política de backup;
19. integrações externas efetivamente disponíveis;
20. profissionais multiprofissionais habilitados;
21. indicadores oficiais da instituição.

------------------------------------------------------------------------

# 74. REQUISITOS DE UX FUNCIONAL

O sistema deverá:

-   reduzir cliques desnecessários;
-   manter contexto do paciente;
-   exibir identificação de forma consistente;
-   evitar perda de dados ao navegar;
-   indicar claramente estado do atendimento;
-   indicar pendências;
-   indicar alertas sem excesso de ruído;
-   permitir retorno rápido ao paciente;
-   permitir visualização cronológica;
-   diferenciar informação registrada de informação pendente;
-   evitar telas que aparentem concluir algo sem persistência real.

------------------------------------------------------------------------

# 75. REQUISITOS DE CONTINUIDADE DO PRONTUÁRIO

O paciente deverá possuir uma identidade longitudinal.

Atendimentos diferentes deverão permanecer relacionados ao mesmo
paciente.

O histórico deverá permitir:

-   atendimento atual;
-   atendimentos anteriores;
-   documentos;
-   diagnósticos;
-   prescrições;
-   exames;
-   eventos;
-   transferências;
-   desfechos.

O prontuário não deverá ser fragmentado em módulos sem relação entre si.

------------------------------------------------------------------------

# 76. REGRA ESPECIAL PARA DOCUMENTOS INSTITUCIONAIS

Os formulários existentes no repositório de referência deverão ser
tratados como **referência visual e funcional**, não como autorização
para reproduzir automaticamente campos sem validação.

Cada formulário deverá ser mapeado para:

-   finalidade;
-   profissão;
-   momento do fluxo;
-   campos;
-   obrigatoriedade;
-   assinatura;
-   documento gerado;
-   regras;
-   destino;
-   auditoria.

------------------------------------------------------------------------

# 77. REGRA ESPECIAL PARA O VITALOOP 1.2

Durante a elaboração técnica do 1.3, cada funcionalidade existente
deverá receber uma classificação:

### PRESERVAR

Está correta e deve continuar.

### CORRIGIR

Existe, mas apresenta problema.

### COMPLETAR

Existe parcialmente.

### SUBSTITUIR

A estrutura atual não deve ser transportada.

### NOVO

Não existe e deverá ser criado.

Nenhuma migração automática de código deverá ser presumida.

------------------------------------------------------------------------

# 78. REGRA DE RASTREABILIDADE DOS REQUISITOS

Cada requisito deste documento deverá receber um identificador único no
Documento 2 e no Documento 3.

Formato recomendado:

-   AUTH-xxx --- autenticação;
-   SEC-xxx --- segurança;
-   PAT-xxx --- paciente;
-   ATT-xxx --- atendimento;
-   REC-xxx --- recepção;
-   TRI-xxx --- triagem;
-   CRS-xxx --- classificação de risco;
-   QUE-xxx --- filas;
-   MED-xxx --- médico;
-   NUR-xxx --- enfermagem;
-   MUL-xxx --- multiprofissional;
-   DIA-xxx --- diagnóstico;
-   CID-xxx --- CID;
-   VS-xxx --- sinais vitais;
-   ESC-xxx --- escalas;
-   DOR-xxx --- dor;
-   GCS-xxx --- Glasgow;
-   GLI-xxx --- glicemia;
-   BAL-xxx --- balanço hídrico;
-   PRE-xxx --- prescrição;
-   APA-xxx --- aprazamento;
-   ADM-xxx --- administração;
-   CHK-xxx --- checagem;
-   EXA-xxx --- exames;
-   PRO-xxx --- procedimentos;
-   PAR-xxx --- pareceres;
-   INT-xxx --- interconsultas;
-   OBS-xxx --- observação;
-   BED-xxx --- leitos;
-   EXT-xxx --- leitos extras;
-   TRF-xxx --- transferências;
-   REG-xxx --- regulação;
-   HSP-xxx --- internação;
-   ALT-xxx --- alta;
-   EVD-xxx --- evasão;
-   OBT-xxx --- óbito;
-   DOC-xxx --- documentos;
-   SIG-xxx --- assinaturas;
-   TML-xxx --- timeline;
-   PDF-xxx --- PDF;
-   FAR-xxx --- farmácia;
-   SUS-xxx --- SUS/AIH;
-   SAF-xxx --- segurança do paciente;
-   IND-xxx --- indicadores;
-   REL-xxx --- relatórios;
-   DASH-xxx --- dashboards;
-   NOT-xxx --- notificações;
-   ALE-xxx --- alertas;
-   HIS-xxx --- histórico;
-   AUD-xxx --- auditoria;
-   TMP-xxx --- regras temporais;
-   CON-xxx --- concorrência;
-   CST-xxx --- consistência.

------------------------------------------------------------------------

# 79. REGRA PARA O DOCUMENTO 2

O Documento 2 não poderá redefinir requisitos clínicos deste documento.

Ele deverá transformar cada requisito em:

**modelo de dados + domínio + API + segurança + frontend +
infraestrutura**, preservando o comportamento definido aqui.

------------------------------------------------------------------------

# 80. REGRA PARA O DOCUMENTO 3

O Documento 3 deverá transformar cada requisito em:

**implementação verificável + teste + evidência + critério de aceite +
status.**

Um requisito sem teste correspondente deverá ser considerado **não
coberto**.

------------------------------------------------------------------------

# 81. DEFINITION OF DONE --- VITALOOP 1.3

O Vitaloop 1.3 somente poderá ser considerado pronto quando:

1.  todos os requisitos aprovados estiverem rastreados;
2.  todos os módulos tiverem implementação correspondente;
3.  frontend e backend utilizarem contratos coerentes;
4.  banco e domínio forem coerentes;
5.  RBAC e necessidade de saber estiverem aplicados;
6.  auditoria estiver funcionando;
7.  fluxos críticos forem transacionais;
8.  concorrência estiver testada;
9.  documentos estiverem íntegros;
10. PDFs estiverem reais;
11. autenticação for real;
12. nenhum fluxo clínico crítico depender de mock;
13. testes unitários, integração, RLS e E2E críticos passarem;
14. backup e restauração forem validados;
15. critérios clínicos forem homologados;
16. critérios administrativos forem homologados;
17. critérios técnicos forem homologados;
18. não houver requisito crítico sem evidência;
19. não houver regressão crítica conhecida;
20. o sistema estiver formalmente aprovado para produção.

------------------------------------------------------------------------

# 82. CONCLUSÃO DO BLUEPRINT

O Vitaloop 1.3 deverá ser tratado como um **PEP completo orientado ao
fluxo assistencial**, e não como um conjunto de telas ou módulos
independentes.

A prioridade será:

**segurança do paciente → integridade clínica → continuidade do cuidado
→ rastreabilidade → fluxo operacional → usabilidade → gestão.**

Este documento define o comportamento funcional e clínico. A
implementação técnica somente deverá ser detalhada após sua consolidação
no Documento 2.

**FIM DO DOCUMENTO 1**
