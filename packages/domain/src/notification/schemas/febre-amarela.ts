import type { SinanBodySchema } from '../types.js';
import { simNaoIgnField } from './shared-options.js';

/**
 * Campos 31-70 da ficha SINAN "Febre Amarela" (Febre_Amarela_v5.pdf),
 * extraídos do texto/layout impresso do PDF-base campo a campo.
 *
 * REESCRITO em 2026-09-11, na revisão de fidelidade pós-Hepatites Virais/
 * Leptospirose/Chagas/Malária/Sarampo/Meningite/Coqueluche: a versão
 * anterior (Lote 4) tinha só 3 grupos e ~9 campos genéricos (`sorologia_igm_
 * febre_amarela`, `isolamento_viral` via `labResultadoField`, `evolucao_caso`
 * genérico) contra os ~55 campos reais da ficha. Faltavam: a investigação
 * entomológica/epizootias completa (33, 3 itens — a v1 não tinha nada
 * disso), local/UF/município/unidade de saúde da vacinação (36-38), os 4
 * sinais e sintomas reais (39 — dor abdominal, sinal de Faget, sinais
 * hemorrágicos, distúrbios de excreção renal — nenhum estava na v1),
 * hospitalização completa com local (40-44), os exames inespecíficos
 * (bilirrubinas e transaminases — 45), a segunda amostra sorológica
 * (48-49), histopatologia/imunohistoquímica/RT-PCR (53-56, a v1 só tinha
 * "isolamento viral" genérico sem esses três exames), classificação final
 * com as 3 opções reais (Silvestre/Urbana/Descartado — não existe conceito
 * de "sorologia positiva=confirmado" simples), critério de confirmação
 * (58), local provável da infecção completo (59-65), doença relacionada ao
 * trabalho e atividade no local (66-67), data de óbito/encerramento
 * (69-70). "Evolução do Caso" (68) também tem opções próprias da ficha, não
 * as genéricas.
 */
