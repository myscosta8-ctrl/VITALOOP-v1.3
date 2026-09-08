import type { ClinicalFormSchema } from '../clinical-forms/types.js';

// APAC (Laudo para Solicitação/Autorização de Procedimento Ambulatorial) é o
// irmão do AIH para procedimento ambulatorial em vez de internação — mesmo
// formulário oficial numerado do Ministério da Saúde/SUS (ver
// docs/REFERENCIA_CAMPOS_IMPRESSOS_HOSPITALARES.md, item 6).
//
// Dados de identificação do paciente (campos 3-14) já são cobertos pelo
// módulo de paciente/encontro — não duplicados aqui. Procedimento SIGTAP
// principal/secundário e CID-10 principal/secundário (campos 15-32 e 34-35)
// têm colunas próprias em app.apac_requests e validação real de
// compatibilidade contra o catálogo SIGTAP (mesma lógica de app.aih_requests,
// reutilizada — ver validateSigtapCompatibility em rules.ts) — não fazem
// parte deste schema genérico.
//
// O que falta é só administrativo/descritivo: descrição do diagnóstico e CID
// de causas associadas (campo 36) e dados do profissional solicitante
// (campos 38-42) — ambos abaixo. O bloco de autorização (campos 43-50) foi
// MOVIDO pra `APAC_AUTHORIZATION_FIELDS_SCHEMA` (2026-09-07): é preenchido
// DEPOIS, pela regulação/auditoria, não por quem solicita, e agora tem sua
// própria etapa/permissão (`sus.authorize_apac`) separada da solicitação
// (`sus.issue_apac`).
export const APAC_CLINICAL_FIELDS_SCHEMA: ClinicalFormSchema = {
  schemaCode: 'APAC_CLINICAL_FIELDS',
  groups: [
    {
      title: 'Diagnóstico e Justificativa',
      fields: [
        { code: 'descricao_diagnostico', label: 'Descrição do Diagnóstico', type: 'text', required: true },
        { code: 'cid10_causas_associadas', label: 'CID-10 de Causas Associadas', type: 'text' },
      ],
    },
    {
      title: 'Solicitação',
      fields: [
        { code: 'profissional_solicitante_nome', label: 'Profissional solicitante', type: 'text', required: true },
        {
          code: 'solicitante_tipo_documento',
          label: 'Tipo de documento do solicitante',
          type: 'code',
          required: true,
          options: [
            { code: 'cns', label: 'CNS' },
            { code: 'cpf', label: 'CPF' },
          ],
        },
        { code: 'solicitante_numero_documento', label: 'Nº do documento do solicitante', type: 'text', required: true },
        { code: 'data_solicitacao', label: 'Data da solicitação', type: 'date', required: true },
      ],
    },
    {
      title: 'Estabelecimento Executante',
      fields: [
        { code: 'estabelecimento_executante_nome', label: 'Nome fantasia do estabelecimento executante', type: 'text' },
        { code: 'estabelecimento_executante_cnes', label: 'CNES do estabelecimento executante', type: 'text' },
      ],
    },
  ],
};

/**
 * Campos preenchidos DEPOIS da solicitação, pela regulação/auditoria —
 * etapa de autorização, separada da etapa de solicitação (`sus.issue_apac`)
 * por uma permissão própria (`sus.authorize_apac`). Ver
 * `apps/api/src/routes/apac.ts` (`POST /api/v1/sus/apac-requests/:id/authorize`).
 */
export const APAC_AUTHORIZATION_FIELDS_SCHEMA: ClinicalFormSchema = {
  schemaCode: 'APAC_AUTHORIZATION_FIELDS',
  groups: [
    {
      title: 'Autorização',
      fields: [
        { code: 'profissional_autorizador_nome', label: 'Profissional autorizador', type: 'text', required: true },
        { code: 'codigo_orgao_emissor', label: 'Código do órgão emissor', type: 'text' },
        {
          code: 'autorizador_tipo_documento',
          label: 'Tipo de documento do autorizador',
          type: 'code',
          options: [
            { code: 'cns', label: 'CNS' },
            { code: 'cpf', label: 'CPF' },
          ],
        },
        { code: 'autorizador_numero_documento', label: 'Nº do documento do autorizador', type: 'text' },
        { code: 'autorizador_registro_conselho', label: 'Nº de registro no conselho do autorizador', type: 'text' },
        { code: 'data_autorizacao', label: 'Data da autorização', type: 'date', required: true },
        { code: 'numero_autorizacao_apac', label: 'Número da autorização (APAC)', type: 'text', required: true },
        { code: 'validade_inicio', label: 'Início do período de validade da APAC', type: 'date', required: true },
        { code: 'validade_fim', label: 'Fim do período de validade da APAC', type: 'date', required: true },
      ],
    },
  ],
};
