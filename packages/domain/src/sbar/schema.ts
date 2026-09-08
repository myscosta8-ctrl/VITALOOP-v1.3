import type { ClinicalFormSchema } from '../clinical-forms/types.js';

// Transferência Interna de Pacientes — formato SBAR (Situation, Background,
// Assessment, Recommendation) — ver
// docs/REFERENCIA_CAMPOS_IMPRESSOS_HOSPITALARES.md, item 16.
//
// Identificação do paciente já é coberta pelo módulo de paciente/encontro —
// não duplicada aqui. Sem lógica de negócio própria — feature de schema
// único, mesmo padrão de TFD/SER/Plano Terapêutico. Sinais vitais ficam como
// campos numéricos do schema (jsonb), mesmo padrão já usado por
// `Triage.vitals` e pelo SER.
export const SBAR_TRANSFER_SCHEMA: ClinicalFormSchema = {
  schemaCode: 'SBAR_TRANSFER',
  groups: [
    {
      title: 'Identificação da Transferência',
      fields: [
        { code: 'setor_origem', label: 'Setor de origem', type: 'text', required: true },
        { code: 'setor_destino', label: 'Setor de destino', type: 'text', required: true },
        { code: 'data_transferencia', label: 'Data da transferência', type: 'date', required: true },
        { code: 'horario_transferencia', label: 'Horário da transferência (HH:MM)', type: 'text', required: true },
      ],
    },
    {
      title: 'S — Situação (Situation)',
      fields: [
        { code: 'impressao_diagnostica', label: 'Impressão diagnóstica', type: 'text', required: true },
        {
          code: 'alergia',
          label: 'Alergia',
          type: 'code',
          required: true,
          options: [
            { code: 'sim', label: 'Sim' },
            { code: 'nao', label: 'Não' },
          ],
        },
        {
          code: 'nivel_consciencia',
          label: 'Nível de consciência',
          type: 'code',
          required: true,
          options: [
            { code: 'alerta', label: 'Alerta' },
            { code: 'sonolento', label: 'Sonolento' },
            { code: 'confuso', label: 'Confuso' },
            { code: 'inconsciente', label: 'Inconsciente' },
          ],
        },
        {
          code: 'suporte_ventilatorio',
          label: 'Suporte ventilatório',
          type: 'code',
          required: true,
          options: [
            { code: 'sim', label: 'Sim' },
            { code: 'nao', label: 'Não' },
          ],
        },
      ],
    },
    {
      title: 'Sinais Vitais',
      fields: [
        { code: 'temperatura', label: 'Temperatura (ºC)', type: 'number' },
        { code: 'frequencia_cardiaca', label: 'Frequência Cardíaca (bpm)', type: 'number' },
        { code: 'frequencia_respiratoria', label: 'Frequência Respiratória (ipm)', type: 'number' },
        { code: 'spo2', label: 'SpO2 (%)', type: 'number' },
        { code: 'pa_sistolica', label: 'PA Sistólica (mmHg)', type: 'number' },
        { code: 'pa_diastolica', label: 'PA Diastólica (mmHg)', type: 'number' },
      ],
    },
    {
      title: 'B/A — Antecedentes e Avaliação (Background/Assessment)',
      fields: [
        {
          code: 'swab_vigilancia',
          label: 'Swab de vigilância',
          type: 'code',
          options: [
            { code: 'sim', label: 'Sim' },
            { code: 'nao', label: 'Não' },
          ],
        },
        {
          code: 'exames_pendentes',
          label: 'Exames pendentes',
          type: 'code',
          options: [
            { code: 'sim', label: 'Sim' },
            { code: 'nao', label: 'Não' },
          ],
        },
        { code: 'dieta', label: 'Dieta', type: 'text' },
        { code: 'eliminacoes', label: 'Eliminações', type: 'text' },
        {
          code: 'higiene_corporal',
          label: 'Higiene corporal realizada',
          type: 'code',
          options: [
            { code: 'sim', label: 'Sim' },
            { code: 'nao', label: 'Não' },
          ],
        },
        {
          code: 'curativo',
          label: 'Curativo',
          type: 'code',
          options: [
            { code: 'sim', label: 'Sim' },
            { code: 'nao', label: 'Não' },
          ],
        },
        {
          code: 'curativo_local',
          label: 'Local do curativo',
          type: 'text',
          required: true,
          visibleWhen: { fieldCode: 'curativo', equals: ['sim'] },
        },
        {
          code: 'isolamento',
          label: 'Isolamento',
          type: 'code',
          options: [
            { code: 'sim', label: 'Sim' },
            { code: 'nao', label: 'Não' },
          ],
        },
        { code: 'dispositivos', label: 'Dispositivos (tipo e local)', type: 'text' },
      ],
    },
    {
      title: 'R — Recomendações (Recommendation)',
      fields: [
        { code: 'recomendacoes', label: 'Recomendações', type: 'text' },
        {
          code: 'intercorrencia_transporte',
          label: 'Intercorrência no transporte',
          type: 'code',
          required: true,
          options: [
            { code: 'sim', label: 'Sim' },
            { code: 'nao', label: 'Não' },
          ],
        },
        {
          code: 'intercorrencia_transporte_detalhe',
          label: 'Detalhe da intercorrência',
          type: 'text',
          required: true,
          visibleWhen: { fieldCode: 'intercorrencia_transporte', equals: ['sim'] },
        },
        { code: 'observacoes', label: 'Observações', type: 'text' },
      ],
    },
    {
      title: 'Rastreabilidade',
      fields: [
        { code: 'enfermeiro_responsavel_transporte', label: 'Enfermeiro responsável pelo transporte', type: 'text', required: true },
        { code: 'enfermeiro_responsavel_recebimento', label: 'Enfermeiro responsável pelo recebimento', type: 'text', required: true },
      ],
    },
  ],
};
