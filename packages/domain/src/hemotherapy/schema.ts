import type { ClinicalFormSchema } from '../clinical-forms/types.js';

/**
 * Campos da "Solicitação de Sangue, Componentes e Derivados" — extraído do
 * impresso real usado hoje na UPA 24h Breves (fonte: docs/
 * REFERENCIA_CAMPOS_IMPRESSOS_HOSPITALARES.md, item 2 — o PDF de origem
 * continha dado de paciente real e foi apagado depois da extração).
 *
 * Evoluções em relação ao impresso de papel (pedido explícito do usuário —
 * layout do papel não importa, só a informação):
 * - HB/HT eram um campo de texto único ("6,4/20,9"); viram dois campos
 *   numéricos (`hb`, `ht`), mais fáceis de validar e comparar entre
 *   solicitações.
 * - Cada hemocomponente/hemoderivado era uma linha de tabela com uma
 *   coluna de quantidade em branco; vira um campo numérico próprio por
 *   item — mais simples de preencher numa tela do que numa tabela livre.
 * - A classificação de urgência era um bloco de "( ) opção" com sub-datas
 *   soltas; vira um campo de código único (`urgencia_tipo`) com
 *   sub-campos condicionais (só aparecem se a opção "Programada" for
 *   escolhida).
 * - A seção "espaço reservado exclusivamente pra uso da Fundação Hemopa"
 *   (tabela de resultado laboratorial) e os campos PAI/AC/CD (pesquisa de
 *   anticorpos irregulares) ficam de fora deste schema de propósito — são
 *   preenchidos pelo banco de sangue depois que a solicitação chega lá,
 *   não pelo profissional da UPA que está solicitando.
 *
 * Campos "Médico solicitante"/CRM (grupo "Solicitação") são intencionais e
 * NÃO redundantes com `requested_by` (o usuário logado que criou o
 * registro): este impresso exige carimbo/assinatura manual do médico
 * responsável pela solicitação, que às vezes é uma pessoa diferente de
 * quem efetivamente está logado registrando (ex.: um médico solicita e,
 * por cortesia, o colega responsável pelo paciente no momento é quem
 * carimba/assina). `requested_by` é rastreabilidade de sistema (quem
 * criou o registro); nome/CRM aqui são a autoria clínica/legal do pedido
 * — as duas coisas podem legitimamente divergir. Mesmo padrão em
 * `pharmacy-atm/schema.ts`.
 */
