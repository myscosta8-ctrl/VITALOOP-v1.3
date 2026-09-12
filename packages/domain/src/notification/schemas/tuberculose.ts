import type { SinanBodySchema } from '../types.js';
import { simNaoIgnField } from './shared-options.js';

/**
 * Campos 31-47 da ficha SINAN "Notificação/Investigação Tuberculose"
 * (Tuberculose_v5.pdf, revisão 02/10/2014), extraídos do texto/layout
 * impresso do PDF-base campo a campo.
 *
 * REESCRITO em 2026-09-11, na revisão de fidelidade pós-Raiva Humana/Febre
 * Amarela/Hepatites Virais/Leptospirose/Chagas/Malária/Sarampo/Meningite/
 * Coqueluche: a versão anterior (Lote 3) tinha um grupo "Desfecho" com
 * `evolucao_caso` (Cura/Abandono/Óbito por TB/etc.) e um campo `tdo_
 * tratamento_diretamente_observado` que **não existem nesta ficha** — a
 * revisão de 2014 da ficha de TB é de página única e cobre só notificação/
 * investigação; evolução do caso é rastreada num módulo de acompanhamento
 * separado, fora deste impresso. `populacoes_especiais` também estava
 * errado como campo de seleção única (Nenhuma/Privado de Liberdade/
 * População em Situação de Rua/Imigrante/Indígena) — a ficha real é um
 * checklist de 4 itens (Privado de Liberdade, Profissional de Saúde,
 * População em Situação de Rua, Imigrante — sem "Indígena", com
 * "Profissional de Saúde" que a v1 não tinha). `tipo_entrada` tinha a ordem/
 * códigos errados (a v1 tinha 4-Transferência/5-Pós-óbito/6-Não Sabe; o
 * real é 4-Não Sabe/5-Transferência/6-Pós-óbito). `localizacao_
 * extrapulmonar` tinha opções incompletas (faltava Cutânea e Laríngea,
 * "Meníngea" no lugar do real "Meningoencefálico"). `trm_tb` tinha opções
 * erradas — faltava a distinção crítica de resistência à Rifampicina
 * (Detectável Sensível vs. Detectável Resistente), central pra vigilância
 * de TB-MDR. Faltavam campos inteiros: beneficiário de programa de
 * transferência de renda (34), radiografia do tórax (39), terapia
 * antirretroviral durante o tratamento (41), histopatologia (42), teste de
 * sensibilidade com as 7 opções reais (45), data de início do tratamento
 * atual (46), total de contatos identificados (47). O checklist de doenças
 * associadas também não tinha a opção "Outras" com especificação.
 */
