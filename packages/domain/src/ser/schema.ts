import type { ClinicalFormSchema } from '../clinical-forms/types.js';

// Atualização de Quadro Clínico de Paciente Regulado (SER) — usado quando o
// paciente já está regulado (aguardando vaga/procedimento via sistema
// estadual de regulação) e precisa de atualização periódica de status (ver
// docs/REFERENCIA_CAMPOS_IMPRESSOS_HOSPITALARES.md, item 5).
//
// Conceito distinto do módulo `regulation`/`ExternalRegulationModal` já
// existente (que trata de SOLICITAR/acompanhar a regulação em si, com seu
// próprio ciclo de status) — SER é a evolução clínica periódica de quem já
// está regulado, podem existir vários registros SER ao longo da espera.
// `numero_solicitacao_ser` é o número de controle do sistema ESTADUAL de
// regulação (SER), não tem relação com o id interno de `ExternalRegulation`.
//
// Identificação do paciente (nome, data de nascimento, nome da mãe) já é
// coberta pelo módulo de paciente/encontro — não duplicada aqui. Sinais
// vitais (PA, FC, FR, Tº, SpO2, HGT) ficam como campos numéricos deste
// schema, mesmo padrão já usado por `Triage.vitals` (jsonb, não colunas
// relacionais próprias) — sem lógica de negócio adicional sobre eles aqui.
export const SER_UPDATE_SCHEMA: ClinicalFormSchema = {
  schemaCode: 'SER_UPDATE',
  groups: [
    {
      title: 'Dados da Regulação',
      fields: [
        { code: 'municipio_origem', label: 'Município de origem', type: 'text' },
        { code: 'data_cadastro', label: 'Data do cadastro no SER', type: 'date' },
        { code: 'numero_solicitacao_ser', label: 'Número da solicitação no SER', type: 'text', required: true },
        { code: 'diagnostico_regulado', label: 'Diagnóstico regulado', type: 'text', required: true },
        {
          code: 'mudanca_diagnostico',
          label: 'Houve mudança de diagnóstico?',
          type: 'code',
          required: true,
          options: [
            { code: 'sim', label: 'Sim' },
            { code: 'nao', label: 'Não' },
          ],
        },
        {
          code: 'mudanca_diagnostico_para',
          label: 'Novo diagnóstico',
          type: 'text',
          required: true,
          visibleWhen: { fieldCode: 'mudanca_diagnostico', equals: ['sim'] },
        },
      ],
    },
    {
      title: 'Sinais Vitais',
      fields: [
        { code: 'pa_sistolica', label: 'PA Sistólica (mmHg)', type: 'number' },
        { code: 'pa_diastolica', label: 'PA Diastólica (mmHg)', type: 'number' },
        { code: 'frequencia_cardiaca', label: 'Frequência Cardíaca (bpm)', type: 'number' },
        { code: 'frequencia_respiratoria', label: 'Frequência Respiratória (ipm)', type: 'number' },
        { code: 'temperatura', label: 'Temperatura (ºC)', type: 'number' },
        { code: 'spo2', label: 'SpO2 (%)', type: 'number' },
        { code: 'hgt', label: 'HGT (mg/dL)', type: 'number' },
      ],
    },
    {
      title: 'Evolução',
      fields: [
        { code: 'evolucao_diaria', label: 'Evolução diária', type: 'text', required: true },
        { code: 'pendencias', label: 'Pendências', type: 'text' },
        { code: 'conduta', label: 'Conduta', type: 'text', required: true },
      ],
    },
    {
      title: 'Assinatura',
      fields: [
        { code: 'medico_responsavel_nome', label: 'Médico responsável', type: 'text', required: true },
        { code: 'medico_responsavel_crm', label: 'CRM', type: 'text', required: true },
        { code: 'data_evolucao', label: 'Data desta evolução', type: 'date', required: true },
      ],
    },
  ],
};
