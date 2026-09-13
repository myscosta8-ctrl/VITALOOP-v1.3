import type { ClinicalFormSchema } from '../clinical-forms/types.js';

/**
 * Ficha de Atendimento de Enfermagem — Admissão Estruturada (NUR-012, novo).
 *
 * Campos extraídos do formulário real de enfermagem do projeto de referência
 * "Emergency Care" (`patient-nursing-form.tsx`, seções 2-4, 6 e 10) — parte
 * de uma avaliação de auditoria (2026-09-12) que encontrou o registro de
 * enfermagem do Vitaloop raso demais (só texto livre + 3 opções de tipo).
 *
 * **Não duplica o que já existe em outro lugar do Vitaloop** — por isso este
 * schema é mais enxuto que o formulário de referência:
 * - Sinais vitais e classificação de risco Manchester já são capturados na
 *   Triagem (`app.triages`) — não repetidos aqui.
 * - Alergias, antecedentes/comorbidades e medicação de uso contínuo já são
 *   campos longitudinais do PACIENTE (`patient_allergies`,
 *   `patient_antecedents`, `patient_continuous_medications`), não do
 *   atendimento — repeti-los aqui duplicaria dado e criaria duas fontes de
 *   verdade divergentes.
 * - Medicações administradas já são rastreadas por
 *   `app.medication_administrations` (grade de aprazamento) — não uma
 *   tabela livre dentro desta ficha.
 *
 * O que sobra, e é o que este schema cobre — dados que hoje genuinamente NÃO
 * existem em nenhuma tabela do Vitaloop: origem do paciente/setor de
 * atendimento, queixa principal e história clínica sob a ótica da
 * enfermagem (podem divergir da queixa médica), e a avaliação sistêmica de
 * enfermagem (estado geral, consciência, pele/mucosas, respiração,
 * perfusão, mobilidade) e os procedimentos de enfermagem realizados.
 */
function simNaoField(code: string, label: string) {
  return {
    code,
    label,
    type: 'code' as const,
    options: [
      { code: 'sim', label: 'Sim' },
      { code: 'nao', label: 'Não' },
    ],
  };
}