export const FEBRE_AMARELA_BODY_SCHEMA: SinanBodySchema = {
  schemaCode: 'FEBRE_AMARELA',
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
        simNaoIgnField('ocorrencia_epizootias', 'Ocorrência de Epizootias (Mortandade de Macacos)'),
        simNaoIgnField('isolamento_virus_mosquitos', 'Isolamento de Vírus em Mosquitos'),
        simNaoIgnField('presenca_aedes_aegypti_area_urbana', 'Presença de Mosquito Aedes aegypti em Área Urbana'),
        simNaoIgnField('vacinado_febre_amarela', 'Vacinado Contra Febre Amarela'),
        { code: 'data_vacinacao', label: 'Caso Afirmativo, Data', type: 'date', visibleWhen: { fieldCode: 'vacinado_febre_amarela', equals: ['1'] } },
        { code: 'uf_vacinacao', label: 'UF da Vacinação', type: 'text', maxLength: 2, visibleWhen: { fieldCode: 'vacinado_febre_amarela', equals: ['1'] } },
        { code: 'municipio_vacinacao', label: 'Município da Vacinação', type: 'text', visibleWhen: { fieldCode: 'vacinado_febre_amarela', equals: ['1'] } },
        { code: 'unidade_saude_vacinacao', label: 'Unidade de Saúde da Vacinação', type: 'text', visibleWhen: { fieldCode: 'vacinado_febre_amarela', equals: ['1'] } },
      ],
    },
    {
      title: 'Dados Clínicos',
      fields: [
        simNaoIgnField('sintoma_dor_abdominal', 'Dor Abdominal'),
        simNaoIgnField('sintoma_sinal_faget', 'Sinal de Faget (Temperatura Alta e Frequência Cardíaca Lenta)'),
        simNaoIgnField('sintoma_sinais_hemorragicos', 'Sinais Hemorrágicos (Hematêmese, Melena, Epistaxe, Gengivorragia, etc.)'),
        simNaoIgnField('sintoma_disturbios_excrecao_renal', 'Distúrbios de Excreção Renal (Oligúria e/ou Anúria)'),
      ],
    },
    {
      title: 'Atendimento',
      fields: [
        simNaoIgnField('ocorreu_hospitalizacao', 'Ocorreu Hospitalização'),
        { code: 'data_internacao', label: 'Data da Internação', type: 'date', visibleWhen: { fieldCode: 'ocorreu_hospitalizacao', equals: ['1'] } },
        { code: 'uf_hospital', label: 'UF do Hospital', type: 'text', maxLength: 2, visibleWhen: { fieldCode: 'ocorreu_hospitalizacao', equals: ['1'] } },
        { code: 'municipio_hospital', label: 'Município do Hospital', type: 'text', visibleWhen: { fieldCode: 'ocorreu_hospitalizacao', equals: ['1'] } },
        { code: 'unidade_saude_hospital', label: 'Unidade de Saúde do Hospital', type: 'text', visibleWhen: { fieldCode: 'ocorreu_hospitalizacao', equals: ['1'] } },
      ],
    },
    {
      title: 'Dados do Laboratório — Exames Inespecíficos',
      fields: [
        { code: 'bilirrubina_total_mg_dl', label: 'Bilirrubina Total (mg/dl)', type: 'text' },
        { code: 'bilirrubina_direta_mg_dl', label: 'Bilirrubina Direta (mg/dl)', type: 'text' },
        { code: 'ast_tgo_ui', label: 'AST (TGO) (UI)', type: 'text' },
        { code: 'alt_tgp_ui', label: 'ALT (TGP) (UI)', type: 'text' },
      ],
    },
    {
      title: 'Dados do Laboratório — Exame Sorológico (IgM)',
      fields: [
        { code: 'data_coleta_sorologia_1a_amostra', label: 'Data da Coleta (1ª Amostra)', type: 'date' },
        resultadoLabField('resultado_sorologia_1a_amostra', 'Resultado da 1ª Amostra'),
        { code: 'data_coleta_sorologia_2a_amostra', label: 'Data da Coleta (2ª Amostra)', type: 'date' },
        resultadoLabField('resultado_sorologia_2a_amostra', 'Resultado da 2ª Amostra'),
      ],
    },
    {
      title: 'Dados do Laboratório — Isolamento Viral, Histopatologia, Imunohistoquímica e RT-PCR',
      fields: [
        simNaoIgnField('material_coletado_isolamento', 'Material Coletado (Isolamento Viral)'),
        { code: 'data_coleta_isolamento', label: 'Data da Coleta (Isolamento)', type: 'date' },
        resultadoLabField('resultado_isolamento', 'Resultado do Isolamento'),
        {
          code: 'resultado_histopatologia',
          label: 'Resultado — Histopatologia',
          type: 'code',
          options: [
            { code: '1', label: 'Compatível' },
            { code: '2', label: 'Negativo' },
            { code: '3', label: 'Inconclusivo' },
            { code: '4', label: 'Não realizado' },
          ],
        },
        {
          code: 'resultado_imunohistoquimica',
          label: 'Resultado — Imunohistoquímica',
          type: 'code',
          options: [
            { code: '1', label: 'Positivo' },
            { code: '2', label: 'Negativo' },
            { code: '3', label: 'Inconclusivo' },
            { code: '4', label: 'Não realizado' },
          ],
        },
        { code: 'data_coleta_rtpcr', label: 'Data da Coleta (RT-PCR)', type: 'date' },
        {
          code: 'resultado_rtpcr',
          label: 'Resultado — RT-PCR',
          type: 'code',
          options: [
            { code: '1', label: 'Positivo' },
            { code: '2', label: 'Negativo' },
            { code: '3', label: 'Inconclusivo' },
            { code: '4', label: 'Não realizado' },
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
            { code: '1', label: 'Febre Amarela Silvestre' },
            { code: '2', label: 'Febre Amarela Urbana' },
            { code: '3', label: 'Descartado' },
          ],
        },
        {
          code: 'classificacao_final_descartado_especifique',
          label: 'Descartado, especifique',
          type: 'text',
          visibleWhen: { fieldCode: 'classificacao_final', equals: ['3'] },
        },
        {
          code: 'criterio_confirmacao_descarte',
          label: 'Critério de Confirmação/Descarte',
          type: 'code',
          options: [
            { code: '1', label: 'Laboratorial' },
            { code: '2', label: 'Clínico-Epidemiológico' },
          ],
        },
        {
          code: 'caso_autoctone',
          label: 'Caso Autóctone do Município de Residência',
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
        { code: 'localidade_provavel_infeccao', label: 'Localidade Provável da Infecção', type: 'text', visibleWhen: { fieldCode: 'caso_autoctone', equals: ['2'] } },
        simNaoIgnField('doenca_relacionada_trabalho', 'Doença Relacionada ao Trabalho'),
        {
          code: 'atividade_local_provavel_infeccao',
          label: 'Atividade Desenvolvida no Local Provável de Infecção',
          type: 'code',
          options: [
            { code: '1', label: 'Trabalho' },
            { code: '2', label: 'Turismo' },
            { code: '3', label: 'Lazer' },
            { code: '9', label: 'Ignorado' },
          ],
        },
        {
          code: 'evolucao_caso',
          label: 'Evolução do Caso',
          type: 'code',
          options: [
            { code: '1', label: 'Cura' },
            { code: '2', label: 'Óbito por febre amarela' },
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
          label: 'Deslocamento para Área Rural ou Outros Municípios (Data/UF/Município/País/Meio de Transporte)',
          type: 'text',
        },
        { code: 'observacoes', label: 'Observações', type: 'text' },
      ],
    },
  ],
};

function resultadoLabField(code: string, label: string) {
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
