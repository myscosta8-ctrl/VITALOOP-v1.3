import type { SinanBodySchema } from '../types.js';
import { evolucaoCasoField, labResultadoField, simNaoIgnField } from './shared-options.js';

/**
 * Campos clínicos/epidemiológicos da ficha SINAN de Sífilis Adquirida. O
 * Vitaloop tem um único código `SIFILIS` (sem separar congênita/gestante
 * como fichas próprias) — este schema cobre a apresentação em adulto/caso
 * geral, que é a mais comum numa UPA.
 */
export const SIFILIS_BODY_SCHEMA: SinanBodySchema = {
  schemaCode: 'SIFILIS',
  groups: [
    {
      title: 'Classificação Clínica',
      fields: [
        {
          code: 'classificacao_sifilis',
          label: 'Classificação da Sífilis',
          type: 'code',
          options: [
            { code: '1', label: 'Primária (cancro duro)' },
            { code: '2', label: 'Secundária (roséola/condiloma)' },
            { code: '3', label: 'Latente Recente (< 1 ano)' },
            { code: '4', label: 'Latente Tardia (> 1 ano ou ignorada)' },
            { code: '5', label: 'Terciária (cardiovascular/neurológica/gomosa)' },
          ],
        },
        simNaoIgnField('gestante', 'Gestante'),
      ],
    },
    {
      title: 'Diagnóstico Laboratorial',
      fields: [
        {
          code: 'vdrl',
          label: 'VDRL',
          type: 'code',
          options: [
            { code: '1', label: 'Não Reativo' },
            { code: '2', label: 'Reativo' },
            { code: '3', label: 'Não Realizado' },
          ],
        },
        { code: 'titulo_vdrl', label: 'Título VDRL', type: 'text' },
        labResultadoField('fta_abs_treponemico', 'FTA-Abs (Treponêmico)'),
        labResultadoField('tpha_elisa_treponemico', 'TPHA/ELISA Treponêmico'),
      ],
    },
    {
      title: 'Tratamento',
      fields: [simNaoIgnField('tratamento_penicilina', 'Tratamento com Penicilina'), simNaoIgnField('parceiro_tratado', 'Parceiro(a) Tratado(a)')],
    },
    {
      title: 'Desfecho',
      fields: [evolucaoCasoField()],
    },
  ],
};
