import type { SinanBodySchema } from '../types.js';
import { simNaoIgnField } from './shared-options.js';

/**
 * Campos 31-65 da ficha SINAN "Doenças Exantemáticas Febris — Sarampo/
 * Rubéola" (Exantematica_v5.pdf), extraídos do texto/layout impresso do
 * PDF-base campo a campo.
 *
 * REESCRITO em 2026-09-11, na revisão de fidelidade pós-Meningite/
 * Coqueluche: a versão anterior (Lote 1) tinha campos que não existem como
 * checklist na ficha real (`febre`/`exantema_maculopapular` são datas —
 * campos 38/39 —, não sim/não; `linfadenopatia` não é o termo usado, o
 * campo real é "Presença de Gânglios Retroauriculares/Occipitais") e
 * faltavam ~40 campos reais inteiros: vacinação/data da última dose (33-34),
 * dados de contato epidemiológico (35-37), hospitalização completa (41-45),
 * a grade inteira de exame sorológico (Sarampo/Rubéola/Outras Exantemáticas
 * × IgM/IgG × S1/S2/Re-Teste — 18 campos), isolamento viral com tipo de
 * amostra e etiologia viral (49-50), medidas de controle com bloqueio
 * vacinal por faixa etária (51-53), classificação final do caso descartado
 * (56), local provável da fonte de infecção (57-62), data de
 * óbito/encerramento (64-65). A ficha oficial cobre Sarampo e Rubéola no
 * mesmo impresso — como o Vitaloop só tem o código `SARAMPO` cadastrado
 * (sem `RUBEOLA` separado), a classificação final mantém as 3 opções reais
 * (Sarampo/Rubéola/Descartado) pra não perder informação de quando a
 * investigação confirma Rubéola em vez de Sarampo.
 */
