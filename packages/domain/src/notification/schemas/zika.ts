import type { SinanBodySchema } from '../types.js';
import { evolucaoCasoField, labResultadoField, simNaoIgnField } from './shared-options.js';

/**
 * Campos clínicos/epidemiológicos da ficha SINAN de Zika. Bloco de
 * gestação/microcefalia fetal só aparece quando "Gestante" = Sim — reflete a
 * ficha oficial, que trata a vigilância de Zika em gestante como o eixo
 * principal de acompanhamento (risco de Síndrome Congênita do Zika Vírus).
 */
export const ZIKA_BODY_SCHEMA: SinanBodySchema = {
  schemaCode: 'ZIKA',
  groups: [
    {
      title: 'Dados Clínicos',
      fields: [
        simNaoIgnField('exantema', 'Exantema (Manchas/Erupção Cutânea)'),
        simNaoIgnField('artralgia_artrite', 'Artralgia/Artrite'),
        simNaoIgnField('conjuntivite_nao_purulenta', 'Conjuntivite Não Purulenta'),
        simNaoIgnField('febre_ate_38_5', 'Febre (≤ 38,5°C)'),
        simNaoIgnField('gestante', 'Gestante'),
      ],
    },
    {
      title: 'Dados da Gestação',
      fields: [
        {
          code: 'idade_gestacional_semanas',
          label: 'Idade Gestacional ao Diagnóstico (semanas)',
          type: 'number',
          visibleWhen: { fieldCode: 'gestante', equals: ['1'] },
        },
        {
          code: 'microcefalia_fetal',
          label: 'Microcefalia Fetal Identificada',
          type: 'code',
          visibleWhen: { fieldCode: 'gestante', equals: ['1'] },
          options: [
            { code: '1', label: 'Suspeita — Aguardando Confirmação' },
            { code: '2', label: 'Confirmada' },
            { code: '3', label: 'Não' },
            { code: '9', label: 'Ignorado' },
          ],
        },
      ],
    },
    {
      title: 'Diagnóstico Laboratorial',
      fields: [
        labResultadoField('pcr_rt_pcr_zika', 'PCR/RT-PCR Zika'),
        labResultadoField('igm_zika_elisa', 'IgM Zika (ELISA)'),
        labResultadoField('igg_zika', 'IgG Zika'),
        { code: 'data_coleta', label: 'Data da Coleta', type: 'date' },
      ],
    },
    {
      title: 'Desfecho',
      fields: [evolucaoCasoField()],
    },
  ],
};
