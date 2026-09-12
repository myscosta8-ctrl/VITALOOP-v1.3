import type { SinanBodySchema } from '../types.js';
import { simNaoIgnField } from './shared-options.js';

/**
 * Campos 31-67 da ficha SINAN "Dengue e Febre de Chikungunya"
 * (Ficha_DENGCHIK_FINAL.pdf), na parte referente a Chikungunya, extraídos
 * do texto/layout impresso do PDF-base campo a campo. Ver `dengue.ts` pro
 * par desta ficha e a explicação de por que os dois schemas ficam
 * separados apesar de compartilharem o mesmo impresso físico.
 *
 * REESCRITO em 2026-09-11, na revisão de fidelidade pós-Tuberculose/Raiva
 * Humana/Febre Amarela/Hepatites Virais/Leptospirose/Chagas/Malária/
 * Sarampo/Meningite/Coqueluche: a versão anterior (Lote 1) tinha um
 * checklist de 8 sintomas "mais distintivos" (poliartralgia migratória,
 * edema articular) que **não existem como campos separados na ficha
 * real** — o campo 33 real é um único checklist de 14 sinais clínicos
 * compartilhado com Dengue (Sim/Não, sem Ignorado), do qual "Artralgia
 * intensa" é o item específico de Chikungunya, não um campo à parte.
 * `artralgia_persistente_apos_2_semanas` também foi inventado — a ficha
 * real trata isso via "Apresentação Clínica: Aguda/Crônica" (campo 64),
 * não um campo de sintoma. Faltava inteiramente o checklist de doenças
 * pré-existentes (34, 7 itens). Os resultados laboratoriais eram genéricos
 * e não seguiam a estrutura real (2 amostras de sorologia IgM + PRNT, cada
 * uma com resultado próprio — campos 35-38). `classificacao_final` tinha
 * um código "14 — Chikungunya Fase Crônica" que **não existe** na ficha
 * (só existe o código 13 "Chikungunya"; a fase crônica é o campo separado
 * 64). Faltava hospitalização completa, local provável de infecção,
 * critério de confirmação, e "Evolução do Caso" com as 5 opções reais da
 * ficha (inclui "Óbito em investigação"), não as genéricas.
 */
