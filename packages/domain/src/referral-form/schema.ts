import type { ClinicalFormSchema } from '../clinical-forms/types.js';

/**
 * Ficha de Referência (contrarreferência para regulação) — Fase 5 do plano
 * de reconstrução assistencial, 12/09/2026. Complementa
 * `app.external_regulations` (que cobre a solicitação/reserva da vaga):
 * esta ficha é o resumo clínico estruturado que acompanha o paciente até a
 * unidade de destino, hoje inexistente no Vitaloop (a transferência sai só
 * com a solicitação de vaga, sem documento de referência clínica formal).
 * Reaproveita o engine genérico de clinical-forms.
 */
export const REFERRAL_FORM_SCHEMA: ClinicalFormSchema = {
  schemaCode: 'REFERRAL_FORM',
  groups: [
    {
      title: 'Ficha de Referência',
      fields: [
        { code: 'unidade_destino', label: 'Unidade de Destino', type: 'text', required: true },
        { code: 'especialidade_solicitada', label: 'Especialidade Solicitada', type: 'text', required: true },
        { code: 'motivo_encaminhamento', label: 'Motivo do Encaminhamento', type: 'text', required: true },
        { code: 'resumo_clinico', label: 'Resumo Clínico / História da Moléstia Atual', type: 'text', required: true },
        { code: 'hipotese_diagnostica', label: 'Hipótese Diagnóstica', type: 'text' },
        { code: 'exames_realizados', label: 'Exames Realizados / Resultados Relevantes', type: 'text' },
        { code: 'conduta_atual', label: 'Conduta Realizada até o Momento', type: 'text' },
        { code: 'medicacao_em_uso', label: 'Medicação em Uso', type: 'text' },
        {
          code: 'regulation_id', label: 'ID da Solicitação de Regulação Externa vinculada (opcional)', type: 'text',
          helpText: 'Preencha só se já existir uma solicitação de vaga/regulação aberta para este encaminhamento.',
        },
      ],
    },
  ],
};
