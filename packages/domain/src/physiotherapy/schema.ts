import type { ClinicalFormSchema } from '../clinical-forms/types.js';

// Avaliação/Evolução Fisioterapêutica — sem modelo real de impresso da UPA
// em mãos (diferente de Nutrição/Serviço Social, que tinham PDF real pra
// extrair campos). Campos desenhados por praxe hospitalar, a pedido
// explícito do usuário — confirmar/ajustar com a equipe de Fisioterapia da
// UPA se o impresso real divergir.
//
// Padronizado seguindo o MESMO padrão já confirmado por dois impressos
// reais desta UPA (Nutrição): um registro de ADMISSÃO/avaliação inicial
// (feito uma vez, no encaminhamento) e um registro de EVOLUÇÃO (repetido a
// cada atendimento/sessão) — não uma soma de campos opcionais. O campo
// `tipo_registro` escolhe qual bloco aparece, mesmo mecanismo de
// `packages/domain/src/nutrition/schema.ts`.
//
// Identificação do paciente já é coberta pelo módulo de paciente/encontro
// — não duplicada aqui. Sem lógica de negócio própria — feature de schema
// único, mesmo padrão de TFD/SER/SBAR.
export const PHYSIOTHERAPY_ASSESSMENT_SCHEMA: ClinicalFormSchema = {
  schemaCode: 'PHYSIOTHERAPY_ASSESSMENT',
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
            { code: 'avaliacao_inicial', label: 'Avaliação Fisioterapêutica Inicial' },
            { code: 'evolucao', label: 'Evolução Fisioterapêutica' },
          ],
        },
      ],
    },
    {
      title: 'Encaminhamento e Diagnóstico (avaliação inicial)',
      fields: [
        {
          code: 'motivo_encaminhamento',
          label: 'Motivo do encaminhamento',
          type: 'text',
          required: true,
          visibleWhen: { fieldCode: 'tipo_registro', equals: ['avaliacao_inicial'] },
        },
        {
          code: 'diagnostico_clinico_referencia',
          label: 'Diagnóstico clínico de referência',
          type: 'text',
          visibleWhen: { fieldCode: 'tipo_registro', equals: ['avaliacao_inicial'] },
        },
      ],
    },
    {
      title: 'Avaliação Funcional (avaliação inicial)',
      fields: [
        {
          code: 'avaliacao_mobilidade',
          label: 'Avaliação de mobilidade',
          type: 'text',
          visibleWhen: { fieldCode: 'tipo_registro', equals: ['avaliacao_inicial'] },
        },
        {
          code: 'forca_muscular',
          label: 'Força muscular (escala MRC 0-5 ou observação)',
          type: 'text',
          visibleWhen: { fieldCode: 'tipo_registro', equals: ['avaliacao_inicial'] },
        },
        {
          code: 'avaliacao_respiratoria',
          label: 'Avaliação respiratória',
          type: 'text',
          visibleWhen: { fieldCode: 'tipo_registro', equals: ['avaliacao_inicial'] },
        },
        {
          code: 'nivel_dependencia_funcional',
          label: 'Nível de dependência funcional',
          type: 'code',
          required: true,
          visibleWhen: { fieldCode: 'tipo_registro', equals: ['avaliacao_inicial'] },
          options: [
            { code: 'independente', label: 'Independente' },
            { code: 'dependencia_parcial', label: 'Dependência parcial' },
            { code: 'dependencia_total', label: 'Dependência total' },
          ],
        },
        {
          code: 'dispositivos_auxiliares',
          label: 'Dispositivos auxiliares em uso (bengala, cadeira de rodas, etc.)',
          type: 'text',
          visibleWhen: { fieldCode: 'tipo_registro', equals: ['avaliacao_inicial'] },
        },
      ],
    },
    {
      title: 'Diagnóstico e Plano Cinético-Funcional (avaliação inicial)',
      fields: [
        {
          code: 'diagnostico_cinetico_funcional',
          label: 'Diagnóstico cinético-funcional',
          type: 'text',
          required: true,
          visibleWhen: { fieldCode: 'tipo_registro', equals: ['avaliacao_inicial'] },
        },
        {
          code: 'objetivos_tratamento',
          label: 'Objetivos do tratamento',
          type: 'text',
          required: true,
          visibleWhen: { fieldCode: 'tipo_registro', equals: ['avaliacao_inicial'] },
        },
        {
          code: 'frequencia_atendimento_prevista',
          label: 'Frequência de atendimento prevista',
          type: 'text',
          visibleWhen: { fieldCode: 'tipo_registro', equals: ['avaliacao_inicial'] },
        },
      ],
    },
    {
      title: 'Evolução Fisioterapêutica (sessão)',
      fields: [
        {
          code: 'evolucao_fisioterapeutica',
          label: 'Evolução',
          type: 'text',
          required: true,
          visibleWhen: { fieldCode: 'tipo_registro', equals: ['evolucao'] },
          helpText: 'Registro cronológico livre do atendimento/sessão.',
        },
        {
          code: 'conduta_fisioterapeutica',
          label: 'Conduta fisioterapêutica / técnicas aplicadas na sessão',
          type: 'text',
          required: true,
          visibleWhen: { fieldCode: 'tipo_registro', equals: ['evolucao'] },
        },
        {
          code: 'intercorrencias_sessao',
          label: 'Intercorrências durante a sessão',
          type: 'text',
          visibleWhen: { fieldCode: 'tipo_registro', equals: ['evolucao'] },
        },
      ],
    },
    {
      title: 'Assinatura',
      fields: [
        { code: 'fisioterapeuta_nome', label: 'Fisioterapeuta responsável', type: 'text', required: true },
        { code: 'fisioterapeuta_crefito', label: 'Registro CREFITO', type: 'text', required: true },
        { code: 'data_registro', label: 'Data do registro', type: 'date', required: true },
      ],
    },
  ],
};
