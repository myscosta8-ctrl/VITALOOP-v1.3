import type { SinanBodySchema } from '../types.js';

/**
 * Campos 31-48 da ficha SINAN "Acidentes por Animais Peçonhentos"
 * (Animais_Peconhentos_v5.pdf). Extraído do texto impresso do PDF-base,
 * campo a campo — não é uma suposição de layout.
 *
 * Campos agrupados do impresso (41, 43) viram vários sub-campos aqui
 * (código composto tipo "41_dor"), um por item da lista, porque cada item
 * recebe seu próprio código Sim/Não/Ignorado no impresso.
 */
export const ANIMAIS_PECONHENTOS_BODY_SCHEMA: SinanBodySchema = {
  schemaCode: 'ACIDENTE_ANIMAL_PECONHENTO',
  groups: [
    {
      title: 'Dados Complementares do Caso',
      fields: [
        { code: '31', label: 'Data da Investigação', type: 'date' },
        { code: '32', label: 'Ocupação', type: 'text' },
        { code: '33', label: 'Data do Acidente', type: 'date' },
        { code: '34_uf', label: 'UF de Ocorrência', type: 'text', maxLength: 2 },
        { code: '35', label: 'Município de Ocorrência do Acidente', type: 'text' },
        { code: '36', label: 'Localidade de Ocorrência do Acidente', type: 'text' },
      ],
    },
    {
      title: 'Antecedentes Epidemiológicos',
      fields: [
        {
          code: '37',
          label: 'Zona de Ocorrência',
          type: 'code',
          options: [
            { code: '1', label: 'Urbana' },
            { code: '2', label: 'Rural' },
            { code: '3', label: 'Periurbana' },
            { code: '9', label: 'Ignorado' },
          ],
        },
        {
          code: '38',
          label: 'Tempo Decorrido Picada/Atendimento',
          type: 'code',
          options: [
            { code: '1', label: '0 ⊢ 1h' },
            { code: '2', label: '1 ⊢ 3h' },
            { code: '3', label: '3 ⊢ 6h' },
            { code: '4', label: '6 ⊢ 12h' },
            { code: '5', label: '12 ⊢ 24h' },
            { code: '6', label: '24 e + h' },
            { code: '9', label: 'Ignorado' },
          ],
        },
        {
          code: '39',
          label: 'Local da Picada',
          type: 'code',
          options: [
            { code: '01', label: 'Cabeça' },
            { code: '02', label: 'Braço' },
            { code: '03', label: 'Ante-Braço' },
            { code: '04', label: 'Mão' },
            { code: '05', label: 'Dedo da Mão' },
            { code: '06', label: 'Tronco' },
            { code: '07', label: 'Coxa' },
            { code: '08', label: 'Perna' },
            { code: '09', label: 'Pé' },
            { code: '10', label: 'Dedo do Pé' },
            { code: '99', label: 'Ignorado' },
          ],
        },
      ],
    },
    {
      title: 'Dados Clínicos',
      fields: [
        {
          code: '40',
          label: 'Manifestações Locais',
          type: 'code',
          options: [
            { code: '1', label: 'Sim' },
            { code: '2', label: 'Não' },
            { code: '9', label: 'Ignorado' },
          ],
        },
        ...(['dor', 'edema', 'equimose', 'necrose', 'outras'] as const).map((item) => ({
          code: `41_${item}`,
          label: `Manifestação Local: ${item === 'outras' ? 'Outras (especificar)' : item[0]!.toUpperCase() + item.slice(1)}`,
          type: 'code' as const,
          visibleWhen: { fieldCode: '40', equals: ['1'] },
          options: [
            { code: '1', label: 'Sim' },
            { code: '2', label: 'Não' },
            { code: '9', label: 'Ignorado' },
          ],
        })),
        {
          code: '41_outras_especifique',
          label: 'Manifestação Local — Outras, especifique',
          type: 'text',
          visibleWhen: { fieldCode: '41_outras', equals: ['1'] },
        },
        {
          code: '42',
          label: 'Manifestações Sistêmicas',
          type: 'code',
          options: [
            { code: '1', label: 'Sim' },
            { code: '2', label: 'Não' },
            { code: '9', label: 'Ignorado' },
          ],
        },
        ...(
          [
            ['neuroparaliticas', 'Neuroparalíticas (ptose palpebral, turvação visual)'],
            ['mioliticas_hemoliticas', 'Miolíticas/Hemolíticas (mialgia, anemia, urina escura)'],
            ['hemorragicas', 'Hemorrágicas (gengivorragia, outros sangramentos)'],
            ['renais', 'Renais (oligúria/anúria)'],
            ['vagais', 'Vagais (vômitos, diarréias)'],
            ['outras', 'Outras (especificar)'],
          ] as const
        ).map(([item, label]) => ({
          code: `43_${item}`,
          label: `Manifestação Sistêmica: ${label}`,
          type: 'code' as const,
          visibleWhen: { fieldCode: '42', equals: ['1'] },
          options: [
            { code: '1', label: 'Sim' },
            { code: '2', label: 'Não' },
            { code: '9', label: 'Ignorado' },
          ],
        })),
        {
          code: '43_outras_especifique',
          label: 'Manifestação Sistêmica — Outras, especifique',
          type: 'text',
          visibleWhen: { fieldCode: '43_outras', equals: ['1'] },
        },
        {
          code: '44',
          label: 'Tempo de Coagulação',
          type: 'code',
          options: [
            { code: '1', label: 'Normal' },
            { code: '2', label: 'Alterado' },
            { code: '9', label: 'Não realizado' },
          ],
        },
      ],
    },
    {
      title: 'Dados do Acidente',
      fields: [
        {
          code: '45',
          label: 'Tipo de Acidente',
          type: 'code',
          options: [
            { code: '1', label: 'Serpente' },
            { code: '2', label: 'Aranha' },
            { code: '3', label: 'Escorpião' },
            { code: '4', label: 'Lagarta' },
            { code: '5', label: 'Abelha' },
            { code: '6', label: 'Outros' },
            { code: '9', label: 'Ignorado' },
          ],
        },
        {
          code: '45_outros_especifique',
          label: 'Tipo de Acidente — Outros, especifique',
          type: 'text',
          visibleWhen: { fieldCode: '45', equals: ['6'] },
        },
        {
          code: '46',
          label: 'Serpente — Tipo de Acidente',
          type: 'code',
          visibleWhen: { fieldCode: '45', equals: ['1'] },
          options: [
            { code: '1', label: 'Botrópico' },
            { code: '2', label: 'Crotálico' },
            { code: '3', label: 'Elapídico' },
            { code: '4', label: 'Laquético' },
            { code: '5', label: 'Serpente Não Peçonhenta' },
            { code: '9', label: 'Ignorado' },
          ],
        },
        {
          code: '47',
          label: 'Aranha — Tipo de Acidente',
          type: 'code',
          visibleWhen: { fieldCode: '45', equals: ['2'] },
          options: [
            { code: '1', label: 'Foneutrismo' },
            { code: '2', label: 'Loxoscelismo' },
            { code: '3', label: 'Latrodectismo' },
            { code: '4', label: 'Outra Aranha' },
            { code: '9', label: 'Ignorado' },
          ],
        },
        {
          code: '48',
          label: 'Lagarta — Tipo de Acidente',
          type: 'code',
          visibleWhen: { fieldCode: '45', equals: ['4'] },
          options: [
            { code: '1', label: 'Lonomia' },
            { code: '2', label: 'Outra lagarta' },
            { code: '9', label: 'Ignorado' },
          ],
        },
      ],
    },
  ],
};
