import type { SinanBodySchema } from '../types.js';
import { simNaoIgnField } from './shared-options.js';

/**
 * Campos 31-52 da ficha SINAN "Hepatites Virais" (Ficha_Hepatites_Virais.pdf),
 * extraídos do texto/layout impresso do PDF-base campo a campo.
 *
 * REESCRITO em 2026-09-11, na revisão de fidelidade pós-Leptospirose/Chagas/
 * Malária/Sarampo/Meningite/Coqueluche: a versão anterior (Lote 3) usava um
 * campo `tipo_hepatite` (A/B/C) como eixo central, condicionando via
 * `visibleWhen` qual bloco de sorologia aparecia — mas **a ficha oficial não
 * separa os marcadores sorológicos por tipo**: o campo real (46, "Resultados
 * Sorológicos/Virológicos/Teste rápido") é uma única grade com os 12
 * marcadores de A/B/C/D/E lado a lado, sempre visíveis, sem nenhum campo
 * "tipo de hepatite" controlando o que aparece — o mais próximo é "Suspeita
 * de" (33), que é só informativo. A versão anterior também só cobria
 * Hepatite A/B/C — a ficha real cobre A, B, C, D **e E**. Faltavam também:
 * vacinação (34), institucionalização (35), agravos associados (36),
 * contato com portador de HBV/HBC por tipo (37), a checklist inteira de
 * exposição a procedimentos de risco — 14 itens, cada um com "Sim há menos/
 * mais de 6 meses" (38-39), local/município da exposição (40), dados dos
 * comunicantes (41), o bloco de triagem de banco de sangue/CTA (42-44),
 * genotipagem completa do HCV (47), forma clínica e classificação
 * etiológica (49-50), e a lista completa de 13 prováveis fontes/mecanismos
 * de infecção (51, a v1 tinha só 7 opções). Esta versão usa os campos/
 * opções exatos do impresso.
 */
const VACINA_OPTIONS = [
  { code: '1', label: 'Completa' },
  { code: '2', label: 'Incompleta' },
  { code: '3', label: 'Não vacinado' },
  { code: '9', label: 'Ignorado' },
] as const;

const CONTATO_OPTIONS = [
  { code: '1', label: 'Sim, há menos de seis meses' },
  { code: '2', label: 'Sim, há mais de seis meses' },
  { code: '3', label: 'Não' },
  { code: '9', label: 'Ignorado' },
] as const;

const RESULTADO_COM_IGNORADO_OPTIONS = [
  { code: '1', label: 'Reagente' },
  { code: '2', label: 'Não reagente' },
  { code: '3', label: 'Inconclusivo' },
  { code: '4', label: 'Não realizado' },
  { code: '9', label: 'Ignorado' },
] as const;

