import type { SinanBodySchema } from '../types.js';
import { simNaoIgnField } from './shared-options.js';

/**
 * Campos 31-74 da ficha SINAN "Leptospirose" (Ficha_Leptospirose.pdf),
 * extraídos do texto/layout impresso do PDF-base campo a campo.
 *
 * REESCRITO em 2026-09-11, na revisão de fidelidade pós-Chagas/Malária/
 * Sarampo/Meningite/Coqueluche: a versão anterior (Lote 3) tinha um campo
 * `tratamento` inteiro (Penicilina/Doxiciclina/Ceftriaxona) que **não
 * existe em lugar nenhum da ficha real** — esta ficha do SINAN não registra
 * antibioticoterapia. O checklist de "Exposição/Fonte de Infecção" também
 * tinha itens que não correspondem aos 12 reais do campo 33 (`solo_lamacento`,
 * `contato_bovinos_cao`, `trabalho_abatedouro_frigorifico`, `lazer_rios_
 * lagoas` não existem como tais; os reais são água/lama de enchente,
 * criação de animais, caixa d'água, fossa/esgoto, local com sinais de
 * roedores, plantio/colheita, rio/córrego/lagoa/represa, roedores
 * diretamente, armazenamento de grãos, terreno baldio, lixo/entulho,
 * outras). O checklist de sintomas tinha só 8 dos 15 reais do campo 36 (e
 * incluía `choque_hipotensao`, que não existe nesta ficha). Faltavam
 * também: casos anteriores de leptospirose no local (34), data de
 * atendimento (35), hospitalização completa com datas/UF/município/hospital
 * (37-42), a grade inteira de laboratório (Sorologia IgM-Elisa,
 * Microaglutinação com sorovar/título por amostra, Isolamento,
 * Imunohistoquímica, RT-PCR — campos 43-60, ~20 campos), classificação
 * final e critério de confirmação (61-62), local provável da fonte de
 * infecção completo (63-68), área/ambiente da infecção (69-70), doença
 * relacionada ao trabalho (71), data de óbito/encerramento (73-74). A
 * "Evolução do Caso" (72) tem opções próprias da ficha (Cura/Óbito por
 * leptospirose/Óbito por outras causas/Ignorado), não o conjunto genérico.
 */
