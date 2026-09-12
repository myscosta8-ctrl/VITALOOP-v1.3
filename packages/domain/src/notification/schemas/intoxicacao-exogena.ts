import type { SinanBodySchema } from '../types.js';
import { evolucaoCasoField } from './shared-options.js';

/** Campos clínicos/epidemiológicos da ficha SINAN de Intoxicação Exógena. */
export const INTOXICACAO_EXOGENA_BODY_SCHEMA: SinanBodySchema = {
  schemaCode: 'INTOXICACAO_EXOGENA',
  groups: [
    {
      title: 'Agente Causador',
      fields: [
        {
          code: 'tipo_agente',
          label: 'Tipo de Agente',
          type: 'code',
          options: [
            { code: '1', label: 'Medicamento' },
            { code: '2', label: 'Agrotóxico/Pesticida' },
            { code: '3', label: 'Raticida' },
            { code: '4', label: 'Domissanitário' },
            { code: '5', label: 'Cosmético' },
            { code: '6', label: 'Produto Veterinário' },
            { code: '7', label: 'Planta/Fungo' },
            { code: '8', label: 'Droga de Abuso/Álcool' },
            { code: '9', label: 'Alimento' },
            { code: '10', label: 'Gás/Vapor/Fumaça' },
            { code: '11', label: 'Metal Pesado/Produto Industrial' },
            { code: '12', label: 'Outro' },
          ],
        },
        { code: 'nome_descricao_agente', label: 'Nome/Descrição do Agente', type: 'text' },
      ],
    },
    {
      title: 'Circunstância e Via de Exposição',
      fields: [
        {
          code: 'circunstancia',
          label: 'Circunstância',
          type: 'code',
          options: [
            { code: '1', label: 'Acidental/Ambiental' },
            { code: '2', label: 'Ocupacional' },
            { code: '3', label: 'Uso Habitual de Drogas/Álcool' },
            { code: '4', label: 'Uso Terapêutico/Prescrito' },
            { code: '5', label: 'Automedicação' },
            { code: '6', label: 'Tentativa de Suicídio (TAS)' },
            { code: '7', label: 'Violência/Homicídio' },
            { code: '9', label: 'Ignorado' },
          ],
        },
        {
          code: 'via_exposicao',
          label: 'Via de Exposição',
          type: 'code',
          options: [
            { code: '1', label: 'Oral/Digestiva' },
            { code: '2', label: 'Cutânea' },
            { code: '3', label: 'Respiratória/Inalatória' },
            { code: '4', label: 'Parenteral/Injeção' },
            { code: '5', label: 'Ocular' },
            { code: '6', label: 'Mucosa Nasal/Vaginal' },
            { code: '7', label: 'Múltiplas Vias' },
            { code: '9', label: 'Ignorado' },
          ],
        },
      ],
    },
    {
      title: 'Tratamento',
      fields: [
        {
          code: 'antidoto_tratamento_especifico',
          label: 'Antídoto/Tratamento Específico',
          type: 'code',
          options: [
            { code: '1', label: 'Sim — Administrado' },
            { code: '2', label: 'Não Indicado' },
            { code: '3', label: 'Não Disponível' },
          ],
        },
        {
          code: 'antidoto_utilizado',
          label: 'Antídoto Utilizado',
          type: 'text',
          visibleWhen: { fieldCode: 'antidoto_tratamento_especifico', equals: ['1'] },
        },
      ],
    },
    {
      title: 'Desfecho',
      fields: [evolucaoCasoField()],
    },
  ],
};
