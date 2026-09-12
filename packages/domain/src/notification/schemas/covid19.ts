import type { SinanBodySchema } from '../types.js';

/**
 * Campos da ficha "e-SUS Notifica — Notificação de SG Suspeito de Doença
 * pelo Coronavírus 2019 (COVID-19)" (Covid19_v5.pdf, revisão 16/08/2021),
 * extraídos do texto/layout impresso do PDF-base campo a campo.
 *
 * ACHADO IMPORTANTE (11/09/2026): esta ficha **não é o formulário clássico
 * numerado do SINAN NET** (campos 1-30 de cabeçalho + 31+ de corpo) que as
 * outras 20 doenças usam — é o formulário do **e-SUS Notifica**, um sistema
 * diferente, com layout de blocos rotulados (IDENTIFICAÇÃO, ESTRATÉGIA E
 * LOCAL DE TESTAGEM, DADOS CLÍNICOS EPIDEMIOLÓGICOS, EXAMES LABORATORIAIS,
 * ENCERRAMENTO, RASTREAMENTO DE CONTATOS), sem numeração de campo e sem o
 * bloco de identificação padrão (Tipo de Notificação/Agravo/UF/Município/
 * Nome do Paciente/etc. nas posições 1-16 usuais). Isso significa que a
 * calibração de PDF (Fase C) desta ficha **não pode reaproveitar
 * `HEADER_BOXES`/`xOffset`/`yOffset`** como as outras 12 doenças da Trilha
 * 1 — vai precisar de coordenadas totalmente novas, medidas do zero contra
 * este layout específico, tanto pro bloco de identificação quanto pro
 * corpo. Documentando isso agora pra não presumir, quando a calibração
 * chegar aqui, que o mesmo offset uniforme vai funcionar.
 *
 * REESCRITO em 2026-09-11 (revisão de fidelidade, Trilha 2 — 12ª doença
 * revisada no total, primeira da Trilha 2 a receber PDF oficial): a versão
 * anterior (Lote 1) tinha um checklist de 8 sintomas sem "Assintomático"/
 * "Dor de Cabeça" (reais) e sem os 9 itens de condições/comorbidades (a
 * ficha real lista Doenças cardíacas crônicas, Doenças respiratórias
 * crônicas descompensadas, Doenças renais crônicas em estágio avançado,
 * Portador de doenças cromossômicas, Puérpera, Gestante, Diabetes,
 * Imunossupressão, Obesidade, Outros — nenhum estava no schema anterior).
 * Faltava inteiramente: estratégia e local de testagem, vacinação com
 * datas/laboratório/lote por dose, e a grade completa de 8 exames
 * laboratoriais diferentes (RT-PCR, RT-LAMP, sorológicos IgA/IgM/IgG/
 * anticorpos totais, testes rápidos IgM/IgG/antígeno), cada um com
 * estado/data de coleta/resultado próprios. `evolucaoCasoField()` e
 * `labResultadoField()` genéricos foram removidos — a ficha real tem
 * evolução/classificação com códigos e opções próprios desta ficha,
 * completamente diferentes do conjunto genérico.
 */
const ESTADO_TESTE_OPTIONS = [
  { code: '1', label: 'Solicitado' },
  { code: '2', label: 'Coletado' },
  { code: '3', label: 'Concluído' },
  { code: '4', label: 'Não Solicitado' },
] as const;

const RESULTADO_MOLECULAR_OPTIONS = [
  { code: '1', label: 'Não detectável' },
  { code: '2', label: 'Detectável' },
  { code: '3', label: 'Inconclusivo ou Indeterminado' },
] as const;

const RESULTADO_SOROLOGICO_OPTIONS = [
  { code: '1', label: 'Não reagente' },
  { code: '2', label: 'Reagente' },
  { code: '3', label: 'Inconclusivo ou Indeterminado' },
] as const;

