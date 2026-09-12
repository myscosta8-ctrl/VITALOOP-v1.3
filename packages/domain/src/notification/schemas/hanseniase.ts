import type { SinanBodySchema } from '../types.js';
import { evolucaoCasoField, labResultadoField } from './shared-options.js';

/** Campos clínicos/epidemiológicos da ficha SINAN de Hanseníase. */
export const HANSENIASE_BODY_SCHEMA: SinanBodySchema = {
  schemaCode: 'HANSENIASE',
  groups: [
    {
      title: 'Classificação Clínica',
      fields: [
        {
          code: 'forma_clinica_madri',
          label: 'Forma Clínica (Classificação de Madri)',
          type: 'code',
          options: [
            { code: '1', label: 'Indeterminada (I)' },
            { code: '2', label: 'Tuberculóide (T)' },
            { code: '3', label: 'Dimorfa/Borderline (D)' },
            { code: '4', label: 'Virchowiana/Lepromatosa (V)' },
          ],
        },
        {
          code: 'classificacao_oms',
          label: 'Classificação Operacional (OMS)',
          type: 'code',
          options: [
            { code: '1', label: 'Paucibacilar (PB) — até 5 lesões' },
            { code: '2', label: 'Multibacilar (MB) — mais de 5 lesões' },
          ],
        },
        { code: 'numero_lesoes_cutaneas', label: 'Número de Lesões Cutâneas', type: 'number' },
        { code: 'numero_nervos_afetados', label: 'Número de Nervos Afetados', type: 'number' },
      ],
    },
    {
      title: 'Diagnóstico Laboratorial',
      fields: [
        labResultadoField('baciloscopia', 'Baciloscopia'),
        labResultadoField('reacao_mitsuda_lepromin', 'Reação de Mitsuda/Lepromin'),
      ],
    },
    {
      title: 'Tratamento (Poliquimioterapia — PQT)',
      fields: [
        {
          code: 'esquema_pqt',
          label: 'Esquema de Tratamento',
          type: 'code',
          options: [
            { code: '1', label: 'PQT-PB — 6 doses' },
            { code: '2', label: 'PQT-MB — 12 doses' },
            { code: '3', label: 'Outro Esquema' },
            { code: '4', label: 'Não Iniciado' },
          ],
        },
      ],
    },
    {
      title: 'Desfecho',
      fields: [evolucaoCasoField()],
    },
  ],
};