export const SARAMPO_BODY_SCHEMA: SinanBodySchema = {
  schemaCode: 'SARAMPO',
  groups: [
    {
      title: 'Dados Complementares do Caso',
      fields: [
        { code: 'data_investigacao', label: 'Data da Investigação', type: 'date' },
        { code: 'ocupacao', label: 'Ocupação', type: 'text' },
      ],
    },
    {
      title: 'Antecedentes Epidemiológicos',
      fields: [
        simNaoIgnField('vacinado_sarampo_rubeola', 'Tomou Vacina Contra Sarampo e Rubéola (dupla ou triviral)'),
        { code: 'data_ultima_dose', label: 'Data da Última Dose', type: 'date', visibleWhen: { fieldCode: 'vacinado_sarampo_rubeola', equals: ['1'] } },
        {
          code: 'contato_caso_suspeito_confirmado',
          label: 'Contato com Caso Suspeito ou Confirmado de Sarampo ou Rubéola (até 23 dias antes do início dos sinais e sintomas)',
          type: 'code',
          options: [
            { code: '1', label: 'Domicílio' },
            { code: '2', label: 'Vizinhança' },
            { code: '3', label: 'Trabalho' },
            { code: '4', label: 'Creche/Escola' },
            { code: '5', label: 'Posto de Saúde/Hospital' },
            { code: '6', label: 'Outro Estado/Município' },
            { code: '7', label: 'Sem História de Contato' },
            { code: '8', label: 'Outro país' },
            { code: '9', label: 'Ignorado' },
          ],
        },
        { code: 'nome_contato', label: 'Nome do Contato', type: 'text' },
        { code: 'endereco_contato', label: 'Endereço do Contato (Rua, Av., Apto., Bairro, Localidade, etc)', type: 'text' },
      ],
    },
    {
      title: 'Dados Clínicos',
      fields: [
        { code: 'data_inicio_exantema', label: 'Data do Início do Exantema', type: 'date' },
        { code: 'data_inicio_febre', label: 'Data do Início da Febre', type: 'date' },
        simNaoIgnField('sintoma_tosse', 'Tosse'),
        simNaoIgnField('sintoma_coriza', 'Coriza (nariz escorrendo)'),
        simNaoIgnField('sintoma_conjuntivite', 'Conjuntivite (olhos avermelhados)'),
        simNaoIgnField('sintoma_artralgia_artrite', 'Artralgia/Artrite (dores nas juntas)'),
        simNaoIgnField('sintoma_ganglios_retroauriculares_occipitais', 'Presença de Gânglios Retroauriculares/Occipitais (caroços atrás da orelha/pescoço)'),
        simNaoIgnField('sintoma_dor_retro_ocular', 'Dor Retro-Ocular (dor acima/atrás dos olhos)'),
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
      title: 'Dados do Laboratório — Exame Sorológico',
      fields: [
        { code: 'data_coleta_amostra1', label: 'Data da Coleta da 1ª Amostra (S1)', type: 'date' },
        { code: 'data_coleta_amostra2', label: 'Data da Coleta da 2ª Amostra (S2)', type: 'date' },
        resultadoSorologicoField('resultado_sarampo_igm_s1', 'Resultado — Sarampo IgM (S1)'),
        resultadoSorologicoField('resultado_sarampo_igm_s2', 'Resultado — Sarampo IgM (S2)'),
        resultadoSorologicoField('resultado_sarampo_igm_reteste', 'Resultado — Sarampo IgM (Re-Teste)'),
        resultadoSorologicoField('resultado_sarampo_igg_s1', 'Resultado — Sarampo IgG (S1)'),
        resultadoSorologicoField('resultado_sarampo_igg_s2', 'Resultado — Sarampo IgG (S2)'),
        resultadoSorologicoField('resultado_sarampo_igg_reteste', 'Resultado — Sarampo IgG (Re-Teste)'),
        resultadoSorologicoField('resultado_rubeola_igm_s1', 'Resultado — Rubéola IgM (S1)'),
        resultadoSorologicoField('resultado_rubeola_igm_s2', 'Resultado — Rubéola IgM (S2)'),
        resultadoSorologicoField('resultado_rubeola_igm_reteste', 'Resultado — Rubéola IgM (Re-Teste)'),
        resultadoSorologicoField('resultado_rubeola_igg_s1', 'Resultado — Rubéola IgG (S1)'),
        resultadoSorologicoField('resultado_rubeola_igg_s2', 'Resultado — Rubéola IgG (S2)'),
        resultadoSorologicoField('resultado_rubeola_igg_reteste', 'Resultado — Rubéola IgG (Re-Teste)'),
        resultadoSorologicoField('resultado_outras_igm_s1', 'Resultado — Outras Exantemáticas IgM (S1)'),
        resultadoSorologicoField('resultado_outras_igm_s2', 'Resultado — Outras Exantemáticas IgM (S2)'),
        resultadoSorologicoField('resultado_outras_igm_reteste', 'Resultado — Outras Exantemáticas IgM (Re-Teste)'),
        resultadoSorologicoField('resultado_outras_igg_s1', 'Resultado — Outras Exantemáticas IgG (S1)'),
        resultadoSorologicoField('resultado_outras_igg_s2', 'Resultado — Outras Exantemáticas IgG (S2)'),
        resultadoSorologicoField('resultado_outras_igg_reteste', 'Resultado — Outras Exantemáticas IgG (Re-Teste)'),
      ],
    },
    {
      title: 'Dados do Laboratório — Isolamento Viral',
      fields: [
        simNaoIgnField('amostra_clinica_coletada', 'Amostra Clínica Coletada'),
        simNaoIgnField('amostra_tipo_sangue_total', 'Tipo de Amostra: Sangue Total', { visibleWhen: { fieldCode: 'amostra_clinica_coletada', equals: ['1'] } }),
        simNaoIgnField('amostra_tipo_secrecao_nasofaringea', 'Tipo de Amostra: Secreção Nasofaríngea', { visibleWhen: { fieldCode: 'amostra_clinica_coletada', equals: ['1'] } }),
        simNaoIgnField('amostra_tipo_urina', 'Tipo de Amostra: Urina', { visibleWhen: { fieldCode: 'amostra_clinica_coletada', equals: ['1'] } }),
        simNaoIgnField('amostra_tipo_liquor', 'Tipo de Amostra: Liquor', { visibleWhen: { fieldCode: 'amostra_clinica_coletada', equals: ['1'] } }),
        {
          code: 'etiologia_viral',
          label: 'Etiologia Viral',
          type: 'code',
          options: [
            { code: '1', label: 'Vírus Sarampo Selvagem' },
            { code: '2', label: 'Vírus Sarampo Vacinal' },
            { code: '3', label: 'Vírus Rubéola Selvagem' },
            { code: '4', label: 'Vírus Rubéola Vacinal' },
            { code: '5', label: 'Dengue' },
            { code: '6', label: 'Herpes Vírus Tipo 6' },
            { code: '7', label: 'Parvovírus B19' },
            { code: '8', label: 'Enterovírus' },
            { code: '9', label: 'Outras' },
            { code: '10', label: 'Não detectado' },
          ],
        },
      ],
    },
    {
      title: 'Medidas de Controle',
      fields: [
        {
          code: 'realizou_bloqueio_vacinal',
          label: 'Realizou Bloqueio Vacinal',
          type: 'code',
          options: [
            { code: '1', label: 'Sim' },
            { code: '2', label: 'Não' },
            { code: '3', label: 'Não, todos vacinados' },
            { code: '4', label: 'Não, sem história de contato' },
            { code: '9', label: 'Ignorado' },
          ],
        },
        {
          code: 'bloqueio_vacinados_menor_5_anos',
          label: 'Quantidade de Pessoas Vacinadas — Menor de 5 anos',
          type: 'number',
          visibleWhen: { fieldCode: 'realizou_bloqueio_vacinal', equals: ['1'] },
        },
        {
          code: 'bloqueio_vacinados_5_a_14_anos',
          label: 'Quantidade de Pessoas Vacinadas — De 5 a 14 anos',
          type: 'number',
          visibleWhen: { fieldCode: 'realizou_bloqueio_vacinal', equals: ['1'] },
        },
        {
          code: 'bloqueio_vacinados_15_a_39_anos',
          label: 'Quantidade de Pessoas Vacinadas — De 15 a 39 anos',
          type: 'number',
          visibleWhen: { fieldCode: 'realizou_bloqueio_vacinal', equals: ['1'] },
        },
        {
          code: 'bloqueio_intervalo_tempo',
          label: 'Especifique Intervalo de Tempo',
          type: 'code',
          visibleWhen: { fieldCode: 'realizou_bloqueio_vacinal', equals: ['1'] },
          options: [
            { code: '1', label: 'Em até 72 horas' },
            { code: '2', label: 'Após 72 horas' },
            { code: '9', label: 'Ignorado' },
          ],
        },
      ],
    },
    {
      title: 'Conclusão — Classificação',
      fields: [
        {
          code: 'classificacao_final',
          label: 'Classificação Final',
          type: 'code',
          options: [
            { code: '1', label: 'Sarampo' },
            { code: '2', label: 'Rubéola' },
            { code: '3', label: 'Descartado' },
          ],
        },
        {
          code: 'criterio_confirmacao_descarte',
          label: 'Critério de Confirmação ou Descarte',
          type: 'code',
          options: [
            { code: '1', label: 'Laboratorial' },
            { code: '2', label: 'Clínico-epidemiológico' },
            { code: '3', label: 'Clínico' },
            { code: '4', label: 'Data da Última Dose da Vacina' },
          ],
        },
        {
          code: 'classificacao_final_caso_descartado',
          label: 'Classificação Final do Caso Descartado',
          type: 'code',
          visibleWhen: { fieldCode: 'classificacao_final', equals: ['3'] },
          options: [
            { code: '1', label: 'Dengue' },
            { code: '2', label: 'Escarlatina' },
            { code: '3', label: 'Exantema Súbito (Herpes Vírus Tipo 6)' },
            { code: '4', label: 'Eritema Infeccioso (Parvovírus B19)' },
            { code: '5', label: 'Enterovirose' },
            { code: '6', label: 'Evento Temporal Relacionado à Vacina' },
            { code: '7', label: 'IgM associado temporalmente à vacina' },
            { code: '8', label: 'Sem soroconversão dos anticorpos IgG' },
            { code: '9', label: 'Ignorado' },
          ],
        },
      ],
    },
    {
      title: 'Conclusão — Local Provável da Fonte de Infecção',
      fields: [
        {
          code: 'caso_autoctone',
          label: 'O Caso é Autóctone do Município de Residência? (no período de 7 a 18 dias para sarampo e 12 a 23 dias para rubéola)',
          type: 'code',
          options: [
            { code: '1', label: 'Sim' },
            { code: '2', label: 'Não' },
            { code: '3', label: 'Indeterminado' },
          ],
        },
        { code: 'uf_provavel_fonte', label: 'UF Provável da Fonte de Infecção', type: 'text', maxLength: 2, visibleWhen: { fieldCode: 'caso_autoctone', equals: ['2'] } },
        { code: 'pais_provavel_fonte', label: 'País Provável da Fonte de Infecção', type: 'text', visibleWhen: { fieldCode: 'caso_autoctone', equals: ['2'] } },
        { code: 'municipio_provavel_fonte', label: 'Município Provável da Fonte de Infecção', type: 'text', visibleWhen: { fieldCode: 'caso_autoctone', equals: ['2'] } },
        { code: 'distrito_provavel_fonte', label: 'Distrito Provável da Fonte de Infecção', type: 'text', visibleWhen: { fieldCode: 'caso_autoctone', equals: ['2'] } },
        { code: 'bairro_provavel_fonte', label: 'Bairro Provável da Fonte de Infecção', type: 'text', visibleWhen: { fieldCode: 'caso_autoctone', equals: ['2'] } },
      ],
    },
    {
      title: 'Conclusão — Evolução',
      fields: [
        {
          code: 'evolucao_caso',
          label: 'Evolução do Caso',
          type: 'code',
          options: [
            { code: '1', label: 'Cura' },
            { code: '2', label: 'Óbito por doenças exantemáticas' },
            { code: '3', label: 'Óbito por outras causas' },
            { code: '9', label: 'Ignorado' },
          ],
        },
        { code: 'data_obito', label: 'Data do Óbito', type: 'date', visibleWhen: { fieldCode: 'evolucao_caso', equals: ['2', '3'] } },
        { code: 'data_encerramento', label: 'Data do Encerramento', type: 'date' },
      ],
    },
    {
      title: 'Informações Complementares e Observações',
      fields: [
        {
          code: 'deslocamento_detalhes',
          label: 'Deslocamento (datas e locais frequentados no período de 7 a 23 dias anteriores ao início de sinais e sintomas)',
          type: 'text',
        },
        { code: 'observacoes_adicionais', label: 'Observações Adicionais', type: 'text' },
      ],
    },
  ],
};

function resultadoSorologicoField(code: string, label: string) {
  return {
    code,
    label,
    type: 'code' as const,
    options: [
      { code: '1', label: 'Reagente' },
      { code: '2', label: 'Não Reagente' },
      { code: '3', label: 'Inconclusivo' },
      { code: '4', label: 'Não Realizado' },
    ],
  };
}