export const HEPATITES_VIRAIS_BODY_SCHEMA: SinanBodySchema = {
  schemaCode: 'HEPATITES_VIRAIS',
  groups: [
    {
      title: 'Dados Complementares do Caso',
      fields: [
        { code: 'data_investigacao', label: 'Data da Investigação', type: 'date' },
        { code: 'ocupacao', label: 'Ocupação', type: 'text' },
      ],
    },
    {
      title: 'Antecedentes Epidemiológicos — Contexto',
      fields: [
        {
          code: 'suspeita_de',
          label: 'Suspeita de',
          type: 'code',
          options: [
            { code: '1', label: 'Hepatite A' },
            { code: '2', label: 'Hepatite B/C' },
            { code: '3', label: 'Não especificada' },
          ],
        },
        { code: 'vacina_hepatite_a', label: 'Tomou Vacina para Hepatite A', type: 'code', options: VACINA_OPTIONS },
        { code: 'vacina_hepatite_b', label: 'Tomou Vacina para Hepatite B', type: 'code', options: VACINA_OPTIONS },
        {
          code: 'institucionalizado_em',
          label: 'Institucionalizado em',
          type: 'code',
          options: [
            { code: '1', label: 'Creche' },
            { code: '2', label: 'Escola' },
            { code: '3', label: 'Asilo' },
            { code: '4', label: 'Empresa' },
            { code: '5', label: 'Penitenciária' },
            { code: '6', label: 'Hospital/clínica' },
            { code: '7', label: 'Outras' },
            { code: '8', label: 'Não institucionalizado' },
            { code: '9', label: 'Ignorado' },
          ],
        },
        simNaoIgnField('agravo_associado_hiv_aids', 'Agravo Associado: HIV/AIDS'),
        simNaoIgnField('agravo_associado_outras_dsts', 'Agravo Associado: Outras DSTs'),
        { code: 'contato_hbv_hbc_sexual', label: 'Contato com Portador de HBV ou HBC — Sexual', type: 'code', options: CONTATO_OPTIONS },
        { code: 'contato_hbv_hbc_domiciliar_nao_sexual', label: 'Contato com Portador de HBV ou HBC — Domiciliar (Não Sexual)', type: 'code', options: CONTATO_OPTIONS },
        { code: 'contato_hbv_hbc_ocupacional', label: 'Contato com Portador de HBV ou HBC — Ocupacional', type: 'code', options: CONTATO_OPTIONS },
      ],
    },
    {
      title: 'Antecedentes Epidemiológicos — Exposição',
      fields: [
        { code: 'exposicao_medicamentos_injetaveis', label: 'Exposto a: Medicamentos Injetáveis', type: 'code', options: CONTATO_OPTIONS },
        { code: 'exposicao_tatuagem_piercing', label: 'Exposto a: Tatuagem/Piercing', type: 'code', options: CONTATO_OPTIONS },
        { code: 'exposicao_acidente_material_biologico', label: 'Exposto a: Acidente com Material Biológico', type: 'code', options: CONTATO_OPTIONS },
        { code: 'exposicao_drogas_inalaveis_crack', label: 'Exposto a: Drogas Inaláveis ou Crack', type: 'code', options: CONTATO_OPTIONS },
        { code: 'exposicao_acupuntura', label: 'Exposto a: Acupuntura', type: 'code', options: CONTATO_OPTIONS },
        { code: 'exposicao_transfusao_sangue_derivados', label: 'Exposto a: Transfusão de Sangue/Derivados', type: 'code', options: CONTATO_OPTIONS },
        { code: 'exposicao_drogas_injetaveis', label: 'Exposto a: Drogas Injetáveis', type: 'code', options: CONTATO_OPTIONS },
        { code: 'exposicao_tratamento_cirurgico', label: 'Exposto a: Tratamento Cirúrgico', type: 'code', options: CONTATO_OPTIONS },
        { code: 'exposicao_agua_alimento_contaminado', label: 'Exposto a: Água/Alimento Contaminado', type: 'code', options: CONTATO_OPTIONS },
        { code: 'exposicao_tratamento_dentario', label: 'Exposto a: Tratamento Dentário', type: 'code', options: CONTATO_OPTIONS },
        { code: 'exposicao_tres_mais_parceiros_sexuais', label: 'Exposto a: Três ou Mais Parceiros Sexuais', type: 'code', options: CONTATO_OPTIONS },
        { code: 'exposicao_hemodialise', label: 'Exposto a: Hemodiálise', type: 'code', options: CONTATO_OPTIONS },
        { code: 'exposicao_transplante', label: 'Exposto a: Transplante', type: 'code', options: CONTATO_OPTIONS },
        { code: 'exposicao_outras', label: 'Exposto a: Outras', type: 'code', options: CONTATO_OPTIONS },
        { code: 'data_acidente_transfusao_transplante', label: 'Data do Acidente ou Transfusão ou Transplante', type: 'date' },
        {
          code: 'local_municipio_exposicao_detalhes',
          label: 'Local/Município da Exposição (UF/Município/Local/Telefone)',
          type: 'text',
        },
        {
          code: 'dados_comunicantes_detalhes',
          label: 'Dados dos Comunicantes (Nome/Idade/Tipo de Contato/Marcadores/Indicações)',
          type: 'text',
        },
      ],
    },
    {
      title: 'Dados Laboratoriais — Banco de Sangue/CTA',
      fields: [
        {
          code: 'paciente_encaminhado_de',
          label: 'Paciente Encaminhado de',
          type: 'code',
          options: [
            { code: '1', label: 'Banco de sangue' },
            { code: '2', label: 'Centro de Testagem e Aconselhamento (CTA)' },
            { code: '3', label: 'Não se aplica' },
          ],
        },
        { code: 'data_coleta_amostra_banco_sangue_cta', label: 'Data da Coleta da Amostra (Banco de Sangue ou CTA)', type: 'date' },
        { code: 'resultado_hbsag_banco_sangue_cta', label: 'Resultado — HBsAg (Banco de Sangue/CTA)', type: 'code', options: RESULTADO_COM_IGNORADO_OPTIONS },
        { code: 'resultado_anti_hbc_total_banco_sangue_cta', label: 'Resultado — Anti-HBc Total (Banco de Sangue/CTA)', type: 'code', options: RESULTADO_COM_IGNORADO_OPTIONS },
        { code: 'resultado_anti_hcv_banco_sangue_cta', label: 'Resultado — Anti-HCV (Banco de Sangue/CTA)', type: 'code', options: RESULTADO_COM_IGNORADO_OPTIONS },
      ],
    },
    {
      title: 'Dados Laboratoriais — Sorologia',
      fields: [
        { code: 'data_coleta_sorologia', label: 'Data da Coleta da Sorologia/Teste Rápido', type: 'date' },
        resultadoSorologicoField('resultado_anti_hav_igm', 'Anti-HAV IgM'),
        resultadoSorologicoField('resultado_hbsag', 'HBsAg'),
        resultadoSorologicoField('resultado_anti_hbc_igm', 'Anti-HBc IgM'),
        resultadoSorologicoField('resultado_anti_hbc_total', 'Anti-HBc (Total)'),
        resultadoSorologicoField('resultado_anti_hbs', 'Anti-HBs'),
        resultadoSorologicoField('resultado_hbeag', 'HBeAg'),
        resultadoSorologicoField('resultado_anti_hbe', 'Anti-HBe'),
        resultadoSorologicoField('resultado_anti_hdv_total', 'Anti-HDV Total'),
        resultadoSorologicoField('resultado_anti_hdv_igm', 'Anti-HDV IgM'),
        resultadoSorologicoField('resultado_anti_hcv', 'Anti-HCV'),
        resultadoSorologicoField('resultado_hcv_rna', 'HCV-RNA'),
        resultadoSorologicoField('resultado_anti_hev_igm', 'Anti-HEV IgM'),
        {
          code: 'genotipo_hcv',
          label: 'Genótipo para HCV',
          type: 'code',
          options: [
            { code: '1', label: 'Genótipo 1' },
            { code: '2', label: 'Genótipo 2' },
            { code: '3', label: 'Genótipo 3' },
            { code: '4', label: 'Genótipo 4' },
            { code: '5', label: 'Genótipo 5' },
            { code: '6', label: 'Genótipo 6' },
            { code: '7', label: 'Não se aplica' },
            { code: '9', label: 'Ignorado' },
          ],
        },
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
            { code: '1', label: 'Confirmação laboratorial' },
            { code: '2', label: 'Confirmação clínico-epidemiológica' },
            { code: '3', label: 'Descartado' },
            { code: '4', label: 'Cicatriz Sorológica' },
            { code: '8', label: 'Inconclusivo' },
          ],
        },
        {
          code: 'forma_clinica',
          label: 'Forma Clínica',
          type: 'code',
          options: [
            { code: '1', label: 'Hepatite Aguda' },
            { code: '2', label: 'Hepatite Crônica/Portador assintomático' },
            { code: '3', label: 'Hepatite Fulminante' },
            { code: '4', label: 'Inconclusivo' },
          ],
        },
        {
          code: 'classificacao_etiologica',
          label: 'Classificação Etiológica',
          type: 'code',
          options: [
            { code: '01', label: 'Vírus A' },
            { code: '02', label: 'Vírus B' },
            { code: '03', label: 'Vírus C' },
            { code: '04', label: 'Vírus B e D' },
            { code: '05', label: 'Vírus E' },
            { code: '06', label: 'Vírus B e C' },
            { code: '07', label: 'Vírus A e B' },
            { code: '08', label: 'Vírus A e C' },
            { code: '09', label: 'Não se aplica' },
            { code: '99', label: 'Ignorado' },
          ],
        },
        {
          code: 'provavel_fonte_mecanismo_infeccao',
          label: 'Provável Fonte/Mecanismo de Infecção',
          type: 'code',
          options: [
            { code: '01', label: 'Sexual' },
            { code: '02', label: 'Transfusional' },
            { code: '03', label: 'Uso de drogas' },
            { code: '04', label: 'Vertical' },
            { code: '05', label: 'Acidente de trabalho' },
            { code: '06', label: 'Hemodiálise' },
            { code: '07', label: 'Domiciliar' },
            { code: '08', label: 'Tratamento cirúrgico' },
            { code: '09', label: 'Tratamento dentário' },
            { code: '10', label: 'Pessoa/pessoa' },
            { code: '11', label: 'Alimento/água contaminada' },
            { code: '12', label: 'Outros' },
            { code: '99', label: 'Ignorado' },
          ],
        },
        {
          code: 'provavel_fonte_outros_especifique',
          label: 'Provável Fonte/Mecanismo — Outros, especifique',
          type: 'text',
          visibleWhen: { fieldCode: 'provavel_fonte_mecanismo_infeccao', equals: ['12'] },
        },
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
      { code: '1', label: 'Reagente/Positivo' },
      { code: '2', label: 'Não Reagente/Negativo' },
      { code: '3', label: 'Inconclusivo' },
      { code: '4', label: 'Não Realizado' },
    ],
  };
}
