import type { SinanBodySchema } from '../types.js';

/**
 * Campos 31-50 da ficha SINAN "Malária" (Malaria_v5.pdf), extraídos do
 * texto/layout impresso do PDF-base campo a campo.
 *
 * REESCRITO em 2026-09-11, na revisão de fidelidade pós-Sarampo/Meningite/
 * Coqueluche: a versão anterior (Fase A, escrita a partir do inventário do
 * Emergency Care sem nunca abrir a ficha oficial) tinha campos inteiros que
 * não existem nesta ficha (`especie_plasmodium` como campo próprio —
 * a espécie é codificada dentro do "Resultado do Exame", campo 37, não tem
 * campo separado; `gota_espessa_lamina`/`teste_rapido_tdr`/
 * `pcr_biologia_molecular` — esta ficha só registra "Tipo de Lâmina" e
 * "Resultado do Exame", não três métodos laboratoriais separados;
 * `evolucao_caso` — esta ficha não tem campo de evolução, só Classificação
 * Final + Data de Encerramento) e opções inventadas em `esquema_terapeutico`
 * (a ficha real usa uma lista numerada de 12 esquemas + "Outro", não nomes
 * de droga livres). Faltavam também: atividade nos últimos 15 dias (33),
 * tipo de lâmina/sintomas (34-35), parasitemia em cruzes (39), e o bloco
 * completo de local provável da infecção (distrito/bairro/localidade, não
 * só país/UF/município). Esta versão usa os códigos/opções exatos do
 * impresso, com código de campo semântico mapeado 1:1 ao campo real.
 */
