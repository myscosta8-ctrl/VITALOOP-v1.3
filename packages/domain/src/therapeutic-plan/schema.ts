import type { ClinicalFormSchema } from '../clinical-forms/types.js';

// Plano Terapêutico (MÉDICO, assinado por CRM) — distinto do "Projeto
// Terapêutico Multidisciplinar" da ENFERMAGEM (assinado por COREN, ver
// packages/domain/src/nursing-therapeutic-plan/schema.ts) — são dois
// documentos reais diferentes nesta UPA, não um substituindo o outro
// (confirmado explicitamente pelo usuário em 2026-09-07 depois de uma
// correção equivocada minha).
//
// Sem modelo real de impresso da UPA em mãos para ESTE documento
// especificamente (diferente do projeto multidisciplinar de enfermagem,
// que tem PDF real) — campos desenhados a partir da praxe de plano
// terapêutico hospitalar, a pedido explícito do usuário. Confirmar/ajustar
// campos com a equipe médica da UPA se o impresso real divergir.
//
// Identificação do paciente já é coberta pelo módulo de paciente/encontro
// — não duplicada aqui. Sem lógica de negócio própria — feature de schema
// único, mesmo padrão de TFD/SER/SBAR.
export const THERAPEUTIC_PLAN_SCHEMA: ClinicalFormSchema = {
  schemaCode: 'THERAPEUTIC_PLAN',
  groups: [
    {
      title: 'Diagnóstico e Motivo',
      fields: [
        { code: 'diagnostico_principal', label: 'Diagnóstico principal', type: 'text', required: true },
        { code: 'motivo_internacao', label: 'Motivo da internação', type: 'text', required: true },
      ],
    },
    {
      title: 'Objetivos da Terapêutica',
      fields: [
        {
          code: 'objetivos_terapeutica',
          label: 'Objetivos da terapêutica (com tempo previsto por meta)',
          type: 'text',
          required: true,
          helpText: 'Descreva cada objetivo e o tempo previsto para alcançá-lo.',
        },
      ],
    },
    {
      title: 'Elegibilidade para Protocolo Institucional',
      fields: [
        {
          code: 'protocolo_antibioticoprofilaxia_cirurgica',
          label: 'Antibioticoprofilaxia cirúrgica',
          type: 'code',
          options: [
            { code: 'sim', label: 'Sim' },
            { code: 'nao', label: 'Não' },
          ],
        },
        {
          code: 'protocolo_cirurgia_segura',
          label: 'Cirurgia segura',
          type: 'code',
          options: [
            { code: 'sim', label: 'Sim' },
            { code: 'nao', label: 'Não' },
          ],
        },
        {
          code: 'protocolo_controle_dor',
          label: 'Controle da dor',
          type: 'code',
          options: [
            { code: 'sim', label: 'Sim' },
            { code: 'nao', label: 'Não' },
          ],
        },
        {
          code: 'protocolo_identificacao_segura',
          label: 'Identificação segura',
          type: 'code',
          options: [
            { code: 'sim', label: 'Sim' },
            { code: 'nao', label: 'Não' },
          ],
        },
        {
          code: 'protocolo_jejum',
          label: 'Jejum',
          type: 'code',
          options: [
            { code: 'sim', label: 'Sim' },
            { code: 'nao', label: 'Não' },
          ],
        },
        {
          code: 'protocolo_prevencao_lpp',
          label: 'Prevenção de LPP (lesão por pressão)',
          type: 'code',
          options: [
            { code: 'sim', label: 'Sim' },
            { code: 'nao', label: 'Não' },
          ],
        },
        {
          code: 'protocolo_prevencao_queda',
          label: 'Prevenção de queda',
          type: 'code',
          options: [
            { code: 'sim', label: 'Sim' },
            { code: 'nao', label: 'Não' },
          ],
        },
        {
          code: 'protocolo_tce',
          label: 'TCE (traumatismo cranioencefálico)',
          type: 'code',
          options: [
            { code: 'sim', label: 'Sim' },
            { code: 'nao', label: 'Não' },
          ],
        },
        {
          code: 'protocolo_tev',
          label: 'TEV (tromboembolismo venoso)',
          type: 'code',
          options: [
            { code: 'sim', label: 'Sim' },
            { code: 'nao', label: 'Não' },
          ],
        },
      ],
    },
    {
      title: 'Tempo de Internação Previsto',
      fields: [
        { code: 'tempo_internacao_previsto_dias', label: 'Tempo de internação previsto (dias)', type: 'number', required: true },
      ],
    },
    {
      title: 'Equipe Multidisciplinar',
      fields: [
        {
          code: 'equipe_fisioterapia',
          label: 'Fisioterapia',
          type: 'code',
          options: [
            { code: 'sim', label: 'Sim' },
            { code: 'nao', label: 'Não' },
          ],
        },
        {
          code: 'equipe_nutricao',
          label: 'Nutrição',
          type: 'code',
          options: [
            { code: 'sim', label: 'Sim' },
            { code: 'nao', label: 'Não' },
          ],
        },
        {
          code: 'equipe_servico_social',
          label: 'Serviço Social',
          type: 'code',
          options: [
            { code: 'sim', label: 'Sim' },
            { code: 'nao', label: 'Não' },
          ],
        },
        {
          code: 'equipe_psicologia',
          label: 'Psicologia',
          type: 'code',
          options: [
            { code: 'sim', label: 'Sim' },
            { code: 'nao', label: 'Não' },
          ],
        },
        {
          code: 'equipe_fonoaudiologia',
          label: 'Fonoaudiologia',
          type: 'code',
          options: [
            { code: 'sim', label: 'Sim' },
            { code: 'nao', label: 'Não' },
          ],
        },
      ],
    },
    {
      title: 'Assinatura',
      fields: [
        { code: 'medico_responsavel_nome', label: 'Médico responsável', type: 'text', required: true },
        { code: 'medico_responsavel_crm', label: 'CRM', type: 'text', required: true },
        { code: 'data_emissao', label: 'Data de emissão do plano', type: 'date', required: true },
      ],
    },
  ],
};
