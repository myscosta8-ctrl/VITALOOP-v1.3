import type { SinanBodySchema } from '../types.js';
import { simNaoIgnField } from './shared-options.js';

/**
 * Campos 31-71 da ficha SINAN "Dengue e Febre de Chikungunya"
 * (Ficha_DENGCHIK_FINAL.pdf), na parte referente a Dengue, extraídos do
 * texto/layout impresso do PDF-base campo a campo. Dengue e Chikungunya
 * compartilham o mesmo impresso físico (cabeçalho, sinais clínicos,
 * doenças pré-existentes, hospitalização, local provável de infecção e
 * conclusão são idênticos nos dois); os blocos de laboratório e o bloco de
 * sinais de alarme/gravidade (exclusivo de Dengue) são diferentes — por
 * isso o Vitaloop mantém dois schemas separados (`dengue.ts`/
 * `chikungunya.ts`), cada um com os campos da doença correspondente. Ver
 * `chikungunya.ts` pro par desta ficha.
 *
 * REESCRITO em 2026-09-11, na revisão de fidelidade pós-Tuberculose/Raiva
 * Humana/Febre Amarela/Hepatites Virais/Leptospirose/Chagas/Malária/
 * Sarampo/Meningite/Coqueluche: a versão anterior (Lote 1) tinha um
 * checklist de 12 sinais e sintomas com itens que não batem exatamente com
 * os 14 reais do campo 33 (faltava "Dor nas costas"; a v1 tinha isso como
 * checklist Sim/Não/Ignorado quando a ficha real só tem Sim/Não pra este
 * campo). Faltava inteiramente o checklist de doenças pré-existentes (34,
 * 7 itens). Os resultados laboratoriais eram genéricos (`labResultadoField`
 * com opções Positivo/Negativo/Inconclusivo/Não Realizado — a ficha real
 * usa códigos exatos por exame) e faltavam Isolamento Viral e Sorotipo
 * (DENV1-4) inteiros. Hospitalização não tinha UF/município/telefone.
 * Faltava local provável de infecção completo, critério de confirmação,
 * apresentação clínica, e principalmente **o bloco inteiro de Dengue com
 * Sinais de Alarme e Dengue Grave** (campos 68-71, ~20 sub-itens) — a
 * distinção clínica mais importante desta ficha para conduta em UPA, que a
 * v1 não tinha em nenhuma forma. "Evolução do Caso" também tinha opções
 * genéricas em vez das 5 próprias da ficha (inclui "Óbito em investigação").
 * `classificacao_final` estava certo nos códigos numéricos mas sem o
 * critério de confirmação que os acompanha.
 */
