import type { ClinicalFormSchema } from '../clinical-forms/types.js';

// Avaliação Nutricional — campos conferidos contra dois impressos reais do
// Hospital Regional Público do Marajó, fornecidos pelo usuário em
// 2026-09-07 e depois apagados (continham dado de paciente real):
// "TRIAGEM NUTRICIONAL – NRS-2002" e "EVOLUCAO NUTRICAO".
//
// São dois tipos de registro DISTINTOS, não uma soma de campos opcionais:
// a Triagem Nutricional é feita SOMENTE na admissão do paciente (funciona
// como a "admissão" da nutrição, mesmo conceito de `recordType: 'admission'`
// já usado em `NursingRecord`), enquanto a Evolução Nutricional é feita
// repetidamente ao longo do acompanhamento. O campo `tipo_registro` abaixo
// escolhe qual dos dois grupos de campos aparece — cada um só existe no
// impresso real correspondente, nunca os dois juntos no mesmo documento.
//
// Identificação do paciente e sinais vitais gerais já são cobertos pelo
// módulo de paciente/encontro/triagem — não duplicados aqui. Sem lógica de
// negócio própria (o escore NRS-2002 é só um checklist somado manualmente
// no impresso real, sem regra de compatibilidade externa) — feature de
// schema único, mesmo padrão de TFD/SER/SBAR.
export const NUTRITION_ASSESSMENT_SCHEMA: ClinicalFormSchema = {
  schemaCode: 'NUTRITION_ASSESSMENT',
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
            { code: 'triagem_admissao', label: 'Triagem Nutricional (admissão)' },
            { code: 'evolucao', label: 'Evolução Nutricional' },
          ],
        },
      ],
    },
    {
      title: 'Triagem Nutricional (NRS-2002) — feita na admissão do paciente',
      fields: [
        {
          code: 'nrs_imc_menor_20_5',
          label: 'O IMC é < 20,5 kg/m²?',
          type: 'code',
          required: true,
          visibleWhen: { fieldCode: 'tipo_registro', equals: ['triagem_admissao'] },
          options: [
            { code: 'sim', label: 'Sim' },
            { code: 'nao', label: 'Não' },
          ],
        },
        {
          code: 'nrs_perdeu_peso_3_meses',
          label: 'O paciente perdeu peso nos 3 últimos meses?',
          type: 'code',
          required: true,
          visibleWhen: { fieldCode: 'tipo_registro', equals: ['triagem_admissao'] },
          options: [
            { code: 'sim', label: 'Sim' },
            { code: 'nao', label: 'Não' },
          ],
        },
        {
          code: 'nrs_ingestao_reduzida_semana',
          label: 'O paciente teve ingestão dietética reduzida na última semana?',
          type: 'code',
          required: true,
          visibleWhen: { fieldCode: 'tipo_registro', equals: ['triagem_admissao'] },
          options: [
            { code: 'sim', label: 'Sim' },
            { code: 'nao', label: 'Não' },
          ],
        },
        {
          code: 'nrs_doenca_grave_uti',
          label: 'Portador de doença grave, mal estado geral ou em UTI?',
          type: 'code',
          required: true,
          visibleWhen: { fieldCode: 'tipo_registro', equals: ['triagem_admissao'] },
          options: [
            { code: 'sim', label: 'Sim' },
            { code: 'nao', label: 'Não' },
          ],
        },
        {
          code: 'nrs_prejuizo_estado_nutricional',
          label: 'Prejuízo do estado nutricional',
          type: 'code',
          required: true,
          visibleWhen: { fieldCode: 'tipo_registro', equals: ['triagem_admissao'] },
          options: [
            { code: '0', label: 'Estado nutricional normal (0 pontos)' },
            { code: '1', label: 'Leve (1 ponto)' },
            { code: '2', label: 'Moderado (2 pontos)' },
            { code: '3', label: 'Grave (3 pontos)' },
          ],
        },
        {
          code: 'nrs_gravidade_doenca',
          label: 'Gravidade da doença (aumento das necessidades nutricionais)',
          type: 'code',
          required: true,
          visibleWhen: { fieldCode: 'tipo_registro', equals: ['triagem_admissao'] },
          options: [
            { code: '0', label: 'Necessidades nutricionais normais (0 pontos)' },
            { code: '1', label: 'Leve (1 ponto)' },
            { code: '2', label: 'Moderado (2 pontos)' },
            { code: '3', label: 'Grave (3 pontos)' },
          ],
        },
        {
          code: 'nrs_idoso_acima_70',
          label: 'Idoso acima de 70 anos? (soma 1 ponto)',
          type: 'code',
          required: true,
          visibleWhen: { fieldCode: 'tipo_registro', equals: ['triagem_admissao'] },
          options: [
            { code: 'sim', label: 'Sim' },
            { code: 'nao', label: 'Não' },
          ],
        },
        {
          code: 'nrs_escore_total',
          label: 'Escore total NRS-2002',
          type: 'number',
          required: true,
          visibleWhen: { fieldCode: 'tipo_registro', equals: ['triagem_admissao'] },
        },
        {
          code: 'nrs_classificacao_risco',
          label: 'Classificação do risco nutricional',
          type: 'code',
          required: true,
          visibleWhen: { fieldCode: 'tipo_registro', equals: ['triagem_admissao'] },
          options: [
            { code: 'sem_risco', label: 'Sem risco nutricional (< 3 pontos)' },
            { code: 'risco_nutricional', label: 'Risco nutricional (≥ 3 pontos)' },
          ],
        },
      ],
    },
    {
      title: 'Avaliação Clínica (evolução)',
      fields: [
        {
          code: 'estado_geral',
          label: 'Estado geral',
          type: 'text',
          visibleWhen: { fieldCode: 'tipo_registro', equals: ['evolucao'] },
          helpText: 'Ex.: acomodado no leito, comunicativo, orientado, anictérico, acianótico, afebril.',
        },
        {
          code: 'comorbidades_alergias_relatadas',
          label: 'Comorbidades e alergias/intolerâncias alimentares relatadas',
          type: 'text',
          visibleWhen: { fieldCode: 'tipo_registro', equals: ['evolucao'] },
        },
        {
          code: 'aceitabilidade_dieta',
          label: 'Aceitabilidade à dieta ofertada',
          type: 'code',
          visibleWhen: { fieldCode: 'tipo_registro', equals: ['evolucao'] },
          options: [
            { code: 'total', label: 'Total' },
            { code: 'parcial', label: 'Parcial' },
            { code: 'nenhuma', label: 'Nenhuma' },
          ],
        },
      ],
    },
    {
      title: 'Prescrição Dietoterápica (evolução)',
      fields: [
        {
          code: 'dieta_prescrita',
          label: 'Dieta prescrita',
          type: 'text',
          required: true,
          visibleWhen: { fieldCode: 'tipo_registro', equals: ['evolucao'] },
          helpText: 'Ex.: dieta normocalórica, normolipídica, normoproteica, fracionada em 6 refeições/dia.',
        },
        {
          code: 'via_alimentacao',
          label: 'Via de alimentação',
          type: 'code',
          required: true,
          visibleWhen: { fieldCode: 'tipo_registro', equals: ['evolucao'] },
          options: [
            { code: 'oral', label: 'Oral' },
            { code: 'oral_tno', label: 'Oral + TNO' },
            { code: 'enteral', label: 'Enteral' },
            { code: 'parenteral', label: 'Parenteral' },
          ],
        },
        {
          code: 'diurese_presente',
          label: 'Diurese',
          type: 'code',
          visibleWhen: { fieldCode: 'tipo_registro', equals: ['evolucao'] },
          options: [
            { code: 'presente', label: 'Presente' },
            { code: 'ausente', label: 'Ausente' },
          ],
        },
        {
          code: 'evacuacao_presente',
          label: 'Evacuação',
          type: 'code',
          visibleWhen: { fieldCode: 'tipo_registro', equals: ['evolucao'] },
          options: [
            { code: 'presente', label: 'Presente' },
            { code: 'ausente', label: 'Ausente' },
          ],
        },
      ],
    },
    {
      title: 'Antropometria (evolução, opcional)',
      fields: [
        { code: 'peso_kg', label: 'Peso (kg)', type: 'number', visibleWhen: { fieldCode: 'tipo_registro', equals: ['evolucao'] } },
        { code: 'altura_cm', label: 'Altura (cm)', type: 'number', visibleWhen: { fieldCode: 'tipo_registro', equals: ['evolucao'] } },
        { code: 'imc', label: 'IMC (kg/m²)', type: 'number', visibleWhen: { fieldCode: 'tipo_registro', equals: ['evolucao'] } },
        {
          code: 'classificacao_imc',
          label: 'Classificação do IMC',
          type: 'code',
          visibleWhen: { fieldCode: 'tipo_registro', equals: ['evolucao'] },
          options: [
            { code: 'baixo_peso', label: 'Baixo peso' },
            { code: 'eutrofia', label: 'Eutrofia' },
            { code: 'sobrepeso', label: 'Sobrepeso' },
            { code: 'obesidade', label: 'Obesidade' },
          ],
        },
      ],
    },
    {
      title: 'Necessidades Nutricionais (evolução, opcional)',
      fields: [
        { code: 'valor_energetico_total_kcal_dia', label: 'Valor energético total (kcal/dia)', type: 'number', visibleWhen: { fieldCode: 'tipo_registro', equals: ['evolucao'] } },
        { code: 'proteina_g_dia', label: 'Proteína (g/dia)', type: 'number', visibleWhen: { fieldCode: 'tipo_registro', equals: ['evolucao'] } },
        {
          code: 'nivel_assistencia_nutricional',
          label: 'Nível de assistência nutricional',
          type: 'code',
          visibleWhen: { fieldCode: 'tipo_registro', equals: ['evolucao'] },
          options: [
            { code: 'primario', label: 'Primário' },
            { code: 'secundario', label: 'Secundário' },
            { code: 'terciario', label: 'Terciário' },
          ],
        },
      ],
    },
    {
      title: 'Conduta (evolução)',
      fields: [
        {
          code: 'conduta_nutricional',
          label: 'Conduta nutricional (CN)',
          type: 'text',
          required: true,
          visibleWhen: { fieldCode: 'tipo_registro', equals: ['evolucao'] },
          helpText: 'Ex.: segue em acompanhamento nutricional.',
        },
        { code: 'data_reavaliacao_prevista', label: 'Data de reavaliação prevista', type: 'date', visibleWhen: { fieldCode: 'tipo_registro', equals: ['evolucao'] } },
      ],
    },
    {
      title: 'Assinatura',
      fields: [
        { code: 'nutricionista_nome', label: 'Nutricionista responsável', type: 'text', required: true },
        { code: 'nutricionista_crn', label: 'Registro CRN', type: 'text', required: true },
        { code: 'data_avaliacao', label: 'Data da avaliação', type: 'date', required: true },
      ],
    },
  ],
};
