import type { SinanBodySchema } from '../types.js';
import { simNaoIgnField } from './shared-options.js';

/**
 * Campos 31-60 da ficha SINAN "Meningite" (Meningite_v5.pdf), extraídos do
 * texto/layout impresso do PDF-base campo a campo.
 *
 * REESCRITO em 2026-09-11, na revisão de fidelidade pós-Coqueluche: a versão
 * anterior (Lote 2, baseada só no inventário semântico do Emergency Care)
 * tinha 2 campos inventados que não existem na ficha real (`fotofobia`,
 * `agente_etiologico`), opções erradas em 3 campos que existem
 * (`aspecto_liquor`, classificação/etiologia, `criterio_confirmacao`), e
 * faltavam ~30 campos reais inteiros: vacinação detalhada (campo 33, 8
 * vacinas × sim/não + doses + data), doenças pré-existentes (34), dados de
 * contato epidemiológico (35-39), hospitalização (41-45), a grade completa
 * de resultados laboratoriais por tipo de exame × material (49), sorogrupo
 * (53), medidas de controle (54-57) e datas de evolução/encerramento
 * (59-60). Esta versão usa os campos/opções exatos do impresso, com código
 * de campo semântico (não o número oficial — decisão já registrada)
 * mapeado 1:1 ao campo real.
 */
