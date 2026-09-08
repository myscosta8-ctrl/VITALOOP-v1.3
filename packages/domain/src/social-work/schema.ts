import type { ClinicalFormSchema } from '../clinical-forms/types.js';

// Evolução de Serviço Social — campos conferidos contra o impresso real
// "EVOLUCAO ASSISTENTE SOCIAL" do Hospital Regional Público do Marajó
// (modelo fornecido pelo usuário em 2026-09-07, extraído e depois apagado —
// continha dado de paciente real). O impresso real é enxuto: cabeçalho
// padrão + um único campo de evolução em texto livre (registro
// cronológico) + assinatura (nome + CRESS), no mesmo espírito de uma nota
// de evolução/intercorrência (ver NursingRecord/MedicalEvolution).
//
// Campos de "Informações Complementares" abaixo são enriquecimento
// opcional (não existem como campos próprios no impresso real — lá essa
// informação aparece dentro do texto corrido da evolução), oferecidos pra
// estruturar dados que o assistente social já registra em prosa hoje, sem
// tornar obrigatório nada que o impresso real não obriga.
//
// Identificação do paciente já é coberta pelo módulo de paciente/encontro
// — não duplicada aqui. Sem lógica de negócio própria — feature de schema
// único, mesmo padrão de TFD/SER/SBAR.
export const SOCIAL_WORK_ASSESSMENT_SCHEMA: ClinicalFormSchema = {
  schemaCode: 'SOCIAL_WORK_ASSESSMENT',
  groups: [
    {
      title: 'Evolução de Serviço Social',
      fields: [
        {
          code: 'evolucao_social',
          label: 'Evolução',
          type: 'text',
          required: true,
          helpText: 'Registro cronológico livre — acolhimento, escuta qualificada, orientações, encaminhamentos, etc.',
        },
      ],
    },
    {
      title: 'Informações Complementares (opcional)',
      fields: [
        { code: 'vulnerabilidades_identificadas', label: 'Vulnerabilidades identificadas', type: 'text' },
        { code: 'encaminhamentos_realizados', label: 'Encaminhamentos realizados (CRAS, CREAS, Conselho Tutelar, TFD, transferência, etc.)', type: 'text' },
        { code: 'rede_apoio', label: 'Rede de apoio familiar/social', type: 'text' },
      ],
    },
    {
      title: 'Assinatura',
      fields: [
        { code: 'assistente_social_nome', label: 'Assistente Social responsável', type: 'text', required: true },
        { code: 'assistente_social_cress', label: 'Registro CRESS', type: 'text', required: true },
        { code: 'data_evolucao', label: 'Data da evolução', type: 'date', required: true },
      ],
    },
  ],
};
