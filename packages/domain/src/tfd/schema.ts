import type { ClinicalFormSchema } from '../clinical-forms/types.js';

// Laudo Médico LM/TFD (Tratamento Fora de Domicílio) — usado quando o
// paciente precisa ser encaminhado pra tratamento em outro município (ver
// docs/REFERENCIA_CAMPOS_IMPRESSOS_HOSPITALARES.md, item 9).
//
// Identificação do paciente (nome, sexo, idade, endereço, data de nascimento,
// identidade) já é coberta pelo módulo de paciente/encontro — não duplicada
// aqui. Sem lógica de negócio própria (ao contrário de AIH/APAC, não valida
// contra catálogo SIGTAP) — feature de schema único, mesmo padrão de
// Solicitação de Sangue/ATM.
export const TFD_REQUEST_SCHEMA: ClinicalFormSchema = {
  schemaCode: 'TFD_REQUEST',
  groups: [
    {
      title: 'Dados Complementares',
      fields: [
        { code: 'profissao_paciente', label: 'Profissão do paciente', type: 'text' },
        { code: 'acompanhante_nome', label: 'Nome do acompanhante', type: 'text' },
        { code: 'acompanhante_parentesco', label: 'Parentesco do acompanhante', type: 'text' },
      ],
    },
    {
      title: 'Quadro Clínico',
      fields: [
        { code: 'historia_doenca_atual', label: 'História da Doença Atual', type: 'text', required: true },
        { code: 'exame_fisico', label: 'Exame Físico', type: 'text', required: true },
        { code: 'diagnostico', label: 'Diagnóstico', type: 'text', required: true },
        { code: 'exame_complementar', label: 'Exame Complementar', type: 'text' },
      ],
    },
    {
      title: 'Tratamento',
      fields: [
        { code: 'tratamento_realizado', label: 'Tratamento Realizado', type: 'text' },
        { code: 'tratamento_indicado', label: 'Tratamento Indicado', type: 'text', required: true },
        { code: 'tempo_provavel_dias', label: 'Tempo Provável de Tratamento (dias)', type: 'number', required: true },
      ],
    },
    {
      title: 'Profissional Responsável',
      fields: [
        { code: 'profissional_responsavel_nome', label: 'Profissional responsável', type: 'text', required: true },
        { code: 'profissional_responsavel_cargo', label: 'Cargo do profissional responsável', type: 'text', required: true },
        { code: 'data_emissao', label: 'Data de emissão do laudo', type: 'date', required: true },
      ],
    },
  ],
};
