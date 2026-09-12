import type { SinanBodySchema } from '../types.js';
import { simNaoIgnField } from './shared-options.js';

/**
 * Campos 31-60 da ficha SINAN "Atendimento Anti-Rábico Humano"
 * (anti_rabico_v5.pdf), extraídos do texto/layout impresso do PDF-base
 * campo a campo.
 *
 * REESCRITO em 2026-09-11, na revisão de fidelidade pós-Febre Amarela/
 * Hepatites Virais/Leptospirose/Chagas/Malária/Sarampo/Meningite/
 * Coqueluche: a versão anterior (Lote 4) tinha 4 grupos e ~10 campos com
 * códigos/opções inventados que não batem com o impresso real (`tipo_
 * exposicao` com 7 opções livres — a ficha real trata exposição, localização
 * e tipo de ferimento como 3 checklists separados de Sim/Não; `esquema_
 * profilaxia` com opções que não existem; `evolucao_caso` genérico — **esta
 * ficha não tem campo de evolução do caso**, é um atendimento, não uma
 * doença com desfecho clínico) contra os ~45 campos reais. Faltavam:
 * localização da lesão como checklist real (33), ferimento único/múltiplo
 * (34), tipo de ferimento como checklist (35), data da exposição (36),
 * antecedentes de tratamento anti-rábico com pré/pós-exposição e prazo de
 * conclusão (37-38), doses aplicadas anteriormente (39), condição do animal
 * e se é passível de observação (41-42), o bloco inteiro de tratamento
 * indicado/vacina com laboratório/lote/vencimento (43-46), as 5 datas de
 * aplicação da vacina (47), condição final do animal após observação (48),
 * interrupção/abandono de tratamento (49-51), eventos adversos à vacina e
 * ao soro (52, 59), o bloco inteiro de soro anti-rábico (peso, quantidade,
 * tipo, infiltração, laboratório, lote — 53-58), data de encerramento (60).
 */
const SIM_NAO_IGN = [
  { code: '1', label: 'Sim' },
  { code: '2', label: 'Não' },
  { code: '9', label: 'Ignorado' },
] as const;

const SIM_NAO_DESCONHECIDA = [
  { code: '1', label: 'Sim' },
  { code: '2', label: 'Não' },
  { code: '3', label: 'Desconhecida' },
] as const;

const LABORATORIO_OPTIONS = [
  { code: '1', label: 'Instituto Butantan' },
  { code: '2', label: 'Instituto Vital Brasil' },
  { code: '3', label: 'Aventis Pasteur' },
  { code: '4', label: 'Outro' },
] as const;

