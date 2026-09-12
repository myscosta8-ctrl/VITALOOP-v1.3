import type { SinanBodySchema } from '../types.js';
import { simNaoIgnField } from './shared-options.js';

/**
 * Campos 31-70 da ficha SINAN "Doença de Chagas Aguda" (Chagas_v5.pdf),
 * extraídos do texto/layout impresso do PDF-base campo a campo.
 *
 * REESCRITO em 2026-09-11, na revisão de fidelidade pós-Malária/Sarampo/
 * Meningite/Coqueluche: achado mais grave do que os anteriores — a versão
 * anterior (Fase A) tinha como EIXO CENTRAL do schema um campo `fase_doenca`
 * (Aguda/Crônica) condicionando dois blocos inteiros (exames parasitológicos
 * diretos vs. forma clínica/ECG), mas **a ficha oficial do SINAN é só de
 * Doença de Chagas AGUDA** — não existe "fase crônica" nem campos
 * `forma_clinica`/`ecg` em lugar nenhum do impresso (Chagas crônica não é
 * agravo de notificação compulsória separado no SINAN). Todo esse eixo foi
 * removido. Faltavam também: todo o bloco de antecedentes epidemiológicos
 * (vestígios de triatomídeos, uso de sangue/hemoderivados, controle
 * sorológico em hemoterapia, manipulação de material com T. cruzi, mãe com
 * infecção chagásica, transmissão oral — campos 33-40), a checklist completa
 * de sinais e sintomas (41), a grade inteira de sorologia (ELISA/
 * Hemoaglutinação/IFI × IgM/IgG × S1/S2, com títulos pra IFI — campos 46-50),
 * parasitológico direto/indireto com tipo de exame (42-45), histopatológico
 * (51-52), tipo/droga/tempo de tratamento (53-55), medidas de controle
 * (56), critério de confirmação/descarte (58), modo e local prováveis da
 * infecção (61-62), local provável completo (63-68), doença relacionada ao
 * trabalho (69). `modo_transmissao` também tinha opções/códigos que não
 * batem com o "Modo Provável da Infecção" real (campo 61, códigos
 * diferentes). Esta versão usa os campos/opções exatos do impresso.
 */
const MEDIDA_OPTIONS = [
  { code: '1', label: 'Sim' },
  { code: '2', label: 'Não' },
  { code: '3', label: 'Não se Aplica' },
  { code: '9', label: 'Ignorado' },
] as const;

