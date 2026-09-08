import type { ClinicalFormSchema } from '../clinical-forms/types.js';

// Acompanhamento Farmacêutico — campos extraídos de três impressos reais do
// Hospital Regional Público do Marajó, fornecidos pelo usuário em
// 2026-09-07 e depois apagados (continham dado de paciente real):
// "ANAMNESE FARMACEUTICA", "SCORE DE CRITERIOS PARA DEFINICAO DO
// ACOMPANHAMENTO FARMACOTERAPEUTICO" e "ACOMPANHAMENTO FARMACEUTICO".
//
// Mesmo padrão de tipo_registro já usado em Nutrição/Fisioterapia: Anamnese
// e Score são feitos juntos, uma única vez, na ADMISSÃO do paciente ao
// acompanhamento farmacêutico (o Score define o risco/periodicidade, a
// Anamnese levanta hábitos/alergias/medicamentos já em uso) — por isso os
// dois impressos compartilham o mesmo tipo_registro 'admissao' abaixo, em
// vez de dois tipos separados. Acompanhamento Farmacêutico é a evolução
// repetida ao longo do seguimento (análise diária/periódica de prescrição),
// mesmo conceito de `tipo_registro: 'evolucao'` já usado em Nutrição.
//
// Grupo "Checklist FAST HUG MAIDENS" (2026-09-08): campos complementares
// baseados em metodologia real, publicada e validada de acompanhamento
// farmacêutico — mnemônico FAST HUG (VINCENT, J. L. Give your patient a
// fast hug (at least) once a day. Critical Care Medicine, 2005) estendido
// para MAIDENS por MABASA, V. H. et al. A Standardized, Structured Approach
// to Identifying Drug-Related Problems in the Intensive Care Unit:
// FASTHUG-MAIDENS. Can J Hosp Pharm, 64(5), 2011. Adotado em protocolo
// institucional real de hospital universitário brasileiro (HU-UNIVASF/
// EBSERH, Protocolo de Acompanhamento Farmacoterapêutico, 2019, ISBN
// 978-85-92656-18-8) — mesma metodologia usada aqui para complementar, não
// substituir, os campos extraídos do impresso real do Marajó. Clearance de
// creatinina segue a fórmula CKD-EPI, referência padrão para ajuste renal
// de dose citada no mesmo protocolo.
export const PHARMACY_FOLLOWUP_SCHEMA: ClinicalFormSchema = {
  schemaCode: 'PHARMACY_CLINICAL_FOLLOWUP',
  groups: [
    {
      title: 'Tipo de Registro',
      fields: [
        {
          code: 'tipo_registro',
          label: 'Tipo de registro',
          type: 'code',
          required: true,
          options: [
            { code: 'admissao', label: 'Anamnese e Score de Risco (admissão ao acompanhamento)' },
            { code: 'evolucao', label: 'Acompanhamento Farmacêutico (evolução)' },
          ],
        },
      ],
    },
    {
      title: 'Anamnese Farmacêutica (admissão)',
      fields: [
        {
          code: 'habitos_de_vida',
          label: 'Hábitos de vida relevantes (tabagismo, etilismo, outros)',
          type: 'text',
          visibleWhen: { fieldCode: 'tipo_registro', equals: ['admissao'] },
          helpText: 'Deixe em branco se o paciente negar hábitos relevantes.',
        },
        {
          code: 'alergias_medicamentos',
          label: 'Alergias a medicamentos',
          type: 'text',
          visibleWhen: { fieldCode: 'tipo_registro', equals: ['admissao'] },
          helpText: 'Deixe em branco se o paciente negar alergias.',
        },
        {
          code: 'medicamentos_uso_continuo',
          label: 'Medicamentos de uso contínuo',
          type: 'text',
          visibleWhen: { fieldCode: 'tipo_registro', equals: ['admissao'] },
          helpText: 'Deixe em branco se o paciente negar uso contínuo.',
        },
        {
          code: 'medicamentos_uso_proprio',
          label: 'Medicamentos de uso próprio (trazidos de casa)',
          type: 'text',
          visibleWhen: { fieldCode: 'tipo_registro', equals: ['admissao'] },
          helpText: 'Deixe em branco se o paciente negar medicamentos de uso próprio.',
        },
      ],
    },
    {
      title: 'Score de Critérios para Definição do Acompanhamento Farmacoterapêutico (admissão)',
      fields: [
        {
          code: 'score_quantidade_medicamentos',
          label: 'Quantidade de medicamentos em uso',
          type: 'code',
          required: true,
          visibleWhen: { fieldCode: 'tipo_registro', equals: ['admissao'] },
          options: [
            { code: 'ate_5', label: 'Até 5 medicamentos' },
            { code: '6_a_10', label: '6 a 10 medicamentos' },
            { code: 'mais_de_10', label: 'Mais de 10 medicamentos' },
          ],
        },
        {
          code: 'score_medicamentos_intravenosos',
          label: 'Medicamentos intravenosos em uso',
          type: 'code',
          required: true,
          visibleWhen: { fieldCode: 'tipo_registro', equals: ['admissao'] },
          options: [
            { code: 'nenhum', label: 'Nenhum' },
            { code: '1_a_3', label: '1 a 3' },
            { code: '4_ou_mais', label: '4 ou mais' },
          ],
        },
        {
          code: 'score_medicamentos_perigosos',
          label: 'Medicamentos potencialmente perigosos em uso',
          type: 'code',
          required: true,
          visibleWhen: { fieldCode: 'tipo_registro', equals: ['admissao'] },
          options: [
            { code: 'nenhum', label: 'Nenhum' },
            { code: '1', label: 'Faz uso de 1 medicamento' },
            { code: '2_ou_mais', label: '2 ou mais medicamentos' },
          ],
          helpText: 'Referência: Lista de Medicamentos Potencialmente Perigosos do ISMP Brasil (ex.: insulinas, anticoagulantes, opioides, eletrólitos concentrados, quimioterápicos, sedativos/bloqueadores neuromusculares).',
        },
        {
          code: 'score_uso_sonda',
          label: 'Paciente em uso de sonda',
          type: 'code',
          required: true,
          visibleWhen: { fieldCode: 'tipo_registro', equals: ['admissao'] },
          options: [
            { code: 'sim', label: 'Sim' },
            { code: 'nao', label: 'Não' },
          ],
        },
        {
          code: 'score_faixa_etaria',
          label: 'Faixa etária',
          type: 'code',
          required: true,
          visibleWhen: { fieldCode: 'tipo_registro', equals: ['admissao'] },
          options: [
            { code: 'menor_15', label: 'Menor de 15 anos' },
            { code: '15_a_65', label: '15 a 65 anos' },
            { code: 'maior_65', label: 'Maior de 65 anos' },
          ],
        },
        {
          code: 'score_problemas_renais_hepaticos',
          label: 'Apresenta problemas renais e/ou hepáticos?',
          type: 'code',
          required: true,
          visibleWhen: { fieldCode: 'tipo_registro', equals: ['admissao'] },
          options: [
            { code: 'sim', label: 'Sim' },
            { code: 'nao', label: 'Não' },
          ],
        },
        {
          code: 'score_problemas_cardiacos_pulmonares',
          label: 'Apresenta problemas cardíacos e/ou pulmonares?',
          type: 'code',
          required: true,
          visibleWhen: { fieldCode: 'tipo_registro', equals: ['admissao'] },
          options: [
            { code: 'sim', label: 'Sim' },
            { code: 'nao', label: 'Não' },
          ],
        },
        {
          code: 'score_imunossuprimido',
          label: 'É imunossuprimido e/ou imunocomprometido?',
          type: 'code',
          required: true,
          visibleWhen: { fieldCode: 'tipo_registro', equals: ['admissao'] },
          options: [
            { code: 'sim', label: 'Sim' },
            { code: 'nao', label: 'Não' },
          ],
        },
        {
          code: 'score_pontuacao_total',
          label: 'Pontuação total',
          type: 'number',
          required: true,
          visibleWhen: { fieldCode: 'tipo_registro', equals: ['admissao'] },
        },
        {
          code: 'score_classificacao_risco',
          label: 'Classificação de risco',
          type: 'code',
          required: true,
          visibleWhen: { fieldCode: 'tipo_registro', equals: ['admissao'] },
          options: [
            { code: 'baixo', label: 'Risco baixo' },
            { code: 'moderado', label: 'Risco moderado (usuários intermediários, acompanhamento não emergencial)' },
            { code: 'alto', label: 'Risco alto' },
          ],
        },
        {
          code: 'score_conduta_definida',
          label: 'Conduta definida pelo score',
          type: 'text',
          required: true,
          visibleWhen: { fieldCode: 'tipo_registro', equals: ['admissao'] },
          helpText: 'Ex.: análise diária de prescrição, evolução em prontuário 2 vezes por semana.',
        },
      ],
    },
    {
      title: 'Acompanhamento Farmacêutico (evolução)',
      fields: [
        {
          code: 'antimicrobianos_em_uso',
          label: 'Antimicrobianos em uso',
          type: 'text',
          visibleWhen: { fieldCode: 'tipo_registro', equals: ['evolucao'] },
          helpText: 'Nome, dose, via e frequência; início e previsão de término.',
        },
        {
          code: 'tratamento_antimicrobiano_anterior',
          label: 'Tratamento antimicrobiano anterior',
          type: 'text',
          visibleWhen: { fieldCode: 'tipo_registro', equals: ['evolucao'] },
        },
        {
          code: 'analgesia',
          label: 'Analgesia',
          type: 'text',
          visibleWhen: { fieldCode: 'tipo_registro', equals: ['evolucao'] },
        },
        {
          code: 'profilaxia_ulcera_estresse',
          label: 'Profilaxia de úlcera de estresse',
          type: 'text',
          visibleWhen: { fieldCode: 'tipo_registro', equals: ['evolucao'] },
        },
        {
          code: 'outras_classes_medicamentosas',
          label: 'Outras classes medicamentosas em seguimento',
          type: 'text',
          visibleWhen: { fieldCode: 'tipo_registro', equals: ['evolucao'] },
          helpText: 'Ex.: benzodiazepínico, anticoagulante — o que não couber nos campos acima.',
        },
        {
          code: 'projeto_terapeutico_seguimento',
          label: 'Projeto terapêutico / seguimento farmacêutico',
          type: 'text',
          required: true,
          visibleWhen: { fieldCode: 'tipo_registro', equals: ['evolucao'] },
          helpText: 'Ex.: seguimento do uso dos antimicrobianos, análise diária de prescrição.',
        },
      ],
    },
    {
      title: 'Checklist FAST HUG MAIDENS (evolução, complementar)',
      fields: [
        {
          code: 'sedacao',
          label: 'Sedação',
          type: 'text',
          visibleWhen: { fieldCode: 'tipo_registro', equals: ['evolucao'] },
          helpText: 'Fármaco e nível de sedação alvo (ex.: escala RASS).',
        },
        {
          code: 'tromboprofilaxia',
          label: 'Tromboprofilaxia (TEV)',
          type: 'text',
          visibleWhen: { fieldCode: 'tipo_registro', equals: ['evolucao'] },
          helpText: 'Ex.: heparina ou enoxaparina, ou contraindicação/motivo de não realização.',
        },
        {
          code: 'delirium',
          label: 'Delirium',
          type: 'code',
          visibleWhen: { fieldCode: 'tipo_registro', equals: ['evolucao'] },
          options: [
            { code: 'ausente', label: 'Ausente' },
            { code: 'hipoativo', label: 'Hipoativo' },
            { code: 'hiperativo', label: 'Hiperativo' },
          ],
        },
        {
          code: 'controle_glicemico',
          label: 'Controle glicêmico',
          type: 'text',
          visibleWhen: { fieldCode: 'tipo_registro', equals: ['evolucao'] },
        },
        {
          code: 'conciliacao_medicamentosa',
          label: 'Conciliação medicamentosa realizada',
          type: 'code',
          visibleWhen: { fieldCode: 'tipo_registro', equals: ['evolucao'] },
          options: [
            { code: 'sim', label: 'Sim' },
            { code: 'nao', label: 'Não' },
          ],
          helpText: 'Comparação entre medicamentos em uso prévio (domiciliar) e os prescritos na internação, para identificar discrepâncias não intencionais.',
        },
        {
          code: 'clearance_creatinina',
          label: 'Clearance de creatinina estimado (mL/min/1,73m²)',
          type: 'number',
          visibleWhen: { fieldCode: 'tipo_registro', equals: ['evolucao'] },
          helpText: 'Fórmula CKD-EPI — usado para ajuste de dose de medicamentos de excreção renal.',
        },
        {
          code: 'interacoes_alergias_duplicidades',
          label: 'Interações medicamentosas, alergias ou duplicidades identificadas',
          type: 'text',
          visibleWhen: { fieldCode: 'tipo_registro', equals: ['evolucao'] },
          helpText: 'Deixe em branco se não houver nenhuma identificada na prescrição atual.',
        },
      ],
    },
    {
      title: 'Assinatura',
      fields: [
        { code: 'farmaceutico_nome', label: 'Farmacêutico(a) responsável', type: 'text', required: true },
        { code: 'farmaceutico_crf', label: 'Registro CRF', type: 'text', required: true },
        { code: 'data_registro', label: 'Data do registro', type: 'date', required: true },
      ],
    },
  ],
};
