import type { ClinicalFormSchema } from '../clinical-forms/types.js';

/**
 * Campos do "Formulário Antimicrobiano (ATM)" — extraído do impresso real
 * usado hoje na UPA 24h Breves (fonte: docs/
 * REFERENCIA_CAMPOS_IMPRESSOS_HOSPITALARES.md, item 3 — o PDF de origem
 * continha dado de paciente real e foi apagado depois da extração).
 *
 * Evolução em relação ao impresso de papel (layout do papel não importa,
 * só a informação): o campo "Medicamento" era texto livre no papel, mas a
 * lista impressa de "Antibióticos de Uso Restrito" é, na prática, a lista
 * fechada de opções válidas (esse formulário só existe pra pedir um desses
 * 8) — vira um campo de código com essas opções em vez de texto livre,
 * evitando erro de digitação/nome divergente na farmácia.
 *
 * Nesta primeira versão o parecer do farmacêutico é capturado no mesmo
 * formulário que a solicitação médica (não há uma segunda tela de revisão
 * separada ainda) — se a farmácia precisar de um fluxo próprio de
 * aprovação depois, isso vira um formulário/tabela separados.
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
 * `hemotherapy/schema.ts`.
 */
export const ANTIMICROBIAL_REQUEST_SCHEMA: ClinicalFormSchema = {
  schemaCode: 'ANTIMICROBIAL_REQUEST',
  groups: [
    {
      title: 'Diagnóstico e Justificativa',
      fields: [
        { code: 'diagnostico', label: 'Diagnóstico', type: 'text', required: true },
        { code: 'data_internacao', label: 'Data de internação', type: 'date' },
        { code: 'justificativa', label: 'Justificativa', type: 'text', required: true },
      ],
    },
    {
      title: 'Tratamento Pretendido',
      fields: [
        {
          code: 'medicamento',
          label: 'Medicamento (antibiótico de uso restrito)',
          type: 'code',
          required: true,
          options: [
            { code: 'cefepime', label: 'Cefepime' },
            { code: 'ciprofloxacino', label: 'Ciprofloxacino' },
            { code: 'clindamicina', label: 'Clindamicina' },
            { code: 'levofloxacino', label: 'Levofloxacino' },
            { code: 'meropenem', label: 'Meropenem' },
            { code: 'metronidazol', label: 'Metronidazol' },
            { code: 'piperacilina_tazobactam', label: 'Piperacilina + Tazobactam' },
            { code: 'vancomicina', label: 'Vancomicina' },
          ],
        },
        { code: 'posologia', label: 'Posologia', type: 'text', required: true },
        { code: 'dose', label: 'Dose (mg)', type: 'number', required: true },
        { code: 'intervalo', label: 'Intervalo (ex.: 8/8h)', type: 'text', required: true },
        { code: 'tempo_uso_dias', label: 'Tempo de uso (dias)', type: 'number', required: true },
        { code: 'ampolas', label: 'Total do tratamento — Ampolas', type: 'number' },
        { code: 'frasco_ampolas', label: 'Total do tratamento — Frasco-ampolas', type: 'number' },
        { code: 'bolsas', label: 'Total do tratamento — Bolsas', type: 'number' },
      ],
    },
    {
      title: 'Parecer do Farmacêutico',
      fields: [
        {
          code: 'parecer',
          label: 'Parecer',
          type: 'code',
          options: [
            { code: 'de_acordo', label: 'De acordo' },
            { code: 'contrario', label: 'Contrário' },
          ],
        },
        {
          code: 'disponibilidade_estoque',
          label: 'Disponibilidade em estoque',
          type: 'code',
          options: [
            { code: 'contempla', label: 'Há disponível quantidade que contemple o tratamento proposto' },
            { code: 'contempla_parcial', label: 'Há disponível somente quantidade para garantia parcial do tratamento' },
            { code: 'nao_ha', label: 'Não há disponível quantidade que contemple o tratamento proposto' },
          ],
        },
        { code: 'parecer_justificativa', label: 'Justificativa do parecer', type: 'text' },
        { code: 'parecer_outros', label: 'Outros', type: 'text' },
        { code: 'parecer_data', label: 'Data do parecer', type: 'date' },
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
