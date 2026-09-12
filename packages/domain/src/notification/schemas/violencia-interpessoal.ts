import type { SinanBodySchema } from '../types.js';
import { simNaoIgnField } from './shared-options.js';

/**
 * Campos 33-69 da ficha SINAN "Violência Interpessoal/Autoprovocada"
 * (violencia_v5.pdf, revisão 15/06/2015), extraídos do texto/layout
 * impresso do PDF-base campo a campo. Nesta ficha o cabeçalho de
 * identificação vai até o campo 32 (não 30 como nas demais), então os
 * "Dados Complementares" começam no campo 33.
 *
 * REESCRITO em 2026-09-11, na revisão de fidelidade pós-Dengue/
 * Chikungunya/Tuberculose/Raiva Humana/Febre Amarela/Hepatites Virais/
 * Leptospirose/Chagas/Malária/Sarampo/Meningite/Coqueluche — última doença
 * da Trilha 1, a ficha mais extensa: a versão anterior (Lote 4) tinha 8
 * grupos e ~60 campos, mas com estrutura substancialmente diferente da
 * ficha real. `tipo_violencia_autoprovocada` não existe como item do
 * checklist de tipo de violência — "a lesão foi autoprovocada?" é um campo
 * próprio (54), independente. `violencia_sexual_atentado_pudor` não existe
 * (crime removido da legislação brasileira em 2009, substituído pelo
 * conceito ampliado de estupro; não consta na ficha). `vinculo_agressor`
 * estava modelado como seleção única — a ficha real (61) é um checklist de
 * 18 vínculos possíveis (podem ser marcados vários, já que pode haver mais
 * de um agressor). Faltavam campos inteiros: dados da pessoa atendida —
 * nome social, situação conjugal, orientação sexual, identidade de gênero,
 * deficiência/transtorno (33-39); dados completos da ocorrência — UF/
 * município/distrito/bairro/logradouro/zona/hora (40-51); motivação da
 * violência com 11 opções, incluindo discriminação por sexismo/homofobia/
 * racismo/xenofobia (55); procedimentos realizados em violência sexual —
 * profilaxias, coletas, contracepção de emergência, aborto previsto em lei
 * (59); ciclo de vida e suspeita de uso de álcool do provável autor
 * (63-64); violência relacionada ao trabalho e CAT (66-67); circunstância
 * da lesão por CID-10 capítulo XX (68). O grupo de encaminhamentos também
 * estava incompleto (faltavam Delegacia de Atendimento à Mulher, Delegacia
 * de Atendimento ao Idoso, Conselho do Idoso, Centro de Referência dos
 * Direitos Humanos, Defensoria Pública, Justiça da Infância e Juventude —
 * a ficha real tem 14 itens, a v1 tinha 9). `evolucaoCasoField()` genérico
 * foi removido — esta ficha não tem campo de evolução clínica, só data de
 * encerramento.
 */
