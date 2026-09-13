import type { ClinicalFormSchema } from '../clinical-forms/types.js';

/**
 * Checklist de Alta (Fase 4 do plano de reconstrução assistencial,
 * 12/09/2026) — hoje a alta é só o formulário de desfecho (texto livre em
 * "Orientações Médicas de Alta"), sem confirmação estruturada dos itens
 * operacionais que a equipe precisa garantir antes de liberar o paciente
 * (achado do projeto de referência Emergency Care). Reaproveita o engine
 * genérico de clinical-forms, mesmo padrão de nutrition/nursing-admission.
 */
export const DISCHARGE_CHECKLIST_SCHEMA: ClinicalFormSchema = {
  schemaCode: 'DISCHARGE_CHECKLIST',
  groups: [
    {
      title: 'Checklist de Alta',
      fields: [
        {
          code: 'orientacoes_entregues', label: 'Orientações de cuidados e sinais de alarme entregues ao paciente/acompanhante',
          type: 'code', options: [{ code: 'sim', label: 'Sim' }, { code: 'nao', label: 'Não' }], required: true,
        },
        {
          code: 'receita_entregue', label: 'Receita médica entregue (se aplicável)',
          type: 'code', options: [{ code: 'sim', label: 'Sim' }, { code: 'nao', label: 'Não' }, { code: 'nao_aplicavel', label: 'Não se aplica' }], required: true,
        },
        {
          code: 'atestado_entregue', label: 'Atestado médico entregue (se aplicável)',
          type: 'code', options: [{ code: 'sim', label: 'Sim' }, { code: 'nao', label: 'Não' }, { code: 'nao_aplicavel', label: 'Não se aplica' }], required: true,
        },
        {
          code: 'pertences_devolvidos', label: 'Pertences pessoais devolvidos ao paciente',
          type: 'code', options: [{ code: 'sim', label: 'Sim' }, { code: 'nao', label: 'Não' }, { code: 'nao_aplicavel', label: 'Não se aplica' }], required: true,
        },
        {
          code: 'acompanhante_ciente', label: 'Acompanhante/responsável ciente da alta e orientações',
          type: 'code', options: [{ code: 'sim', label: 'Sim' }, { code: 'nao', label: 'Não' }, { code: 'nao_aplicavel', label: 'Paciente sem acompanhante' }], required: true,
        },
        {
          code: 'retorno_agendado', label: 'Retorno ou encaminhamento ambulatorial agendado/orientado (se necessário)',
          type: 'code', options: [{ code: 'sim', label: 'Sim' }, { code: 'nao', label: 'Não' }, { code: 'nao_aplicavel', label: 'Não se aplica' }], required: true,
        },
        {
          code: 'observacoes', label: 'Observações do checklist de alta', type: 'text',
        },
      ],
    },
  ],
};