export const DENGUE_BODY_SCHEMA: SinanBodySchema = {
  schemaCode: 'DENGUE',
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
      title: 'Dados Laboratoriais — Dengue',
      fields: [
        { code: 'data_coleta_sorologia_igm_dengue', label: 'Sorologia (IgM) Dengue — Data da Coleta', type: 'date' },
        resultadoField('resultado_sorologia_igm_dengue', 'Sorologia (IgM) Dengue — Resultado'),
        { code: 'data_coleta_ns1', label: 'Exame NS1 — Data da Coleta', type: 'date' },
        resultadoField('resultado_ns1', 'Exame NS1 — Resultado'),
        { code: 'data_coleta_isolamento', label: 'Isolamento — Data da Coleta', type: 'date' },
        resultadoField('resultado_isolamento', 'Isolamento — Resultado'),
        { code: 'data_coleta_rtpcr', label: 'RT-PCR — Data da Coleta', type: 'date' },
        resultadoField('resultado_rtpcr', 'RT-PCR — Resultado'),
        {
          code: 'sorotipo',
          label: 'Sorotipo',
          type: 'code',
          options: [
            { code: '1', label: 'DENV 1' },
            { code: '2', label: 'DENV 2' },
            { code: '3', label: 'DENV 3' },
            { code: '4', label: 'DENV 4' },
          ],
        },
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
            { code: '10', label: 'Dengue' },
            { code: '11', label: 'Dengue com Sinais de Alarme' },
            { code: '12', label: 'Dengue Grave' },
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
      title: 'Dengue com Sinais de Alarme',
      fields: [
        {
          code: 'dengue_sinais_alarme',
          label: 'Dengue com Sinais de Alarme',
          type: 'code',
          options: [
            { code: '1', label: 'Sim' },
            { code: '2', label: 'Não' },
          ],
        },
        simNaoField('alarme_hipotensao_postural_lipotimia', 'Hipotensão Postural e/ou Lipotímia', { fieldCode: 'dengue_sinais_alarme', equals: ['1'] }),
        simNaoField('alarme_queda_abrupta_plaquetas', 'Queda Abrupta de Plaquetas', { fieldCode: 'dengue_sinais_alarme', equals: ['1'] }),
        simNaoField('alarme_vomitos_persistentes', 'Vômitos Persistentes', { fieldCode: 'dengue_sinais_alarme', equals: ['1'] }),
        simNaoField('alarme_dor_abdominal_intensa_continua', 'Dor Abdominal Intensa e Contínua', { fieldCode: 'dengue_sinais_alarme', equals: ['1'] }),
        simNaoField('alarme_letargia_irritabilidade', 'Letargia ou Irritabilidade', { fieldCode: 'dengue_sinais_alarme', equals: ['1'] }),
        simNaoField('alarme_sangramento_mucosa_outras_hemorragias', 'Sangramento de Mucosa/Outras Hemorragias', { fieldCode: 'dengue_sinais_alarme', equals: ['1'] }),
        simNaoField('alarme_aumento_progressivo_hematocrito', 'Aumento Progressivo do Hematócrito', { fieldCode: 'dengue_sinais_alarme', equals: ['1'] }),
        simNaoField('alarme_hepatomegalia_maior_2cm', 'Hepatomegalia ≥ 2cm', { fieldCode: 'dengue_sinais_alarme', equals: ['1'] }),
        simNaoField('alarme_acumulo_liquidos', 'Acúmulo de Líquidos', { fieldCode: 'dengue_sinais_alarme', equals: ['1'] }),
        { code: 'data_inicio_sinais_alarme', label: 'Data de Início dos Sinais de Alarme', type: 'date', visibleWhen: { fieldCode: 'dengue_sinais_alarme', equals: ['1'] } },
      ],
    },
    {
      title: 'Dengue Grave',
      fields: [
        {
          code: 'dengue_grave',
          label: 'Dengue Grave',
          type: 'code',
          options: [
            { code: '1', label: 'Sim' },
            { code: '2', label: 'Não' },
          ],
        },
        simNaoField('grave_pulso_debil_indetectavel', 'Extravasamento — Pulso Débil ou Indetectável', { fieldCode: 'dengue_grave', equals: ['1'] }),
        simNaoField('grave_taquicardia', 'Extravasamento — Taquicardia', { fieldCode: 'dengue_grave', equals: ['1'] }),
        simNaoField('grave_extremidades_frias', 'Extravasamento — Extremidades Frias', { fieldCode: 'dengue_grave', equals: ['1'] }),
        simNaoField('grave_pa_convergente_menor_20mmhg', 'Extravasamento — PA Convergente ≤ 20 mmHg', { fieldCode: 'dengue_grave', equals: ['1'] }),
        simNaoField('grave_tempo_enchimento_capilar_maior_3s', 'Extravasamento — Tempo de Enchimento Capilar ≥ 3 Segundos', { fieldCode: 'dengue_grave', equals: ['1'] }),
        simNaoField('grave_hipotensao_arterial_fase_tardia', 'Extravasamento — Hipotensão Arterial em Fase Tardia', { fieldCode: 'dengue_grave', equals: ['1'] }),
        simNaoField('grave_acumulo_liquidos_insuficiencia_respiratoria', 'Extravasamento — Acúmulo de Líquidos com Insuficiência Respiratória', { fieldCode: 'dengue_grave', equals: ['1'] }),
        simNaoField('grave_hematemese', 'Sangramento Grave — Hematêmese', { fieldCode: 'dengue_grave', equals: ['1'] }),
        simNaoField('grave_melena', 'Sangramento Grave — Melena', { fieldCode: 'dengue_grave', equals: ['1'] }),
        simNaoField('grave_metrorragia_volumosa', 'Sangramento Grave — Metrorragia Volumosa', { fieldCode: 'dengue_grave', equals: ['1'] }),
        simNaoField('grave_sangramento_snc', 'Sangramento Grave — Sangramento do SNC', { fieldCode: 'dengue_grave', equals: ['1'] }),
        simNaoField('grave_ast_alt_maior_1000', 'Comprometimento de Órgãos — AST/ALT > 1.000', { fieldCode: 'dengue_grave', equals: ['1'] }),
        simNaoField('grave_miocardite', 'Comprometimento de Órgãos — Miocardite', { fieldCode: 'dengue_grave', equals: ['1'] }),
        simNaoField('grave_alteracao_consciencia', 'Comprometimento de Órgãos — Alteração da Consciência', { fieldCode: 'dengue_grave', equals: ['1'] }),
        simNaoField('grave_outros_orgaos', 'Comprometimento de Órgãos — Outros', { fieldCode: 'dengue_grave', equals: ['1'] }),
        { code: 'grave_outros_orgaos_especifique', label: 'Outros Órgãos, especifique', type: 'text', visibleWhen: { fieldCode: 'grave_outros_orgaos', equals: ['1'] } },
        { code: 'data_inicio_sinais_gravidade', label: 'Data de Início dos Sinais de Gravidade', type: 'date', visibleWhen: { fieldCode: 'dengue_grave', equals: ['1'] } },
      ],
    },
    {
      title: 'Informações Complementares e Observações',
      fields: [{ code: 'observacoes_adicionais', label: 'Observações Adicionais', type: 'text' }],
    },
  ],
};

function simNaoField(code: string, label: string, visibleWhen?: { fieldCode: string; equals: readonly string[] }) {
  return {
    code,
    label,
    type: 'code' as const,
    options: [
      { code: '1', label: 'Sim' },
      { code: '2', label: 'Não' },
    ],
    ...(visibleWhen ? { visibleWhen } : {}),
  };
}

function resultadoField(code: string, label: string) {
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
