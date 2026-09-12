import type { SinanBodySchema } from '../types.js';
import { simNaoIgnField } from './shared-options.js';

/**
 * Campos 27-52 da ficha "Sinan Influenza — Síndrome Respiratória Aguda
 * Grave (SRAG) Internada" (Srag_v5.pdf, revisão 22/08/2012, CID J11),
 * extraídos do texto/layout impresso do PDF-base campo a campo.
 *
 * ACHADO IMPORTANTE (11/09/2026): esta ficha usa a numeração e o layout do
 * **Sinan Influenza** (subsistema próprio de vigilância de influenza/SRAG),
 * não o "Sinan NET" clássico das outras 20 doenças — o cabeçalho aqui vai
 * de 1 a 26 (não 1-30) e a ordem/posição dos campos diverge (1=Data do
 * preenchimento, 7=Cartão SUS antes da data de nascimento, 11=Gestante
 * antes de Raça/Cor, etc.). Isso significa que a calibração de PDF (Fase
 * C) desta ficha **não pode reaproveitar `HEADER_BOXES`/`xOffset`/
 * `yOffset`** como as outras 11 doenças da Trilha 1 — precisa de
 * coordenadas totalmente novas. Documentando isso agora pra não presumir
 * que o mesmo offset uniforme vai funcionar quando a calibração chegar
 * aqui (mesma ressalva já registrada em `covid19.ts`, que usa um sistema
 * ainda mais diferente, o e-SUS Notifica).
 *
 * **Incerteza da extração de texto do PDF, já RESOLVIDA por render em
 * alta resolução (11/09/2026)**: o texto extraído do PDF colocava a lista
 * de opções de antiviral (Não usou/Oseltamivir/Zanamivir/Outro) perto do
 * campo 27 ("Recebeu Vacina contra Gripe..."), o que não fazia sentido
 * semântico. Confirmado por grid de medição + leitura do render visual: o
 * campo 27 é mesmo um Sim/Não/Ignorado simples (vacina), e a lista de
 * antiviral pertence inteira ao campo 31 ("Uso de antiviral?") — que não é
 * um Sim/Não com sub-campo, é **um único campo de código com as 5 opções
 * diretamente** (1-Não usou/2-Oseltamivir/3-Zanamivir/4-Outro/9-Ignorado).
 * Schema corrigido pra um campo só (`tipo_antiviral`), sem o `uso_
 * antiviral` booleano que a primeira versão desta reescrita tinha
 * inventado como intermediário.
 *
 * REESCRITO em 2026-09-11 (revisão de fidelidade, Trilha 2 — 13ª doença
 * revisada no total): a versão anterior (Lote 1) tinha só 7 sintomas
 * genéricos e nenhum fator de risco (a ficha real lista 10: Pneumopatias
 * Crônicas, Doença Cardiovascular Crônica, Doença Hepática Crônica, Doença
 * Neurológica Crônica, Doença Renal Crônica, Síndrome de Down, Diabetes
 * Mellitus, Imunodeficiência/Imunodepressão, Puerpério, Obesidade+IMC,
 * Outros). Faltava inteiramente: vacinação contra gripe e antiviral (27-32),
 * internação completa com UF/município/unidade (33-37), Raio X de Tórax
 * (38-39), suporte ventilatório e UTI com datas de entrada/saída (40-43),
 * a grade completa de dados laboratoriais — tipo de amostra, metodologia
 * (IFI/RT-PCR/outro método, cada um com data de resultado própria),
 * diagnóstico etiológico com 8 agentes diferentes incluindo subtipagem de
 * Influenza A (44-47), critério de confirmação (49), data de alta/óbito
 * (51). "Evolução do Caso"/"Classificação Final" também tinham opções
 * genéricas (`labResultadoField`/`evolucaoCasoField`) em vez das opções
 * exatas desta ficha (que usa "SRAG por Influenza/outros vírus/outros
 * agentes/não especificada" — um conceito totalmente diferente de
 * Cura/Óbito).
 */
