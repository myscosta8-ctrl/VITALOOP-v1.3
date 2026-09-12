import type { SinanBodySchema } from '../types.js';
import { simNaoIgnField } from './shared-options.js';

/**
 * Campos 31-64 da ficha SINAN "Coqueluche" (Coqueluche_v5.pdf), extraídos do
 * texto/layout impresso do PDF-base campo a campo (não suposição de
 * layout) — mesmo padrão de rastreabilidade de `animais-peconhentos.ts`.
 *
 * REESCRITO em 2026-09-11: a versão anterior deste arquivo (Lote 2, baseada
 * só no inventário semântico do Emergency Care, sem conferência contra a
 * ficha oficial) tinha campos que não existem na ficha real (`fase_clinica_
 * atual`, `pcr_bordetella_pertussis`) e opções erradas em campos que
 * existem (`doses_dtp`). Achado ao ler o PDF oficial diretamente pela
 * primeira vez, no início da Fase C (calibração). Esta versão usa os
 * códigos/opções exatos do impresso, com o código de campo semântico (não o
 * número oficial — decisão já registrada) mapeado 1:1 ao campo real.
 */
export const COQUELUCHE_BODY_SCHEMA: SinanBodySchema = {
  schemaCode: 'COQUELUCHE',
  groups: [
    {
      title: 'Dados Complementares do Caso',
      fields: [
        { code: 'data_investigacao', label: 'Data da Investigação', type: 'date' },
        { code: 'ocupacao', label: 'Ocupação', type: 'text' },
        simNaoIgnField('unidade_notificante_sentinela', 'A Unidade Notificante é Sentinela?'),
      ],
    },
    {
      title: 'Antecedentes Epidemiológicos',
      fields: [
        {
          code: 'contato_caso_suspeito_confirmado',
          label: 'Contato Com Caso Suspeito ou Confirmado de Coqueluche (até 14 dias antes do início dos sinais e sintomas)',
          type: 'code',
          options: [
            { code: '1', label: 'Domicílio' },
            { code: '2', label: 'Vizinhança' },
            { code: '3', label: 'Trabalho' },
            { code: '4', label: 'Creche/Escola' },
            { code: '5', label: 'Posto de Saúde/Hospital' },
            { code: '6', label: 'Outro Estado/Município' },
            { code: '7', label: 'Outro' },
            { code: '8', label: 'Sem História de Contato' },
            { code: '9', label: 'Ignorado' },
          ],
        },
        {
          code: 'contato_outro_especifique',
          label: 'Contato — Outro, especifique',
          type: 'text',
          visibleWhen: { fieldCode: 'contato_caso_suspeito_confirmado', equals: ['7'] },
        },
        { code: 'nome_contato', label: 'Nome do Contato', type: 'text' },
        { code: 'endereco_contato', label: 'Endereço do Contato (Rua, Av., Apto., Bairro, Localidade, etc)', type: 'text' },
        {
          code: 'doses_dtp',
          label: 'Nº de Doses da Vacina Tríplice (DTP) ou Tetravalente (DTP+Hib)',
          type: 'code',
          options: [
            { code: '1', label: 'Uma' },
            { code: '2', label: 'Duas' },
            { code: '3', label: 'Três' },
            { code: '4', label: 'Três + Um Reforço' },
            { code: '5', label: 'Três + Dois Reforços' },
            { code: '6', label: 'Nunca Vacinado' },
            { code: '9', label: 'Ignorado' },
          ],
        },
        { code: 'data_ultima_dose', label: 'Data da Última Dose', type: 'date' },
      ],
    },
    {
      title: 'Dados Clínicos',
      fields: [
        { code: 'data_inicio_tosse', label: 'Data do Início da Tosse', type: 'date' },
        simNaoIgnField('sintoma_tosse', 'Tosse'),
        simNaoIgnField('sintoma_tosse_paroxistica', 'Tosse Paroxística'),
        simNaoIgnField('sintoma_respiracao_ruidosa_guincho', 'Respiração Ruidosa ao Final da Crise de Tosse (Guincho)'),
        simNaoIgnField('sintoma_cianose', 'Cianose'),
        simNaoIgnField('sintoma_vomitos', 'Vômitos'),
        simNaoIgnField('sintoma_apneia', 'Apnéia'),
        simNaoIgnField('sintoma_temperatura_menor_38', 'Temperatura < 38ºC'),
        simNaoIgnField('sintoma_temperatura_maior_igual_38', 'Temperatura ≥ 38ºC'),
        simNaoIgnField('sintoma_outros', 'Outros Sintomas'),
        {
          code: 'sintoma_outros_especifique',
          label: 'Outros Sintomas, especifique',
          type: 'text',
          visibleWhen: { fieldCode: 'sintoma_outros', equals: ['1'] },
        },
        simNaoIgnField('complicacao_pneumonia_broncopneumonia', 'Complicação: Pneumonia ou Broncopneumonia'),
        simNaoIgnField('complicacao_encefalopatia_convulsoes', 'Complicação: Encefalopatia (Convulsões)'),
        simNaoIgnField('complicacao_desidratacao', 'Complicação: Desidratação'),
        simNaoIgnField('complicacao_otite', 'Complicação: Otite'),
        simNaoIgnField('complicacao_desnutricao', 'Complicação: Desnutrição'),
        simNaoIgnField('complicacao_outras', 'Outras Complicações'),
        {
          code: 'complicacao_outras_especifique',
          label: 'Outras Complicações, especifique',
          type: 'text',
          visibleWhen: { fieldCode: 'complicacao_outras', equals: ['1'] },
        },
      ],
    },
    {
      title: 'Atendimento',
      fields: [
        simNaoIgnField('ocorreu_hospitalizacao', 'Ocorreu Hospitalização'),
        { code: 'data_internacao', label: 'Data da Internação', type: 'date', visibleWhen: { fieldCode: 'ocorreu_hospitalizacao', equals: ['1'] } },
        { code: 'uf_hospital', label: 'UF do Hospital', type: 'text', maxLength: 2, visibleWhen: { fieldCode: 'ocorreu_hospitalizacao', equals: ['1'] } },
        { code: 'municipio_hospital', label: 'Município do Hospital', type: 'text', visibleWhen: { fieldCode: 'ocorreu_hospitalizacao', equals: ['1'] } },
        { code: 'nome_hospital', label: 'Nome do Hospital', type: 'text', visibleWhen: { fieldCode: 'ocorreu_hospitalizacao', equals: ['1'] } },
      ],
    },
    {
      title: 'Tratamento',
      fields: [
        simNaoIgnField('utilizou_antibiotico', 'Utilizou Antibiótico'),
        {
          code: 'data_administracao_antibiotico',
          label: 'Data de Administração do Antibiótico',
          type: 'date',
          visibleWhen: { fieldCode: 'utilizou_antibiotico', equals: ['1'] },
        },
      ],
    },
    {
      title: 'Dados Laboratoriais',
      fields: [
        simNaoIgnField('coleta_material_nasofaringe', 'Coleta de Material da Nasofaringe'),
        { code: 'data_coleta_material', label: 'Data da Coleta de Material', type: 'date' },
        {
          code: 'resultado_cultura',
          label: 'Resultado da Cultura',
          type: 'code',
          options: [
            { code: '1', label: 'Positiva' },
            { code: '2', label: 'Negativa' },
            { code: '3', label: 'Não Realizada' },
            { code: '9', label: 'Ignorado' },
          ],
        },
      ],
    },
    {
      title: 'Medidas de Controle',
      fields: [
        simNaoIgnField('identificacao_comunicantes_intimos', 'Realizada Identificação dos Comunicantes Íntimos?'),
        {
          code: 'quantos_comunicantes',
          label: 'Se Sim, Quantos?',
          type: 'number',
          visibleWhen: { fieldCode: 'identificacao_comunicantes_intimos', equals: ['1'] },
        },
        {
          code: 'casos_secundarios_confirmados',
          label: 'Quantos Casos Secundários Foram Confirmados entre os Comunicantes',
          type: 'code',
          options: [
            { code: '0', label: 'Nenhum' },
            { code: '1', label: 'Um' },
            { code: '2', label: 'Dois ou mais' },
            { code: '9', label: 'Ignorado' },
          ],
        },
        simNaoIgnField('coleta_material_comunicantes', 'Realizada Coleta de Material da Nasofaringe dos Comunicantes?'),
        {
          code: 'em_quantos_coletado',
          label: 'Se Sim, Em Quantos?',
          type: 'number',
          visibleWhen: { fieldCode: 'coleta_material_comunicantes', equals: ['1'] },
        },
        { code: 'comunicantes_cultura_positiva', label: 'Em Quantos Comunicantes o Resultado da Cultura Foi Positivo?', type: 'number' },
        {
          code: 'medidas_prevencao_controle',
          label: 'Medidas de Prevenção/Controle',
          type: 'code',
          options: [
            { code: '1', label: 'Bloqueio Vacinal' },
            { code: '2', label: 'Quimioprofilaxia' },
            { code: '3', label: 'Ambos' },
            { code: '4', label: 'Não' },
            { code: '9', label: 'Ignorado' },
          ],
        },
      ],
    },
    {
      title: 'Conclusão',
      fields: [
        {
          code: 'classificacao_final',
          label: 'Classificação Final',
          type: 'code',
          options: [
            { code: '1', label: 'Confirmado' },
            { code: '2', label: 'Descartado' },
          ],
        },
        {
          code: 'criterio_confirmacao_descarte',
          label: 'Critério de Confirmação/Descarte',
          type: 'code',
          options: [
            { code: '1', label: 'Laboratorial' },
            { code: '2', label: 'Clínico-Epidemiológico' },
            { code: '3', label: 'Clínico' },
          ],
        },
        simNaoIgnField('doenca_relacionada_trabalho', 'Doença Relacionada ao Trabalho'),
        {
          code: 'evolucao',
          label: 'Evolução',
          type: 'code',
          options: [
            { code: '1', label: 'Cura' },
            { code: '2', label: 'Óbito por Coqueluche' },
            { code: '3', label: 'Óbito por Outras Causas' },
            { code: '9', label: 'Ignorado' },
          ],
        },
        { code: 'data_obito', label: 'Data do Óbito', type: 'date', visibleWhen: { fieldCode: 'evolucao', equals: ['2', '3'] } },
        { code: 'data_encerramento', label: 'Data do Encerramento', type: 'date' },
      ],
    },
  ],
};