export const RAIVA_HUMANA_BODY_SCHEMA: SinanBodySchema = {
  schemaCode: 'RAIVA_HUMANA',
  groups: [
    {
      title: 'Dados Complementares do Caso',
      fields: [{ code: 'ocupacao', label: 'Ocupação', type: 'text' }],
    },
    {
      title: 'Antecedentes Epidemiológicos — Tipo de Exposição e Localização',
      fields: [
        { code: 'exposicao_contato_indireto', label: 'Tipo de Exposição: Contato Indireto', type: 'code', options: SIM_NAO_IGN },
        { code: 'exposicao_arranhadura', label: 'Tipo de Exposição: Arranhadura', type: 'code', options: SIM_NAO_IGN },
        { code: 'exposicao_lambedura', label: 'Tipo de Exposição: Lambedura', type: 'code', options: SIM_NAO_IGN },
        { code: 'exposicao_mordedura', label: 'Tipo de Exposição: Mordedura', type: 'code', options: SIM_NAO_IGN },
        { code: 'exposicao_outro', label: 'Tipo de Exposição: Outro', type: 'code', options: SIM_NAO_IGN },
        { code: 'localizacao_mucosa', label: 'Localização: Mucosa', type: 'code', options: SIM_NAO_DESCONHECIDA },
        { code: 'localizacao_cabeca_pescoco', label: 'Localização: Cabeça/Pescoço', type: 'code', options: SIM_NAO_DESCONHECIDA },
        { code: 'localizacao_maos_pes', label: 'Localização: Mãos/Pés', type: 'code', options: SIM_NAO_DESCONHECIDA },
        { code: 'localizacao_tronco', label: 'Localização: Tronco', type: 'code', options: SIM_NAO_DESCONHECIDA },
        { code: 'localizacao_membros_superiores', label: 'Localização: Membros Superiores', type: 'code', options: SIM_NAO_DESCONHECIDA },
        { code: 'localizacao_membros_inferiores', label: 'Localização: Membros Inferiores', type: 'code', options: SIM_NAO_DESCONHECIDA },
        {
          code: 'ferimento',
          label: 'Ferimento',
          type: 'code',
          options: [
            { code: '1', label: 'Único' },
            { code: '2', label: 'Múltiplo' },
            { code: '3', label: 'Sem ferimento' },
            { code: '9', label: 'Ignorado' },
          ],
        },
        { code: 'tipo_ferimento_profundo', label: 'Tipo de Ferimento: Profundo', type: 'code', options: SIM_NAO_IGN },
        { code: 'tipo_ferimento_superficial', label: 'Tipo de Ferimento: Superficial', type: 'code', options: SIM_NAO_IGN },
        { code: 'tipo_ferimento_dilacerante', label: 'Tipo de Ferimento: Dilacerante', type: 'code', options: SIM_NAO_IGN },
        { code: 'data_exposicao', label: 'Data da Exposição', type: 'date' },
      ],
    },
    {
      title: 'Antecedentes Epidemiológicos — Tratamento Anti-Rábico Anterior',
      fields: [
        simNaoIgnField('antecedente_tratamento_antirrabico', 'Tem Antecedentes de Tratamento Anti-Rábico?'),
        simNaoIgnField('antecedente_tratamento_pre_exposicao', 'Antecedente: Pré-Exposição', { visibleWhen: { fieldCode: 'antecedente_tratamento_antirrabico', equals: ['1'] } }),
        simNaoIgnField('antecedente_tratamento_pos_exposicao', 'Antecedente: Pós-Exposição', { visibleWhen: { fieldCode: 'antecedente_tratamento_antirrabico', equals: ['1'] } }),
        {
          code: 'antecedente_tratamento_quando_concluido',
          label: 'Se Houve, Quando Foi Concluído?',
          type: 'code',
          visibleWhen: { fieldCode: 'antecedente_tratamento_antirrabico', equals: ['1'] },
          options: [
            { code: '1', label: 'Até 90 dias' },
            { code: '2', label: 'Após 90 dias' },
          ],
        },
        { code: 'numero_doses_aplicadas_anteriormente', label: 'Nº de Doses Aplicadas (Tratamento Anterior)', type: 'number' },
      ],
    },
    {
      title: 'Animal Agressor',
      fields: [
        {
          code: 'especie_animal',
          label: 'Espécie do Animal Agressor',
          type: 'code',
          options: [
            { code: '1', label: 'Canina' },
            { code: '2', label: 'Felina' },
            { code: '3', label: 'Quiróptera (Morcego)' },
            { code: '4', label: 'Primata (Macaco)' },
            { code: '5', label: 'Raposa' },
            { code: '6', label: 'Herbívoro doméstico' },
            { code: '7', label: 'Outra' },
          ],
        },
        { code: 'especie_animal_especifique', label: 'Espécie do Animal, especifique', type: 'text', visibleWhen: { fieldCode: 'especie_animal', equals: ['6', '7'] } },
        {
          code: 'condicao_animal',
          label: 'Condição do Animal para Fins de Conduta do Tratamento',
          type: 'code',
          options: [
            { code: '1', label: 'Sadio' },
            { code: '2', label: 'Suspeito' },
            { code: '3', label: 'Raivoso' },
            { code: '4', label: 'Morto/Desaparecido' },
          ],
        },
        {
          code: 'animal_passivel_observacao',
          label: 'Animal Passível de Observação? (Somente para Cão ou Gato)',
          type: 'code',
          options: [
            { code: '1', label: 'Sim' },
            { code: '2', label: 'Não' },
          ],
        },
      ],
    },
    {
      title: 'Tratamento Atual — Indicação e Vacina',
      fields: [
        {
          code: 'tratamento_indicado',
          label: 'Tratamento Indicado',
          type: 'code',
          options: [
            { code: '1', label: 'Pré Exposição' },
            { code: '2', label: 'Dispensa de Tratamento' },
            { code: '3', label: 'Observação do animal (se cão ou gato)' },
            { code: '4', label: 'Observação + Vacina' },
            { code: '5', label: 'Vacina' },
            { code: '6', label: 'Soro + Vacina' },
            { code: '7', label: 'Esquema de Reexposição' },
          ],
        },
        { code: 'laboratorio_produtor_vacina', label: 'Laboratório Produtor da Vacina', type: 'code', options: LABORATORIO_OPTIONS },
        { code: 'laboratorio_produtor_vacina_especifique', label: 'Laboratório Produtor da Vacina, especifique', type: 'text', visibleWhen: { fieldCode: 'laboratorio_produtor_vacina', equals: ['4'] } },
        { code: 'numero_lote_vacina', label: 'Número do Lote (Vacina)', type: 'text' },
        { code: 'data_vencimento_vacina', label: 'Data do Vencimento (Vacina)', type: 'date' },
      ],
    },
    {
      title: 'Tratamento Atual — Doses e Evolução',
      fields: [
        { code: 'data_1a_dose', label: 'Data da 1ª Dose (dia e mês)', type: 'date' },
        { code: 'data_2a_dose', label: 'Data da 2ª Dose (dia e mês)', type: 'date' },
        { code: 'data_3a_dose', label: 'Data da 3ª Dose (dia e mês)', type: 'date' },
        { code: 'data_4a_dose', label: 'Data da 4ª Dose (dia e mês)', type: 'date' },
        { code: 'data_5a_dose', label: 'Data da 5ª Dose (dia e mês)', type: 'date' },
        {
          code: 'condicao_final_animal',
          label: 'Condição Final do Animal (após período de observação)',
          type: 'code',
          options: [
            { code: '1', label: 'Negativo para Raiva (Clínica)' },
            { code: '2', label: 'Negativo para Raiva (Laboratório)' },
            { code: '3', label: 'Positivo para Raiva (Clínica)' },
            { code: '4', label: 'Positivo para Raiva (Laboratório)' },
            { code: '5', label: 'Morto/Sacrificado/Sem Diagnóstico' },
            { code: '9', label: 'Ignorado' },
          ],
        },
        {
          code: 'houve_interrupcao_tratamento',
          label: 'Houve Interrupção do Tratamento',
          type: 'code',
          options: [
            { code: '1', label: 'Sim' },
            { code: '2', label: 'Não' },
          ],
        },
        {
          code: 'motivo_interrupcao',
          label: 'Qual o Motivo da Interrupção',
          type: 'code',
          visibleWhen: { fieldCode: 'houve_interrupcao_tratamento', equals: ['1'] },
          options: [
            { code: '1', label: 'Indicação da Unidade de Saúde' },
            { code: '2', label: 'Abandono' },
            { code: '3', label: 'Transferência' },
          ],
        },
        {
          code: 'abandono_unidade_procurou_paciente',
          label: 'Se Houve Abandono do Tratamento, a Unidade de Saúde Procurou o Paciente',
          type: 'code',
          visibleWhen: { fieldCode: 'motivo_interrupcao', equals: ['2'] },
          options: [
            { code: '1', label: 'Sim' },
            { code: '2', label: 'Não' },
          ],
        },
        simNaoIgnField('evento_adverso_vacina', 'Evento Adverso à Vacina'),
      ],
    },
    {
      title: 'Tratamento Atual — Soro Anti-Rábico',
      fields: [
        simNaoIgnField('indicacao_soro_antirrabico', 'Indicação do Soro Anti-Rábico'),
        { code: 'peso_paciente_kg', label: 'Peso do Paciente (Kg)', type: 'text' },
        { code: 'quantidade_soro_aplicada_ml', label: 'Quantidade de Soro Aplicada (ml)', type: 'number', visibleWhen: { fieldCode: 'indicacao_soro_antirrabico', equals: ['1'] } },
        {
          code: 'tipo_soro',
          label: 'Tipo de Soro',
          type: 'code',
          visibleWhen: { fieldCode: 'indicacao_soro_antirrabico', equals: ['1'] },
          options: [
            { code: '1', label: 'Heterólogo' },
            { code: '2', label: 'Homólogo' },
          ],
        },
        {
          code: 'infiltracao_soro_ferimentos',
          label: 'Infiltração de Soro no(s) Local(is) do(s) Ferimento(s)',
          type: 'code',
          options: [
            { code: '1', label: 'Sim' },
            { code: '2', label: 'Não' },
          ],
        },
        {
          code: 'infiltracao_soro_tipo',
          label: 'Infiltração de Soro — Tipo',
          type: 'code',
          visibleWhen: { fieldCode: 'infiltracao_soro_ferimentos', equals: ['1'] },
          options: [
            { code: '1', label: 'Total' },
            { code: '2', label: 'Parcial' },
          ],
        },
        { code: 'laboratorio_produtor_soro', label: 'Laboratório Produtor do Soro Anti-Rábico', type: 'code', options: LABORATORIO_OPTIONS },
        { code: 'laboratorio_produtor_soro_especifique', label: 'Laboratório Produtor do Soro, especifique', type: 'text', visibleWhen: { fieldCode: 'laboratorio_produtor_soro', equals: ['4'] } },
        { code: 'numero_partida_soro', label: 'Número da Partida (Soro)', type: 'text' },
        simNaoIgnField('evento_adverso_soro', 'Evento Adverso ao Soro Anti-Rábico'),
      ],
    },
    {
      title: 'Conclusão',
      fields: [{ code: 'data_encerramento', label: 'Data do Encerramento do Caso', type: 'date' }],
    },
    {
      title: 'Observações',
      fields: [{ code: 'observacoes', label: 'Observações', type: 'text' }],
    },
  ],
};
