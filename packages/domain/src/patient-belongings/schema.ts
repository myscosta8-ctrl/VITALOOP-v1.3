import type { ClinicalFormSchema } from '../clinical-forms/types.js';

/**
 * Inventário de Pertences do Paciente (Fase 5 do plano de reconstrução
 * assistencial, 12/09/2026) — gap administrativo encontrado contra o
 * projeto de referência Emergency Care: hoje não existe nenhum registro dos
 * pertences que o paciente traz consigo (roupas, documentos, celular,
 * valores...), o que é um risco de disputa/perda em UPA. Reaproveita o
 * engine genérico de clinical-forms, mesmo padrão de nutrition/
 * nursing-admission.
 */
function itemField(code: string, label: string) {
  return [
    {
      code, label, type: 'code' as const,
      options: [{ code: 'sim', label: 'Sim, trouxe' }, { code: 'nao', label: 'Não trouxe' }],
      required: true,
    },
    {
      code: `${code}_descricao`, label: `${label} — descrição/quantidade`, type: 'text' as const,
      visibleWhen: { fieldCode: code, equals: ['sim'] },
    },
  ];
}

export const PATIENT_BELONGINGS_INVENTORY_SCHEMA: ClinicalFormSchema = {
  schemaCode: 'PATIENT_BELONGINGS_INVENTORY',
  groups: [
    {
      title: 'Pertences do Paciente',
      fields: [
        ...itemField('roupas_calcados', 'Roupas e calçados'),
        ...itemField('oculos_lentes', 'Óculos / lentes de contato'),
        ...itemField('protese_orquestra', 'Prótese / órtese / dispositivo auxiliar'),
        ...itemField('documentos', 'Documentos pessoais'),
        ...itemField('celular_eletronicos', 'Celular / eletrônicos'),
        ...itemField('dinheiro_valores', 'Dinheiro / cartões / valores'),
        ...itemField('joias_acessorios', 'Joias / acessórios'),
        ...itemField('outros', 'Outros pertences'),
      ],
    },
    {
      title: 'Responsabilidade pela Guarda',
      fields: [
        { code: 'responsavel_recebimento', label: 'Nome de quem recebeu os pertences para guarda', type: 'text', required: true },
        { code: 'acompanhante_levou_pertences', label: 'Acompanhante levou os pertences consigo (em vez de guarda na unidade)', type: 'code', options: [{ code: 'sim', label: 'Sim' }, { code: 'nao', label: 'Não' }] },
        { code: 'observacoes', label: 'Observações', type: 'text' },
      ],
    },
  ],
};