export const BLOOD_PRODUCT_REQUEST_SCHEMA: ClinicalFormSchema = {
  schemaCode: 'BLOOD_PRODUCT_REQUEST',
  groups: [
    {
      title: 'Dados Clínicos da Solicitação',
      fields: [
        { code: 'peso', label: 'Peso (kg)', type: 'number' },
        { code: 'hb', label: 'Hemoglobina (HB)', type: 'number' },
        { code: 'ht', label: 'Hematócrito (HT)', type: 'number' },
        {
          code: 'recebeu_transfusao',
          label: 'Recebeu transfusão anteriormente?',
          type: 'code',
          required: true,
          options: [
            { code: '1', label: 'Sim' },
            { code: '2', label: 'Não' },
          ],
        },
        {
          code: 'recebeu_transfusao_quando',
          label: 'Quando (transfusão anterior)',
          type: 'text',
          visibleWhen: { fieldCode: 'recebeu_transfusao', equals: ['1'] },
        },
        {
          code: 'recebeu_transfusao_onde',
          label: 'Onde (transfusão anterior)',
          type: 'text',
          visibleWhen: { fieldCode: 'recebeu_transfusao', equals: ['1'] },
        },
        {
          code: 'anticorpo_irregular',
          label: 'Antecedentes de anticorpo irregular?',
          type: 'code',
          required: true,
          options: [
            { code: '1', label: 'Sim' },
            { code: '2', label: 'Não' },
          ],
        },
        {
          code: 'solicitou_doadores',
          label: 'Solicitou doadores?',
          type: 'code',
          options: [
            { code: '1', label: 'Sim' },
            { code: '2', label: 'Não' },
          ],
        },
      ],
    },
    {
      title: 'Hemocomponentes / Hemoderivados solicitados (quantidade de unidades)',
      fields: [
        { code: 'hc_hemacias', label: 'Concentrado de hemácias (+300ml/unid)', type: 'number' },
        { code: 'hc_hemacias_leucorreduzido', label: 'Concentrado de hemácias pobre em leucócitos (+300ml/unid)', type: 'number' },
        { code: 'hc_hemacias_leucorreduzido_irradiado', label: 'Concentrado de hemácias pobre em leucócitos irradiado (+300ml/unid)', type: 'number' },
        { code: 'hc_plasma_fresco', label: 'Plasma fresco congelado (+200ml/unid)', type: 'number' },
        { code: 'hc_plaquetas_leucorreduzido', label: 'Concentrado de plaquetas pobre em leucócitos (+60ml/unid)', type: 'number' },
        { code: 'hc_plaquetas_leucorreduzido_irradiado', label: 'Concentrado de plaquetas pobre em leucócitos irradiado (+60ml/unid)', type: 'number' },
        { code: 'hc_plaquetas_aferese', label: 'Concentrado de plaquetas por aférese (+300ml/unid)', type: 'number' },
        { code: 'hc_crioprecipitado', label: 'Crioprecipitado (+20ml/unid)', type: 'number' },
        { code: 'hc_outros_especifique', label: 'Outros — especifique', type: 'text' },
        { code: 'hc_outros_quantidade', label: 'Outros — quantidade', type: 'number' },
      ],
    },
    {
      title: 'Classificação de Urgência',
      fields: [
        {
          code: 'urgencia_tipo',
          label: 'Classificação',
          type: 'code',
          required: true,
          options: [
            { code: 'urgencia', label: 'Urgência — realizar dentro de 3 horas' },
            { code: 'rotina', label: 'Não urgente (rotina) — realizar dentro de 24 horas' },
            { code: 'programada', label: 'Programada' },
            { code: 'residencia', label: 'Transfusão em residência (exige Termo de Responsabilidade)' },
            { code: 'auto_transfusao', label: 'Auto-transfusão' },
          ],
        },
        {
          code: 'programada_subtipo',
          label: 'Programada para',
          type: 'code',
          visibleWhen: { fieldCode: 'urgencia_tipo', equals: ['programada'] },
          options: [
            { code: 'cirurgia_eletiva', label: 'Cirurgia eletiva (com possível transfusão)' },
            { code: 'ambulatorial', label: 'Transfusão em regime ambulatorial' },
          ],
        },
        {
          code: 'programada_data',
          label: 'Data programada',
          type: 'date',
          visibleWhen: { fieldCode: 'urgencia_tipo', equals: ['programada'] },
          helpText: 'Encaminhar à Fundação Hemopa com antecedência mínima de 3 dias úteis.',
        },
        {
          code: 'programada_hora',
          label: 'Hora programada',
          type: 'text',
          visibleWhen: { fieldCode: 'urgencia_tipo', equals: ['programada'] },
        },
      ],
    },
    {
      title: 'Transfusão de Extrema Urgência',
      fields: [
        {
          code: 'extrema_urgencia_autorizada',
          label: 'Autorizada transfusão sem testes pré-transfusionais (risco de vida)?',
          type: 'code',
          options: [
            { code: '1', label: 'Sim' },
            { code: '2', label: 'Não' },
          ],
        },
        {
          code: 'extrema_urgencia_data',
          label: 'Data da autorização',
          type: 'date',
          visibleWhen: { fieldCode: 'extrema_urgencia_autorizada', equals: ['1'] },
        },
        {
          code: 'extrema_urgencia_hora',
          label: 'Hora da autorização',
          type: 'text',
          visibleWhen: { fieldCode: 'extrema_urgencia_autorizada', equals: ['1'] },
        },
        {
          code: 'coletado_por',
          label: 'Coletado por',
          type: 'text',
          visibleWhen: { fieldCode: 'extrema_urgencia_autorizada', equals: ['1'] },
        },
        {
          code: 'coletado_data',
          label: 'Data da coleta',
          type: 'date',
          visibleWhen: { fieldCode: 'extrema_urgencia_autorizada', equals: ['1'] },
        },
        {
          code: 'coletado_hora',
          label: 'Hora da coleta',
          type: 'text',
          visibleWhen: { fieldCode: 'extrema_urgencia_autorizada', equals: ['1'] },
        },
      ],
    },
    {
      title: 'Solicitação',
      fields: [
        { code: 'medico_solicitante_nome', label: 'Médico solicitante', type: 'text', required: true },
        { code: 'medico_solicitante_crm', label: 'CRM', type: 'text', required: true },
        { code: 'data_solicitacao', label: 'Data da solicitação', type: 'date', required: true },
      ],
    },
  ],
};