export const CHIKUNGUNYA_BODY_SCHEMA: SinanBodySchema = {
  schemaCode: 'CHIKUNGUNYA',
  groups: [
    {
      title: 'Dados Clínicos e Laboratoriais',
      fields: [
        { code: 'data_investigacao', label: 'Data da Investigação', type: 'date' },
        { code: 'ocupacao', label: 'Ocupação', type: 'text' },
      ],
    },
    {
      title: 'Dados Clínicos — Sinais Clínicos',
      fields: [
        simNaoField('sinal_febre', 'Febre'),
        simNaoField('sinal_cefaleia', 'Cefaleia'),
        simNaoField('sinal_mialgia', 'Mialgia'),
        simNaoField('sinal_exantema', 'Exantema'),
        simNaoField('sinal_vomito', 'Vômito'),
        simNaoField('sinal_nauseas', 'Náuseas'),
        simNaoField('sinal_dor_nas_costas', 'Dor nas Costas'),
        simNaoField('sinal_artrite', 'Artrite'),
        simNaoField('sinal_artralgia_intensa', 'Artralgia Intensa'),
        simNaoField('sinal_conjuntivite', 'Conjuntivite'),
        simNaoField('sinal_petequias', 'Petéquias'),
        simNaoField('sinal_leucopenia', 'Leucopenia'),
        simNaoField('sinal_prova_laco_positiva', 'Prova do Laço Positiva'),
        simNaoField('sinal_dor_retroorbital', 'Dor Retroorbital'),
      ],
    },
    {
      title: 'Dados Clínicos — Doenças Pré-existentes',
      fields: [
        simNaoField('doenca_preexistente_diabetes', 'Diabetes'),
        simNaoField('doenca_preexistente_hipertensao_arterial', 'Hipertensão Arterial'),
        simNaoField('doenca_preexistente_doencas_autoimunes', 'Doenças Auto-imunes'),
        simNaoField('doenca_preexistente_doencas_hematologicas', 'Doenças Hematológicas'),
        simNaoField('doenca_preexistente_doenca_acido_peptica', 'Doença Ácido-péptica'),
        simNaoField('doenca_preexistente_hepatopatias', 'Hepatopatias'),
        simNaoField('doenca_preexistente_doenca_renal_cronica', 'Doença Renal Crônica'),
      ],
    },
    {
      title: 'Dados Laboratoriais — Chikungunya',
      fields: [
        { code: 'data_coleta_igm_1a_amostra', label: 'Sorologia (IgM) Chikungunya — Data da Coleta 1ª Amostra (S1)', type: 'date' },
        { code: 'data_coleta_igm_2a_amostra', label: 'Sorologia (IgM) Chikungunya — Data da Coleta 2ª Amostra (S2)', type: 'date' },
        { code: 'data_coleta_prnt', label: 'Exame PRNT — Data da Coleta', type: 'date' },
        resultadoField('resultado_sorologia_s1', 'Resultado — 1ª Amostra (S1)'),
        resultadoField('resultado_sorologia_s2', 'Resultado — 2ª Amostra (S2)'),
        resultadoField('resultado_prnt', 'Resultado — PRNT'),
        {
          code: 'resultado_histopatologia',
          label: 'Histopatologia — Resultado',
          type: 'code',
          options: [
            { code: '1', label: 'Compatível' },
            { code: '2', label: 'Incompatível' },
            { code: '3', label: 'Inconclusivo' },
            { code: '4', label: 'Não realizado' },
          ],
        },
        resultadoField('resultado_imunohistoquimica', 'Imunohistoquímica — Resultado'),
      ],
    },
    {
      title: 'Hospitalização',
      fields: [
        simNaoIgnField('ocorreu_hospitalizacao', 'Ocorreu Hospitalização?'),
        { code: 'data_internacao', label: 'Data da Internação', type: 'date', visibleWhen: { fieldCode: 'ocorreu_hospitalizacao', equals: ['1'] } },
        { code: 'uf_hospital', label: 'UF do Hospital', type: 'text', maxLength: 2, visibleWhen: { fieldCode: 'ocorreu_hospitalizacao', equals: ['1'] } },
        { code: 'municipio_hospital', label: 'Município do Hospital', type: 'text', visibleWhen: { fieldCode: 'ocorreu_hospitalizacao', equals: ['1'] } },
        { code: 'nome_hospital', label: 'Nome do Hospital', type: 'text', visibleWhen: { fieldCode: 'ocorreu_hospitalizacao', equals: ['1'] } },
        { code: 'telefone_hospital', label: '(DDD) Telefone do Hospital', type: 'text', visibleWhen: { fieldCode: 'ocorreu_hospitalizacao', equals: ['1'] } },
      ],
    },
    {
      title: 'Conclusão',
      fields: [
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
        { code: 'uf_provavel_infeccao', label: 'UF Provável de Infecção', type: 'text', maxLength: 2, visibleWhen: { fieldCode: 'caso_autoctone', equals: ['2'] } },
        { code: 'pais_provavel_infeccao', label: 'País Provável de Infecção', type: 'text', visibleWhen: { fieldCode: 'caso_autoctone', equals: ['2'] } },
        { code: 'municipio_provavel_infeccao', label: 'Município Provável de Infecção', type: 'text', visibleWhen: { fieldCode: 'caso_autoctone', equals: ['2'] } },
        { code: 'distrito_provavel_infeccao', label: 'Distrito Provável de Infecção', type: 'text', visibleWhen: { fieldCode: 'caso_autoctone', equals: ['2'] } },
        { code: 'bairro_provavel_infeccao', label: 'Bairro Provável de Infecção', type: 'text', visibleWhen: { fieldCode: 'caso_autoctone', equals: ['2'] } },
        {
          code: 'classificacao_final',
          label: 'Classificação',
          type: 'code',
          options: [
            { code: '5', label: 'Descartado' },
            { code: '13', label: 'Chikungunya' },
          ],
        },
        {
          code: 'criterio_confirmacao_descarte',
          label: 'Critério de Confirmação/Descarte',
          type: 'code',
          options: [
            { code: '1', label: 'Laboratório' },
            { code: '2', label: 'Clínico-Epidemiológico' },
            { code: '3', label: 'Em investigação' },
          ],
        },
        {
          code: 'apresentacao_clinica',
          label: 'Apresentação Clínica',
          type: 'code',
          options: [
            { code: '1', label: 'Aguda' },
            { code: '2', label: 'Crônica' },
          ],
        },
        {
          code: 'evolucao_caso',
          label: 'Evolução do Caso',
          type: 'code',
          options: [
            { code: '1', label: 'Cura' },
            { code: '2', label: 'Óbito pelo agravo' },
            { code: '3', label: 'Óbito por outras causas' },
            { code: '4', label: 'Óbito em investigação' },
            { code: '9', label: 'Ignorado' },
          ],
        },
        { code: 'data_obito', label: 'Data do Óbito', type: 'date', visibleWhen: { fieldCode: 'evolucao_caso', equals: ['2', '3', '4'] } },
        { code: 'data_encerramento', label: 'Data do Encerramento', type: 'date' },
      ],
    },
    {
      title: 'Informações Complementares e Observações',
      fields: [{ code: 'observacoes_adicionais', label: 'Observações Adicionais', type: 'text' }],
    },
  ],
};

function simNaoField(code: string, label: string) {
  return {
    code,
    label,
    type: 'code' as const,
    options: [
      { code: '1', label: 'Sim' },
      { code: '2', label: 'Não' },
    ],
  };
}

function resultadoField(code: string, label: string) {
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