export const TUBERCULOSE_BODY_SCHEMA: SinanBodySchema = {
  schemaCode: 'TUBERCULOSE',
  groups: [
    {
      title: 'Dados Complementares do Caso',
      fields: [
        { code: 'numero_prontuario', label: 'Nº do Prontuário', type: 'text' },
        {
          code: 'tipo_entrada',
          label: 'Tipo de Entrada',
          type: 'code',
          options: [
            { code: '1', label: 'Caso Novo' },
            { code: '2', label: 'Recidiva' },
            { code: '3', label: 'Reingresso Após Abandono' },
            { code: '4', label: 'Não Sabe' },
            { code: '5', label: 'Transferência' },
            { code: '6', label: 'Pós-óbito' },
          ],
        },
      ],
    },
    {
      title: 'Populações Especiais e Programas',
      fields: [
        simNaoIgnField('populacao_privada_liberdade', 'População Privada de Liberdade'),
        simNaoIgnField('profissional_saude', 'Profissional de Saúde'),
        simNaoIgnField('populacao_situacao_rua', 'População em Situação de Rua'),
        simNaoIgnField('imigrante', 'Imigrante'),
        simNaoIgnField('beneficiario_transferencia_renda', 'Beneficiário de Programa de Transferência de Renda do Governo'),
      ],
    },
    {
      title: 'Dados Clínicos',
      fields: [
        {
          code: 'forma_clinica',
          label: 'Forma',
          type: 'code',
          options: [
            { code: '1', label: 'Pulmonar' },
            { code: '2', label: 'Extrapulmonar' },
            { code: '3', label: 'Pulmonar + Extrapulmonar' },
          ],
        },
        {
          code: 'localizacao_extrapulmonar',
          label: 'Se Extrapulmonar',
          type: 'code',
          visibleWhen: { fieldCode: 'forma_clinica', equals: ['2', '3'] },
          options: [
            { code: '1', label: 'Pleural' },
            { code: '2', label: 'Ganglionar Periférica' },
            { code: '3', label: 'Geniturinária' },
            { code: '4', label: 'Óssea' },
            { code: '5', label: 'Ocular' },
            { code: '6', label: 'Miliar' },
            { code: '7', label: 'Meningoencefálico' },
            { code: '8', label: 'Cutânea' },
            { code: '9', label: 'Laríngea' },
            { code: '10', label: 'Outra' },
          ],
        },
      ],
    },
    {
      title: 'Doenças e Agravos Associados',
      fields: [
        simNaoIgnField('agravo_aids', 'Aids'),
        simNaoIgnField('agravo_alcoolismo', 'Alcoolismo'),
        simNaoIgnField('agravo_diabetes', 'Diabetes'),
        simNaoIgnField('agravo_doenca_mental', 'Doença Mental'),
        simNaoIgnField('agravo_uso_drogas_ilicitas', 'Uso de Drogas Ilícitas'),
        simNaoIgnField('agravo_tabagismo', 'Tabagismo'),
        simNaoIgnField('agravo_outras', 'Outras Doenças/Agravos'),
        { code: 'agravo_outras_especifique', label: 'Outras Doenças/Agravos, especifique', type: 'text', visibleWhen: { fieldCode: 'agravo_outras', equals: ['1'] } },
      ],
    },
    {
      title: 'Dados Complementares — Exames',
      fields: [
        {
          code: 'baciloscopia_escarro_diagnostico',
          label: 'Baciloscopia de Escarro (diagnóstico)',
          type: 'code',
          options: [
            { code: '1', label: 'Positiva' },
            { code: '2', label: 'Negativa' },
            { code: '3', label: 'Não Realizada' },
            { code: '4', label: 'Não se aplica' },
          ],
        },
        {
          code: 'radiografia_torax',
          label: 'Radiografia do Tórax',
          type: 'code',
          options: [
            { code: '1', label: 'Suspeito' },
            { code: '2', label: 'Normal' },
            { code: '3', label: 'Outra Patologia' },
            { code: '4', label: 'Não Realizado' },
          ],
        },
        {
          code: 'hiv',
          label: 'HIV',
          type: 'code',
          options: [
            { code: '1', label: 'Positivo' },
            { code: '2', label: 'Negativo' },
            { code: '3', label: 'Em Andamento' },
            { code: '4', label: 'Não Realizado' },
          ],
        },
        simNaoIgnField('terapia_antirretroviral_durante_tratamento', 'Terapia Antirretroviral Durante o Tratamento para a TB'),
        {
          code: 'histopatologia',
          label: 'Histopatologia',
          type: 'code',
          options: [
            { code: '1', label: 'Baar Positivo' },
            { code: '2', label: 'Sugestivo de TB' },
            { code: '3', label: 'Não Sugestivo de TB' },
            { code: '4', label: 'Em Andamento' },
            { code: '5', label: 'Não Realizado' },
          ],
        },
        {
          code: 'cultura',
          label: 'Cultura',
          type: 'code',
          options: [
            { code: '1', label: 'Positivo' },
            { code: '2', label: 'Negativo' },
            { code: '3', label: 'Em Andamento' },
            { code: '4', label: 'Não Realizado' },
          ],
        },
        {
          code: 'teste_molecular_rapido_tb',
          label: 'Teste Molecular Rápido TB (TMR-TB)',
          type: 'code',
          options: [
            { code: '1', label: 'Detectável sensível à Rifampicina' },
            { code: '2', label: 'Detectável Resistente à Rifampicina' },
            { code: '3', label: 'Não Detectável' },
            { code: '4', label: 'Inconclusivo' },
            { code: '5', label: 'Não Realizado' },
          ],
        },
        {
          code: 'teste_sensibilidade',
          label: 'Teste de Sensibilidade',
          type: 'code',
          options: [
            { code: '1', label: 'Resistente somente à Isoniazida' },
            { code: '2', label: 'Resistente somente à Rifampicina' },
            { code: '3', label: 'Resistente à Isoniazida e Rifampicina' },
            { code: '4', label: 'Resistente a outras drogas de 1ª linha' },
            { code: '5', label: 'Sensível' },
            { code: '6', label: 'Em andamento' },
            { code: '7', label: 'Não realizado' },
          ],
        },
        { code: 'data_inicio_tratamento_atual', label: 'Data de Início do Tratamento Atual', type: 'date' },
        { code: 'total_contatos_identificados', label: 'Total de Contatos Identificados', type: 'number' },
      ],
    },
  ],
};
