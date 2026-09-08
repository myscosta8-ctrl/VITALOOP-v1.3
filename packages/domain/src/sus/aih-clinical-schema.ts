import type { ClinicalFormSchema } from '../clinical-forms/types.js';

/**
 * Campos clínicos/administrativos do Laudo de AIH que ainda não tinham
 * lugar nenhum no sistema — comparado contra o impresso oficial já
 * fornecido pelo usuário em sessão anterior (ver
 * docs/REFERENCIA_CAMPOS_IMPRESSOS_HOSPITALARES.md, item 1).
 *
 * O que JÁ existe e não entra aqui de propósito:
 * - Identificação do paciente (nome, nascimento, sexo, raça/cor, mãe,
 *   endereço) — já é dado de cadastro do paciente, não digitado de novo.
 * - Procedimento SIGTAP principal/secundário, CID-10 principal/secundário,
 *   justificativa clínica — já são campos próprios e validados de verdade
 *   contra a tabela SIGTAP (idade/sexo compatíveis, CID exigido) em
 *   `AihFormModal`/`sus.ts`; não fazem sentido virar campo de schema
 *   genérico, porque têm regra de negócio real por trás, não só uma lista
 *   fechada de opções.
 *
 * O que faltava (adicionado aqui): história da doença atual, estado geral
 * na admissão, clínica/especialidade, caráter da internação.
 *
 * Campos "Médico solicitante"/CRM (grupo "Solicitação") seguem o mesmo
 * princípio já estabelecido em `hemotherapy/schema.ts` e
 * `pharmacy-atm/schema.ts`: não são redundantes com `requester_id` (o
 * usuário logado que criou o registro) — o impresso exige carimbo/
 * assinatura manual do médico responsável pela solicitação, que pode ser
 * uma pessoa diferente de quem está logado registrando.
 *
 * `numero_autorizacao` foi MOVIDO pra `AIH_AUTHORIZATION_FIELDS_SCHEMA`
 * (2026-09-07) — é emitido depois, pela regulação/auditoria, não pelo
 * médico solicitante, e agora tem sua própria etapa/permissão
 * (`sus.authorize_aih`) separada da solicitação (`sus.issue_aih`).
 */
export const AIH_CLINICAL_FIELDS_SCHEMA: ClinicalFormSchema = {
  schemaCode: 'AIH_CLINICAL_FIELDS',
  groups: [
    {
      title: 'Dados Clínicos da Internação',
      fields: [
        { code: 'historia_doenca_atual', label: 'História da Doença Atual', type: 'text', required: true },
        { code: 'estado_geral_admissao', label: 'Estado Geral na Admissão', type: 'text', required: true },
        { code: 'clinica_especialidade', label: 'Clínica / Especialidade', type: 'text', required: true },
        {
          code: 'carater_internacao',
          label: 'Caráter da Internação',
          type: 'code',
          required: true,
          options: [
            { code: 'eletivo', label: 'Eletivo' },
            { code: 'urgencia', label: 'Urgência' },
          ],
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

/**
 * Campos preenchidos DEPOIS da solicitação, pela regulação/auditoria —
 * etapa de autorização, separada da etapa de solicitação (`sus.issue_aih`)
 * por uma permissão própria (`sus.authorize_aih`). Ver
 * `apps/api/src/routes/sus.ts` (`POST /api/v1/sus/aih-requests/:id/authorize`).
 */
export const AIH_AUTHORIZATION_FIELDS_SCHEMA: ClinicalFormSchema = {
  schemaCode: 'AIH_AUTHORIZATION_FIELDS',
  groups: [
    {
      title: 'Autorização',
      fields: [
        { code: 'profissional_autorizador_nome', label: 'Profissional autorizador', type: 'text', required: true },
        { code: 'profissional_autorizador_registro', label: 'Registro do profissional autorizador', type: 'text' },
        { code: 'numero_autorizacao', label: 'Número de autorização', type: 'text', required: true },
        { code: 'data_autorizacao', label: 'Data da autorização', type: 'date', required: true },
      ],
    },
  ],
};
