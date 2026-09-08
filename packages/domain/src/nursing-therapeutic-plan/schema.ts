import type { ClinicalFormSchema } from '../clinical-forms/types.js';

// Projeto Terapêutico Multidisciplinar (ENFERMAGEM, assinado por COREN) —
// distinto do "Plano Terapêutico" MÉDICO (assinado por CRM, ver
// packages/domain/src/therapeutic-plan/schema.ts) — são dois documentos
// reais diferentes nesta UPA, não um substituindo o outro (confirmado
// explicitamente pelo usuário em 2026-09-07).
//
// Campos extraídos do impresso real "PROJETO TERAPEUTICO MULTIDISCIPLINAR -
// ENFERMAGEM" do Hospital Regional Público do Marajó (fornecido pelo
// usuário, extraído e depois apagado — continha dado de paciente real).
// Estrutura real: resumo do projeto (texto livre); diagnósticos de
// enfermagem (lista numerada); resultado esperado (lista numerada);
// possíveis intervenções (lista numerada); tempo estimado de internação
// (dias); assinatura (nome + COREN). Não tem checkboxes de protocolo
// institucional — isso é exclusivo do Plano Terapêutico médico.
//
// Identificação do paciente e classificação de risco (cor) já são
// cobertas pelo módulo de paciente/encontro/triagem — não duplicadas aqui.
// Sem lógica de negócio própria — feature de schema único, mesmo padrão
// de TFD/SER/SBAR.
export const NURSING_THERAPEUTIC_PLAN_SCHEMA: ClinicalFormSchema = {
  schemaCode: 'NURSING_THERAPEUTIC_PLAN',
  groups: [
    {
      title: 'Resumo e Diagnósticos de Enfermagem',
      fields: [
        { code: 'resumo_projeto', label: 'Resumo do projeto', type: 'text', required: true },
        {
          code: 'diagnosticos_enfermagem',
          label: 'Diagnósticos de enfermagem',
          type: 'text',
          required: true,
          helpText: 'Lista numerada de diagnósticos (ex.: 1. Risco de infecção relacionado a procedimentos invasivos...).',
        },
      ],
    },
    {
      title: 'Resultados Esperados e Intervenções',
      fields: [
        {
          code: 'resultado_esperado',
          label: 'Resultado esperado',
          type: 'text',
          required: true,
          helpText: 'Lista numerada, correspondente a cada diagnóstico.',
        },
        {
          code: 'possiveis_intervencoes',
          label: 'Possíveis intervenções',
          type: 'text',
          required: true,
          helpText: 'Lista numerada de condutas/cuidados de enfermagem.',
        },
      ],
    },
    {
      title: 'Tempo Estimado de Internação',
      fields: [
        { code: 'tempo_estimado_internacao_dias', label: 'Tempo estimado de internação (dias)', type: 'number', required: true },
      ],
    },
    {
      title: 'Assinatura',
      fields: [
        { code: 'enfermeiro_responsavel_nome', label: 'Enfermeiro responsável', type: 'text', required: true },
        { code: 'enfermeiro_responsavel_coren', label: 'Registro COREN', type: 'text', required: true },
        { code: 'data_projeto', label: 'Data do projeto', type: 'date', required: true },
      ],
    },
  ],
};