export const CHAGAS_BODY_SCHEMA: SinanBodySchema = {
  schemaCode: 'CHAGAS',
  groups: [
    {
      title: 'Dados Complementares do Caso',
      fields: [
        { code: 'data_investigacao', label: 'Data da Investigação', type: 'date' },
        { code: 'ocupacao', label: 'Ocupação', type: 'text' },
      ],
    },
    {
      title: 'Antecedentes Epidemiológicos',
      fields: [
        {
          code: 'deslocamento_detalhes',
          label: 'Deslocamento (viagens para áreas infestadas até 120 dias antes do início dos sintomas — UF/Município)',
          type: 'text',
        },
        {
          code: 'vestigios_triatomideos_intradomicilio',
          label: 'Presença de Vestígios de Triatomídeos Intra-Domicílio',
          type: 'code',
          options: [
            { code: '1', label: 'Sim' },
            { code: '2', label: 'Não' },
            { code: '3', label: 'Não Realizado' },
            { code: '9', label: 'Ignorado' },
          ],
        },
        {
          code: 'data_encontro_vestigios',
          label: 'Data de Encontro dos Vestígios',
          type: 'date',
          visibleWhen: { fieldCode: 'vestigios_triatomideos_intradomicilio', equals: ['1'] },
        },
        simNaoIgnField('uso_sangue_hemoderivados_120_dias', 'História de Uso de Sangue ou Hemoderivados nos Últimos 120 Dias'),
        {
          code: 'controle_sorologico_unidade_hemoterapia',
          label: 'Existência de Controle Sorológico na Unidade de Hemoterapia',
          type: 'code',
          options: [
            { code: '1', label: 'Sim' },
            { code: '2', label: 'Não' },
            { code: '3', label: 'Não se Aplica' },
            { code: '9', label: 'Ignorado' },
          ],
        },
        {
          code: 'manipulacao_contato_material_t_cruzi',
          label: 'Manipulação/Contato de Material com T. cruzi',
          type: 'code',
          options: [
            { code: '1', label: 'Sim' },
            { code: '2', label: 'Não' },
            { code: '3', label: 'Não se Aplica' },
            { code: '9', label: 'Ignorado' },
          ],
        },
        {
          code: 'menor_9_meses_mae_infeccao_chagasica',
          label: 'Menor ou Igual a 9 Meses de Idade: Mãe com Infecção Chagásica',
          type: 'code',
          options: [
            { code: '1', label: 'Sim' },
            { code: '2', label: 'Não' },
            { code: '3', label: 'Não se Aplica' },
            { code: '9', label: 'Ignorado' },
          ],
        },
        simNaoIgnField('possibilidade_transmissao_via_oral', 'Possibilidade de Transmissão por Via Oral'),
      ],
    },
    {
      title: 'Dados Clínicos — Sinais e Sintomas',
      fields: [
        simNaoIgnField('sintoma_assintomatico', 'Assintomático'),
        simNaoIgnField('sintoma_febre_persistente', 'Febre Persistente'),
        simNaoIgnField('sintoma_edema_face_membros', 'Edema de Face/Membros'),
        simNaoIgnField('sintoma_hepatomegalia', 'Hepatomegalia'),
        simNaoIgnField('sintoma_esplenomegalia', 'Esplenomegalia'),
        simNaoIgnField('sintoma_chagoma_inoculacao_sinal_romana', 'Chagoma de Inoculação/Sinal de Romaña'),
        simNaoIgnField('sintoma_poliadenopatia', 'Poliadenopatia'),
        simNaoIgnField('sintoma_astenia', 'Astenia'),
        simNaoIgnField('sintoma_sinais_icc', 'Sinais de ICC'),
        simNaoIgnField('sintoma_sinais_meningoencefalite', 'Sinais de Meningoencefalite'),
        simNaoIgnField('sintoma_taquicardia_persistente_arritmias', 'Taquicardia Persistente/Arritmias'),
        simNaoIgnField('sintoma_outros', 'Outros Sinais e Sintomas'),
        { code: 'sintoma_outros_especifique', label: 'Outros Sinais e Sintomas, especifique', type: 'text', visibleWhen: { fieldCode: 'sintoma_outros', equals: ['1'] } },
      ],
    },
    {
      title: 'Dados do Laboratório — Exames Parasitológicos',
      fields: [
        { code: 'data_coleta_parasitologico_direto', label: 'Data da Coleta (Parasitológico Direto)', type: 'date' },
        {
          code: 'parasitologico_direto',
          label: 'Parasitológico Direto',
          type: 'code',
          options: [
            { code: '1', label: 'Positivo' },
            { code: '2', label: 'Negativo' },
            { code: '3', label: 'Não Realizado' },
          ],
        },
        {
          code: 'parasitologico_direto_tipo',
          label: 'Tipo de Exame Parasitológico Direto',
          type: 'code',
          visibleWhen: { fieldCode: 'parasitologico_direto', equals: ['1', '2'] },
          options: [
            { code: '1', label: 'Exame a Fresco/Gota Espessa/Esfregaço' },
            { code: '2', label: 'Strout/Microhematócrito/QBC' },
            { code: '3', label: 'Outro' },
          ],
        },
        { code: 'data_coleta_parasitologico_indireto', label: 'Data da Coleta (Parasitológico Indireto)', type: 'date' },
        {
          code: 'parasitologico_indireto',
          label: 'Parasitológico Indireto',
          type: 'code',
          options: [
            { code: '1', label: 'Positivo' },
            { code: '2', label: 'Negativo' },
            { code: '3', label: 'Não Realizado' },
          ],
        },
        {
          code: 'parasitologico_indireto_tipo',
          label: 'Tipo de Exame Parasitológico Indireto',
          type: 'code',
          visibleWhen: { fieldCode: 'parasitologico_indireto', equals: ['1', '2'] },
          options: [
            { code: '1', label: 'Xenodiagnóstico' },
            { code: '2', label: 'Hemocultivo' },
          ],
        },
      ],
    },
    {
      title: 'Dados do Laboratório — Sorologia',
      fields: [
        { code: 'data_coleta_s1', label: 'Data da Coleta S1', type: 'date' },
        { code: 'data_coleta_s2', label: 'Data da Coleta S2', type: 'date' },
        resultadoSorologicoField('elisa_igm_s1', 'ELISA — IgM (S1)'),
        resultadoSorologicoField('elisa_igm_s2', 'ELISA — IgM (S2)'),
        resultadoSorologicoField('elisa_igg_s1', 'ELISA — IgG (S1)'),
        resultadoSorologicoField('elisa_igg_s2', 'ELISA — IgG (S2)'),
        resultadoSorologicoField('hemoaglutinacao_igm_s1', 'Hemoaglutinação — IgM (S1)'),
        resultadoSorologicoField('hemoaglutinacao_igm_s2', 'Hemoaglutinação — IgM (S2)'),
        resultadoSorologicoField('hemoaglutinacao_igg_s1', 'Hemoaglutinação — IgG (S1)'),
        resultadoSorologicoField('hemoaglutinacao_igg_s2', 'Hemoaglutinação — IgG (S2)'),
        resultadoSorologicoField('ifi_igm_s1', 'IFI (Imunofluorescência Indireta) — IgM (S1)'),
        { code: 'ifi_igm_s1_titulo', label: 'IFI IgM (S1) — Título', type: 'text' },
        resultadoSorologicoField('ifi_igm_s2', 'IFI — IgM (S2)'),
        { code: 'ifi_igm_s2_titulo', label: 'IFI IgM (S2) — Título', type: 'text' },
        resultadoSorologicoField('ifi_igg_s1', 'IFI — IgG (S1)'),
        { code: 'ifi_igg_s1_titulo', label: 'IFI IgG (S1) — Título', type: 'text' },
        resultadoSorologicoField('ifi_igg_s2', 'IFI — IgG (S2)'),
        { code: 'ifi_igg_s2_titulo', label: 'IFI IgG (S2) — Título', type: 'text' },
        { code: 'data_coleta_histopatologico', label: 'Data da Coleta do Histopatológico', type: 'date' },
        {
          code: 'resultado_histopatologico',
          label: 'Resultado do Histopatológico (biópsia/necrópsia)',
          type: 'code',
          options: [
            { code: '1', label: 'Positivo' },
            { code: '2', label: 'Negativo' },
            { code: '3', label: 'Não Realizado' },
            { code: '9', label: 'Ignorado' },
          ],
        },
      ],
    },
    {
      title: 'Tratamento',
      fields: [
        simNaoIgnField('tratamento_especifico', 'Tipo de Tratamento: Específico'),
        simNaoIgnField('tratamento_sintomatico', 'Tipo de Tratamento: Sintomático'),
        {
          code: 'droga_tratamento_especifico',
          label: 'Droga Utilizada no Tratamento Específico',
          type: 'code',
          visibleWhen: { fieldCode: 'tratamento_especifico', equals: ['1'] },
          options: [
            { code: '1', label: 'Benznidazol' },
            { code: '2', label: 'Outro' },
          ],
        },
        { code: 'tempo_tratamento_dias', label: 'Tempo de Tratamento (em dias)', type: 'number' },
      ],
    },
    {
      title: 'Medidas de Controle',
      fields: [
        {
          code: 'medida_controle_triatomideos',
          label: 'Medida Tomada: Controle de Triatomídeos',
          type: 'code',
          options: MEDIDA_OPTIONS,
        },
        {
          code: 'medida_fiscalizacao_sanitaria_hemoterapia',
          label: 'Medida Tomada: Fiscalização Sanitária em Unidade de Hemoterapia',
          type: 'code',
          options: MEDIDA_OPTIONS,
        },
        {
          code: 'medida_biosseguranca_laboratorio',
          label: 'Medida Tomada: Implantação de Normas de Biossegurança em Laboratório',
          type: 'code',
          options: MEDIDA_OPTIONS,
        },
        { code: 'medida_outras', label: 'Medida Tomada: Outros', type: 'code', options: MEDIDA_OPTIONS },
        { code: 'medida_outras_especifique', label: 'Outras Medidas, especifique', type: 'text', visibleWhen: { fieldCode: 'medida_outras', equals: ['1'] } },
      ],
    },
    {
      title: 'Conclusão',
      fields: [
        {
          code: 'classificacao_final',
          label: 'Classificação Final',
          type: 'code',
          options: [
            { code: '1', label: 'Confirmado' },
            { code: '2', label: 'Descartado' },
          ],
        },
        {
          code: 'criterio_confirmacao_descarte',
          label: 'Critério de Confirmação/Descarte',
          type: 'code',
          options: [
            { code: '1', label: 'Laboratório' },
            { code: '2', label: 'Clínico-Epidemiológico' },
            { code: '3', label: 'Clínico' },
          ],
        },
        {
          code: 'evolucao_caso',
          label: 'Evolução do Caso',
          type: 'code',
          options: [
            { code: '1', label: 'Vivo' },
            { code: '2', label: 'Óbito por D. Chagas Aguda' },
            { code: '3', label: 'Óbito por outras causas' },
            { code: '9', label: 'Ignorado' },
          ],
        },
        { code: 'data_obito', label: 'Data do Óbito', type: 'date', visibleWhen: { fieldCode: 'evolucao_caso', equals: ['2', '3'] } },
        {
          code: 'modo_provavel_infeccao',
          label: 'Modo Provável da Infecção',
          type: 'code',
          options: [
            { code: '1', label: 'Transfusional' },
            { code: '2', label: 'Vetorial' },
            { code: '3', label: 'Vertical' },
            { code: '4', label: 'Acidental' },
            { code: '5', label: 'Oral' },
            { code: '6', label: 'Outra' },
            { code: '9', label: 'Ignorada' },
          ],
        },
        {
          code: 'modo_provavel_infeccao_outra_especifique',
          label: 'Modo Provável da Infecção — Outra, especifique',
          type: 'text',
          visibleWhen: { fieldCode: 'modo_provavel_infeccao', equals: ['6'] },
        },
        {
          code: 'local_provavel_infeccao',
          label: 'Local Provável da Infecção (no período de 120 dias)',
          type: 'code',
          options: [
            { code: '1', label: 'Unidade de Hemoterapia' },
            { code: '2', label: 'Domicílio' },
            { code: '3', label: 'Laboratório' },
            { code: '4', label: 'Outro' },
            { code: '9', label: 'Ignorado' },
          ],
        },
        {
          code: 'caso_autoctone',
          label: 'O Caso é Autóctone do Município de Residência?',
          type: 'code',
          options: [
            { code: '1', label: 'Sim' },
            { code: '2', label: 'Não' },
            { code: '3', label: 'Indeterminado' },
          ],
        },
        { code: 'uf_provavel_infeccao', label: 'UF Provável da Infecção', type: 'text', maxLength: 2, visibleWhen: { fieldCode: 'caso_autoctone', equals: ['2'] } },
        { code: 'pais_provavel_infeccao', label: 'País Provável da Infecção', type: 'text', visibleWhen: { fieldCode: 'caso_autoctone', equals: ['2'] } },
        { code: 'municipio_provavel_infeccao', label: 'Município Provável da Infecção', type: 'text', visibleWhen: { fieldCode: 'caso_autoctone', equals: ['2'] } },
        { code: 'distrito_provavel_infeccao', label: 'Distrito Provável da Infecção', type: 'text', visibleWhen: { fieldCode: 'caso_autoctone', equals: ['2'] } },
        { code: 'bairro_provavel_infeccao', label: 'Bairro Provável da Infecção', type: 'text', visibleWhen: { fieldCode: 'caso_autoctone', equals: ['2'] } },
        simNaoIgnField('doenca_relacionada_trabalho', 'Doença Relacionada ao Trabalho'),
        { code: 'data_encerramento', label: 'Data do Encerramento', type: 'date' },
      ],
    },
    {
      title: 'Observações',
      fields: [{ code: 'observacoes', label: 'Observações', type: 'text' }],
    },
  ],
};

function resultadoSorologicoField(code: string, label: string) {
  return {
    code,
    label,
    type: 'code' as const,
    options: [
      { code: '1', label: 'Reagente' },
      { code: '2', label: 'Não-Reagente' },
      { code: '3', label: 'Inconclusivo' },
      { code: '4', label: 'Não Realizado' },
    ],
  };
}
