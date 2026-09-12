import type { SinanBodySchema } from '../types.js';
import { evolucaoCasoField, simNaoIgnField } from './shared-options.js';

/**
 * Campos clínicos/epidemiológicos da ficha SINAN de Tétano Acidental. O
 * Vitaloop só tem o código `TETANO_ACIDENTAL` (sem a variante Neonatal
 * separada), então este schema cobre só os dados da ferida/vacinação da
 * apresentação acidental — não os campos de parto/coto umbilical do Tétano
 * Neonatal.
 */
export const TETANO_ACIDENTAL_BODY_SCHEMA: SinanBodySchema = {
  schemaCode: 'TETANO_ACIDENTAL',
  groups: [
    {
      title: 'Dados da Ferida',
      fields: [
        {
          code: 'tipo_ferimento',
          label: 'Tipo de Ferimento',
          type: 'code',
          options: [
            { code: '1', label: 'Puntiforme/Perfurante' },
            { code: '2', label: 'Cortocontuso' },
            { code: '3', label: 'Lacerado' },
            { code: '4', label: 'Amputação' },
            { code: '5', label: 'Fratura Exposta' },
            { code: '6', label: 'Queimadura' },
            { code: '7', label: 'Cirúrgico' },
            { code: '8', label: 'Úlcera/Escara' },
            { code: '9', label: 'Outro' },
          ],
        },
        {
          code: 'localizacao_ferimento',
          label: 'Localização do Ferimento',
          type: 'code',
          options: [
            { code: '1', label: 'Cabeça/Pescoço' },
            { code: '2', label: 'Tronco' },
            { code: '3', label: 'Membro Superior' },
            { code: '4', label: 'Membro Inferior' },
            { code: '5', label: 'Múltiplos' },
          ],
        },
      ],
    },
    {
      title: 'Vacinação Antitetânica (VTA)',
      fields: [
        {
          code: 'doses_vta',
          label: 'Doses de VTA Recebidas',
          type: 'code',
          options: [
            { code: '0', label: 'Nenhuma' },
            { code: '1', label: '1 dose' },
            { code: '2', label: '2 doses' },
            { code: '3', label: '3 ou mais doses' },
            { code: '9', label: 'Ignorado' },
          ],
        },
        { code: 'data_ultima_dose_vta', label: 'Data da Última Dose VTA', type: 'date' },
        simNaoIgnField('sat_soro_antitetanico_aplicado', 'SAT (Soro Antitetânico) Aplicado'),
        simNaoIgnField('igh_t_imunoglobulina_aplicada', 'IGH-T (Imunoglobulina Humana) Aplicada'),
      ],
    },
    {
      title: 'Desfecho',
      fields: [evolucaoCasoField()],
    },
  ],
};