export const LEPTOSPIROSE_BODY_SCHEMA: SinanBodySchema = {
  schemaCode: 'LEPTOSPIROSE',
  groups: [
    {
      title: 'Dados Complementares do Caso',
      fields: [
        { code: 'data_investigacao', label: 'Data da Investigação', type: 'date' },
        { code: 'ocupacao', label: 'Ocupação', type: 'text' },
      ],
    },
    {
      title: 'Antecedentes Epidemiológicos — Situação de Risco (Contato/Limpeza de)',
      fields: [
        simNaoIgnField('situacao_risco_agua_lama_enchente', 'Água ou Lama de Enchente'),
        simNaoIgnField('situacao_risco_criacao_animais', 'Criação de Animais'),
        simNaoIgnField('situacao_risco_caixa_dagua', "Caixa d'Água"),
        simNaoIgnField('situacao_risco_fossa_caixa_gordura_esgoto', 'Fossa, Caixa de Gordura ou Esgoto'),
        simNaoIgnField('situacao_risco_local_sinais_roedores', 'Local com Sinais de Roedores'),
        simNaoIgnField('situacao_risco_plantio_colheita', 'Plantio/Colheita (Lavoura)'),
        simNaoIgnField('situacao_risco_rio_corrego_lagoa_represa', 'Rio, Córrego, Lagoa ou Represa'),
        simNaoIgnField('situacao_risco_roedores_diretamente', 'Roedores Diretamente'),
        simNaoIgnField('situacao_risco_armazenamento_graos_alimentos', 'Armazenamento de Grãos/Alimentos'),
        simNaoIgnField('situacao_risco_terreno_baldio', 'Terreno Baldio'),
        simNaoIgnField('situacao_risco_lixo_entulho', 'Lixo/Entulho'),
        simNaoIgnField('situacao_risco_outras', 'Outras Situações de Risco'),
        { code: 'situacao_risco_outras_especifique', label: 'Outras Situações de Risco, especifique', type: 'text', visibleWhen: { fieldCode: 'situacao_risco_outras', equals: ['1'] } },
      ],
    },
    {
      title: 'Antecedentes Epidemiológicos — Casos Anteriores',
      fields: [
        simNaoIgnField('casos_anteriores_leptospirose_local', 'Casos Anteriores de Leptospirose no Local Provável de Infecção nos Últimos Dois Meses'),
        simNaoIgnField('casos_anteriores_humanos', 'Casos Anteriores — Humanos', { visibleWhen: { fieldCode: 'casos_anteriores_leptospirose_local', equals: ['1'] } }),
        simNaoIgnField('casos_anteriores_animais', 'Casos Anteriores — Animais', { visibleWhen: { fieldCode: 'casos_anteriores_leptospirose_local', equals: ['1'] } }),
      ],
    },
    {
      title: 'Dados Clínicos',
      fields: [
        { code: 'data_atendimento', label: 'Data de Atendimento', type: 'date' },
        simNaoIgnField('sintoma_febre', 'Febre'),
        simNaoIgnField('sintoma_congestao_conjuntival', 'Congestão Conjuntival'),
        simNaoIgnField('sintoma_ictericia', 'Icterícia'),
        simNaoIgnField('sintoma_hemorragia_pulmonar', 'Hemorragia Pulmonar'),
        simNaoIgnField('sintoma_mialgia', 'Mialgia'),
        simNaoIgnField('sintoma_dor_panturrilha', 'Dor na Panturrilha'),
        simNaoIgnField('sintoma_insuficiencia_renal', 'Insuficiência Renal'),
        simNaoIgnField('sintoma_outras_hemorragias', 'Outras Hemorragias'),
        simNaoIgnField('sintoma_cefaleia', 'Cefaléia'),
        simNaoIgnField('sintoma_vomito', 'Vômito'),
        simNaoIgnField('sintoma_alteracoes_respiratorias', 'Alterações Respiratórias'),
        simNaoIgnField('sintoma_meningismo', 'Meningismo'),
        simNaoIgnField('sintoma_prostracao', 'Prostração'),
        simNaoIgnField('sintoma_diarreia', 'Diarréia'),
        simNaoIgnField('sintoma_alteracoes_cardiacas', 'Alterações Cardíacas'),
        simNaoIgnField('sintoma_outros', 'Outros Sinais e Sintomas'),
        { code: 'sintoma_outros_especifique', label: 'Outros Sinais e Sintomas, quais', type: 'text', visibleWhen: { fieldCode: 'sintoma_outros', equals: ['1'] } },
      ],
    },
    {
      title: 'Atendimento',
      fields: [
        simNaoIgnField('ocorreu_hospitalizacao', 'Ocorreu Hospitalização'),
        { code: 'data_internacao', label: 'Data da Internação', type: 'date', visibleWhen: { fieldCode: 'ocorreu_hospitalizacao', equals: ['1'] } },
        { code: 'data_alta', label: 'Data de Alta', type: 'date', visibleWhen: { fieldCode: 'ocorreu_hospitalizacao', equals: ['1'] } },
        { code: 'uf_hospital', label: 'UF do Hospital', type: 'text', maxLength: 2, visibleWhen: { fieldCode: 'ocorreu_hospitalizacao', equals: ['1'] } },
        { code: 'municipio_hospital', label: 'Município do Hospital', type: 'text', visibleWhen: { fieldCode: 'ocorreu_hospitalizacao', equals: ['1'] } },
        { code: 'nome_hospital', label: 'Nome do Hospital', type: 'text', visibleWhen: { fieldCode: 'ocorreu_hospitalizacao', equals: ['1'] } },
      ],
    },
    {
      title: 'Dados do Laboratório — Sorologia IgM (ELISA)',
      fields: [
        { code: 'data_coleta_elisa_1a_amostra', label: 'Data da Coleta — 1ª Amostra (ELISA)', type: 'date' },
        resultadoElisaField('resultado_elisa_1a_amostra', 'Resultado — 1ª Amostra (ELISA)'),
        { code: 'data_coleta_elisa_2a_amostra', label: 'Data da Coleta — 2ª Amostra (ELISA)', type: 'date' },
        resultadoElisaField('resultado_elisa_2a_amostra', 'Resultado — 2ª Amostra (ELISA)'),
      ],
    },
    {
      title: 'Dados do Laboratório — Microaglutinação (MAT)',
      fields: [
        { code: 'data_coleta_micro_1a_amostra', label: 'Data da Coleta — Micro 1ª Amostra', type: 'date' },
        { code: 'micro_1a_amostra_1_sorovar', label: 'Micro 1ª Amostra — 1º Sorovar', type: 'text' },
        { code: 'micro_1a_amostra_1_titulo', label: 'Micro 1ª Amostra — 1º Sorovar, Título (1:___)', type: 'text' },
        { code: 'micro_1a_amostra_2_sorovar', label: 'Micro 1ª Amostra — 2º Sorovar', type: 'text' },
        { code: 'micro_1a_amostra_2_titulo', label: 'Micro 1ª Amostra — 2º Sorovar, Título (1:___)', type: 'text' },
        resultadoMatField('resultado_micro_1a_amostra', 'Resultado MICRO-Aglutinação — 1ª Amostra'),
        { code: 'data_coleta_micro_2a_amostra', label: 'Data da Coleta — Micro 2ª Amostra', type: 'date' },
        { code: 'micro_2a_amostra_1_sorovar', label: 'Micro 2ª Amostra — 1º Sorovar', type: 'text' },
        { code: 'micro_2a_amostra_1_titulo', label: 'Micro 2ª Amostra — 1º Sorovar, Título (1:___)', type: 'text' },
        { code: 'micro_2a_amostra_2_sorovar', label: 'Micro 2ª Amostra — 2º Sorovar', type: 'text' },
        { code: 'micro_2a_amostra_2_titulo', label: 'Micro 2ª Amostra — 2º Sorovar, Título (1:___)', type: 'text' },
        resultadoMatField('resultado_micro_2a_amostra', 'Resultado MICRO-Aglutinação — 2ª Amostra'),
      ],
    },
    {
      title: 'Dados do Laboratório — Isolamento, Imunohistoquímica e RT-PCR',
      fields: [
        { code: 'data_coleta_isolamento', label: 'Data da Coleta (Isolamento)', type: 'date' },
        resultadoLabField('resultado_isolamento', 'Resultado — Isolamento'),
        { code: 'data_coleta_imunohistoquimica', label: 'Data da Coleta (Imunohistoquímica)', type: 'date' },
        resultadoLabField('resultado_imunohistoquimica', 'Resultado — Imunohistoquímica'),
        { code: 'data_coleta_rtpcr', label: 'Data da Coleta (RT-PCR)', type: 'date' },
        resultadoLabField('resultado_rtpcr', 'Resultado — RT-PCR'),
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
          label: 'Critério de Confirmação ou Descarte',
          type: 'code',
          options: [
            { code: '1', label: 'Clínico-Laboratorial' },
            { code: '2', label: 'Clínico-Epidemiológico' },
          ],
        },
        {
          code: 'caso_autoctone',
          label: 'O Caso é Autóctone do Município de Residência?',
          type: 'code',
          options: [
            { code: '1', label: 'Sim' },
            { code: '2', label: 'Não' },
            { code: '3', label: 'Indeterminado' },
          ],
        },
        { code: 'uf_provavel_infeccao', label: 'UF Provável da Infecção', type: 'text', maxLength: 2, visibleWhen: { fieldCode: 'caso_autoctone', equals: ['2'] } },
        { code: 'pais_provavel_infeccao', label: 'País Provável da Infecção', type: 'text', visibleWhen: { fieldCode: 'caso_autoctone', equals: ['2'] } },
        { code: 'municipio_provavel_infeccao', label: 'Município Provável da Infecção', type: 'text', visibleWhen: { fieldCode: 'caso_autoctone', equals: ['2'] } },
        { code: 'distrito_provavel_infeccao', label: 'Distrito Provável da Infecção', type: 'text', visibleWhen: { fieldCode: 'caso_autoctone', equals: ['2'] } },
        { code: 'bairro_provavel_infeccao', label: 'Bairro Provável da Infecção', type: 'text', visibleWhen: { fieldCode: 'caso_autoctone', equals: ['2'] } },
        {
          code: 'area_provavel_infeccao',
          label: 'Área Provável de Infecção',
          type: 'code',
          options: [
            { code: '1', label: 'Urbana' },
            { code: '2', label: 'Rural' },
            { code: '3', label: 'Peri-Urbana' },
            { code: '9', label: 'Ignorado' },
          ],
        },
        {
          code: 'ambiente_infeccao',
          label: 'Ambiente da Infecção',
          type: 'code',
          options: [
            { code: '1', label: 'Domiciliar' },
            { code: '2', label: 'Trabalho' },
            { code: '3', label: 'Lazer' },
            { code: '4', label: 'Outro' },
            { code: '9', label: 'Ignorado' },
          ],
        },
        simNaoIgnField('doenca_relacionada_trabalho', 'Doença Relacionada ao Trabalho'),
        {
          code: 'evolucao_caso',
          label: 'Evolução do Caso',
          type: 'code',
          options: [
            { code: '1', label: 'Cura' },
            { code: '2', label: 'Óbito por leptospirose' },
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
          code: 'deslocamento_situacao_risco_detalhes',
          label: 'Data e Endereço se Esteve em Situação de Risco Ocorrida nos 30 Dias que Antecederam os Primeiros Sintomas (Data/UF/Município/Endereço/Localidade)',
          type: 'text',
        },
        { code: 'observacoes', label: 'Observações', type: 'text' },
      ],
    },
  ],
};

function resultadoElisaField(code: string, label: string) {
  return {
    code,
    label,
    type: 'code' as const,
    options: [
      { code: '1', label: 'Reagente' },
      { code: '2', label: 'Não Reagente' },
      { code: '3', label: 'Inconclusivo' },
      { code: '4', label: 'Não realizado' },
    ],
  };
}

function resultadoMatField(code: string, label: string) {
  return {
    code,
    label,
    type: 'code' as const,
    options: [
      { code: '1', label: 'Reagente' },
      { code: '2', label: 'Não Reagente' },
      { code: '3', label: 'Não realizada' },
      { code: '9', label: 'Ignorado' },
    ],
  };
}

function resultadoLabField(code: string, label: string) {
  return {
    code,
    label,
    type: 'code' as const,
    options: [
      { code: '1', label: 'Positivo' },
      { code: '2', label: 'Negativo' },
      { code: '3', label: 'Inconclusivo' },
      { code: '4', label: 'Não realizado' },
    ],
  };
}