export const SRAG_BODY_SCHEMA: SinanBodySchema = {
  schemaCode: 'SRAG',
  groups: [
    {
      title: 'Vacinação e Antiviral',
      fields: [
        simNaoIgnField('recebeu_vacina_gripe_12_meses', 'Recebeu Vacina Contra Gripe nos Últimos 12 Meses?'),
        { code: 'data_ultima_dose_vacina_gripe', label: 'Se Sim, Data da Última Dose', type: 'date', visibleWhen: { fieldCode: 'recebeu_vacina_gripe_12_meses', equals: ['1'] } },
        {
          code: 'tipo_antiviral',
          label: 'Uso de Antiviral?',
          type: 'code',
          options: [
            { code: '1', label: 'Não usou' },
            { code: '2', label: 'Oseltamivir' },
            { code: '3', label: 'Zanamivir' },
            { code: '4', label: 'Outro' },
            { code: '9', label: 'Ignorado' },
          ],
        },
        { code: 'tipo_antiviral_outro_especifique', label: 'Tipo de Antiviral — Outro, especifique', type: 'text', visibleWhen: { fieldCode: 'tipo_antiviral', equals: ['4'] } },
        {
          code: 'data_inicio_tratamento_antiviral',
          label: 'Data de Início do Tratamento',
          type: 'date',
          visibleWhen: { fieldCode: 'tipo_antiviral', equals: ['2', '3', '4'] },
        },
      ],
    },
    {
      title: 'Principais Sinais e Sintomas',
      fields: [
        simNaoIgnField('sintoma_febre', 'Febre'),
        simNaoIgnField('sintoma_tosse', 'Tosse'),
        simNaoIgnField('sintoma_dor_garganta', 'Dor de Garganta'),
        simNaoIgnField('sintoma_dispneia', 'Dispneia'),
        simNaoIgnField('sintoma_mialgia', 'Mialgia'),
        simNaoIgnField('sintoma_saturacao_o2_menor_95', 'Saturação de O₂ < 95%'),
        simNaoIgnField('sintoma_desconforto_respiratorio', 'Desconforto Respiratório'),
        { code: 'sintoma_outros_especifique', label: 'Outros Sinais e Sintomas Importantes', type: 'text' },
      ],
    },
    {
      title: 'Fatores de Risco',
      fields: [
        simNaoIgnField('fator_risco_pneumopatias_cronicas', 'Pneumopatias Crônicas'),
        simNaoIgnField('fator_risco_doenca_cardiovascular_cronica', 'Doença Cardiovascular Crônica'),
        simNaoIgnField('fator_risco_doenca_hepatica_cronica', 'Doença Hepática Crônica'),
        simNaoIgnField('fator_risco_doenca_neurologica_cronica', 'Doença Neurológica Crônica'),
        simNaoIgnField('fator_risco_doenca_renal_cronica', 'Doença Renal Crônica'),
        simNaoIgnField('fator_risco_sindrome_down', 'Síndrome de Down'),
        simNaoIgnField('fator_risco_diabetes_mellitus', 'Diabetes Mellitus'),
        simNaoIgnField('fator_risco_imunodeficiencia_imunodepressao', 'Imunodeficiência/Imunodepressão'),
        simNaoIgnField('fator_risco_puerperio', 'Puerpério (até 42 dias do parto)'),
        simNaoIgnField('fator_risco_obesidade', 'Obesidade'),
        { code: 'fator_risco_obesidade_imc', label: 'Se Obesidade, Especifique o IMC', type: 'text', visibleWhen: { fieldCode: 'fator_risco_obesidade', equals: ['1'] } },
        { code: 'fator_risco_outros_especifique', label: 'Outros Fatores de Risco Relacionados com a SRAG', type: 'text' },
      ],
    },
    {
      title: 'Internação',
      fields: [
        simNaoIgnField('ocorreu_internacao', 'Ocorreu Internação?'),
        { code: 'data_internacao', label: 'Data da Internação', type: 'date', visibleWhen: { fieldCode: 'ocorreu_internacao', equals: ['1'] } },
        { code: 'uf_internacao', label: 'UF da Internação', type: 'text', maxLength: 2, visibleWhen: { fieldCode: 'ocorreu_internacao', equals: ['1'] } },
        { code: 'municipio_unidade_internacao', label: 'Município da Unidade de Internação', type: 'text', visibleWhen: { fieldCode: 'ocorreu_internacao', equals: ['1'] } },
        { code: 'nome_unidade_saude_internacao', label: 'Nome da Unidade de Saúde da Internação', type: 'text', visibleWhen: { fieldCode: 'ocorreu_internacao', equals: ['1'] } },
        {
          code: 'raio_x_torax',
          label: 'Raio X de Tórax',
          type: 'code',
          options: [
            { code: '1', label: 'Normal' },
            { code: '2', label: 'Infiltrado intersticial' },
            { code: '3', label: 'Consolidação' },
            { code: '4', label: 'Misto' },
            { code: '5', label: 'Outro' },
            { code: '6', label: 'Não realizado' },
            { code: '9', label: 'Ignorado' },
          ],
        },
        { code: 'raio_x_torax_outro_especifique', label: 'Raio X de Tórax — Outro, especifique', type: 'text', visibleWhen: { fieldCode: 'raio_x_torax', equals: ['5'] } },
        { code: 'data_raio_x', label: 'Data do Raio X', type: 'date' },
        {
          code: 'suporte_ventilatorio',
          label: 'Fez Uso de Suporte Ventilatório?',
          type: 'code',
          options: [
            { code: '1', label: 'Não usou' },
            { code: '2', label: 'Sim, invasivo' },
            { code: '3', label: 'Sim, não invasivo' },
            { code: '9', label: 'Ignorado' },
          ],
        },
        simNaoIgnField('internado_uti', 'Foi Internado em Unidade de Terapia Intensiva?'),
        { code: 'data_entrada_uti', label: 'Data de Entrada na UTI', type: 'date', visibleWhen: { fieldCode: 'internado_uti', equals: ['1'] } },
        { code: 'data_saida_uti', label: 'Data de Saída na UTI', type: 'date', visibleWhen: { fieldCode: 'internado_uti', equals: ['1'] } },
      ],
    },
    {
      title: 'Dados Laboratoriais',
      fields: [
        {
          code: 'tipo_amostra_coletada',
          label: 'Coletou que Tipo de Amostra?',
          type: 'code',
          options: [
            { code: '1', label: 'Não coletou' },
            { code: '2', label: 'Secreção de oro e nasofaringe' },
            { code: '3', label: 'Tecido post-mortem' },
            { code: '4', label: 'Lavado Bronco-alveolar' },
            { code: '5', label: 'Outro' },
            { code: '9', label: 'Ignorado' },
          ],
        },
        { code: 'tipo_amostra_outro_especifique', label: 'Tipo de Amostra — Outro, especifique', type: 'text', visibleWhen: { fieldCode: 'tipo_amostra_coletada', equals: ['5'] } },
        { code: 'data_coleta_amostra', label: 'Data da Coleta', type: 'date' },
        simNaoIgnField('metodologia_ifi', 'Metodologia Realizada: IFI'),
        { code: 'data_resultado_ifi', label: 'Data do Resultado — IFI', type: 'date', visibleWhen: { fieldCode: 'metodologia_ifi', equals: ['1'] } },
        simNaoIgnField('metodologia_rtpcr', 'Metodologia Realizada: RT-PCR'),
        {
          code: 'tipo_rtpcr',
          label: 'Tipo de RT-PCR',
          type: 'code',
          visibleWhen: { fieldCode: 'metodologia_rtpcr', equals: ['1'] },
          options: [
            { code: '1', label: 'Convencional' },
            { code: '2', label: 'Em tempo real' },
          ],
        },
        { code: 'data_resultado_rtpcr', label: 'Data do Resultado — RT-PCR', type: 'date', visibleWhen: { fieldCode: 'metodologia_rtpcr', equals: ['1'] } },
        simNaoIgnField('metodologia_outro', 'Metodologia Realizada: Outro Método'),
        { code: 'metodologia_outro_especifique', label: 'Outro Método, especifique (ex.: cultura)', type: 'text', visibleWhen: { fieldCode: 'metodologia_outro', equals: ['1'] } },
        { code: 'data_resultado_outro_metodo', label: 'Data do Resultado do Outro Método', type: 'date', visibleWhen: { fieldCode: 'metodologia_outro', equals: ['1'] } },
      ],
    },
    {
      title: 'Diagnóstico Etiológico',
      fields: [
        diagnosticoField('diagnostico_influenza_a', 'Influenza A'),
        {
          code: 'influenza_a_subtipo',
          label: 'Se Positivo para Influenza A, Qual Subtipo',
          type: 'code',
          visibleWhen: { fieldCode: 'diagnostico_influenza_a', equals: ['1'] },
          options: [
            { code: '1', label: 'Influenza A(H1N1)pdm09' },
            { code: '2', label: 'Influenza A/H1 sazonal' },
            { code: '3', label: 'Influenza A/H3 sazonal' },
            { code: '4', label: 'Influenza A não subtipado' },
            { code: '5', label: 'Influenza A/H3N2v' },
            { code: '6', label: 'Outro subtipo de Influenza A' },
          ],
        },
        { code: 'influenza_a_subtipo_outro_especifique', label: 'Outro Subtipo de Influenza A, especifique', type: 'text', visibleWhen: { fieldCode: 'influenza_a_subtipo', equals: ['6'] } },
        diagnosticoField('diagnostico_influenza_b', 'Influenza B'),
        diagnosticoField('diagnostico_vsr', 'Vírus Sincicial Respiratório (VSR)'),
        diagnosticoField('diagnostico_parainfluenza_1', 'Parainfluenza 1'),
        diagnosticoField('diagnostico_parainfluenza_2', 'Parainfluenza 2'),
        diagnosticoField('diagnostico_parainfluenza_3', 'Parainfluenza 3'),
        diagnosticoField('diagnostico_adenovirus', 'Adenovírus'),
        { code: 'outros_agentes_etiologicos_respiratorios', label: 'Outros Agentes Etiológicos Respiratórios', type: 'text' },
        diagnosticoField('diagnostico_outro_virus_agente', 'Outro Vírus ou Agente Etiológico'),
        { code: 'diagnostico_outro_virus_agente_especifique', label: 'Outro Vírus ou Agente Etiológico, especifique', type: 'text' },
      ],
    },
    {
      title: 'Conclusão',
      fields: [
        {
          code: 'classificacao_final_srag',
          label: 'Classificação Final da SRAG — Internada ou Óbito por SRAG',
          type: 'code',
          options: [
            { code: '1', label: 'SRAG por Influenza' },
            { code: '2', label: 'SRAG por outros vírus respiratórios' },
            { code: '3', label: 'SRAG por outros agentes etiológicos' },
            { code: '4', label: 'SRAG não especificada' },
          ],
        },
        { code: 'classificacao_final_srag_outros_especifique', label: 'SRAG por Outros Agentes Etiológicos, especifique', type: 'text', visibleWhen: { fieldCode: 'classificacao_final_srag', equals: ['3'] } },
        {
          code: 'criterio_confirmacao',
          label: 'Critério de Confirmação',
          type: 'code',
          options: [
            { code: '1', label: 'Laboratorial' },
            { code: '2', label: 'Clínico-Epidemiológico' },
            { code: '3', label: 'Clínico' },
          ],
        },
        {
          code: 'evolucao_clinica',
          label: 'Evolução Clínica',
          type: 'code',
          options: [
            { code: '1', label: 'Recebeu alta por cura' },
            { code: '2', label: 'Evoluiu para óbito' },
            { code: '9', label: 'Ignorado' },
          ],
        },
        { code: 'data_alta_obito', label: 'Data da Alta ou Óbito', type: 'date' },
        { code: 'data_encerramento', label: 'Data do Encerramento', type: 'date' },
      ],
    },
  ],
};

function diagnosticoField(code: string, label: string) {
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