export const COVID19_BODY_SCHEMA: SinanBodySchema = {
  schemaCode: 'COVID19',
  groups: [
    {
      title: 'Estratégia e Local de Testagem',
      fields: [
        {
          code: 'estrategia_testagem',
          label: 'Estratégia',
          type: 'code',
          options: [
            { code: '1', label: 'Diagnóstico assistencial (sintomático)' },
            { code: '2', label: 'Busca ativa de assintomático' },
            { code: '3', label: 'Triagem de população específica' },
          ],
        },
        {
          code: 'busca_ativa_tipo',
          label: 'Busca Ativa de Assintomático',
          type: 'code',
          visibleWhen: { fieldCode: 'estrategia_testagem', equals: ['2'] },
          options: [
            { code: '1', label: 'Monitoramento de contatos' },
            { code: '2', label: 'Investigação de surtos' },
            { code: '3', label: 'Monitoramento de viajantes com risco de VOC (quarentena)' },
            { code: '4', label: 'Outro' },
          ],
        },
        { code: 'busca_ativa_outro_especifique', label: 'Busca Ativa — Outro, especifique', type: 'text', visibleWhen: { fieldCode: 'busca_ativa_tipo', equals: ['4'] } },
        {
          code: 'triagem_populacao_tipo',
          label: 'Triagem de População Específica',
          type: 'code',
          visibleWhen: { fieldCode: 'estrategia_testagem', equals: ['3'] },
          options: [
            { code: '1', label: 'Trabalhadores de serviços essenciais ou estratégicos' },
            { code: '2', label: 'Profissionais de saúde' },
            { code: '3', label: 'Gestantes e puérperas' },
            { code: '4', label: 'Povos e comunidades tradicionais' },
            { code: '5', label: 'Outro' },
          ],
        },
        { code: 'triagem_populacao_outro_especifique', label: 'Triagem — Outro, especifique', type: 'text', visibleWhen: { fieldCode: 'triagem_populacao_tipo', equals: ['5'] } },
        {
          code: 'local_testagem',
          label: 'Local de Realização da Testagem',
          type: 'code',
          options: [
            { code: '1', label: 'Serviço de saúde (UBS, hospital, UPA etc.)' },
            { code: '2', label: 'Local de trabalho' },
            { code: '3', label: 'Aeroporto' },
            { code: '4', label: 'Farmácia ou drogaria' },
            { code: '5', label: 'Escola' },
            { code: '6', label: 'Domicílio ou comunidade' },
            { code: '7', label: 'Outro' },
          ],
        },
        { code: 'local_testagem_outro_especifique', label: 'Local de Testagem — Outro, especifique', type: 'text', visibleWhen: { fieldCode: 'local_testagem', equals: ['7'] } },
      ],
    },
    {
      title: 'Dados Clínicos Epidemiológicos — Sintomas',
      fields: [
        simNaoField('sintoma_assintomatico', 'Assintomático'),
        simNaoField('sintoma_febre', 'Febre'),
        simNaoField('sintoma_dor_garganta', 'Dor de Garganta'),
        simNaoField('sintoma_dispneia', 'Dispneia'),
        simNaoField('sintoma_tosse', 'Tosse'),
        simNaoField('sintoma_coriza', 'Coriza'),
        simNaoField('sintoma_dor_cabeca', 'Dor de Cabeça'),
        simNaoField('sintoma_disturbios_gustativos', 'Distúrbios Gustativos'),
        simNaoField('sintoma_disturbios_olfativos', 'Distúrbios Olfativos'),
        simNaoField('sintoma_outros', 'Outros Sintomas'),
        { code: 'sintoma_outros_especifique', label: 'Outros Sintomas, especifique', type: 'text', visibleWhen: { fieldCode: 'sintoma_outros', equals: ['1'] } },
        { code: 'data_inicio_sintomas', label: 'Data do Início dos Sintomas', type: 'date' },
      ],
    },
    {
      title: 'Dados Clínicos Epidemiológicos — Condições',
      fields: [
        simNaoField('condicao_doencas_cardiacas_cronicas', 'Doenças Cardíacas Crônicas'),
        simNaoField('condicao_diabetes', 'Diabetes'),
        simNaoField('condicao_doencas_respiratorias_cronicas_descompensadas', 'Doenças Respiratórias Crônicas Descompensadas'),
        simNaoField('condicao_puerpera', 'Puérpera (até 45 dias do parto)'),
        simNaoField('condicao_gestante', 'Gestante'),
        simNaoField('condicao_doencas_renais_cronicas_avancado', 'Doenças Renais Crônicas em Estágio Avançado (graus 3, 4 e 5)'),
        simNaoField('condicao_imunossupressao', 'Imunossupressão'),
        simNaoField('condicao_obesidade', 'Obesidade'),
        simNaoField('condicao_doencas_cromossomicas_fragilidade_imunologica', 'Portador de Doenças Cromossômicas ou Estado de Fragilidade Imunológica'),
        simNaoField('condicao_outros', 'Outras Condições'),
        { code: 'condicao_outros_especifique', label: 'Outras Condições, especifique', type: 'text', visibleWhen: { fieldCode: 'condicao_outros', equals: ['1'] } },
      ],
    },
    {
      title: 'Vacinação',
      fields: [
        simNaoField('recebeu_vacina_covid19', 'Recebeu Vacina Covid-19?'),
        { code: 'dose1_data', label: '1ª Dose — Data da Vacinação', type: 'date', visibleWhen: { fieldCode: 'recebeu_vacina_covid19', equals: ['1'] } },
        { code: 'dose1_laboratorio', label: '1ª Dose — Laboratório Produtor', type: 'text', visibleWhen: { fieldCode: 'recebeu_vacina_covid19', equals: ['1'] } },
        { code: 'dose1_lote', label: '1ª Dose — Lote', type: 'text', visibleWhen: { fieldCode: 'recebeu_vacina_covid19', equals: ['1'] } },
        { code: 'dose2_data', label: '2ª Dose — Data da Vacinação', type: 'date', visibleWhen: { fieldCode: 'recebeu_vacina_covid19', equals: ['1'] } },
        { code: 'dose2_laboratorio', label: '2ª Dose — Laboratório Produtor', type: 'text', visibleWhen: { fieldCode: 'recebeu_vacina_covid19', equals: ['1'] } },
        { code: 'dose2_lote', label: '2ª Dose — Lote', type: 'text', visibleWhen: { fieldCode: 'recebeu_vacina_covid19', equals: ['1'] } },
      ],
    },
    {
      title: 'Exames Laboratoriais',
      fields: [
        ...exameMolecularFields('rtpcr', 'RT-PCR'),
        ...exameMolecularFields('rtlamp', 'RT-LAMP'),
        ...exameSorologicoFields('iga', 'Teste Sorológico IgA'),
        ...exameSorologicoFields('igm', 'Teste Sorológico IgM'),
        ...exameSorologicoFields('igg', 'Teste Sorológico IgG'),
        ...exameSorologicoFields('anticorpos_totais', 'Teste Sorológico — Anticorpos Totais'),
        ...exameSorologicoFields('rapido_igm', 'Teste Rápido de Anticorpo IgM'),
        ...exameSorologicoFields('rapido_igg', 'Teste Rápido de Anticorpo IgG'),
        {
          code: 'exame_rapido_antigeno_estado',
          label: 'Teste Rápido de Antígeno — Estado do Teste',
          type: 'code',
          options: ESTADO_TESTE_OPTIONS,
        },
        { code: 'exame_rapido_antigeno_data_coleta', label: 'Teste Rápido de Antígeno — Data da Coleta', type: 'date' },
        { code: 'exame_rapido_antigeno_fabricante', label: 'Teste Rápido de Antígeno — Fabricante', type: 'text' },
        { code: 'exame_rapido_antigeno_lote', label: 'Teste Rápido de Antígeno — Lote', type: 'text' },
        {
          code: 'exame_rapido_antigeno_resultado',
          label: 'Teste Rápido de Antígeno — Resultado',
          type: 'code',
          options: RESULTADO_SOROLOGICO_OPTIONS,
        },
      ],
    },
    {
      title: 'Encerramento',
      fields: [
        {
          code: 'evolucao_caso',
          label: 'Evolução do Caso',
          type: 'code',
          options: [
            { code: '1', label: 'Cancelado' },
            { code: '2', label: 'Em tratamento domiciliar' },
            { code: '3', label: 'Cura' },
            { code: '4', label: 'Internado' },
            { code: '5', label: 'Internado em UTI' },
            { code: '6', label: 'Óbito' },
            { code: '7', label: 'Ignorado' },
          ],
        },
        {
          code: 'classificacao_final',
          label: 'Classificação Final',
          type: 'code',
          options: [
            { code: '1', label: 'Descartado' },
            { code: '2', label: 'Confirmado Clínico-Epidemiológico' },
            { code: '3', label: 'Confirmado Laboratorial' },
            { code: '4', label: 'Confirmado Clínico-Imagem' },
            { code: '5', label: 'Confirmado Por Critério Clínico' },
            { code: '6', label: 'Síndrome Gripal Não Especificada' },
          ],
        },
        { code: 'data_encerramento', label: 'Data de Encerramento', type: 'date' },
      ],
    },
    {
      title: 'Informações Complementares e Observações',
      fields: [
        { code: 'observacoes_adicionais', label: 'Observações Adicionais', type: 'text' },
        {
          code: 'rastreamento_contatos_detalhes',
          label: 'Rastreamento de Contatos (Nome/CPF/Telefones/Relação/Data do Último Contato)',
          type: 'text',
        },
      ],
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

function exameMolecularFields(prefix: string, label: string) {
  return [
    { code: `exame_${prefix}_estado`, label: `${label} — Estado do Teste`, type: 'code' as const, options: ESTADO_TESTE_OPTIONS },
    { code: `exame_${prefix}_data_coleta`, label: `${label} — Data da Coleta`, type: 'date' as const },
    { code: `exame_${prefix}_resultado`, label: `${label} — Resultado`, type: 'code' as const, options: RESULTADO_MOLECULAR_OPTIONS },
  ];
}

function exameSorologicoFields(prefix: string, label: string) {
  return [
    { code: `exame_${prefix}_estado`, label: `${label} — Estado do Teste`, type: 'code' as const, options: ESTADO_TESTE_OPTIONS },
    { code: `exame_${prefix}_data_coleta`, label: `${label} — Data da Coleta`, type: 'date' as const },
    { code: `exame_${prefix}_resultado`, label: `${label} — Resultado`, type: 'code' as const, options: RESULTADO_SOROLOGICO_OPTIONS },
  ];
}