export const NURSING_ADMISSION_SCHEMA: ClinicalFormSchema = {
  schemaCode: 'NURSING_ADMISSION',
  groups: [
    {
      title: 'Dados do Atendimento (Enfermagem)',
      fields: [
        simNaoField('origem_demanda_espontanea', 'Origem: Demanda Espontânea'),
        simNaoField('origem_samu', 'Origem: SAMU'),
        simNaoField('origem_ubs', 'Origem: UBS'),
        simNaoField('origem_transferencia', 'Origem: Transferência'),
        simNaoField('origem_policia', 'Origem: Polícia'),
        simNaoField('origem_bombeiros', 'Origem: Bombeiros'),
        simNaoField('origem_outro', 'Origem: Outro'),
        { code: 'origem_outro_especifique', label: 'Origem — Outro, especifique', type: 'text' as const, visibleWhen: { fieldCode: 'origem_outro', equals: ['sim'] } },
        {
          code: 'setor_atendimento',
          label: 'Setor de Atendimento',
          type: 'code' as const,
          options: [
            { code: 'consultorio', label: 'Consultório' },
            { code: 'sala_medicacao', label: 'Sala de Medicação' },
            { code: 'observacao', label: 'Observação' },
            { code: 'sala_vermelha', label: 'Sala Vermelha' },
            { code: 'pediatria', label: 'Pediatria' },
            { code: 'isolamento', label: 'Isolamento' },
          ],
        },
      ],
    },
    {
      title: 'Queixa Principal (Enfermagem)',
      fields: [
        simNaoField('queixa_cefaleia', 'Cefaleia'),
        simNaoField('queixa_vomitos', 'Vômitos'),
        simNaoField('queixa_febre', 'Febre'),
        simNaoField('queixa_diarreia', 'Diarreia'),
        simNaoField('queixa_dor_abdominal', 'Dor Abdominal'),
        simNaoField('queixa_hipertensao', 'Hipertensão'),
        simNaoField('queixa_dor_lombar', 'Dor Lombar'),
        simNaoField('queixa_hipoglicemia', 'Hipoglicemia'),
        simNaoField('queixa_dor_toracica', 'Dor Torácica'),
        simNaoField('queixa_trauma', 'Trauma'),
        simNaoField('queixa_dispneia', 'Dispneia'),
        simNaoField('queixa_ferimento', 'Ferimento'),
        simNaoField('queixa_tosse', 'Tosse'),
        simNaoField('queixa_crise_asmatica', 'Crise Asmática'),
        simNaoField('queixa_nauseas', 'Náuseas'),
        simNaoField('queixa_reacao_alergica', 'Reação Alérgica'),
        simNaoField('queixa_mal_estar_geral', 'Mal-estar Geral'),
        simNaoField('queixa_outros', 'Outros'),
        { code: 'queixa_outros_especifique', label: 'Queixa — Outros, especifique', type: 'text' as const, visibleWhen: { fieldCode: 'queixa_outros', equals: ['sim'] } },
      ],
    },
    {
      title: 'História Clínica (Enfermagem)',
      fields: [
        simNaoField('historia_inicio_subito', 'Início Súbito'),
        simNaoField('historia_inicio_gradual', 'Início Gradual'),
        simNaoField('historia_piora_progressiva', 'Piora Progressiva'),
        simNaoField('historia_sintomas_recorrentes', 'Sintomas Recorrentes'),
        simNaoField('historia_primeiro_episodio', 'Primeiro Episódio'),
        simNaoField('historia_uso_previo_medicacao', 'Uso Prévio de Medicação'),
        { code: 'historia_observacoes', label: 'Observações da História Clínica', type: 'text' as const },
      ],
    },
    {
      title: 'Avaliação Geral (Enfermagem)',
      fields: [
        {
          code: 'estado_geral',
          label: 'Estado Geral',
          type: 'code' as const,
          options: [
            { code: 'bom', label: 'Bom' },
            { code: 'regular', label: 'Regular' },
            { code: 'grave', label: 'Grave' },
          ],
        },
        simNaoField('consciencia_consciente', 'Consciência: Consciente'),
        simNaoField('consciencia_orientado', 'Consciência: Orientado'),
        simNaoField('consciencia_sonolento', 'Consciência: Sonolento'),
        simNaoField('consciencia_confuso', 'Consciência: Confuso'),
        simNaoField('consciencia_agitado', 'Consciência: Agitado'),
        simNaoField('consciencia_rebaixado', 'Consciência: Rebaixado'),
        simNaoField('consciencia_inconsciente', 'Consciência: Inconsciente'),
        simNaoField('pele_coradas', 'Pele/Mucosas: Coradas'),
        simNaoField('pele_hipocoradas', 'Pele/Mucosas: Hipocoradas'),
        simNaoField('pele_cianoticas', 'Pele/Mucosas: Cianóticas'),
        simNaoField('pele_ictericas', 'Pele/Mucosas: Ictéricas'),
        simNaoField('pele_desidratadas', 'Pele/Mucosas: Desidratadas'),
        simNaoField('pele_normohidratadas', 'Pele/Mucosas: Normohidratadas'),
        simNaoField('pele_diaforeticas', 'Pele/Mucosas: Diaforéticas'),
        simNaoField('respiracao_eupneico', 'Respiração: Eupneico'),
        simNaoField('respiracao_dispneico', 'Respiração: Dispneico'),
        simNaoField('respiracao_taquipneico', 'Respiração: Taquipneico'),
        simNaoField('respiracao_bradipneico', 'Respiração: Bradipneico'),
        simNaoField('respiracao_musculatura_acessoria', 'Respiração: Uso de Musculatura Acessória'),
        simNaoField('respiracao_sibilos', 'Respiração: Sibilos'),
        simNaoField('respiracao_roncos', 'Respiração: Roncos'),
        simNaoField('perfusao_boa', 'Perfusão: Boa Perfusão'),
        simNaoField('perfusao_lentificada', 'Perfusão: Lentificada'),
        simNaoField('perfusao_extremidades_frias', 'Perfusão: Extremidades Frias'),
        simNaoField('perfusao_extremidades_quentes', 'Perfusão: Extremidades Quentes'),
        { code: 'tempo_enchimento_capilar_seg', label: 'Tempo de Enchimento Capilar (segundos)', type: 'number' as const },
        simNaoField('mobilidade_deambula', 'Mobilidade: Deambula'),
        simNaoField('mobilidade_cadeira_rodas', 'Mobilidade: Cadeira de Rodas'),
        simNaoField('mobilidade_acamado', 'Mobilidade: Acamado'),
        simNaoField('mobilidade_necessita_apoio', 'Mobilidade: Necessita Apoio'),
        simNaoField('mobilidade_restricao_movimento', 'Mobilidade: Restrição de Movimento'),
      ],
    },
    {
      title: 'Procedimentos Realizados (Enfermagem)',
      fields: [
        simNaoField('procedimento_puncao_venosa', 'Punção Venosa'),
        simNaoField('procedimento_ecg', 'ECG'),
        simNaoField('procedimento_aspiracao_vias_aereas', 'Aspiração de Vias Aéreas'),
        simNaoField('procedimento_medicacao_vo', 'Medicação VO'),
        simNaoField('procedimento_glicemia_capilar', 'Glicemia Capilar'),
        simNaoField('procedimento_cateterismo_vesical', 'Cateterismo Vesical'),
        simNaoField('procedimento_medicacao_im', 'Medicação IM'),
        simNaoField('procedimento_curativo', 'Curativo'),
        simNaoField('procedimento_lavagem_gastrica', 'Lavagem Gástrica'),
        simNaoField('procedimento_medicacao_ev', 'Medicação EV'),
        simNaoField('procedimento_coleta_laboratorial', 'Coleta Laboratorial'),
        simNaoField('procedimento_retirada_pontos', 'Retirada de Pontos'),
        simNaoField('procedimento_nebulizacao', 'Nebulização'),
        simNaoField('procedimento_sondagem_nasogastrica', 'Sondagem Nasogástrica'),
        simNaoField('procedimento_oxigenoterapia', 'Oxigenoterapia'),
        simNaoField('procedimento_monitorizacao', 'Monitorização'),
        simNaoField('procedimento_outros', 'Outros'),
        { code: 'procedimento_outros_especifique', label: 'Procedimento — Outros, especifique', type: 'text' as const, visibleWhen: { fieldCode: 'procedimento_outros', equals: ['sim'] } },
      ],
    },
  ],
};