export const VIOLENCIA_INTERPESSOAL_BODY_SCHEMA: SinanBodySchema = {
  schemaCode: 'VIOLENCIA_INTERPESSOAL',
  groups: [
    {
      title: 'Dados da Pessoa Atendida',
      fields: [
        { code: 'nome_social', label: 'Nome Social', type: 'text' },
        { code: 'ocupacao', label: 'Ocupação', type: 'text' },
        {
          code: 'situacao_conjugal',
          label: 'Situação Conjugal/Estado Civil',
          type: 'code',
          options: [
            { code: '1', label: 'Solteiro' },
            { code: '2', label: 'Casado/União Consensual' },
            { code: '3', label: 'Viúvo' },
            { code: '4', label: 'Separado' },
            { code: '8', label: 'Não se aplica' },
            { code: '9', label: 'Ignorado' },
          ],
        },
        {
          code: 'orientacao_sexual',
          label: 'Orientação Sexual',
          type: 'code',
          options: [
            { code: '1', label: 'Heterossexual' },
            { code: '2', label: 'Homossexual (gay/lésbica)' },
            { code: '3', label: 'Bissexual' },
            { code: '8', label: 'Não se aplica' },
            { code: '9', label: 'Ignorado' },
          ],
        },
        {
          code: 'identidade_genero',
          label: 'Identidade de Gênero',
          type: 'code',
          options: [
            { code: '1', label: 'Travesti' },
            { code: '2', label: 'Mulher Transexual' },
            { code: '3', label: 'Homem Transexual' },
            { code: '8', label: 'Não se aplica' },
            { code: '9', label: 'Ignorado' },
          ],
        },
        simNaoIgnField('possui_deficiencia_transtorno', 'Possui Algum Tipo de Deficiência/Transtorno?'),
        naoSeAplicaField('deficiencia_fisica', 'Tipo: Deficiência Física', { fieldCode: 'possui_deficiencia_transtorno', equals: ['1'] }),
        naoSeAplicaField('deficiencia_intelectual', 'Tipo: Deficiência Intelectual', { fieldCode: 'possui_deficiencia_transtorno', equals: ['1'] }),
        naoSeAplicaField('deficiencia_auditiva', 'Tipo: Deficiência Auditiva', { fieldCode: 'possui_deficiencia_transtorno', equals: ['1'] }),
        naoSeAplicaField('deficiencia_visual', 'Tipo: Deficiência Visual', { fieldCode: 'possui_deficiencia_transtorno', equals: ['1'] }),
        naoSeAplicaField('transtorno_mental', 'Tipo: Transtorno Mental', { fieldCode: 'possui_deficiencia_transtorno', equals: ['1'] }),
        naoSeAplicaField('transtorno_comportamento', 'Tipo: Transtorno de Comportamento', { fieldCode: 'possui_deficiencia_transtorno', equals: ['1'] }),
        naoSeAplicaField('deficiencia_outras', 'Tipo: Outras', { fieldCode: 'possui_deficiencia_transtorno', equals: ['1'] }),
        { code: 'deficiencia_outras_especifique', label: 'Outras, especifique', type: 'text', visibleWhen: { fieldCode: 'deficiencia_outras', equals: ['1'] } },
      ],
    },
    {
      title: 'Dados da Ocorrência',
      fields: [
        { code: 'uf_ocorrencia', label: 'UF da Ocorrência', type: 'text', maxLength: 2 },
        { code: 'municipio_ocorrencia', label: 'Município da Ocorrência', type: 'text' },
        { code: 'distrito_ocorrencia', label: 'Distrito', type: 'text' },
        { code: 'bairro_ocorrencia', label: 'Bairro', type: 'text' },
        { code: 'logradouro_ocorrencia', label: 'Logradouro (rua, avenida, ...)', type: 'text' },
        { code: 'numero_ocorrencia', label: 'Número', type: 'text' },
        { code: 'complemento_ocorrencia', label: 'Complemento (apto., casa, ...)', type: 'text' },
        { code: 'ponto_referencia_ocorrencia', label: 'Ponto de Referência', type: 'text' },
        {
          code: 'zona_ocorrencia',
          label: 'Zona',
          type: 'code',
          options: [
            { code: '1', label: 'Urbana' },
            { code: '2', label: 'Rural' },
            { code: '3', label: 'Periurbana' },
            { code: '9', label: 'Ignorado' },
          ],
        },
        { code: 'hora_ocorrencia', label: 'Hora da Ocorrência (00:00 - 23:59 horas)', type: 'text', maxLength: 5 },
        {
          code: 'local_ocorrencia',
          label: 'Local de Ocorrência',
          type: 'code',
          options: [
            { code: '01', label: 'Residência' },
            { code: '02', label: 'Habitação Coletiva' },
            { code: '03', label: 'Escola' },
            { code: '04', label: 'Local de Prática Esportiva' },
            { code: '05', label: 'Bar ou Similar' },
            { code: '06', label: 'Via Pública' },
            { code: '07', label: 'Comércio/Serviços' },
            { code: '08', label: 'Indústrias/Construção' },
            { code: '09', label: 'Outro' },
            { code: '99', label: 'Ignorado' },
          ],
        },
        simNaoIgnField('ocorreu_outras_vezes', 'Ocorreu Outras Vezes?'),
        simNaoIgnField('lesao_autoprovocada', 'A Lesão foi Autoprovocada?'),
      ],
    },
    {
      title: 'Contexto da Violência',
      fields: [
        {
          code: 'motivacao_violencia',
          label: 'Essa Violência foi Motivada por',
          type: 'code',
          options: [
            { code: '01', label: 'Sexismo' },
            { code: '02', label: 'Homofobia/Lesbofobia/Bifobia/Transfobia' },
            { code: '03', label: 'Racismo' },
            { code: '04', label: 'Intolerância Religiosa' },
            { code: '05', label: 'Xenofobia' },
            { code: '06', label: 'Conflito Geracional' },
            { code: '07', label: 'Situação de Rua' },
            { code: '08', label: 'Deficiência' },
            { code: '09', label: 'Outros' },
            { code: '88', label: 'Não se aplica' },
            { code: '99', label: 'Ignorado' },
          ],
        },
        { code: 'motivacao_violencia_outros_especifique', label: 'Outros, especifique', type: 'text', visibleWhen: { fieldCode: 'motivacao_violencia', equals: ['09'] } },
      ],
    },
    {
      title: 'Tipo de Violência',
      fields: [
        simNaoIgnField('tipo_violencia_fisica', 'Física'),
        simNaoIgnField('tipo_violencia_psicologica_moral', 'Psicológica/Moral'),
        simNaoIgnField('tipo_violencia_tortura', 'Tortura'),
        simNaoIgnField('tipo_violencia_sexual', 'Sexual'),
        simNaoIgnField('tipo_violencia_trafico_pessoas', 'Tráfico de Seres Humanos'),
        simNaoIgnField('tipo_violencia_financeira_economica', 'Financeira/Econômica'),
        simNaoIgnField('tipo_violencia_intervencao_legal', 'Intervenção Legal'),
        simNaoIgnField('tipo_violencia_negligencia_abandono', 'Negligência/Abandono'),
        simNaoIgnField('tipo_violencia_trabalho_infantil', 'Trabalho Infantil'),
        simNaoIgnField('tipo_violencia_outros', 'Outros'),
        { code: 'tipo_violencia_outros_especifique', label: 'Outros, especifique', type: 'text', visibleWhen: { fieldCode: 'tipo_violencia_outros', equals: ['1'] } },
      ],
    },
    {
      title: 'Meio de Agressão',
      fields: [
        simNaoIgnField('meio_forca_corporal_espancamento', 'Força Corporal/Espancamento'),
        simNaoIgnField('meio_enforcamento', 'Enforcamento'),
        simNaoIgnField('meio_objeto_contundente', 'Objeto Contundente'),
        simNaoIgnField('meio_objeto_perfurocortante', 'Objeto Perfurocortante'),
        simNaoIgnField('meio_arma_fogo', 'Arma de Fogo'),
        simNaoIgnField('meio_substancia_objeto_quente', 'Substância/Objeto Quente'),
        simNaoIgnField('meio_envenenamento_intoxicacao', 'Envenenamento/Intoxicação'),
        simNaoIgnField('meio_ameaca', 'Ameaça'),
        simNaoIgnField('meio_outro', 'Outro'),
        { code: 'meio_outro_especifique', label: 'Outro, especifique', type: 'text', visibleWhen: { fieldCode: 'meio_outro', equals: ['1'] } },
      ],
    },
    {
      title: 'Violência Sexual',
      fields: [
        naoSeAplicaField('violencia_sexual_assedio', 'Assédio Sexual', { fieldCode: 'tipo_violencia_sexual', equals: ['1'] }),
        naoSeAplicaField('violencia_sexual_estupro', 'Estupro', { fieldCode: 'tipo_violencia_sexual', equals: ['1'] }),
        naoSeAplicaField('violencia_sexual_pornografia_infantil', 'Pornografia Infantil', { fieldCode: 'tipo_violencia_sexual', equals: ['1'] }),
        naoSeAplicaField('violencia_sexual_exploracao', 'Exploração Sexual', { fieldCode: 'tipo_violencia_sexual', equals: ['1'] }),
        naoSeAplicaField('violencia_sexual_outras', 'Outras', { fieldCode: 'tipo_violencia_sexual', equals: ['1'] }),
        { code: 'violencia_sexual_outras_especifique', label: 'Outras, especifique', type: 'text', visibleWhen: { fieldCode: 'violencia_sexual_outras', equals: ['1'] } },
      ],
    },
    {
      title: 'Procedimentos Realizados',
      fields: [
        naoSeAplicaField('procedimento_profilaxia_dst', 'Profilaxia DST', { fieldCode: 'tipo_violencia_sexual', equals: ['1'] }),
        naoSeAplicaField('procedimento_profilaxia_hiv', 'Profilaxia HIV', { fieldCode: 'tipo_violencia_sexual', equals: ['1'] }),
        naoSeAplicaField('procedimento_profilaxia_hepatite_b', 'Profilaxia Hepatite B', { fieldCode: 'tipo_violencia_sexual', equals: ['1'] }),
        naoSeAplicaField('procedimento_coleta_sangue', 'Coleta de Sangue', { fieldCode: 'tipo_violencia_sexual', equals: ['1'] }),
        naoSeAplicaField('procedimento_coleta_semen', 'Coleta de Sêmen', { fieldCode: 'tipo_violencia_sexual', equals: ['1'] }),
        naoSeAplicaField('procedimento_coleta_secrecao_vaginal', 'Coleta de Secreção Vaginal', { fieldCode: 'tipo_violencia_sexual', equals: ['1'] }),
        naoSeAplicaField('procedimento_contracepcao_emergencia', 'Contracepção de Emergência', { fieldCode: 'tipo_violencia_sexual', equals: ['1'] }),
        naoSeAplicaField('procedimento_aborto_previsto_lei', 'Aborto Previsto em Lei', { fieldCode: 'tipo_violencia_sexual', equals: ['1'] }),
      ],
    },
    {
      title: 'Dados do Provável Autor da Violência',
      fields: [
        {
          code: 'numero_envolvidos',
          label: 'Número de Envolvidos',
          type: 'code',
          options: [
            { code: '1', label: 'Um' },
            { code: '2', label: 'Dois ou mais' },
            { code: '9', label: 'Ignorado' },
          ],
        },
        simNaoIgnField('vinculo_pai', 'Vínculo: Pai'),
        simNaoIgnField('vinculo_mae', 'Vínculo: Mãe'),
        simNaoIgnField('vinculo_padrasto', 'Vínculo: Padrasto'),
        simNaoIgnField('vinculo_madrasta', 'Vínculo: Madrasta'),
        simNaoIgnField('vinculo_conjuge', 'Vínculo: Cônjuge'),
        simNaoIgnField('vinculo_ex_conjuge', 'Vínculo: Ex-Cônjuge'),
        simNaoIgnField('vinculo_namorado', 'Vínculo: Namorado(a)'),
        simNaoIgnField('vinculo_ex_namorado', 'Vínculo: Ex-Namorado(a)'),
        simNaoIgnField('vinculo_filho', 'Vínculo: Filho(a)'),
        simNaoIgnField('vinculo_irmao', 'Vínculo: Irmão(ã)'),
        simNaoIgnField('vinculo_amigos_conhecidos', 'Vínculo: Amigos/Conhecidos'),
        simNaoIgnField('vinculo_desconhecido', 'Vínculo: Desconhecido(a)'),
        simNaoIgnField('vinculo_cuidador', 'Vínculo: Cuidador(a)'),
        simNaoIgnField('vinculo_patrao_chefe', 'Vínculo: Patrão/Chefe'),
        simNaoIgnField('vinculo_policial_agente_lei', 'Vínculo: Policial/Agente da Lei'),
        simNaoIgnField('vinculo_propria_pessoa', 'Vínculo: Própria Pessoa'),
        simNaoIgnField('vinculo_pessoa_relacao_institucional', 'Vínculo: Pessoa com Relação Institucional'),
        simNaoIgnField('vinculo_outros', 'Vínculo: Outros'),
        { code: 'vinculo_outros_especifique', label: 'Vínculo: Outros, especifique', type: 'text', visibleWhen: { fieldCode: 'vinculo_outros', equals: ['1'] } },
        {
          code: 'sexo_provavel_autor',
          label: 'Sexo do Provável Autor da Violência',
          type: 'code',
          options: [
            { code: '1', label: 'Masculino' },
            { code: '2', label: 'Feminino' },
            { code: '3', label: 'Ambos os sexos' },
            { code: '9', label: 'Ignorado' },
          ],
        },
        simNaoIgnField('suspeita_uso_alcool_autor', 'Suspeita de Uso de Álcool'),
        {
          code: 'ciclo_vida_provavel_autor',
          label: 'Ciclo de Vida do Provável Autor da Violência',
          type: 'code',
          options: [
            { code: '1', label: 'Criança (0 a 9 anos)' },
            { code: '2', label: 'Adolescente (10 a 19 anos)' },
            { code: '3', label: 'Jovem (20 a 24 anos)' },
            { code: '4', label: 'Pessoa adulta (25 a 59 anos)' },
            { code: '5', label: 'Pessoa idosa (60 anos ou mais)' },
            { code: '9', label: 'Ignorado' },
          ],
        },
      ],
    },
    {
      title: 'Encaminhamento',
      fields: [
        simNaoIgnField('encaminhamento_rede_saude', 'Rede da Saúde (Unidade Básica de Saúde, hospital, outras)'),
        simNaoIgnField('encaminhamento_rede_assistencia_social', 'Rede da Assistência Social (CRAS, CREAS, outras)'),
        simNaoIgnField('encaminhamento_rede_educacao', 'Rede da Educação (Creche, escola, outras)'),
        simNaoIgnField('encaminhamento_rede_atendimento_mulher', 'Rede de Atendimento à Mulher (Centro Especializado, Casa da Mulher Brasileira, outras)'),
        simNaoIgnField('encaminhamento_conselho_tutelar', 'Conselho Tutelar'),
        simNaoIgnField('encaminhamento_conselho_idoso', 'Conselho do Idoso'),
        simNaoIgnField('encaminhamento_centro_referencia_direitos_humanos', 'Centro de Referência dos Direitos Humanos'),
        simNaoIgnField('encaminhamento_ministerio_publico', 'Ministério Público'),
        simNaoIgnField('encaminhamento_delegacia_atendimento_mulher', 'Delegacia de Atendimento à Mulher'),
        simNaoIgnField('encaminhamento_delegacia_protecao_crianca_adolescente', 'Delegacia Especializada de Proteção à Criança e Adolescente'),
        simNaoIgnField('encaminhamento_delegacia_atendimento_idoso', 'Delegacia de Atendimento ao Idoso'),
        simNaoIgnField('encaminhamento_outras_delegacias', 'Outras Delegacias'),
        simNaoIgnField('encaminhamento_defensoria_publica', 'Defensoria Pública'),
        simNaoIgnField('encaminhamento_justica_infancia_juventude', 'Justiça da Infância e da Juventude'),
      ],
    },
    {
      title: 'Dados Finais',
      fields: [
        simNaoIgnField('violencia_relacionada_trabalho', 'Violência Relacionada ao Trabalho'),
        naoSeAplicaField('emitida_cat', 'Se Sim, foi Emitida a Comunicação de Acidente do Trabalho (CAT)', { fieldCode: 'violencia_relacionada_trabalho', equals: ['1'] }),
        { code: 'circunstancia_lesao_cid', label: 'Circunstância da Lesão (CID-10 Capítulo XX)', type: 'text' },
        { code: 'data_encerramento', label: 'Data de Encerramento', type: 'date' },
      ],
    },
    {
      title: 'Informações Complementares e Observações',
      fields: [
        { code: 'nome_acompanhante', label: 'Nome do Acompanhante', type: 'text' },
        { code: 'vinculo_acompanhante', label: 'Vínculo/Grau de Parentesco (Acompanhante)', type: 'text' },
        { code: 'telefone_acompanhante', label: '(DDD) Telefone do Acompanhante', type: 'text' },
        { code: 'observacoes_adicionais', label: 'Observações Adicionais', type: 'text', maxLength: 4000 },
      ],
    },
  ],
};

function naoSeAplicaField(code: string, label: string, visibleWhen?: { fieldCode: string; equals: readonly string[] }) {
  return {
    code,
    label,
    type: 'code' as const,
    options: [
      { code: '1', label: 'Sim' },
      { code: '2', label: 'Não' },
      { code: '8', label: 'Não se aplica' },
      { code: '9', label: 'Ignorado' },
    ],
    ...(visibleWhen ? { visibleWhen } : {}),
  };
}