export const MENINGITE_BODY_SCHEMA: SinanBodySchema = {
  schemaCode: 'MENINGITE',
  groups: [
    {
      title: 'Dados Complementares do Caso',
      fields: [
        { code: 'data_investigacao', label: 'Data da Investigação', type: 'date' },
        { code: 'ocupacao', label: 'Ocupação', type: 'text' },
      ],
    },
    {
      title: 'Antecedentes Epidemiológicos — Vacinação',
      fields: [
        simNaoIgnField('vacina_polissacaridica_ac', 'Vacina Polissacarídica A/C'),
        { code: 'vacina_polissacaridica_ac_doses', label: 'Polissacarídica A/C — Nº Doses', type: 'number', visibleWhen: { fieldCode: 'vacina_polissacaridica_ac', equals: ['1'] } },
        { code: 'vacina_polissacaridica_ac_data', label: 'Polissacarídica A/C — Data da Última Dose', type: 'date', visibleWhen: { fieldCode: 'vacina_polissacaridica_ac', equals: ['1'] } },
        simNaoIgnField('vacina_polissacaridica_bc', 'Vacina Polissacarídica B/C'),
        { code: 'vacina_polissacaridica_bc_doses', label: 'Polissacarídica B/C — Nº Doses', type: 'number', visibleWhen: { fieldCode: 'vacina_polissacaridica_bc', equals: ['1'] } },
        { code: 'vacina_polissacaridica_bc_data', label: 'Polissacarídica B/C — Data da Última Dose', type: 'date', visibleWhen: { fieldCode: 'vacina_polissacaridica_bc', equals: ['1'] } },
        simNaoIgnField('vacina_conjugada_meningo_c', 'Vacina Conjugada Meningo C'),
        { code: 'vacina_conjugada_meningo_c_doses', label: 'Conjugada Meningo C — Nº Doses', type: 'number', visibleWhen: { fieldCode: 'vacina_conjugada_meningo_c', equals: ['1'] } },
        { code: 'vacina_conjugada_meningo_c_data', label: 'Conjugada Meningo C — Data da Última Dose', type: 'date', visibleWhen: { fieldCode: 'vacina_conjugada_meningo_c', equals: ['1'] } },
        simNaoIgnField('vacina_bcg', 'Vacina BCG'),
        { code: 'vacina_bcg_doses', label: 'BCG — Nº Doses', type: 'number', visibleWhen: { fieldCode: 'vacina_bcg', equals: ['1'] } },
        { code: 'vacina_bcg_data', label: 'BCG — Data da Última Dose', type: 'date', visibleWhen: { fieldCode: 'vacina_bcg', equals: ['1'] } },
        simNaoIgnField('vacina_triplice', 'Vacina Tríplice'),
        { code: 'vacina_triplice_doses', label: 'Tríplice — Nº Doses', type: 'number', visibleWhen: { fieldCode: 'vacina_triplice', equals: ['1'] } },
        { code: 'vacina_triplice_data', label: 'Tríplice — Data da Última Dose', type: 'date', visibleWhen: { fieldCode: 'vacina_triplice', equals: ['1'] } },
        simNaoIgnField('vacina_hemofilo_hib', 'Vacina Hemófilo (Tetravalente ou Hib)'),
        { code: 'vacina_hemofilo_hib_doses', label: 'Hemófilo (Tetravalente/Hib) — Nº Doses', type: 'number', visibleWhen: { fieldCode: 'vacina_hemofilo_hib', equals: ['1'] } },
        { code: 'vacina_hemofilo_hib_data', label: 'Hemófilo (Tetravalente/Hib) — Data da Última Dose', type: 'date', visibleWhen: { fieldCode: 'vacina_hemofilo_hib', equals: ['1'] } },
        simNaoIgnField('vacina_pneumococo', 'Vacina Pneumococo'),
        { code: 'vacina_pneumococo_doses', label: 'Pneumococo — Nº Doses', type: 'number', visibleWhen: { fieldCode: 'vacina_pneumococo', equals: ['1'] } },
        { code: 'vacina_pneumococo_data', label: 'Pneumococo — Data da Última Dose', type: 'date', visibleWhen: { fieldCode: 'vacina_pneumococo', equals: ['1'] } },
        simNaoIgnField('vacina_outra', 'Outra Vacina'),
        { code: 'vacina_outra_especifique', label: 'Outra Vacina, especifique', type: 'text', visibleWhen: { fieldCode: 'vacina_outra', equals: ['1'] } },
        { code: 'vacina_outra_doses', label: 'Outra Vacina — Nº Doses', type: 'number', visibleWhen: { fieldCode: 'vacina_outra', equals: ['1'] } },
        { code: 'vacina_outra_data', label: 'Outra Vacina — Data da Última Dose', type: 'date', visibleWhen: { fieldCode: 'vacina_outra', equals: ['1'] } },
      ],
    },
    {
      title: 'Antecedentes Epidemiológicos — Doenças Pré-existentes',
      fields: [
        simNaoIgnField('doenca_preexistente_aids_hiv', 'Doença Pré-existente: AIDS/HIV+'),
        simNaoIgnField('doenca_preexistente_outras_imunodepressoras', 'Doença Pré-existente: Outras Doenças Imunodepressoras'),
        simNaoIgnField('doenca_preexistente_ira', 'Doença Pré-existente: IRA'),
        simNaoIgnField('doenca_preexistente_tuberculose', 'Doença Pré-existente: Tuberculose'),
        simNaoIgnField('doenca_preexistente_traumatismo', 'Doença Pré-existente: Traumatismo'),
        simNaoIgnField('doenca_preexistente_infeccao_hospitalar', 'Doença Pré-existente: Infecção Hospitalar'),
        simNaoIgnField('doenca_preexistente_outra', 'Outra Doença Pré-existente'),
        {
          code: 'doenca_preexistente_outra_especifique',
          label: 'Outra Doença Pré-existente, especifique',
          type: 'text',
          visibleWhen: { fieldCode: 'doenca_preexistente_outra', equals: ['1'] },
        },
      ],
    },
    {
      title: 'Antecedentes Epidemiológicos — Contato',
      fields: [
        {
          code: 'contato_caso_suspeito_confirmado',
          label: 'Contato com Caso Suspeito ou Confirmado de Meningite (até 15 dias antes do início dos sintomas)',
          type: 'code',
          options: [
            { code: '1', label: 'Domicílio' },
            { code: '2', label: 'Vizinhança' },
            { code: '3', label: 'Trabalho' },
            { code: '4', label: 'Creche/Escola' },
            { code: '5', label: 'Posto de Saúde/Hospital' },
            { code: '6', label: 'Outro Estado/Município' },
            { code: '7', label: 'Sem História de Contato' },
            { code: '8', label: 'Outro país' },
            { code: '9', label: 'Ignorado' },
          ],
        },
        { code: 'nome_contato', label: 'Nome do Contato', type: 'text' },
        { code: 'telefone_contato', label: '(DDD) Telefone do Contato', type: 'text' },
        { code: 'endereco_contato', label: 'Endereço do Contato (Rua, Av., Apto., Bairro, Localidade, etc)', type: 'text' },
        simNaoIgnField('caso_secundario', 'Caso Secundário'),
      ],
    },
    {
      title: 'Dados Clínicos — Sinais e Sintomas',
      fields: [
        simNaoIgnField('sintoma_cefaleia', 'Cefaléia'),
        simNaoIgnField('sintoma_vomitos', 'Vômitos'),
        simNaoIgnField('sintoma_rigidez_nuca', 'Rigidez de Nuca'),
        simNaoIgnField('sintoma_abaulamento_fontanela', 'Abaulamento de Fontanela'),
        simNaoIgnField('sintoma_petequias_sufusoes_hemorragicas', 'Petequias/Sufusões Hemorrágicas'),
        simNaoIgnField('sintoma_febre', 'Febre'),
        simNaoIgnField('sintoma_convulsoes', 'Convulsões'),
        simNaoIgnField('sintoma_kernig_brudzinski', 'Kernig/Brudzinski'),
        simNaoIgnField('sintoma_coma', 'Coma'),
        simNaoIgnField('sintoma_outros', 'Outros Sinais e Sintomas'),
        {
          code: 'sintoma_outros_especifique',
          label: 'Outros Sinais e Sintomas, especifique',
          type: 'text',
          visibleWhen: { fieldCode: 'sintoma_outros', equals: ['1'] },
        },
      ],
    },
    {
      title: 'Atendimento',
      fields: [
        simNaoIgnField('ocorreu_hospitalizacao', 'Ocorreu Hospitalização'),
        { code: 'data_internacao', label: 'Data da Internação', type: 'date', visibleWhen: { fieldCode: 'ocorreu_hospitalizacao', equals: ['1'] } },
        { code: 'uf_hospital', label: 'UF do Hospital', type: 'text', maxLength: 2, visibleWhen: { fieldCode: 'ocorreu_hospitalizacao', equals: ['1'] } },
        { code: 'municipio_hospital', label: 'Município do Hospital', type: 'text', visibleWhen: { fieldCode: 'ocorreu_hospitalizacao', equals: ['1'] } },
        { code: 'nome_hospital', label: 'Nome do Hospital', type: 'text', visibleWhen: { fieldCode: 'ocorreu_hospitalizacao', equals: ['1'] } },
      ],
    },
    {
      title: 'Dados do Laboratório — Punção Lombar',
      fields: [
        simNaoIgnField('puncao_lombar', 'Punção Lombar'),
        { code: 'data_puncao', label: 'Data da Punção', type: 'date' },
        {
          code: 'aspecto_liquor',
          label: 'Aspecto do Líquor',
          type: 'code',
          options: [
            { code: '1', label: 'Límpido' },
            { code: '2', label: 'Purulento' },
            { code: '3', label: 'Hemorrágico' },
            { code: '4', label: 'Turvo' },
            { code: '5', label: 'Xantocrômico' },
            { code: '6', label: 'Outro' },
            { code: '9', label: 'Ignorado' },
          ],
        },
      ],
    },
    {
      title: 'Dados do Laboratório — Resultados Laboratoriais',
      fields: [
        { code: 'lab_cultura_liquor', label: 'Cultura — Líquor', type: 'text' },
        { code: 'lab_cultura_lesao_petequial', label: 'Cultura — Lesão Petequial', type: 'text' },
        { code: 'lab_cultura_sangue_soro', label: 'Cultura — Sangue/Soro', type: 'text' },
        { code: 'lab_cultura_escarro', label: 'Cultura — Escarro', type: 'text' },
        { code: 'lab_cie_liquor', label: 'CIE — Líquor', type: 'text' },
        { code: 'lab_cie_sangue_soro', label: 'CIE — Sangue/Soro', type: 'text' },
        { code: 'lab_pcr_liquor', label: 'PCR — Líquor', type: 'text' },
        { code: 'lab_pcr_lesao_petequial', label: 'PCR — Lesão Petequial', type: 'text' },
        { code: 'lab_pcr_sangue_soro', label: 'PCR — Sangue/Soro', type: 'text' },
        { code: 'lab_pcr_escarro', label: 'PCR — Escarro', type: 'text' },
        { code: 'lab_aglutinacao_latex_liquor', label: 'Aglutinação pelo Látex — Líquor', type: 'text' },
        { code: 'lab_aglutinacao_latex_sangue_soro', label: 'Aglutinação pelo Látex — Sangue/Soro', type: 'text' },
        { code: 'lab_bacterioscopia_liquor', label: 'Bacterioscopia — Líquor', type: 'text' },
        { code: 'lab_bacterioscopia_lesao_petequial', label: 'Bacterioscopia — Lesão Petequial', type: 'text' },
        { code: 'lab_bacterioscopia_sangue_soro', label: 'Bacterioscopia — Sangue/Soro', type: 'text' },
        { code: 'lab_bacterioscopia_escarro', label: 'Bacterioscopia — Escarro', type: 'text' },
        { code: 'lab_isolamento_viral_liquor', label: 'Isolamento Viral — Líquor', type: 'text' },
        { code: 'lab_isolamento_viral_fezes', label: 'Isolamento Viral — Fezes', type: 'text' },
      ],
    },
    {
      title: 'Classificação do Caso / Etiologia',
      fields: [
        {
          code: 'classificacao_caso',
          label: 'Classificação do Caso',
          type: 'code',
          options: [
            { code: '1', label: 'Confirmado' },
            { code: '2', label: 'Descartado' },
          ],
        },
        {
          code: 'especifique_confirmado',
          label: 'Se Confirmado, Especifique',
          type: 'code',
          visibleWhen: { fieldCode: 'classificacao_caso', equals: ['1'] },
          options: [
            { code: '1', label: 'Meningococemia' },
            { code: '2', label: 'Meningite Meningocócica' },
            { code: '3', label: 'Meningite Meningocócica com Meningococemia' },
            { code: '4', label: 'Meningite Tuberculosa' },
            { code: '5', label: 'Meningite por outras bactérias' },
            { code: '6', label: 'Meningite não especificada' },
            { code: '7', label: 'Meningite Asséptica' },
            { code: '8', label: 'Meningite de outra etiologia' },
            { code: '9', label: 'Meningite por Hemófilo' },
            { code: '10', label: 'Meningite por Pneumococos' },
          ],
        },
        {
          code: 'criterio_confirmacao',
          label: 'Critério de Confirmação',
          type: 'code',
          options: [
            { code: '1', label: 'Cultura' },
            { code: '2', label: 'CIE' },
            { code: '3', label: 'Ag. Látex' },
            { code: '4', label: 'Clínico' },
            { code: '5', label: 'Bacterioscopia' },
            { code: '6', label: 'Quimiocitológico do líquor' },
            { code: '7', label: 'Clínico-epidemiológico' },
            { code: '8', label: 'Isolamento viral' },
            { code: '9', label: 'PCR' },
            { code: '10', label: 'Outros' },
          ],
        },
        { code: 'sorogrupo_n_meningitidis', label: 'Se N. meningitidis, Especificar Sorogrupo', type: 'text' },
      ],
    },
    {
      title: 'Medidas de Controle',
      fields: [
        { code: 'numero_comunicantes', label: 'Número de Comunicantes', type: 'number' },
        simNaoIgnField('quimioprofilaxia_comunicantes', 'Realizada Quimioprofilaxia dos Comunicantes?'),
        { code: 'data_quimioprofilaxia', label: 'Se Sim, Data', type: 'date', visibleWhen: { fieldCode: 'quimioprofilaxia_comunicantes', equals: ['1'] } },
        simNaoIgnField('doenca_relacionada_trabalho', 'Doença Relacionada ao Trabalho'),
      ],
    },
    {
      title: 'Conclusão',
      fields: [
        {
          code: 'evolucao_caso',
          label: 'Evolução do Caso',
          type: 'code',
          options: [
            { code: '1', label: 'Alta' },
            { code: '2', label: 'Óbito por meningite' },
            { code: '3', label: 'Óbito por outra causa' },
            { code: '9', label: 'Ignorado' },
          ],
        },
        { code: 'data_evolucao', label: 'Data da Evolução', type: 'date' },
        { code: 'data_encerramento', label: 'Data do Encerramento', type: 'date' },
      ],
    },
    {
      title: 'Informações Complementares e Observações',
      fields: [
        { code: 'quimiocitologico_hemacias', label: 'Exame Quimiocitológico — Hemácias (mm³)', type: 'text' },
        { code: 'quimiocitologico_leucocitos', label: 'Exame Quimiocitológico — Leucócitos (mm³)', type: 'text' },
        { code: 'quimiocitologico_monocitos', label: 'Exame Quimiocitológico — Monócitos (%)', type: 'text' },
        { code: 'quimiocitologico_neutrofilos', label: 'Exame Quimiocitológico — Neutrófilos (%)', type: 'text' },
        { code: 'quimiocitologico_eosinofilos', label: 'Exame Quimiocitológico — Eosinófilos (%)', type: 'text' },
        { code: 'quimiocitologico_linfocitos', label: 'Exame Quimiocitológico — Linfócitos (%)', type: 'text' },
        { code: 'quimiocitologico_glicose', label: 'Exame Quimiocitológico — Glicose (mg)', type: 'text' },
        { code: 'quimiocitologico_proteinas', label: 'Exame Quimiocitológico — Proteínas (mg)', type: 'text' },
        { code: 'quimiocitologico_cloreto', label: 'Exame Quimiocitológico — Cloreto (mg)', type: 'text' },
        { code: 'observacoes_adicionais', label: 'Observações Adicionais', type: 'text' },
      ],
    },
  ],
};