export const MALARIA_BODY_SCHEMA: SinanBodySchema = {
  schemaCode: 'MALARIA',
  groups: [
    {
      title: 'Dados Complementares do Caso',
      fields: [
        { code: 'data_investigacao', label: 'Data da Investigação', type: 'date' },
        { code: 'ocupacao', label: 'Ocupação', type: 'text' },
      ],
    },
    {
      title: 'Atendimento Epidemiológico',
      fields: [
        {
          code: 'principal_atividade_15_dias',
          label: 'Principal Atividade nos Últimos 15 Dias',
          type: 'code',
          options: [
            { code: '1', label: 'Agricultura' },
            { code: '2', label: 'Pecuária' },
            { code: '3', label: 'Doméstica' },
            { code: '4', label: 'Turismo' },
            { code: '5', label: 'Garimpagem' },
            { code: '6', label: 'Exploração vegetal' },
            { code: '7', label: 'Caça/pesca' },
            { code: '8', label: 'Const. estrad./barragens' },
            { code: '9', label: 'Mineração' },
            { code: '10', label: 'Viajante' },
            { code: '11', label: 'Outros' },
            { code: '12', label: 'Motorista' },
            { code: '99', label: 'Ignorado' },
          ],
        },
        {
          code: 'tipo_lamina',
          label: 'Tipo de Lâmina',
          type: 'code',
          options: [
            { code: '1', label: 'BP' },
            { code: '2', label: 'BA' },
            { code: '3', label: 'LVC' },
          ],
        },
        {
          code: 'sintomas',
          label: 'Sintomas',
          type: 'code',
          options: [
            { code: '1', label: 'Com sintomas' },
            { code: '2', label: 'Sem sintomas' },
          ],
        },
      ],
    },
    {
      title: 'Dados do Exame',
      fields: [
        { code: 'data_exame', label: 'Data do Exame', type: 'date' },
        {
          code: 'resultado_exame',
          label: 'Resultado do Exame',
          type: 'code',
          options: [
            { code: '1', label: 'Negativo' },
            { code: '2', label: 'F (P. falciparum)' },
            { code: '3', label: 'F+FG (P. falciparum + gametócito)' },
            { code: '4', label: 'V (P. vivax)' },
            { code: '5', label: 'F+V (infecção mista)' },
            { code: '6', label: 'V+FG' },
            { code: '7', label: 'FG (gametócito)' },
            { code: '8', label: 'M (P. malariae)' },
            { code: '9', label: 'F+M' },
            { code: '10', label: 'O (outra espécie)' },
          ],
        },
        { code: 'parasitos_mm3', label: 'Parasitos por mm³', type: 'text' },
        {
          code: 'parasitemia_cruzes',
          label: 'Parasitemia em "Cruzes"',
          type: 'code',
          options: [
            { code: '1', label: '< +/2 (menor que meia cruz)' },
            { code: '2', label: '+/2 (meia cruz)' },
            { code: '3', label: '+ (uma cruz)' },
            { code: '4', label: '++ (duas cruzes)' },
            { code: '5', label: '+++ (três cruzes)' },
            { code: '6', label: '++++ (quatro cruzes)' },
          ],
        },
      ],
    },
    {
      title: 'Tratamento',
      fields: [
        {
          code: 'esquema_tratamento',
          label: 'Esquema de Tratamento Utilizado (Manual de Terapêutica da Malária)',
          type: 'code',
          options: [
            { code: '1', label: 'Infecções por Pv com Cloroquina em 3 dias e Primaquina em 7 dias' },
            { code: '2', label: 'Infecções por Pf com Quinina em 3 dias + Doxiciclina em 5 dias + Primaquina no 6º dia' },
            { code: '3', label: 'Infecções mistas por Pv + Pf com Mefloquina em dose única e Primaquina em 7 dias' },
            { code: '4', label: 'Infecções por Pm com Cloroquina em 3 dias' },
            { code: '5', label: 'Infecções por Pv em crianças com vômitos: artesunato retal em 4 dias e Primaquina em 7 dias' },
            { code: '6', label: 'Infecções por Pf com Mefloquina em dose única e Primaquina no segundo dia' },
            { code: '7', label: 'Infecções por Pf com Quinina em 7 dias' },
            { code: '8', label: 'Infecções por Pf em crianças: artesunato retal em 4 dias + Mefloquina dose única no 3º dia + Primaquina no 5º dia' },
            { code: '9', label: 'Infecções mistas por Pv + Pf com Quinina em 3 dias, Doxiciclina em 5 dias e Primaquina em 7 dias' },
            { code: '10', label: 'Prevenção de recaída por Pv: Cloroquina em dose única semanal durante 3 meses' },
            { code: '11', label: 'Malária grave e complicada' },
            { code: '12', label: 'Infecções por Pf com Artemeter + Lumefantrina em 3 dias' },
            { code: '99', label: 'Outro esquema utilizado (por médico)' },
          ],
        },
        {
          code: 'esquema_tratamento_outro_especifique',
          label: 'Outro Esquema Utilizado, descreva',
          type: 'text',
          visibleWhen: { fieldCode: 'esquema_tratamento', equals: ['99'] },
        },
        { code: 'data_inicio_tratamento', label: 'Data de Início do Tratamento', type: 'date' },
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
          code: 'caso_autoctone',
          label: 'O Caso é Autóctone do Município de Residência?',
          type: 'code',
          options: [
            { code: '1', label: 'Sim' },
            { code: '2', label: 'Não' },
            { code: '3', label: 'Indeterminado' },
          ],
        },
        { code: 'uf_provavel_infeccao', label: 'UF Provável de Infecção', type: 'text', maxLength: 2, visibleWhen: { fieldCode: 'caso_autoctone', equals: ['2'] } },
        { code: 'pais_provavel_infeccao', label: 'País Provável de Infecção', type: 'text', visibleWhen: { fieldCode: 'caso_autoctone', equals: ['2'] } },
        { code: 'municipio_provavel_infeccao', label: 'Município Provável da Infecção', type: 'text', visibleWhen: { fieldCode: 'caso_autoctone', equals: ['2'] } },
        { code: 'distrito_provavel_infeccao', label: 'Distrito Provável da Infecção', type: 'text', visibleWhen: { fieldCode: 'caso_autoctone', equals: ['2'] } },
        { code: 'bairro_provavel_infeccao', label: 'Bairro Provável da Infecção', type: 'text', visibleWhen: { fieldCode: 'caso_autoctone', equals: ['2'] } },
        { code: 'localidade_provavel_infeccao', label: 'Localidade Provável da Infecção', type: 'text', visibleWhen: { fieldCode: 'caso_autoctone', equals: ['2'] } },
        { code: 'data_encerramento', label: 'Data de Encerramento', type: 'date' },
      ],
    },
    {
      title: 'Observações Adicionais',
      fields: [{ code: 'observacoes_adicionais', label: 'Observações Adicionais', type: 'text' }],
    },
  ],
};
