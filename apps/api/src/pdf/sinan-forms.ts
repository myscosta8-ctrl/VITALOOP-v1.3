import { PDFDocument, rgb, TextAlignment, type Color } from 'pdf-lib';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = join(__dirname, '..', '..', 'assets', 'sinan');

/**
 * Campo de formulário real (AcroForm) criado sobre o PDF modelo. A maioria
 * dos campos escreve texto simples (nome, unidade etc.); data e CNS usam
 * campos "comb" (field.enableCombing()), pois o PDF-base tem caixinhas
 * individuais pré-impressas pra cada dígito — confirmado por inspeção visual
 * ampliada do arquivo original, não por suposição.
 * O fundo do campo é sempre transparente (pdf-lib usa branco opaco por
 * padrão), senão o retângulo do campo apaga a linha/tracejado impressos por
 * baixo — o que pareceria uma rasura. Depois de preenchidos, os campos são
 * "achatados" (flatten): viram conteúdo estático da página, sem nenhum
 * widget interativo restante.
 */
export interface SinanFormData {
  notificationDate?: string | null;
  // Segunda data do cabeçalho (campo 7). O rótulo impresso varia por
  // ficha — "Data dos Primeiros Sintomas" em Animais Peçonhentos, "Data do
  // Atendimento" em Antirrábico — mas é sempre a mesma posição/tipo de
  // campo, por isso um único slot aqui. Quem chama generateSinanFormPdf
  // deve passar o valor certo pro agravo (ver FORM_TEMPLATES).
  symptomOnsetDate?: string | null;
  notifyingUnit?: string | null;
  patientName?: string | null;
  birthDate?: string | null;
  age?: string | null;
  // Unidade do valor de `age`, no código do próprio impresso: 1-Hora,
  // 2-Dia, 3-Mês, 4-Ano.
  //
  // Regra de negócio: TESTEI a hipótese de que "ano" ficaria implícito
  // (caixinha em branco pra idade em anos), mas um exemplo manuscrito real
  // do usuário mostrou o código "4" escrito na caixinha mesmo pra um
  // paciente de 68 ANOS — ou seja, a hipótese estava errada. Padrão real:
  // a caixinha SEMPRE recebe o código da unidade, sem exceção pra "ano",
  // igual a todo outro campo de múltipla escolha desta ficha.
  //
  // Achei a caixinha certa depois de errar duas vezes: (1) achei que não
  // existia; (2) achei uma que na verdade era a moldura do número do
  // campo "11". A caixinha de verdade fica ENTRE o valor da idade e a
  // lista "1-Hora 2-Dia 3-Mês 4-Ano" (não depois da lista) — é a mesma
  // caixa que eu tinha atribuído por engano ao valor numérico da idade
  // antes. Corrigido: ver HEADER_BOXES.age (realocado) e
  // HEADER_BOXES.ageUnit.
  ageUnit?: '1' | '2' | '3' | '4' | null;
  sex?: 'M' | 'F' | 'I' | null;
  motherName?: string | null;
  cns?: string | null;
  // Campo 13 (Raça/Cor): código de 1 a 9 do impresso (1-Branca, 2-Preta,
  // 3-Amarela, 4-Parda, 5-Indígena, 9-Ignorado).
  race?: '1' | '2' | '3' | '4' | '5' | '9' | null;
  municipality?: string | null;
  clinicalNotes?: string | null;
  // Campos abaixo só existem em `app.patients` e só são usados pela ficha
  // do e-SUS Notifica (COVID19) — nenhuma ficha "Sinan NET" clássica tem
  // campo de CPF ou UF de residência no cabeçalho numerado 1-30.
  cpf?: string | null;
  // UF de residência (sigla, ex. "SP") — não confundir com `municipality`
  // (cidade), que já existe acima.
  state?: string | null;
}

const onlyDigits = (s: string | null | undefined): string => (s ?? '').replace(/\D/g, '');

const formatDateBR = (s: string | null | undefined): string => {
  if (!s) return '';
  const trimmed = s.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  const br = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(trimmed);
  if (br) return br[0];
  return trimmed;
};

/**
 * Cada ficha do SINAN reaproveita conceitualmente o mesmo cabeçalho de
 * identificação, mas a posição exata varia por ficha — às vezes por um
 * deslocamento uniforme simples (xOffset/yOffset aplicados em cima de
 * HEADER_BOXES), às vezes não. NÃO assuma que o deslocamento uniforme vale
 * pra uma ficha nova sem testar: gerei a hipótese comparando a posição de
 * rótulos-âncora extraídos do PDF-base contra os mesmos rótulos em Animais
 * Peçonhentos, e só validei visualmente depois (sobrepor caixas transladadas
 * no PDF-base + render em PNG de alta resolução).
 *
 * - ANTIRRÁBICO: deslocamento uniforme bateu exato em todos os campos
 *   (+39.7 a +39.8pt Y, +1.5 a +1.6pt X) — usa xOffset/yOffset puro.
 * - TUBERCULOSE: o deslocamento uniforme NÃO bateu — campos da coluna
 *   direita (datas, Nome da mãe) e da esquerda (Unidade, Nome do Paciente)
 *   tinham deltas de X diferentes entre si. Recalibrei cada campo
 *   individualmente por medição de pixel direta (não por transferência de
 *   delta) — ver `headerBoxes` abaixo, que substitui HEADER_BOXES por
 *   inteiro pra esta ficha.
 */
interface FormTemplate {
  file: string;
  xOffset: number;
  yOffset: number;
  // Quando presente, substitui HEADER_BOXES por inteiro pra esta ficha —
  // usado quando o deslocamento uniforme (xOffset/yOffset) não é suficiente
  // e cada campo precisou de coordenada própria (ver TUBERCULOSE).
  headerBoxes?: Record<string, HeaderBox>;
  // Coordenadas dos campos do CORPO (17+) desta ficha, chaveadas pelo mesmo
  // código semântico usado no schema de
  // `packages/domain/src/notification/schemas/<doenca>.ts` (ex.: `doses_dtp`,
  // não o número oficial do campo). Sempre coordenada ABSOLUTA já medida
  // direto no PDF-base desta ficha (`xOffset`/`yOffset` do template NÃO se
  // aplicam aqui — não existe "ficha de referência" pro corpo, cada uma é
  // medida do zero). `HeaderBox.page` seleciona a página (0 = primeira).
  bodyBoxes?: Record<string, HeaderBox>;
}

const FORM_TEMPLATES: Record<string, FormTemplate> = {
  ACIDENTE_ANIMAL_PECONHENTO: { file: 'Animais_Peconhentos_v5.pdf', xOffset: 0, yOffset: 0 },
  // COQUELUCHE: deslocamento uniforme bateu em TODOS os campos do cabeçalho
  // (notificação, unidade, sintomas, nome, nascimento, idade/unidade, sexo,
  // raça, CNS, nome da mãe) — confirmado por 2 rounds de render com
  // `debugBorders:true` + leitura direta do PDF resultante (grid de
  // referência de 5pt sobreposto ao PDF-base pra medir a posição real das
  // linhas antes de testar o deslocamento). Primeira tentativa (0,0) caiu
  // sistematicamente ~1 linha acima do campo certo; -30pt em Y corrigiu
  // todos de uma vez, sem precisar de headerBoxes individual por campo.
  COQUELUCHE: {
    file: 'Coqueluche_v5.pdf',
    xOffset: 0,
    yOffset: -30,
    // Corpo (campos 31-64, ficha de 2 páginas) — PRIMEIRA RODADA de
    // calibração, medida com grid de referência de 5pt sobreposto ao
    // PDF-base (não transferência de delta de nenhuma outra ficha, já que
    // não existe "corpo de referência" — cada ficha é sua própria fonte).
    // Códigos batem com `packages/domain/src/notification/schemas/coqueluche.ts`.
    //
    // STATUS (2026-09-11): render de verificação com debugBorders:true
    // confirmou o CABEÇALHO 100% correto e a MAIORIA dos campos do corpo
    // (checkboxes de sintomas/complicações, datas de internação/coleta,
    // classificação final, evolução) caindo na caixa certa. Segunda rodada
    // de verificação resolveu 2 dos 3 campos incertos originais
    // (`contato_outro_especifique`, `doses_dtp` — confirmados corretos).
    // `data_inicio_tosse` continua incerto mesmo após 3 tentativas — ver
    // comentário no próprio campo. Diferente do cabeçalho (que teve várias
    // rodadas com exemplo manuscrito real do usuário antes de fechar), o
    // corpo desta ficha ainda não teve essa confirmação externa.
    bodyBoxes: {
      data_investigacao: { x: 100, y: 303, width: 55, height: 9, comb: true, maxLength: 8, fontSize: 6 },
      ocupacao: { x: 220, y: 303, width: 325, height: 9 },
      unidade_notificante_sentinela: { x: 557, y: 310, width: 10, height: 10, align: TextAlignment.Center },
      contato_caso_suspeito_confirmado: { x: 557, y: 291, width: 10, height: 10, align: TextAlignment.Center },
      // Recalibrado com grid fino de 5pt focado nesta região (y150-300):
      // "7-Outro:___" fica na 2ª linha da legenda do campo 34 (y≈273), logo
      // após o texto do rótulo "7-Outro:" (que termina ~x=248), até antes de
      // "8-Sem História de Contato" (~x=420). Confirmado por render de
      // verificação; y:270 (não 272) pra não encostar na linha "3-Trabalho"
      // acima.
      contato_outro_especifique: { x: 252, y: 270, width: 165, height: 7, fontSize: 6 },
      nome_contato: { x: 115, y: 255, width: 450, height: 9 },
      endereco_contato: { x: 40, y: 230, width: 530, height: 9 },
      // Recalibrado com grid fino: legenda do campo 37 ocupa 2 linhas
      // (y≈213 e y≈203) — a caixinha de resposta única fica centralizada
      // verticalmente entre as duas, ~y=210.
      doses_dtp: { x: 557, y: 210, width: 10, height: 10, align: TextAlignment.Center },
      data_ultima_dose: { x: 497, y: 198, width: 60, height: 9, comb: true, maxLength: 8, fontSize: 6 },
      // AINDA INCERTO após 3 tentativas (168 → 157 → 152) — a mesma
      // sobreposição com o rótulo "39 Data do Início da Tosse" persistiu
      // igual nas duas últimas, o que sugere ou (a) o campo precisa de uma
      // correção bem maior que 5-10pt de cada vez, ou (b) o que estou vendo
      // é um artefato de como o PDF de verificação extrai texto em ordem de
      // conteúdo, não a posição visual real. Sem uma segunda fonte de
      // confirmação (ex.: exemplo manuscrito real, como foi feito pro
      // cabeçalho), não vou seguir ajustando às cegas — documentando a
      // incerteza em vez de fingir calibrado.
      data_inicio_tosse: { x: 40, y: 152, width: 55, height: 9, comb: true, maxLength: 8, fontSize: 6 },
      sintoma_tosse: { x: 195, y: 148, width: 9, height: 9, align: TextAlignment.Center },
      sintoma_cianose: { x: 385, y: 148, width: 9, height: 9, align: TextAlignment.Center },
      sintoma_temperatura_menor_38: { x: 555, y: 148, width: 9, height: 9, align: TextAlignment.Center },
      sintoma_tosse_paroxistica: { x: 195, y: 132, width: 9, height: 9, align: TextAlignment.Center },
      sintoma_vomitos: { x: 385, y: 132, width: 9, height: 9, align: TextAlignment.Center },
      sintoma_temperatura_maior_igual_38: { x: 555, y: 132, width: 9, height: 9, align: TextAlignment.Center },
      sintoma_respiracao_ruidosa_guincho: { x: 195, y: 112, width: 9, height: 9, align: TextAlignment.Center },
      sintoma_apneia: { x: 385, y: 112, width: 9, height: 9, align: TextAlignment.Center },
      sintoma_outros: { x: 555, y: 112, width: 9, height: 9, align: TextAlignment.Center },
      sintoma_outros_especifique: { x: 560, y: 100, width: 30, height: 7, fontSize: 5 },
      complicacao_pneumonia_broncopneumonia: { x: 390, y: 65, width: 9, height: 9, align: TextAlignment.Center },
      complicacao_desidratacao: { x: 478, y: 65, width: 9, height: 9, align: TextAlignment.Center },
      complicacao_desnutricao: { x: 555, y: 65, width: 9, height: 9, align: TextAlignment.Center },
      complicacao_encefalopatia_convulsoes: { x: 390, y: 48, width: 9, height: 9, align: TextAlignment.Center },
      complicacao_otite: { x: 478, y: 48, width: 9, height: 9, align: TextAlignment.Center },
      complicacao_outras: { x: 555, y: 48, width: 9, height: 9, align: TextAlignment.Center },
      complicacao_outras_especifique: { x: 560, y: 40, width: 30, height: 7, fontSize: 5 },
      // Página 2 (page: 1)
      ocorreu_hospitalizacao: { x: 195, y: 783, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      data_internacao: { x: 240, y: 783, width: 95, height: 9, comb: true, maxLength: 8, fontSize: 6, page: 1 },
      uf_hospital: { x: 345, y: 783, width: 30, height: 9, page: 1 },
      municipio_hospital: { x: 390, y: 783, width: 140, height: 9, page: 1 },
      nome_hospital: { x: 115, y: 760, width: 400, height: 9, page: 1 },
      utilizou_antibiotico: { x: 557, y: 718, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      data_administracao_antibiotico: { x: 497, y: 722, width: 65, height: 9, comb: true, maxLength: 8, fontSize: 6, page: 1 },
      coleta_material_nasofaringe: { x: 195, y: 690, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      data_coleta_material: { x: 240, y: 685, width: 95, height: 9, comb: true, maxLength: 8, fontSize: 6, page: 1 },
      resultado_cultura: { x: 557, y: 693, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      identificacao_comunicantes_intimos: { x: 285, y: 650, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      quantos_comunicantes: { x: 305, y: 650, width: 30, height: 9, comb: true, maxLength: 3, fontSize: 6, page: 1 },
      casos_secundarios_confirmados: { x: 557, y: 655, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      coleta_material_comunicantes: { x: 285, y: 605, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      em_quantos_coletado: { x: 305, y: 605, width: 30, height: 9, comb: true, maxLength: 3, fontSize: 6, page: 1 },
      comunicantes_cultura_positiva: { x: 420, y: 605, width: 30, height: 9, comb: true, maxLength: 3, fontSize: 6, page: 1 },
      medidas_prevencao_controle: { x: 557, y: 612, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      classificacao_final: { x: 190, y: 572, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      criterio_confirmacao_descarte: { x: 557, y: 572, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      doenca_relacionada_trabalho: { x: 190, y: 540, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      evolucao: { x: 557, y: 542, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      data_obito: { x: 40, y: 508, width: 55, height: 9, comb: true, maxLength: 8, fontSize: 6, page: 1 },
      data_encerramento: { x: 195, y: 508, width: 55, height: 9, comb: true, maxLength: 8, fontSize: 6, page: 1 },
    },
  },
  // Campo 7 nesta ficha se chama "Data do Atendimento" (não "Data dos
  // Primeiros Sintomas" — não existe "sintoma" num atendimento profilático).
  // Mapeado no mesmo slot `symptomOnsetDate` porque é estruturalmente a
  // mesma posição/tipo de campo (segunda data do cabeçalho); quem chamar
  // generateSinanFormPdf pra esta ficha deve passar a data do atendimento
  // nesse campo.
  //
  // Chave renomeada de `ATENDIMENTO_ANTIRRABICO` pra `RAIVA_HUMANA` (2026-09-11)
  // pra bater com o código real cadastrado em `app.notifiable_diseases`
  // (migration 0049) — mesmo PDF (`anti_rabico_v5.pdf`), sem mudança de
  // coordenada nenhuma. Seguro: esta tabela ainda não está ligada a nenhuma
  // rota, então não havia nenhum consumidor usando a chave antiga.
  RAIVA_HUMANA: {
    file: 'anti_rabico_v5.pdf',
    xOffset: 1.5,
    yOffset: 39.75,
    // Corpo (campos 31-60, ficha de 2 páginas) calibrado em 11/09/2026:
    // grid de 5pt sobreposto ao PDF-base + 4 rounds de render de
    // verificação com debugBorders:true. 1ª tentativa tinha TODO o corpo
    // ~18-20pt alto demais (mesmo padrão sistemático já visto em
    // Tuberculose) — corrigido com shift uniforme nas duas páginas. Depois
    // do ajuste, a grande maioria dos ~50 campos confirmada na linha
    // certa, incluindo as 3 datas de dose testadas na página 2. **2 campos
    // ficaram genuinamente incertos após várias tentativas** — ver
    // comentário em `data_exposicao` e `data_vencimento_vacina` abaixo,
    // mesmo padrão de transparência de `data_inicio_tosse` (Coqueluche).
    // Códigos batem com packages/domain/.../schemas/raiva-humana.ts.
    bodyBoxes: {
      ocupacao: { x: 45, y: 376, width: 510, height: 9 },
      exposicao_contato_indireto: { x: 205, y: 358, width: 10, height: 10, align: TextAlignment.Center },
      exposicao_arranhadura: { x: 290, y: 358, width: 10, height: 10, align: TextAlignment.Center },
      exposicao_lambedura: { x: 390, y: 358, width: 10, height: 10, align: TextAlignment.Center },
      exposicao_mordedura: { x: 460, y: 358, width: 10, height: 10, align: TextAlignment.Center },
      exposicao_outro: { x: 555, y: 358, width: 10, height: 10, align: TextAlignment.Center },

      localizacao_mucosa: { x: 290, y: 338, width: 10, height: 10, align: TextAlignment.Center },
      localizacao_cabeca_pescoco: { x: 355, y: 338, width: 10, height: 10, align: TextAlignment.Center },
      localizacao_maos_pes: { x: 420, y: 338, width: 10, height: 10, align: TextAlignment.Center },
      localizacao_tronco: { x: 460, y: 338, width: 10, height: 10, align: TextAlignment.Center },
      localizacao_membros_superiores: { x: 500, y: 338, width: 10, height: 10, align: TextAlignment.Center },
      localizacao_membros_inferiores: { x: 557, y: 338, width: 10, height: 10, align: TextAlignment.Center },

      ferimento: { x: 195, y: 312, width: 10, height: 10, align: TextAlignment.Center },
      tipo_ferimento_profundo: { x: 290, y: 312, width: 10, height: 10, align: TextAlignment.Center },
      tipo_ferimento_superficial: { x: 390, y: 312, width: 10, height: 10, align: TextAlignment.Center },
      tipo_ferimento_dilacerante: { x: 460, y: 312, width: 10, height: 10, align: TextAlignment.Center },
      // AINDA INCERTO após 4 tentativas (y:310→290→345→320) — o campo 36
      // fica numa posição de layout multi-coluna difícil de medir sem
      // zoom real; a cada ajuste o valor caiu numa linha errada diferente
      // (34, cabeçalho do campo 32, campo 33), nunca na linha 36 de fato.
      // Documentando a incerteza em vez de continuar ajustando às cegas,
      // mesmo padrão de `data_inicio_tosse` em Coqueluche — precisa de uma
      // segunda fonte de confirmação (zoom real) antes de fechar.
      data_exposicao: { x: 45, y: 320, width: 95, height: 9, comb: true, maxLength: 8, fontSize: 6 },

      antecedente_tratamento_antirrabico: { x: 195, y: 280, width: 10, height: 10, align: TextAlignment.Center },
      antecedente_tratamento_pre_exposicao: { x: 290, y: 280, width: 10, height: 10, align: TextAlignment.Center },
      antecedente_tratamento_pos_exposicao: { x: 460, y: 280, width: 10, height: 10, align: TextAlignment.Center },
      antecedente_tratamento_quando_concluido: { x: 195, y: 260, width: 10, height: 10, align: TextAlignment.Center },
      numero_doses_aplicadas_anteriormente: { x: 460, y: 260, width: 60, height: 9 },

      especie_animal: { x: 557, y: 238, width: 10, height: 10, align: TextAlignment.Center },
      especie_animal_especifique: { x: 260, y: 230, width: 280, height: 7, fontSize: 5 },
      condicao_animal: { x: 195, y: 205, width: 10, height: 10, align: TextAlignment.Center },
      animal_passivel_observacao: { x: 557, y: 208, width: 10, height: 10, align: TextAlignment.Center },

      tratamento_indicado: { x: 557, y: 180, width: 10, height: 10, align: TextAlignment.Center },
      laboratorio_produtor_vacina: { x: 557, y: 158, width: 10, height: 10, align: TextAlignment.Center },
      laboratorio_produtor_vacina_especifique: { x: 460, y: 152, width: 90, height: 7, fontSize: 5 },
      numero_lote_vacina: { x: 45, y: 100, width: 200, height: 9 },
      // AINDA INCERTO após 3 tentativas (y:130→100→55) — nas duas
      // primeiras o valor caía na linha do campo 43/44 (acima da linha
      // real de "46 Data do Vencimento"); na terceira (55) passou longe
      // demais pro outro lado, caindo depois do rodapé da página. A
      // distância real até a linha 46 não bateu com nenhuma estimativa via
      // grid de 5pt. Documentando a incerteza em vez de continuar
      // ajustando às cegas — precisa de zoom real antes de fechar.
      // Mantendo 130 (mais perto do range plausível) até a próxima rodada.
      data_vencimento_vacina: { x: 460, y: 130, width: 95, height: 9, comb: true, maxLength: 8, fontSize: 6 },

      // Página 2 (page: 1).
      data_1a_dose: { x: 45, y: 768, width: 65, height: 9, comb: true, maxLength: 4, fontSize: 6, page: 1 },
      data_2a_dose: { x: 180, y: 768, width: 65, height: 9, comb: true, maxLength: 4, fontSize: 6, page: 1 },
      data_3a_dose: { x: 310, y: 768, width: 65, height: 9, comb: true, maxLength: 4, fontSize: 6, page: 1 },
      data_4a_dose: { x: 435, y: 768, width: 65, height: 9, comb: true, maxLength: 4, fontSize: 6, page: 1 },
      data_5a_dose: { x: 530, y: 768, width: 65, height: 9, comb: true, maxLength: 4, fontSize: 6, page: 1 },

      condicao_final_animal: { x: 557, y: 725, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      houve_interrupcao_tratamento: { x: 195, y: 700, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      motivo_interrupcao: { x: 557, y: 697, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      abandono_unidade_procurou_paciente: { x: 460, y: 678, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      evento_adverso_vacina: { x: 557, y: 678, width: 10, height: 10, align: TextAlignment.Center, page: 1 },

      indicacao_soro_antirrabico: { x: 195, y: 658, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      peso_paciente_kg: { x: 240, y: 648, width: 40, height: 9, page: 1 },
      quantidade_soro_aplicada_ml: { x: 400, y: 648, width: 40, height: 9, page: 1 },
      tipo_soro: { x: 480, y: 648, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      infiltracao_soro_ferimentos: { x: 195, y: 630, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      infiltracao_soro_tipo: { x: 290, y: 625, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      laboratorio_produtor_soro: { x: 557, y: 630, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      laboratorio_produtor_soro_especifique: { x: 460, y: 615, width: 90, height: 7, fontSize: 5, page: 1 },
      // numero_partida_soro/evento_adverso_soro/data_encerramento: bons o
      // bastante (linha certa, leve sobreposição de 1-2 caracteres no
      // texto impresso "58 Número da Partida"/"60 Data do Encerramento") —
      // aceito, mesmo padrão de tolerância já usado nos outros campos
      // desta ficha e de SRAG/COVID19.
      numero_partida_soro: { x: 45, y: 548, width: 200, height: 9, page: 1 },
      evento_adverso_soro: { x: 460, y: 548, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      data_encerramento: { x: 500, y: 548, width: 65, height: 9, comb: true, maxLength: 8, fontSize: 6, page: 1 },

      observacoes: { x: 90, y: 522, width: 460, height: 9, page: 1 },
    },
  },
  // Campo 7 aqui se chama "Data do Diagnóstico" — mesmo slot
  // `symptomOnsetDate` pelo mesmo motivo do Antirrábico acima.
  TUBERCULOSE: {
    file: 'Tuberculose_v5.pdf',
    xOffset: 0,
    yOffset: 0,
    headerBoxes: {
      notificationDate: { x: 432, y: 706, width: 126, height: 11, comb: true, maxLength: 8, fontSize: 8 },
      symptomOnsetDate: { x: 432, y: 646, width: 126, height: 11, comb: true, maxLength: 8, fontSize: 8 },
      // notifyingUnit/patientName/motherName: y corrigido depois que o
      // usuário reportou "quase na linha divisória" na primeira versão.
      // A transferência de delta de Animais Peçonhentos tinha colocado os
      // três QUASE EM CIMA da borda inferior real da linha (achei por
      // medição de pixel: borda em y:645.5/615.0/525.5 — meu valor
      // original deixava só 0.5 a 1.8pt de folga, praticamente em cima da
      // linha). Agora com ~2pt de folga acima da borda de verdade.
      notifyingUnit: { x: 61.9, y: 648, width: 267, height: 11 },
      patientName: { x: 63, y: 617, width: 373, height: 11 },
      birthDate: { x: 432, y: 616, width: 126, height: 11, comb: true, maxLength: 8, fontSize: 8 },
      // CAUSA RAIZ FINALMENTE ACHADA (usuário reportou 3 vezes): eu vinha
      // colocando o valor da idade no vão apertado ao lado do rótulo — mas
      // o lugar certo é uma linha própria com dois tracinhos impressos
      // logo ABAIXO de "(ou) Idade" (mesmo princípio de datas/CNS: escrever
      // por cima dos tracinhos). Só achei esses tracinhos numa varredura de
      // pixel bem abaixo do rótulo (quase colados na linha de
      // "Escolaridade"), em x:74.5 e x:88.5. Confirmado com exemplo
      // manuscrito do usuário mostrando "68" escrito ali.
      age: { x: 68, y: 586.5, width: 28, height: 8, fontSize: 7, align: TextAlignment.Center },
      ageUnit: { x: 108, y: 593, width: 11, height: 11, fontSize: 7, align: TextAlignment.Center },
      motherName: { x: 234.4, y: 528, width: 351, height: 11 },
      cns: { x: 49, y: 525, width: 175, height: 10, comb: true, maxLength: 15, fontSize: 8 },
      sex: { x: 225, y: 600, width: 11, height: 11, align: TextAlignment.Center },
      race: { x: 545, y: 599, width: 10.5, height: 11, align: TextAlignment.Center },
    },
    // Corpo (campos 31-47) calibrado em 11/09/2026: grid de 5pt sobreposto
    // ao PDF-base + 3 rounds de render de verificação com
    // debugBorders:true. 1ª tentativa tinha TODO o corpo ~18pt alto demais
    // (sistemático, confirmado comparando vários campos que vazavam pra
    // linha/seção anterior) — corrigido com um shift uniforme. 2ª rodada
    // ainda tinha o grupo "Doenças e Agravos Associados" vazando pra
    // dentro da lista de opções do campo 36 (Se Extrapulmonar) — corrigido
    // baixando mais ~10pt. 3ª rodada confirmou os campos 46/47 (datas
    // finais) que na 1ª/2ª tentativa não apareciam de jeito nenhum (y
    // longe demais da linha real). Todos os campos confirmados na posição
    // certa depois disso. Códigos batem com
    // packages/domain/.../schemas/tuberculose.ts.
    bodyBoxes: {
      numero_prontuario: { x: 45, y: 360, width: 255, height: 9 },
      tipo_entrada: { x: 557, y: 360, width: 10, height: 10, align: TextAlignment.Center },

      populacao_privada_liberdade: { x: 310, y: 337, width: 10, height: 10, align: TextAlignment.Center },
      profissional_saude: { x: 420, y: 337, width: 10, height: 10, align: TextAlignment.Center },
      populacao_situacao_rua: { x: 310, y: 327, width: 10, height: 10, align: TextAlignment.Center },
      imigrante: { x: 420, y: 327, width: 10, height: 10, align: TextAlignment.Center },
      beneficiario_transferencia_renda: { x: 557, y: 335, width: 10, height: 10, align: TextAlignment.Center },

      forma_clinica: { x: 310, y: 312, width: 10, height: 10, align: TextAlignment.Center },
      localizacao_extrapulmonar: { x: 557, y: 312, width: 10, height: 10, align: TextAlignment.Center },

      agravo_aids: { x: 310, y: 277, width: 10, height: 10, align: TextAlignment.Center },
      agravo_alcoolismo: { x: 395, y: 277, width: 10, height: 10, align: TextAlignment.Center },
      agravo_diabetes: { x: 470, y: 277, width: 10, height: 10, align: TextAlignment.Center },
      agravo_doenca_mental: { x: 557, y: 277, width: 10, height: 10, align: TextAlignment.Center },
      agravo_uso_drogas_ilicitas: { x: 320, y: 265, width: 10, height: 10, align: TextAlignment.Center },
      agravo_tabagismo: { x: 470, y: 265, width: 10, height: 10, align: TextAlignment.Center },
      agravo_outras: { x: 557, y: 265, width: 10, height: 10, align: TextAlignment.Center },
      agravo_outras_especifique: { x: 480, y: 257, width: 90, height: 7, fontSize: 5 },

      baciloscopia_escarro_diagnostico: { x: 310, y: 262, width: 10, height: 10, align: TextAlignment.Center },
      radiografia_torax: { x: 557, y: 262, width: 10, height: 10, align: TextAlignment.Center },
      hiv: { x: 557, y: 242, width: 10, height: 10, align: TextAlignment.Center },
      terapia_antirretroviral_durante_tratamento: { x: 310, y: 227, width: 10, height: 10, align: TextAlignment.Center },
      histopatologia: { x: 557, y: 222, width: 10, height: 10, align: TextAlignment.Center },
      cultura: { x: 310, y: 200, width: 10, height: 10, align: TextAlignment.Center },
      teste_molecular_rapido_tb: { x: 540, y: 194, width: 10, height: 10, align: TextAlignment.Center },
      teste_sensibilidade: { x: 557, y: 177, width: 10, height: 10, align: TextAlignment.Center },
      data_inicio_tratamento_atual: { x: 45, y: 90, width: 95, height: 9, comb: true, maxLength: 8, fontSize: 6 },
      total_contatos_identificados: { x: 200, y: 90, width: 100, height: 9 },
    },
  },
  // MALÁRIA: deslocamento uniforme bateu em praticamente todos os campos
  // (+9.9pt X em 7 de 8 rótulos-âncora, +18.9pt Y — só "Data da
  // Notificação" destoou um pouco, mesmo padrão de outlier já visto em
  // Tuberculose). Confirmado por sobreposição de caixas no PDF-base
  // renderizado em alta resolução: datas (3), CNS (15 células), idade
  // (linha de tracinhos abaixo do rótulo), unidade de idade, sexo e
  // raça/cor bateram certo com o deslocamento simples, sem recalibração
  // individual.
  //
  // EXCEÇÃO (mesma lição de Tuberculose): notifyingUnit/patientName/
  // motherName, calculados só pelo deslocamento, ficavam de novo a
  // 0.4-0.6pt da borda inferior real da linha — quase em cima dela.
  // Corrigido individualmente com ~2pt de folga (ver comentário em cada
  // um), por isso esta ficha usa `headerBoxes` completo em vez de só
  // xOffset/yOffset, apesar do deslocamento servir pra quase tudo.
  MALARIA: {
    file: 'Malaria_v5.pdf',
    xOffset: 0,
    yOffset: 0,
    headerBoxes: {
      notificationDate: { x: 451.5, y: 707.9, width: 120, height: 14, comb: true, maxLength: 8, fontSize: 8 },
      symptomOnsetDate: { x: 448.7, y: 651.9, width: 120, height: 14, comb: true, maxLength: 8, fontSize: 8 },
      // Borda inferior real da linha em y:651.5 (medida por pixel) — o
      // deslocamento simples (651.9) deixava só 0.4pt de folga.
      notifyingUnit: { x: 70.9, y: 653.5, width: 267, height: 11 },
      // Borda inferior real em y:619.5 — deslocamento simples (618.9)
      // ficava ABAIXO da borda.
      patientName: { x: 71.9, y: 621.5, width: 373, height: 11 },
      birthDate: { x: 452.4, y: 620.9, width: 119, height: 14, comb: true, maxLength: 8, fontSize: 8 },
      age: { x: 76.9, y: 591.9, width: 28, height: 8, fontSize: 7, align: TextAlignment.Center },
      // Corrigido: o valor por deslocamento (604.9) não foi conferido por
      // pixel na hora — a caixinha real fica ~6.6pt mais abaixo (y:598.3),
      // numa altura diferente da caixinha de sexo nesta ficha (ao contrário
      // de Animais Peçonhentos, onde as duas ficam quase na mesma altura).
      // Usuário reportou o "4" parcialmente fora do quadrado.
      ageUnit: { x: 117, y: 598.5, width: 11, height: 10.5, fontSize: 7, align: TextAlignment.Center },
      // Borda inferior real em y:531.5 — deslocamento simples (531.9)
      // deixava só 0.4pt de folga.
      motherName: { x: 248.9, y: 533.5, width: 351, height: 11 },
      cns: { x: 57.9, y: 529.9, width: 174, height: 11, comb: true, maxLength: 15, fontSize: 8 },
      sex: { x: 239.9, y: 605.9, width: 11, height: 11, align: TextAlignment.Center },
      race: { x: 559.3, y: 604.9, width: 10.8, height: 11, align: TextAlignment.Center },
    },
    // Corpo (campos 31-50, ficha de 1 página + comprovante destacável — o
    // comprovante não é preenchido, é um recibo pro paciente sem fonte de
    // dados própria) calibrado em 12/09/2026 pelo mesmo método de
    // Meningite/Sarampo (extração de texto posicionado via `pdfjs-dist`,
    // sem renderizador visual disponível neste ambiente — ver comentário
    // em MENINGITE acima). Campos de data confirmados por marca de comb
    // real extraída da própria ficha; campos de código único sem marca de
    // texto própria (retângulo vetorial puro) têm posição estimada pela
    // proximidade das opções/rótulo — confiança menor, mesma ressalva já
    // registrada em Meningite/Sarampo.
    bodyBoxes: {
      data_investigacao: { x: 75, y: 349, width: 100, height: 9, comb: true, maxLength: 8, fontSize: 6 },
      ocupacao: { x: 250, y: 349, width: 300, height: 9 },
      principal_atividade_15_dias: { x: 370, y: 320, width: 10, height: 10, align: TextAlignment.Center },
      tipo_lamina: { x: 475, y: 327, width: 9, height: 9, align: TextAlignment.Center },
      sintomas: { x: 555, y: 327, width: 9, height: 9, align: TextAlignment.Center },
      data_exame: { x: 165, y: 288, width: 90, height: 9, comb: true, maxLength: 8, fontSize: 6 },
      resultado_exame: { x: 557, y: 283, width: 10, height: 10, align: TextAlignment.Center },
      parasitos_mm3: { x: 494, y: 270, width: 70, height: 9 },
      parasitemia_cruzes: { x: 557, y: 245, width: 10, height: 10, align: TextAlignment.Center },
      esquema_tratamento: { x: 557, y: 165, width: 10, height: 10, align: TextAlignment.Center },
      esquema_tratamento_outro_especifique: { x: 370, y: 114, width: 180, height: 7, fontSize: 5 },
      data_inicio_tratamento: { x: 468, y: 118, width: 90, height: 9, comb: true, maxLength: 8, fontSize: 6 },
      // Página 2 a partir daqui.
      classificacao_final: { x: 210, y: 778, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      caso_autoctone: { x: 210, y: 728, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      uf_provavel_infeccao: { x: 286, y: 735, width: 25, height: 9, maxLength: 2, page: 1 },
      pais_provavel_infeccao: { x: 346, y: 728, width: 130, height: 9, page: 1 },
      municipio_provavel_infeccao: { x: 230, y: 709, width: 95, height: 9, page: 1 },
      distrito_provavel_infeccao: { x: 385, y: 706, width: 80, height: 9, page: 1 },
      bairro_provavel_infeccao: { x: 515, y: 709, width: 45, height: 9, page: 1 },
      localidade_provavel_infeccao: { x: 232, y: 673, width: 320, height: 9, page: 1 },
      data_encerramento: { x: 470, y: 656, width: 90, height: 9, comb: true, maxLength: 8, fontSize: 6, page: 1 },
      observacoes_adicionais: { x: 200, y: 618, width: 350, height: 9, page: 1 },
    },
  },
  // CHAGAS: deslocamento uniforme (+2.2pt X, -86.35pt Y, calculado por
  // transformação de coordenada inferior-esquerda, não por diferença de
  // yTop direta) bateu certo em quase tudo: 3 datas, CNS (15 células),
  // idade (linha de tracinhos), sexo, raça/cor e os 3 campos de texto
  // livre (Nome do Paciente, Unidade de Saúde, Nome da mãe) — todos
  // confirmados por sobreposição visual no PDF-base em alta resolução.
  //
  // EXCEÇÃO, DE NOVO: ageUnit. Igual em Malária, a caixinha do código de
  // unidade da idade não acompanha o deslocamento — fica numa altura
  // própria, bem diferente da caixinha de sexo (que aí sim bate com o
  // deslocamento). Parece ser um padrão: SEMPRE conferir ageUnit
  // individualmente por pixel, nunca confiar em deslocamento pra ele.
  CHAGAS: {
    file: 'Chagas_v5.pdf',
    xOffset: 0,
    yOffset: 0,
    headerBoxes: {
      notificationDate: { x: 443.8, y: 602.65, width: 120, height: 14, comb: true, maxLength: 8, fontSize: 8 },
      symptomOnsetDate: { x: 441.0, y: 546.65, width: 120, height: 14, comb: true, maxLength: 8, fontSize: 8 },
      notifyingUnit: { x: 63.2, y: 546.65, width: 267, height: 11 },
      patientName: { x: 64.2, y: 513.65, width: 373, height: 11 },
      birthDate: { x: 444.7, y: 515.65, width: 119, height: 14, comb: true, maxLength: 8, fontSize: 8 },
      age: { x: 69.2, y: 486.65, width: 28, height: 8, fontSize: 7, align: TextAlignment.Center },
      // Medido individualmente por pixel — não é o deslocamento simples
      // (que daria y:499.65 e ficaria ~7pt alto demais, sobre a moldura
      // do número do campo, não sobre a caixinha de resposta real).
      ageUnit: { x: 109, y: 492.5, width: 11, height: 11, fontSize: 7, align: TextAlignment.Center },
      motherName: { x: 241.2, y: 426.65, width: 351, height: 11 },
      cns: { x: 50.2, y: 424.65, width: 174, height: 11, comb: true, maxLength: 15, fontSize: 8 },
      sex: { x: 232.2, y: 500.65, width: 11, height: 11, align: TextAlignment.Center },
      race: { x: 551.6, y: 499.65, width: 10.8, height: 11, align: TextAlignment.Center },
    },
    // Corpo (campos 31-70, ficha de 2 páginas) calibrado em 12/09/2026 pelo
    // mesmo método de Meningite/Sarampo/Malária (extração de texto
    // posicionado via `pdfjs-dist`, sem renderizador visual disponível
    // neste ambiente — ver comentário em MENINGITE acima). Campos de data
    // confirmados por marca de comb real extraída da própria ficha; campos
    // de código único sem marca de texto própria têm posição estimada pela
    // proximidade das opções/rótulo — confiança menor, mesma ressalva já
    // registrada em Meningite/Sarampo/Malária. A grade de sorologia (ELISA/
    // Hemoaglutinação/IFI × IgM/IgG × S1/S2, campos 48-50) é a parte mais
    // incerta desta ficha, mesma categoria da grade sorológica de Sarampo.
    bodyBoxes: {
      data_investigacao: { x: 70, y: 242, width: 100, height: 9, comb: true, maxLength: 8, fontSize: 6 },
      ocupacao: { x: 250, y: 242, width: 300, height: 9 },
      deslocamento_detalhes: { x: 40, y: 216, width: 530, height: 9 },
      vestigios_triatomideos_intradomicilio: { x: 60, y: 138, width: 10, height: 10, align: TextAlignment.Center },
      data_encontro_vestigios: { x: 282, y: 133, width: 95, height: 9, comb: true, maxLength: 8, fontSize: 6 },
      uso_sangue_hemoderivados_120_dias: { x: 557, y: 136, width: 10, height: 10, align: TextAlignment.Center },
      controle_sorologico_unidade_hemoterapia: { x: 557, y: 118, width: 10, height: 10, align: TextAlignment.Center },
      manipulacao_contato_material_t_cruzi: { x: 557, y: 100, width: 10, height: 10, align: TextAlignment.Center },
      menor_9_meses_mae_infeccao_chagasica: { x: 557, y: 85, width: 10, height: 10, align: TextAlignment.Center },
      possibilidade_transmissao_via_oral: { x: 557, y: 71, width: 10, height: 10, align: TextAlignment.Center },
      // Página 2 a partir daqui.
      sintoma_assintomatico: { x: 72, y: 791, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      sintoma_febre_persistente: { x: 70, y: 774, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      sintoma_edema_face_membros: { x: 153, y: 791, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      sintoma_hepatomegalia: { x: 154, y: 774.8, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      sintoma_esplenomegalia: { x: 154, y: 758.6, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      sintoma_chagoma_inoculacao_sinal_romana: { x: 256, y: 761.4, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      sintoma_poliadenopatia: { x: 423, y: 796.2, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      sintoma_astenia: { x: 71, y: 758.8, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      sintoma_sinais_icc: { x: 257, y: 777.2, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      sintoma_taquicardia_persistente_arritmias: { x: 422, y: 781.5, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      sintoma_sinais_meningoencefalite: { x: 258, y: 792, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      sintoma_outros: { x: 423, y: 766.1, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      sintoma_outros_especifique: { x: 470, y: 767.1, width: 80, height: 7, fontSize: 5, page: 1 },
      data_coleta_parasitologico_direto: { x: 65, y: 702, width: 100, height: 9, comb: true, maxLength: 8, fontSize: 6, page: 1 },
      parasitologico_direto: { x: 350, y: 713, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      parasitologico_direto_tipo: { x: 557, y: 705, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      data_coleta_parasitologico_indireto: { x: 65, y: 663, width: 100, height: 9, comb: true, maxLength: 8, fontSize: 6, page: 1 },
      parasitologico_indireto: { x: 350, y: 673, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      parasitologico_indireto_tipo: { x: 557, y: 670, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      data_coleta_s1: { x: 65, y: 622, width: 100, height: 9, comb: true, maxLength: 8, fontSize: 6, page: 1 },
      data_coleta_s2: { x: 65, y: 587, width: 100, height: 9, comb: true, maxLength: 8, fontSize: 6, page: 1 },
      elisa_igm_s1: { x: 283, y: 619, width: 10, height: 9, align: TextAlignment.Center, page: 1 },
      elisa_igm_s2: { x: 283, y: 605, width: 10, height: 9, align: TextAlignment.Center, page: 1 },
      elisa_igg_s1: { x: 316, y: 619, width: 10, height: 9, align: TextAlignment.Center, page: 1 },
      elisa_igg_s2: { x: 316, y: 605, width: 10, height: 9, align: TextAlignment.Center, page: 1 },
      hemoaglutinacao_igm_s1: { x: 476, y: 617, width: 10, height: 9, align: TextAlignment.Center, page: 1 },
      hemoaglutinacao_igm_s2: { x: 476, y: 603, width: 10, height: 9, align: TextAlignment.Center, page: 1 },
      hemoaglutinacao_igg_s1: { x: 509, y: 617, width: 10, height: 9, align: TextAlignment.Center, page: 1 },
      hemoaglutinacao_igg_s2: { x: 509, y: 603, width: 10, height: 9, align: TextAlignment.Center, page: 1 },
      ifi_igm_s1: { x: 200, y: 553, width: 10, height: 9, align: TextAlignment.Center, page: 1 },
      ifi_igm_s1_titulo: { x: 270, y: 545, width: 45, height: 9, comb: true, maxLength: 3, fontSize: 6, page: 1 },
      ifi_igm_s2: { x: 200, y: 524, width: 10, height: 9, align: TextAlignment.Center, page: 1 },
      ifi_igm_s2_titulo: { x: 270, y: 522, width: 45, height: 9, comb: true, maxLength: 3, fontSize: 6, page: 1 },
      ifi_igg_s1: { x: 385, y: 553, width: 10, height: 9, align: TextAlignment.Center, page: 1 },
      ifi_igg_s1_titulo: { x: 469, y: 545, width: 45, height: 9, comb: true, maxLength: 3, fontSize: 6, page: 1 },
      ifi_igg_s2: { x: 385, y: 524, width: 10, height: 9, align: TextAlignment.Center, page: 1 },
      ifi_igg_s2_titulo: { x: 469, y: 522, width: 45, height: 9, comb: true, maxLength: 3, fontSize: 6, page: 1 },
      data_coleta_histopatologico: { x: 68, y: 479, width: 100, height: 9, comb: true, maxLength: 8, fontSize: 6, page: 1 },
      resultado_histopatologico: { x: 557, y: 487, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      tratamento_especifico: { x: 180, y: 465, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      tratamento_sintomatico: { x: 180, y: 452, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      droga_tratamento_especifico: { x: 557, y: 450, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      tempo_tratamento_dias: { x: 449, y: 449, width: 60, height: 9, page: 1 },
      medida_controle_triatomideos: { x: 145, y: 411, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      medida_fiscalizacao_sanitaria_hemoterapia: { x: 145, y: 394.5, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      medida_biosseguranca_laboratorio: { x: 343, y: 410, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      medida_outras: { x: 343, y: 393.7, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      medida_outras_especifique: { x: 402, y: 394, width: 140, height: 7, fontSize: 5, page: 1 },
      classificacao_final: { x: 180, y: 354, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      criterio_confirmacao_descarte: { x: 557, y: 355, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      evolucao_caso: { x: 430, y: 356, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      data_obito: { x: 459, y: 347, width: 100, height: 9, comb: true, maxLength: 8, fontSize: 6, page: 1 },
      modo_provavel_infeccao: { x: 557, y: 312, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      modo_provavel_infeccao_outra_especifique: { x: 250, y: 307, width: 150, height: 7, fontSize: 5, page: 1 },
      local_provavel_infeccao: { x: 490, y: 300, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      caso_autoctone: { x: 200, y: 277, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      uf_provavel_infeccao: { x: 345, y: 269, width: 25, height: 9, maxLength: 2, page: 1 },
      pais_provavel_infeccao: { x: 418, y: 291, width: 130, height: 9, page: 1 },
      municipio_provavel_infeccao: { x: 125, y: 261, width: 140, height: 9, page: 1 },
      distrito_provavel_infeccao: { x: 345, y: 259, width: 90, height: 9, page: 1 },
      bairro_provavel_infeccao: { x: 490, y: 260, width: 65, height: 9, page: 1 },
      doenca_relacionada_trabalho: { x: 557, y: 217, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      data_encerramento: { x: 458, y: 213, width: 100, height: 9, comb: true, maxLength: 8, fontSize: 6, page: 1 },
      observacoes: { x: 180, y: 180, width: 370, height: 9, page: 1 },
    },
  },
  // LEPTOSPIROSE e HEPATITES_VIRAIS: calibradas em 12/09/2026, sem
  // renderização visual disponível neste ambiente (mesmo método já usado em
  // MENINGITE/SARAMPO/MALARIA/CHAGAS — ver comentário detalhado em
  // MENINGITE acima: extração de texto posicionado via `pdfjs-dist` +
  // transferência de delta campo a campo a partir de ANIMAIS_PECONHENTOS,
  // confirmado por marca de comb própria de cada ficha). Verificado por PDF
  // achatado de teste + reextração de texto antes de fechar.
  LEPTOSPIROSE: {
    file: 'Ficha_Leptospirose.pdf',
    xOffset: 0,
    yOffset: 0,
    headerBoxes: {
      notificationDate: { x: 446.1, y: 668.2, width: 120, height: 14, comb: true, maxLength: 8, fontSize: 8 },
      symptomOnsetDate: { x: 444.8, y: 609.9, width: 120, height: 14, comb: true, maxLength: 8, fontSize: 8 },
      notifyingUnit: { x: 67.1, y: 609.9, width: 270, height: 11 },
      patientName: { x: 68.1, y: 576.9, width: 375, height: 11 },
      birthDate: { x: 448.6, y: 579.0, width: 119, height: 14, comb: true, maxLength: 8, fontSize: 8 },
      age: { x: 73.1, y: 549.9, width: 28, height: 8, fontSize: 7, align: TextAlignment.Center },
      ageUnit: { x: 113.1, y: 562.9, width: 11, height: 11, fontSize: 7, align: TextAlignment.Center },
      motherName: { x: 245.1, y: 490.0, width: 351, height: 11 },
      cns: { x: 54.0, y: 487.9, width: 174, height: 11, comb: true, maxLength: 15, fontSize: 8 },
      sex: { x: 236.1, y: 563.9, width: 11, height: 11, align: TextAlignment.Center },
      race: { x: 555.4, y: 563.0, width: 10.8, height: 11, align: TextAlignment.Center },
    },
    bodyBoxes: {
      data_investigacao: { x: 65, y: 307, width: 100, height: 9, comb: true, maxLength: 8, fontSize: 6 },
      ocupacao: { x: 250, y: 307, width: 300, height: 9 },
      situacao_risco_agua_lama_enchente: { x: 62, y: 275.5, width: 9, height: 9, align: TextAlignment.Center },
      situacao_risco_criacao_animais: { x: 247, y: 274.7, width: 9, height: 9, align: TextAlignment.Center },
      situacao_risco_caixa_dagua: { x: 406, y: 275.5, width: 9, height: 9, align: TextAlignment.Center },
      situacao_risco_fossa_caixa_gordura_esgoto: { x: 64, y: 259.7, width: 9, height: 9, align: TextAlignment.Center },
      situacao_risco_local_sinais_roedores: { x: 247, y: 256.4, width: 9, height: 9, align: TextAlignment.Center },
      situacao_risco_plantio_colheita: { x: 407, y: 260.5, width: 9, height: 9, align: TextAlignment.Center },
      situacao_risco_rio_corrego_lagoa_represa: { x: 62, y: 243.1, width: 9, height: 9, align: TextAlignment.Center },
      situacao_risco_roedores_diretamente: { x: 247, y: 241.1, width: 9, height: 9, align: TextAlignment.Center },
      situacao_risco_armazenamento_graos_alimentos: { x: 409, y: 250.1, width: 9, height: 9, align: TextAlignment.Center },
      situacao_risco_terreno_baldio: { x: 63, y: 228.8, width: 9, height: 9, align: TextAlignment.Center },
      situacao_risco_lixo_entulho: { x: 249, y: 226.2, width: 9, height: 9, align: TextAlignment.Center },
      situacao_risco_outras: { x: 409, y: 230.8, width: 9, height: 9, align: TextAlignment.Center },
      situacao_risco_outras_especifique: { x: 460, y: 228, width: 90, height: 7, fontSize: 5 },
      casos_anteriores_leptospirose_local: { x: 557, y: 205, width: 10, height: 10, align: TextAlignment.Center },
      casos_anteriores_humanos: { x: 127, y: 198.5, width: 9, height: 9, align: TextAlignment.Center },
      casos_anteriores_animais: { x: 302, y: 196.9, width: 9, height: 9, align: TextAlignment.Center },
      data_atendimento: { x: 68, y: 161, width: 95, height: 9, comb: true, maxLength: 8, fontSize: 6 },
      sintoma_febre: { x: 183, y: 163.5, width: 9, height: 9, align: TextAlignment.Center },
      sintoma_congestao_conjuntival: { x: 183, y: 149.2, width: 9, height: 9, align: TextAlignment.Center },
      sintoma_ictericia: { x: 185, y: 134.9, width: 9, height: 9, align: TextAlignment.Center },
      sintoma_hemorragia_pulmonar: { x: 185, y: 120.6, width: 9, height: 9, align: TextAlignment.Center },
      sintoma_mialgia: { x: 280, y: 163.5, width: 9, height: 9, align: TextAlignment.Center },
      sintoma_dor_panturrilha: { x: 279, y: 149.1, width: 9, height: 9, align: TextAlignment.Center },
      sintoma_insuficiencia_renal: { x: 280, y: 135.5, width: 9, height: 9, align: TextAlignment.Center },
      sintoma_outras_hemorragias: { x: 280, y: 119.5, width: 9, height: 9, align: TextAlignment.Center },
      sintoma_cefaleia: { x: 369, y: 165.6, width: 9, height: 9, align: TextAlignment.Center },
      sintoma_vomito: { x: 368, y: 151.4, width: 9, height: 9, align: TextAlignment.Center },
      sintoma_alteracoes_respiratorias: { x: 370, y: 138.2, width: 9, height: 9, align: TextAlignment.Center },
      sintoma_meningismo: { x: 369, y: 119.1, width: 9, height: 9, align: TextAlignment.Center },
      sintoma_prostracao: { x: 440, y: 165.6, width: 9, height: 9, align: TextAlignment.Center },
      sintoma_diarreia: { x: 441, y: 149.9, width: 9, height: 9, align: TextAlignment.Center },
      sintoma_alteracoes_cardiacas: { x: 441, y: 134.1, width: 9, height: 9, align: TextAlignment.Center },
      sintoma_outros: { x: 440, y: 119.1, width: 9, height: 9, align: TextAlignment.Center },
      sintoma_outros_especifique: { x: 454, y: 110, width: 100, height: 7, fontSize: 5 },
      ocorreu_hospitalizacao: { x: 270, y: 84, width: 10, height: 10, align: TextAlignment.Center },
      data_internacao: { x: 326, y: 79, width: 95, height: 9, comb: true, maxLength: 8, fontSize: 6 },
      data_alta: { x: 457, y: 79, width: 95, height: 9, comb: true, maxLength: 8, fontSize: 6 },
      uf_hospital: { x: 90, y: 70, width: 25, height: 9, maxLength: 2 },
      municipio_hospital: { x: 205, y: 70, width: 180, height: 9 },
      nome_hospital: { x: 160, y: 43, width: 330, height: 9 },
      // Página 2 a partir daqui.
      data_coleta_elisa_1a_amostra: { x: 73, y: 767, width: 95, height: 9, comb: true, maxLength: 8, fontSize: 6, page: 1 },
      resultado_elisa_1a_amostra: { x: 200, y: 766, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      data_coleta_elisa_2a_amostra: { x: 325, y: 768, width: 95, height: 9, comb: true, maxLength: 8, fontSize: 6, page: 1 },
      resultado_elisa_2a_amostra: { x: 450, y: 766, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      data_coleta_micro_1a_amostra: { x: 75, y: 714, width: 95, height: 9, comb: true, maxLength: 8, fontSize: 6, page: 1 },
      micro_1a_amostra_1_sorovar: { x: 195, y: 718, width: 80, height: 9, page: 1 },
      micro_1a_amostra_1_titulo: { x: 305, y: 714, width: 58, height: 9, comb: true, maxLength: 4, fontSize: 6, page: 1 },
      micro_1a_amostra_2_sorovar: { x: 389, y: 717, width: 70, height: 9, page: 1 },
      micro_1a_amostra_2_titulo: { x: 487, y: 713, width: 58, height: 9, comb: true, maxLength: 4, fontSize: 6, page: 1 },
      resultado_micro_1a_amostra: { x: 557, y: 681, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      data_coleta_micro_2a_amostra: { x: 74, y: 639, width: 95, height: 9, comb: true, maxLength: 8, fontSize: 6, page: 1 },
      micro_2a_amostra_1_sorovar: { x: 193, y: 643, width: 75, height: 9, page: 1 },
      micro_2a_amostra_1_titulo: { x: 292, y: 639, width: 58, height: 9, comb: true, maxLength: 4, fontSize: 6, page: 1 },
      micro_2a_amostra_2_sorovar: { x: 387, y: 642, width: 70, height: 9, page: 1 },
      micro_2a_amostra_2_titulo: { x: 485, y: 637, width: 58, height: 9, comb: true, maxLength: 4, fontSize: 6, page: 1 },
      resultado_micro_2a_amostra: { x: 557, y: 606, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      data_coleta_isolamento: { x: 74, y: 554, width: 95, height: 9, comb: true, maxLength: 8, fontSize: 6, page: 1 },
      resultado_isolamento: { x: 557, y: 556, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      data_coleta_imunohistoquimica: { x: 74, y: 511, width: 95, height: 9, comb: true, maxLength: 8, fontSize: 6, page: 1 },
      resultado_imunohistoquimica: { x: 557, y: 513, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      data_coleta_rtpcr: { x: 72, y: 470, width: 95, height: 9, comb: true, maxLength: 8, fontSize: 6, page: 1 },
      resultado_rtpcr: { x: 557, y: 473, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      classificacao_final: { x: 557, y: 435, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      criterio_confirmacao_descarte: { x: 300, y: 434, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      caso_autoctone: { x: 220, y: 397, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      uf_provavel_infeccao: { x: 352, y: 390, width: 25, height: 9, maxLength: 2, page: 1 },
      pais_provavel_infeccao: { x: 423, y: 412, width: 120, height: 9, page: 1 },
      municipio_provavel_infeccao: { x: 115, y: 382, width: 110, height: 9, page: 1 },
      distrito_provavel_infeccao: { x: 350, y: 380, width: 90, height: 9, page: 1 },
      bairro_provavel_infeccao: { x: 495, y: 381, width: 60, height: 9, page: 1 },
      area_provavel_infeccao: { x: 290, y: 330, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      ambiente_infeccao: { x: 557, y: 329, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      doenca_relacionada_trabalho: { x: 230, y: 303, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      evolucao_caso: { x: 557, y: 300, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      data_obito: { x: 80, y: 272, width: 95, height: 9, comb: true, maxLength: 8, fontSize: 6, page: 1 },
      data_encerramento: { x: 213, y: 272, width: 95, height: 9, comb: true, maxLength: 8, fontSize: 6, page: 1 },
      deslocamento_situacao_risco_detalhes: { x: 40, y: 214, width: 530, height: 9, page: 1 },
      observacoes: { x: 110, y: 174, width: 440, height: 9, page: 1 },
    },
  },
  HEPATITES_VIRAIS: {
    file: 'Ficha_Hepatites_Virais.pdf',
    xOffset: 0,
    yOffset: 0,
    headerBoxes: {
      notificationDate: { x: 440.9, y: 552.5, width: 120, height: 14, comb: true, maxLength: 8, fontSize: 8 },
      symptomOnsetDate: { x: 439.7, y: 494.2, width: 120, height: 14, comb: true, maxLength: 8, fontSize: 8 },
      notifyingUnit: { x: 61.9, y: 494.2, width: 270, height: 11 },
      patientName: { x: 62.9, y: 461.1, width: 375, height: 11 },
      birthDate: { x: 443.4, y: 463.3, width: 119, height: 14, comb: true, maxLength: 8, fontSize: 8 },
      age: { x: 67.9, y: 434.2, width: 28, height: 8, fontSize: 7, align: TextAlignment.Center },
      ageUnit: { x: 107.9, y: 447.2, width: 11, height: 11, fontSize: 7, align: TextAlignment.Center },
      motherName: { x: 239.9, y: 374.2, width: 351, height: 11 },
      cns: { x: 48.9, y: 372.2, width: 174, height: 11, comb: true, maxLength: 15, fontSize: 8 },
      sex: { x: 230.9, y: 448.2, width: 11, height: 11, align: TextAlignment.Center },
      race: { x: 550.3, y: 447.2, width: 10.8, height: 11, align: TextAlignment.Center },
    },
    bodyBoxes: {
      // data_investigacao/ocupacao: sem marca de comb própria encontrada
      // por perto (achei um grupo de ticks a 32pt de distância do rótulo,
      // longe demais pra ser deste campo — provavelmente pertence a outra
      // parte da ficha não identificada) — posição pelo delta padrão
      // (rótulo -18), não por tick confirmado.
      data_investigacao: { x: 65, y: 192, width: 100, height: 9, comb: true, maxLength: 8, fontSize: 6 },
      ocupacao: { x: 250, y: 192, width: 300, height: 9 },
      suspeita_de: { x: 557, y: 155, width: 10, height: 10, align: TextAlignment.Center },
      vacina_hepatite_a: { x: 557, y: 170, width: 10, height: 10, align: TextAlignment.Center },
      vacina_hepatite_b: { x: 557, y: 153, width: 10, height: 10, align: TextAlignment.Center },
      institucionalizado_em: { x: 557, y: 115, width: 10, height: 10, align: TextAlignment.Center },
      agravo_associado_hiv_aids: { x: 180, y: 89, width: 9, height: 9, align: TextAlignment.Center },
      agravo_associado_outras_dsts: { x: 179, y: 76.4, width: 9, height: 9, align: TextAlignment.Center },
      contato_hbv_hbc_sexual: { x: 557, y: 97, width: 10, height: 10, align: TextAlignment.Center },
      contato_hbv_hbc_domiciliar_nao_sexual: { x: 557, y: 85, width: 10, height: 10, align: TextAlignment.Center },
      contato_hbv_hbc_ocupacional: { x: 557, y: 71, width: 10, height: 10, align: TextAlignment.Center },
      // Página 2 a partir daqui.
      exposicao_medicamentos_injetaveis: { x: 61, y: 778, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      exposicao_tatuagem_piercing: { x: 263, y: 779, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      exposicao_acidente_material_biologico: { x: 402, y: 781, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      exposicao_drogas_inalaveis_crack: { x: 61, y: 762, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      exposicao_acupuntura: { x: 263, y: 761, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      exposicao_transfusao_sangue_derivados: { x: 403, y: 766, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      exposicao_drogas_injetaveis: { x: 61, y: 746, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      exposicao_tratamento_cirurgico: { x: 262, y: 746, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      exposicao_agua_alimento_contaminado: { x: 63, y: 730, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      exposicao_tratamento_dentario: { x: 263, y: 729, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      exposicao_tres_mais_parceiros_sexuais: { x: 62, y: 715, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      exposicao_hemodialise: { x: 262, y: 715.6, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      exposicao_transplante: { x: 63, y: 702, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      exposicao_outras: { x: 261, y: 702, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      data_acidente_transfusao_transplante: { x: 400, y: 703, width: 95, height: 9, comb: true, maxLength: 8, fontSize: 6, page: 1 },
      local_municipio_exposicao_detalhes: { x: 40, y: 651, width: 530, height: 9, page: 1 },
      // dados_comunicantes_detalhes: a ficha real tem uma tabela repetível
      // (nome/idade/tipo de contato/marcadores por comunicante) — vira um
      // único campo de texto livre, mesmo padrão já usado em Hepatites da
      // v1/Febre Amarela/COVID19 pra tabelas repetíveis.
      dados_comunicantes_detalhes: { x: 40, y: 537, width: 530, height: 9, page: 1 },
      paciente_encaminhado_de: { x: 557, y: 450, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      data_coleta_amostra_banco_sangue_cta: { x: 242, y: 436, width: 95, height: 9, comb: true, maxLength: 8, fontSize: 6, page: 1 },
      resultado_hbsag_banco_sangue_cta: { x: 557, y: 461, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      resultado_anti_hbc_total_banco_sangue_cta: { x: 557, y: 449, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      resultado_anti_hcv_banco_sangue_cta: { x: 557, y: 433, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      data_coleta_sorologia: { x: 124, y: 400, width: 95, height: 9, comb: true, maxLength: 8, fontSize: 6, page: 1 },
      // Grade de 12 marcadores sorológicos (campo 46) — mesma categoria de
      // confiança menor da grade sorológica de Sarampo/Chagas (caixinha
      // única por marcador, sem marca de texto própria; posição estimada
      // pela proximidade do rótulo de cada marcador).
      resultado_anti_hav_igm: { x: 417, y: 406, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      resultado_hbsag: { x: 397, y: 396, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      resultado_anti_hbc_igm: { x: 415, y: 383, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      resultado_anti_hbc_total: { x: 418, y: 369, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      resultado_anti_hbs: { x: 475, y: 408, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      resultado_hbeag: { x: 473, y: 394, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      resultado_anti_hbe: { x: 472, y: 382, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      resultado_anti_hdv_total: { x: 475, y: 368, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      resultado_anti_hdv_igm: { x: 543, y: 411, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      resultado_anti_hcv: { x: 543, y: 382, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      resultado_hcv_rna: { x: 543, y: 368, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      resultado_anti_hev_igm: { x: 543, y: 398, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      genotipo_hcv: { x: 210, y: 378, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      classificacao_final: { x: 557, y: 320, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      forma_clinica: { x: 340, y: 320, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      classificacao_etiologica: { x: 557, y: 310, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      provavel_fonte_mecanismo_infeccao: { x: 557, y: 260, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      provavel_fonte_outros_especifique: { x: 475, y: 256, width: 80, height: 7, fontSize: 5, page: 1 },
      data_encerramento: { x: 65, y: 208, width: 95, height: 9, comb: true, maxLength: 8, fontSize: 6, page: 1 },
      observacoes: { x: 100, y: 196, width: 450, height: 9, page: 1 },
    },
  },
  // FEBRE_AMARELA e DENGUE: calibradas em 12/09/2026, sem renderização
  // visual disponível neste ambiente (mesmo método já usado em MENINGITE/
  // SARAMPO/MALARIA/CHAGAS/LEPTOSPIROSE/HEPATITES_VIRAIS — ver comentário
  // detalhado em MENINGITE acima). DENGUE compartilha o PDF-base com
  // CHIKUNGUNYA (`Ficha_DENGCHIK_FINAL.pdf`) — só o corpo (campos
  // específicos de cada doença) difere; CHIKUNGUNYA ainda não tem
  // template próprio (fica pra quando for calibrada).
  FEBRE_AMARELA: {
    file: 'Febre_Amarela_v5.pdf',
    xOffset: 0,
    yOffset: 0,
    headerBoxes: {
      notificationDate: { x: 439.4, y: 690.2, width: 120, height: 14, comb: true, maxLength: 8, fontSize: 8 },
      symptomOnsetDate: { x: 438.2, y: 631.9, width: 120, height: 14, comb: true, maxLength: 8, fontSize: 8 },
      notifyingUnit: { x: 60.3, y: 631.9, width: 270, height: 11 },
      patientName: { x: 61.3, y: 599.0, width: 375, height: 11 },
      birthDate: { x: 441.8, y: 601.0, width: 119, height: 14, comb: true, maxLength: 8, fontSize: 8 },
      age: { x: 66.4, y: 572.1, width: 28, height: 8, fontSize: 7, align: TextAlignment.Center },
      ageUnit: { x: 106.4, y: 585.1, width: 11, height: 11, fontSize: 7, align: TextAlignment.Center },
      motherName: { x: 238.4, y: 512.0, width: 351, height: 11 },
      cns: { x: 47.3, y: 510.0, width: 174, height: 11, comb: true, maxLength: 15, fontSize: 8 },
      sex: { x: 229.4, y: 586.1, width: 11, height: 11, align: TextAlignment.Center },
      race: { x: 548.7, y: 585.0, width: 10.8, height: 11, align: TextAlignment.Center },
    },
    bodyBoxes: {
      data_investigacao: { x: 65, y: 330, width: 100, height: 9, comb: true, maxLength: 8, fontSize: 6 },
      ocupacao: { x: 250, y: 330, width: 300, height: 9 },
      ocorrencia_epizootias: { x: 557, y: 298, width: 10, height: 10, align: TextAlignment.Center },
      isolamento_virus_mosquitos: { x: 557, y: 280, width: 10, height: 10, align: TextAlignment.Center },
      presenca_aedes_aegypti_area_urbana: { x: 557, y: 264, width: 10, height: 10, align: TextAlignment.Center },
      vacinado_febre_amarela: { x: 320, y: 234, width: 10, height: 10, align: TextAlignment.Center },
      data_vacinacao: { x: 421, y: 230, width: 100, height: 9, comb: true, maxLength: 8, fontSize: 6 },
      uf_vacinacao: { x: 540, y: 230, width: 22, height: 9, maxLength: 2 },
      municipio_vacinacao: { x: 130, y: 220, width: 170, height: 9 },
      unidade_saude_vacinacao: { x: 395, y: 220, width: 160, height: 9 },
      sintoma_dor_abdominal: { x: 63, y: 176, width: 9, height: 9, align: TextAlignment.Center },
      sintoma_sinal_faget: { x: 62, y: 156.4, width: 9, height: 9, align: TextAlignment.Center },
      sintoma_sinais_hemorragicos: { x: 316, y: 181.6, width: 9, height: 9, align: TextAlignment.Center },
      sintoma_disturbios_excrecao_renal: { x: 314, y: 160.5, width: 9, height: 9, align: TextAlignment.Center },
      ocorreu_hospitalizacao: { x: 270, y: 126, width: 10, height: 10, align: TextAlignment.Center },
      data_internacao: { x: 422, y: 122, width: 100, height: 9, comb: true, maxLength: 8, fontSize: 6 },
      uf_hospital: { x: 540, y: 122, width: 22, height: 9, maxLength: 2 },
      municipio_hospital: { x: 130, y: 112, width: 170, height: 9 },
      unidade_saude_hospital: { x: 395, y: 112, width: 160, height: 9 },
      bilirrubina_total_mg_dl: { x: 142, y: 67, width: 70, height: 9 },
      bilirrubina_direta_mg_dl: { x: 142, y: 50.5, width: 70, height: 9 },
      ast_tgo_ui: { x: 310, y: 68.3, width: 55, height: 9 },
      alt_tgp_ui: { x: 310, y: 49.8, width: 55, height: 9 },
      // Página 2 a partir daqui.
      data_coleta_sorologia_1a_amostra: { x: 51, y: 769, width: 95, height: 9, comb: true, maxLength: 8, fontSize: 6, page: 1 },
      resultado_sorologia_1a_amostra: { x: 300, y: 768, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      data_coleta_sorologia_2a_amostra: { x: 326, y: 769, width: 95, height: 9, comb: true, maxLength: 8, fontSize: 6, page: 1 },
      resultado_sorologia_2a_amostra: { x: 557, y: 768, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      material_coletado_isolamento: { x: 557, y: 730, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      data_coleta_isolamento: { x: 260, y: 728, width: 95, height: 9, comb: true, maxLength: 8, fontSize: 6, page: 1 },
      resultado_isolamento: { x: 557, y: 746, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      resultado_histopatologia: { x: 100, y: 700, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      resultado_imunohistoquimica: { x: 557, y: 690, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      data_coleta_rtpcr: { x: 44, y: 647, width: 95, height: 9, comb: true, maxLength: 8, fontSize: 6, page: 1 },
      resultado_rtpcr: { x: 557, y: 650, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      classificacao_final: { x: 557, y: 622, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      classificacao_final_descartado_especifique: { x: 150, y: 616, width: 230, height: 7, fontSize: 5, page: 1 },
      criterio_confirmacao_descarte: { x: 500, y: 618, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      caso_autoctone: { x: 210, y: 573, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      uf_provavel_infeccao: { x: 208, y: 571, width: 22, height: 9, maxLength: 2, page: 1 },
      pais_provavel_infeccao: { x: 275, y: 587, width: 90, height: 9, page: 1 },
      municipio_provavel_infeccao: { x: 390, y: 592, width: 100, height: 9, page: 1 },
      distrito_provavel_infeccao: { x: 90, y: 556, width: 90, height: 9, page: 1 },
      bairro_provavel_infeccao: { x: 250, y: 554, width: 80, height: 9, page: 1 },
      localidade_provavel_infeccao: { x: 420, y: 559, width: 130, height: 9, page: 1 },
      doenca_relacionada_trabalho: { x: 250, y: 512, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      atividade_local_provavel_infeccao: { x: 557, y: 508, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      evolucao_caso: { x: 557, y: 471, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      data_obito: { x: 342, y: 467, width: 95, height: 9, comb: true, maxLength: 8, fontSize: 6, page: 1 },
      data_encerramento: { x: 463, y: 467, width: 95, height: 9, comb: true, maxLength: 8, fontSize: 6, page: 1 },
      deslocamento_detalhes: { x: 40, y: 408, width: 530, height: 9, page: 1 },
      observacoes: { x: 40, y: 305, width: 530, height: 9, page: 1 },
    },
  },
  DENGUE: {
    file: 'Ficha_DENGCHIK_FINAL.pdf',
    xOffset: 0,
    yOffset: 0,
    headerBoxes: {
      notificationDate: { x: 445.7, y: 649.0, width: 120, height: 14, comb: true, maxLength: 8, fontSize: 8 },
      symptomOnsetDate: { x: 442.8, y: 593.0, width: 120, height: 14, comb: true, maxLength: 8, fontSize: 8 },
      notifyingUnit: { x: 64.8, y: 593.0, width: 270, height: 11 },
      patientName: { x: 58.4, y: 559.2, width: 375, height: 11 },
      birthDate: { x: 442.0, y: 561.4, width: 119, height: 14, comb: true, maxLength: 8, fontSize: 8 },
      age: { x: 66.4, y: 532.2, width: 28, height: 8, fontSize: 7, align: TextAlignment.Center },
      ageUnit: { x: 106.4, y: 545.2, width: 11, height: 11, fontSize: 7, align: TextAlignment.Center },
      motherName: { x: 238.4, y: 472.4, width: 351, height: 11 },
      cns: { x: 47.3, y: 470.4, width: 174, height: 11, comb: true, maxLength: 15, fontSize: 8 },
      sex: { x: 229.4, y: 546.2, width: 11, height: 11, align: TextAlignment.Center },
      race: { x: 548.7, y: 545.4, width: 10.8, height: 11, align: TextAlignment.Center },
    },
    bodyBoxes: {
      data_investigacao: { x: 70, y: 290, width: 100, height: 9, comb: true, maxLength: 8, fontSize: 6 },
      ocupacao: { x: 250, y: 290, width: 300, height: 9 },
      sinal_febre: { x: 57, y: 261, width: 9, height: 9, align: TextAlignment.Center },
      sinal_mialgia: { x: 56, y: 247.5, width: 9, height: 9, align: TextAlignment.Center },
      sinal_cefaleia: { x: 101, y: 262.3, width: 9, height: 9, align: TextAlignment.Center },
      sinal_exantema: { x: 101, y: 247.5, width: 9, height: 9, align: TextAlignment.Center },
      sinal_nauseas: { x: 159, y: 247.2, width: 9, height: 9, align: TextAlignment.Center },
      sinal_vomito: { x: 160, y: 260.9, width: 9, height: 9, align: TextAlignment.Center },
      sinal_dor_nas_costas: { x: 218, y: 260.9, width: 9, height: 9, align: TextAlignment.Center },
      sinal_conjuntivite: { x: 219, y: 246.8, width: 9, height: 9, align: TextAlignment.Center },
      sinal_artrite: { x: 303, y: 262.4, width: 9, height: 9, align: TextAlignment.Center },
      sinal_artralgia_intensa: { x: 300, y: 248.9, width: 9, height: 9, align: TextAlignment.Center },
      sinal_petequias: { x: 390, y: 264, width: 9, height: 9, align: TextAlignment.Center },
      sinal_leucopenia: { x: 388, y: 250.6, width: 9, height: 9, align: TextAlignment.Center },
      sinal_prova_laco_positiva: { x: 472, y: 265, width: 9, height: 9, align: TextAlignment.Center },
      sinal_dor_retroorbital: { x: 472, y: 245.3, width: 9, height: 9, align: TextAlignment.Center },
      doenca_preexistente_diabetes: { x: 55, y: 209.8, width: 9, height: 9, align: TextAlignment.Center },
      doenca_preexistente_hipertensao_arterial: { x: 313, y: 212.2, width: 9, height: 9, align: TextAlignment.Center },
      doenca_preexistente_doencas_autoimunes: { x: 427, y: 213.6, width: 9, height: 9, align: TextAlignment.Center },
      doenca_preexistente_doencas_hematologicas: { x: 56, y: 193.2, width: 9, height: 9, align: TextAlignment.Center },
      doenca_preexistente_doenca_acido_peptica: { x: 314, y: 197.1, width: 9, height: 9, align: TextAlignment.Center },
      doenca_preexistente_hepatopatias: { x: 192, y: 210.8, width: 9, height: 9, align: TextAlignment.Center },
      doenca_preexistente_doenca_renal_cronica: { x: 190, y: 195.6, width: 9, height: 9, align: TextAlignment.Center },
      data_coleta_sorologia_igm_dengue: { x: 70, y: 97, width: 95, height: 9, comb: true, maxLength: 8, fontSize: 6 },
      resultado_sorologia_igm_dengue: { x: 290, y: 105, width: 10, height: 10, align: TextAlignment.Center },
      data_coleta_ns1: { x: 330, y: 97, width: 95, height: 9, comb: true, maxLength: 8, fontSize: 6 },
      resultado_ns1: { x: 557, y: 105, width: 10, height: 10, align: TextAlignment.Center },
      data_coleta_isolamento: { x: 63, y: 61, width: 95, height: 9, comb: true, maxLength: 8, fontSize: 6 },
      resultado_isolamento: { x: 557, y: 68, width: 10, height: 10, align: TextAlignment.Center },
      data_coleta_rtpcr: { x: 333, y: 61, width: 95, height: 9, comb: true, maxLength: 8, fontSize: 6 },
      resultado_rtpcr: { x: 557, y: 70, width: 10, height: 10, align: TextAlignment.Center },
      sorotipo: { x: 170, y: 38, width: 10, height: 10, align: TextAlignment.Center },
      resultado_histopatologia: { x: 500, y: 27, width: 10, height: 10, align: TextAlignment.Center },
      resultado_imunohistoquimica: { x: 557, y: 27, width: 10, height: 10, align: TextAlignment.Center },
      // Página 2 a partir daqui.
      ocorreu_hospitalizacao: { x: 180, y: 782, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      data_internacao: { x: 198, y: 779, width: 95, height: 9, comb: true, maxLength: 8, fontSize: 6, page: 1 },
      uf_hospital: { x: 318, y: 780, width: 22, height: 9, maxLength: 2, page: 1 },
      municipio_hospital: { x: 345, y: 780, width: 200, height: 9, page: 1 },
      nome_hospital: { x: 150, y: 762, width: 270, height: 9, page: 1 },
      telefone_hospital: { x: 443, y: 745, width: 110, height: 9, comb: true, maxLength: 9, fontSize: 6, page: 1 },
      caso_autoctone: { x: 210, y: 709, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      uf_provavel_infeccao: { x: 345, y: 701, width: 22, height: 9, maxLength: 2, page: 1 },
      pais_provavel_infeccao: { x: 415, y: 720, width: 100, height: 9, page: 1 },
      municipio_provavel_infeccao: { x: 115, y: 691, width: 110, height: 9, page: 1 },
      distrito_provavel_infeccao: { x: 345, y: 690, width: 90, height: 9, page: 1 },
      bairro_provavel_infeccao: { x: 490, y: 691, width: 65, height: 9, page: 1 },
      classificacao_final: { x: 557, y: 636, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      criterio_confirmacao_descarte: { x: 470, y: 636, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      apresentacao_clinica: { x: 557, y: 648, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      evolucao_caso: { x: 250, y: 600, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      data_obito: { x: 320, y: 595, width: 95, height: 9, comb: true, maxLength: 8, fontSize: 6, page: 1 },
      data_encerramento: { x: 455, y: 595, width: 95, height: 9, comb: true, maxLength: 8, fontSize: 6, page: 1 },
      dengue_sinais_alarme: { x: 145, y: 553, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      alarme_hipotensao_postural_lipotimia: { x: 56, y: 539.7, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      alarme_queda_abrupta_plaquetas: { x: 55, y: 523.1, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      alarme_vomitos_persistentes: { x: 213, y: 564.7, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      alarme_dor_abdominal_intensa_continua: { x: 212, y: 552.4, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      alarme_letargia_irritabilidade: { x: 211, y: 532.3, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      alarme_sangramento_mucosa_outras_hemorragias: { x: 211, y: 519.3, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      alarme_aumento_progressivo_hematocrito: { x: 345, y: 566.6, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      alarme_hepatomegalia_maior_2cm: { x: 344, y: 548.1, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      alarme_acumulo_liquidos: { x: 344, y: 531.8, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      data_inicio_sinais_alarme: { x: 463, y: 513, width: 95, height: 9, comb: true, maxLength: 8, fontSize: 6, page: 1 },
      dengue_grave: { x: 210, y: 499, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      grave_pulso_debil_indetectavel: { x: 59, y: 464.9, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      grave_taquicardia: { x: 201, y: 467.8, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      grave_extremidades_frias: { x: 203, y: 452.9, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      grave_pa_convergente_menor_20mmhg: { x: 59, y: 452.2, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      grave_tempo_enchimento_capilar_maior_3s: { x: 60, y: 437.1, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      grave_hipotensao_arterial_fase_tardia: { x: 201, y: 437.1, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      grave_acumulo_liquidos_insuficiencia_respiratoria: { x: 59, y: 422.9, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      grave_hematemese: { x: 334, y: 486.8, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      grave_melena: { x: 334, y: 469.5, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      grave_metrorragia_volumosa: { x: 430, y: 485.8, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      grave_sangramento_snc: { x: 427, y: 466.8, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      grave_ast_alt_maior_1000: { x: 334, y: 434.2, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      grave_miocardite: { x: 425, y: 435.6, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      grave_alteracao_consciencia: { x: 485, y: 440.2, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      grave_outros_orgaos: { x: 331, y: 416.2, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      grave_outros_orgaos_especifique: { x: 430, y: 416, width: 120, height: 7, fontSize: 5, page: 1 },
      data_inicio_sinais_gravidade: { x: 63, y: 368, width: 95, height: 9, comb: true, maxLength: 8, fontSize: 6, page: 1 },
      observacoes_adicionais: { x: 40, y: 319, width: 530, height: 9, page: 1 },
    },
  },
  // CHIKUNGUNYA: mesmo PDF-base de DENGUE (`Ficha_DENGCHIK_FINAL.pdf`) —
  // cabeçalho idêntico (mesmas coordenadas de DENGUE acima) e a maioria dos
  // campos do corpo (sinais clínicos, doenças pré-existentes,
  // hospitalização, local provável de infecção, conclusão) são os MESMOS
  // campos físicos da ficha, reaproveitados aqui com a coordenada já
  // calibrada em DENGUE (não uma repetição por acaso — são literalmente a
  // mesma caixa impressa, compartilhada pelas duas doenças). Só o bloco de
  // laboratório (campos 35-38, Sorologia IgM Chikungunya + PRNT) é
  // exclusivo desta doença; histopatologia/imunohistoquímica (48/49) também
  // são compartilhados com Dengue, mesma coordenada.
  CHIKUNGUNYA: {
    file: 'Ficha_DENGCHIK_FINAL.pdf',
    xOffset: 0,
    yOffset: 0,
    headerBoxes: {
      notificationDate: { x: 445.7, y: 649.0, width: 120, height: 14, comb: true, maxLength: 8, fontSize: 8 },
      symptomOnsetDate: { x: 442.8, y: 593.0, width: 120, height: 14, comb: true, maxLength: 8, fontSize: 8 },
      notifyingUnit: { x: 64.8, y: 593.0, width: 270, height: 11 },
      patientName: { x: 58.4, y: 559.2, width: 375, height: 11 },
      birthDate: { x: 442.0, y: 561.4, width: 119, height: 14, comb: true, maxLength: 8, fontSize: 8 },
      age: { x: 66.4, y: 532.2, width: 28, height: 8, fontSize: 7, align: TextAlignment.Center },
      ageUnit: { x: 106.4, y: 545.2, width: 11, height: 11, fontSize: 7, align: TextAlignment.Center },
      motherName: { x: 238.4, y: 472.4, width: 351, height: 11 },
      cns: { x: 47.3, y: 470.4, width: 174, height: 11, comb: true, maxLength: 15, fontSize: 8 },
      sex: { x: 229.4, y: 546.2, width: 11, height: 11, align: TextAlignment.Center },
      race: { x: 548.7, y: 545.4, width: 10.8, height: 11, align: TextAlignment.Center },
    },
    bodyBoxes: {
      data_investigacao: { x: 70, y: 290, width: 100, height: 9, comb: true, maxLength: 8, fontSize: 6 },
      ocupacao: { x: 250, y: 290, width: 300, height: 9 },
      sinal_febre: { x: 57, y: 261, width: 9, height: 9, align: TextAlignment.Center },
      sinal_mialgia: { x: 56, y: 247.5, width: 9, height: 9, align: TextAlignment.Center },
      sinal_cefaleia: { x: 101, y: 262.3, width: 9, height: 9, align: TextAlignment.Center },
      sinal_exantema: { x: 101, y: 247.5, width: 9, height: 9, align: TextAlignment.Center },
      sinal_nauseas: { x: 159, y: 247.2, width: 9, height: 9, align: TextAlignment.Center },
      sinal_vomito: { x: 160, y: 260.9, width: 9, height: 9, align: TextAlignment.Center },
      sinal_dor_nas_costas: { x: 218, y: 260.9, width: 9, height: 9, align: TextAlignment.Center },
      sinal_conjuntivite: { x: 219, y: 246.8, width: 9, height: 9, align: TextAlignment.Center },
      sinal_artrite: { x: 303, y: 262.4, width: 9, height: 9, align: TextAlignment.Center },
      sinal_artralgia_intensa: { x: 300, y: 248.9, width: 9, height: 9, align: TextAlignment.Center },
      sinal_petequias: { x: 390, y: 264, width: 9, height: 9, align: TextAlignment.Center },
      sinal_leucopenia: { x: 388, y: 250.6, width: 9, height: 9, align: TextAlignment.Center },
      sinal_prova_laco_positiva: { x: 472, y: 265, width: 9, height: 9, align: TextAlignment.Center },
      sinal_dor_retroorbital: { x: 472, y: 245.3, width: 9, height: 9, align: TextAlignment.Center },
      doenca_preexistente_diabetes: { x: 55, y: 209.8, width: 9, height: 9, align: TextAlignment.Center },
      doenca_preexistente_hipertensao_arterial: { x: 313, y: 212.2, width: 9, height: 9, align: TextAlignment.Center },
      doenca_preexistente_doencas_autoimunes: { x: 427, y: 213.6, width: 9, height: 9, align: TextAlignment.Center },
      doenca_preexistente_doencas_hematologicas: { x: 56, y: 193.2, width: 9, height: 9, align: TextAlignment.Center },
      doenca_preexistente_doenca_acido_peptica: { x: 314, y: 197.1, width: 9, height: 9, align: TextAlignment.Center },
      doenca_preexistente_hepatopatias: { x: 192, y: 210.8, width: 9, height: 9, align: TextAlignment.Center },
      doenca_preexistente_doenca_renal_cronica: { x: 190, y: 195.6, width: 9, height: 9, align: TextAlignment.Center },
      // Bloco exclusivo de Chikungunya (campos 35-38): Sorologia IgM (1ª/2ª
      // amostra) + PRNT, com resultado por coluna (S1/S2/PRNT) sob um único
      // cabeçalho "Resultado" compartilhado.
      data_coleta_igm_1a_amostra: { x: 63, y: 142, width: 95, height: 9, comb: true, maxLength: 8, fontSize: 6 },
      data_coleta_igm_2a_amostra: { x: 188, y: 141, width: 95, height: 9, comb: true, maxLength: 8, fontSize: 6 },
      data_coleta_prnt: { x: 313, y: 141, width: 95, height: 9, comb: true, maxLength: 8, fontSize: 6 },
      resultado_sorologia_s1: { x: 449, y: 152, width: 10, height: 10, align: TextAlignment.Center },
      resultado_sorologia_s2: { x: 479, y: 152, width: 10, height: 10, align: TextAlignment.Center },
      resultado_prnt: { x: 530, y: 152, width: 10, height: 10, align: TextAlignment.Center },
      resultado_histopatologia: { x: 500, y: 27, width: 10, height: 10, align: TextAlignment.Center },
      resultado_imunohistoquimica: { x: 557, y: 27, width: 10, height: 10, align: TextAlignment.Center },
      // Página 2 a partir daqui (campos compartilhados com Dengue).
      ocorreu_hospitalizacao: { x: 180, y: 782, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      data_internacao: { x: 198, y: 779, width: 95, height: 9, comb: true, maxLength: 8, fontSize: 6, page: 1 },
      uf_hospital: { x: 318, y: 780, width: 22, height: 9, maxLength: 2, page: 1 },
      municipio_hospital: { x: 345, y: 780, width: 200, height: 9, page: 1 },
      nome_hospital: { x: 150, y: 762, width: 270, height: 9, page: 1 },
      telefone_hospital: { x: 443, y: 745, width: 110, height: 9, comb: true, maxLength: 9, fontSize: 6, page: 1 },
      caso_autoctone: { x: 210, y: 709, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      uf_provavel_infeccao: { x: 345, y: 701, width: 22, height: 9, maxLength: 2, page: 1 },
      pais_provavel_infeccao: { x: 415, y: 720, width: 100, height: 9, page: 1 },
      municipio_provavel_infeccao: { x: 115, y: 691, width: 110, height: 9, page: 1 },
      distrito_provavel_infeccao: { x: 345, y: 690, width: 90, height: 9, page: 1 },
      bairro_provavel_infeccao: { x: 490, y: 691, width: 65, height: 9, page: 1 },
      classificacao_final: { x: 557, y: 636, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      criterio_confirmacao_descarte: { x: 470, y: 636, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      apresentacao_clinica: { x: 557, y: 648, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      evolucao_caso: { x: 250, y: 600, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      data_obito: { x: 320, y: 595, width: 95, height: 9, comb: true, maxLength: 8, fontSize: 6, page: 1 },
      data_encerramento: { x: 455, y: 595, width: 95, height: 9, comb: true, maxLength: 8, fontSize: 6, page: 1 },
      observacoes_adicionais: { x: 40, y: 319, width: 530, height: 9, page: 1 },
    },
  },
  // VIOLENCIA_INTERPESSOAL: última doença da Trilha 1, deixada por último
  // de propósito (a maior, ~90 campos). Cabeçalho vai até o campo 32 (não
  // 30 como nas demais fichas Sinan NET), com um campo extra de "Tipo de
  // Unidade Notificadora" antes do nome da unidade — mapeado pro slot
  // genérico `notifyingUnit` usando o campo "Nome da Unidade Notificadora"
  // (equivalente estrutural). Campo 7 (slot `symptomOnsetDate`) chama-se
  // "Data da ocorrência da violência" aqui. Calibrada em 12/09/2026, sem
  // renderização visual disponível (mesmo método das demais desta rodada).
  // Duas datas do cabeçalho (notificationDate/birthDate) tiveram delta de
  // texto ~4-5pt diferente do padrão de ANIMAIS_PECONHENTOS — usei a marca
  // de comb própria desta ficha em vez do delta puro nesses dois casos
  // (ageUnit/motherName/cns mantidos por delta, sem tick próprio pra
  // conferir, mas cns bateu quase exato com a marca de comb encontrada).
  VIOLENCIA_INTERPESSOAL: {
    file: 'violencia_v5.pdf',
    xOffset: 0,
    yOffset: 0,
    headerBoxes: {
      notificationDate: { x: 448.3, y: 693, width: 120, height: 14, comb: true, maxLength: 8, fontSize: 8 },
      symptomOnsetDate: { x: 439.0, y: 620.6, width: 120, height: 14, comb: true, maxLength: 8, fontSize: 8 },
      notifyingUnit: { x: 60.3, y: 621, width: 270, height: 11 },
      patientName: { x: 62.0, y: 585, width: 375, height: 11 },
      birthDate: { x: 443.5, y: 588, width: 119, height: 14, comb: true, maxLength: 8, fontSize: 8 },
      age: { x: 68.1, y: 559.3, width: 28, height: 8, fontSize: 7, align: TextAlignment.Center },
      ageUnit: { x: 108.1, y: 572.3, width: 11, height: 11, fontSize: 7, align: TextAlignment.Center },
      motherName: { x: 240.1, y: 497, width: 351, height: 11 },
      cns: { x: 49.0, y: 497.4, width: 174, height: 11, comb: true, maxLength: 15, fontSize: 8 },
      sex: { x: 231.1, y: 573.3, width: 11, height: 11, align: TextAlignment.Center },
      race: { x: 550.4, y: 572.3, width: 10.8, height: 11, align: TextAlignment.Center },
    },
    bodyBoxes: {
      nome_social: { x: 140, y: 336, width: 300, height: 9 },
      ocupacao: { x: 410, y: 336, width: 140, height: 9 },
      situacao_conjugal: { x: 557, y: 295, width: 10, height: 10, align: TextAlignment.Center },
      orientacao_sexual: { x: 250, y: 270, width: 10, height: 10, align: TextAlignment.Center },
      identidade_genero: { x: 557, y: 265, width: 10, height: 10, align: TextAlignment.Center },
      possui_deficiencia_transtorno: { x: 185, y: 221, width: 10, height: 10, align: TextAlignment.Center },
      deficiencia_fisica: { x: 195, y: 235, width: 9, height: 9, align: TextAlignment.Center },
      deficiencia_intelectual: { x: 195, y: 224, width: 9, height: 9, align: TextAlignment.Center },
      deficiencia_auditiva: { x: 291, y: 222.5, width: 9, height: 9, align: TextAlignment.Center },
      deficiencia_visual: { x: 292, y: 234.5, width: 9, height: 9, align: TextAlignment.Center },
      transtorno_mental: { x: 388, y: 233.5, width: 9, height: 9, align: TextAlignment.Center },
      transtorno_comportamento: { x: 389, y: 219.6, width: 9, height: 9, align: TextAlignment.Center },
      deficiencia_outras: { x: 472, y: 233.5, width: 9, height: 9, align: TextAlignment.Center },
      deficiencia_outras_especifique: { x: 490, y: 232, width: 65, height: 7, fontSize: 5 },
      uf_ocorrencia: { x: 62, y: 188, width: 22, height: 9, maxLength: 2 },
      municipio_ocorrencia: { x: 100, y: 188, width: 250, height: 9 },
      distrito_ocorrencia: { x: 400, y: 188, width: 150, height: 9 },
      bairro_ocorrencia: { x: 40, y: 162, width: 250, height: 9 },
      logradouro_ocorrencia: { x: 300, y: 162, width: 250, height: 9 },
      numero_ocorrencia: { x: 40, y: 137, width: 100, height: 9 },
      complemento_ocorrencia: { x: 150, y: 137, width: 250, height: 9 },
      ponto_referencia_ocorrencia: { x: 40, y: 111, width: 250, height: 9 },
      zona_ocorrencia: { x: 340, y: 123, width: 10, height: 10, align: TextAlignment.Center },
      hora_ocorrencia: { x: 498, y: 111, width: 65, height: 9, comb: true, maxLength: 5, fontSize: 6 },
      local_ocorrencia: { x: 557, y: 88, width: 10, height: 10, align: TextAlignment.Center },
      ocorreu_outras_vezes: { x: 557, y: 101, width: 10, height: 10, align: TextAlignment.Center },
      lesao_autoprovocada: { x: 557, y: 68, width: 10, height: 10, align: TextAlignment.Center },
      motivacao_violencia: { x: 557, y: 770, width: 10, height: 10, align: TextAlignment.Center },
      motivacao_violencia_outros_especifique: { x: 340, y: 774, width: 55, height: 7, fontSize: 5 },
      tipo_violencia_fisica: { x: 68, y: 747.3, width: 9, height: 9, align: TextAlignment.Center },
      tipo_violencia_psicologica_moral: { x: 68, y: 733.1, width: 9, height: 9, align: TextAlignment.Center },
      tipo_violencia_tortura: { x: 68, y: 720.4, width: 9, height: 9, align: TextAlignment.Center },
      tipo_violencia_sexual: { x: 69, y: 708.4, width: 9, height: 9, align: TextAlignment.Center },
      tipo_violencia_trafico_pessoas: { x: 152, y: 747.3, width: 9, height: 9, align: TextAlignment.Center },
      tipo_violencia_financeira_economica: { x: 153, y: 733.1, width: 9, height: 9, align: TextAlignment.Center },
      tipo_violencia_negligencia_abandono: { x: 153, y: 719.5, width: 9, height: 9, align: TextAlignment.Center },
      tipo_violencia_trabalho_infantil: { x: 153, y: 707.5, width: 9, height: 9, align: TextAlignment.Center },
      tipo_violencia_intervencao_legal: { x: 256, y: 734.6, width: 9, height: 9, align: TextAlignment.Center },
      tipo_violencia_outros: { x: 256, y: 719.7, width: 9, height: 9, align: TextAlignment.Center },
      tipo_violencia_outros_especifique: { x: 280, y: 710, width: 70, height: 7, fontSize: 5 },
      meio_forca_corporal_espancamento: { x: 346, y: 743.2, width: 9, height: 9, align: TextAlignment.Center },
      meio_enforcamento: { x: 346, y: 722.8, width: 9, height: 9, align: TextAlignment.Center },
      meio_objeto_contundente: { x: 345, y: 708.7, width: 9, height: 9, align: TextAlignment.Center },
      meio_objeto_perfurocortante: { x: 423, y: 746.6, width: 9, height: 9, align: TextAlignment.Center },
      meio_substancia_objeto_quente: { x: 424, y: 730, width: 9, height: 9, align: TextAlignment.Center },
      meio_envenenamento_intoxicacao: { x: 422, y: 715.4, width: 9, height: 9, align: TextAlignment.Center },
      meio_arma_fogo: { x: 497, y: 742.7, width: 9, height: 9, align: TextAlignment.Center },
      meio_ameaca: { x: 497, y: 730.3, width: 9, height: 9, align: TextAlignment.Center },
      meio_outro: { x: 497, y: 718.7, width: 9, height: 9, align: TextAlignment.Center },
      meio_outro_especifique: { x: 545, y: 718, width: 50, height: 7, fontSize: 5 },
      // Página 2 a partir daqui.
      violencia_sexual_assedio: { x: 72, y: 684.2, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      violencia_sexual_estupro: { x: 155, y: 684.2, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      violencia_sexual_pornografia_infantil: { x: 232, y: 684.7, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      violencia_sexual_exploracao: { x: 336, y: 684.7, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      violencia_sexual_outras: { x: 439, y: 684.2, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      violencia_sexual_outras_especifique: { x: 485, y: 683, width: 65, height: 7, fontSize: 5, page: 1 },
      procedimento_profilaxia_dst: { x: 69, y: 648, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      procedimento_profilaxia_hiv: { x: 69, y: 633.6, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      procedimento_profilaxia_hepatite_b: { x: 156, y: 647.8, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      procedimento_coleta_sangue: { x: 156, y: 634.8, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      procedimento_coleta_semen: { x: 267, y: 647, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      procedimento_coleta_secrecao_vaginal: { x: 268, y: 634.6, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      procedimento_contracepcao_emergencia: { x: 410, y: 648, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      procedimento_aborto_previsto_lei: { x: 410, y: 634.6, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      numero_envolvidos: { x: 110, y: 590, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      vinculo_pai: { x: 117, y: 603.1, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      vinculo_mae: { x: 117, y: 591.1, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      vinculo_padrasto: { x: 117, y: 579.1, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      vinculo_madrasta: { x: 117, y: 567.1, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      vinculo_conjuge: { x: 117, y: 555.1, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      vinculo_ex_conjuge: { x: 172, y: 602.3, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      vinculo_namorado: { x: 172, y: 590.3, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      vinculo_ex_namorado: { x: 172, y: 578.3, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      vinculo_filho: { x: 172, y: 566.3, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      vinculo_irmao: { x: 172, y: 554.3, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      vinculo_amigos_conhecidos: { x: 251, y: 601.6, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      vinculo_desconhecido: { x: 251, y: 589.6, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      vinculo_cuidador: { x: 251, y: 577.6, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      vinculo_patrao_chefe: { x: 251, y: 565.6, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      vinculo_pessoa_relacao_institucional: { x: 251, y: 553.6, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      vinculo_policial_agente_lei: { x: 339, y: 601.6, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      vinculo_propria_pessoa: { x: 339, y: 577.6, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      vinculo_outros: { x: 339, y: 565.6, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      vinculo_outros_especifique: { x: 395, y: 565, width: 90, height: 7, fontSize: 5, page: 1 },
      sexo_provavel_autor: { x: 557, y: 568, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      suspeita_uso_alcool_autor: { x: 497, y: 575, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      ciclo_vida_provavel_autor: { x: 557, y: 515, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      encaminhamento_rede_saude: { x: 51, y: 472, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      encaminhamento_rede_assistencia_social: { x: 51, y: 460.3, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      encaminhamento_rede_educacao: { x: 51, y: 448.3, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      encaminhamento_rede_atendimento_mulher: { x: 51, y: 427, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      encaminhamento_conselho_tutelar: { x: 52, y: 415.1, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      encaminhamento_conselho_idoso: { x: 287, y: 479.9, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      encaminhamento_centro_referencia_direitos_humanos: { x: 283, y: 445.9, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      encaminhamento_ministerio_publico: { x: 284, y: 434.8, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      encaminhamento_delegacia_atendimento_mulher: { x: 434, y: 477.5, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      encaminhamento_delegacia_protecao_crianca_adolescente: { x: 284, y: 412.8, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      encaminhamento_delegacia_atendimento_idoso: { x: 284, y: 465.1, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      encaminhamento_outras_delegacias: { x: 433, y: 465.8, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      encaminhamento_defensoria_publica: { x: 433, y: 431.5, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      encaminhamento_justica_infancia_juventude: { x: 433, y: 445.4, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      violencia_relacionada_trabalho: { x: 170, y: 368, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      emitida_cat: { x: 380, y: 368, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      circunstancia_lesao_cid: { x: 460, y: 365, width: 90, height: 9, comb: true, maxLength: 4, fontSize: 6, page: 1 },
      data_encerramento: { x: 88, y: 323, width: 95, height: 9, comb: true, maxLength: 8, fontSize: 6, page: 1 },
      nome_acompanhante: { x: 130, y: 296, width: 100, height: 9, page: 1 },
      vinculo_acompanhante: { x: 355, y: 296, width: 60, height: 9, page: 1 },
      telefone_acompanhante: { x: 485, y: 296, width: 70, height: 9, page: 1 },
      observacoes_adicionais: { x: 140, y: 269, width: 420, height: 9, page: 1 },
    },
  },
  // SRAG: ficha do "Sinan Influenza" (subsistema próprio, layout e
  // numeração diferentes do "Sinan NET" clássico — ver comentário em
  // packages/domain/.../srag.ts). Cabeçalho calibrado em 11/09/2026 por
  // grid sobreposto (5pt/2pt) + 4 rounds de render de verificação com
  // debugBorders:true — todos os 11 campos confirmados na posição certa,
  // EXCETO `sex`: depois de 4 tentativas de ajuste (x:270→290→310→345→325)
  // ainda sobrepõe 1-2 caracteres do texto impresso "Ignorado" — o suficiente
  // pra não considerar 100% fechado, mas não bloqueante (o valor gravado
  // continua legível). Documentando a incerteza em vez de seguir ajustando
  // às cegas, mesmo padrão já usado em `data_inicio_tosse` (Coqueluche) —
  // precisa de uma segunda fonte de confirmação (zoom real de alta
  // resolução, não disponível neste ambiente) antes de fechar.
  SRAG: {
    file: 'Srag_v5.pdf',
    xOffset: 0,
    yOffset: 0,
    headerBoxes: {
      notificationDate: { x: 40, y: 693, width: 95, height: 11, comb: true, maxLength: 8, fontSize: 8 },
      symptomOnsetDate: { x: 462, y: 640, width: 95, height: 11, comb: true, maxLength: 8, fontSize: 8 },
      notifyingUnit: { x: 40, y: 640, width: 290, height: 11 },
      patientName: { x: 40, y: 618, width: 350, height: 11 },
      cns: { x: 400, y: 618, width: 160, height: 11, comb: true, maxLength: 14, fontSize: 8 },
      birthDate: { x: 40, y: 580, width: 95, height: 11, comb: true, maxLength: 8, fontSize: 8 },
      age: { x: 160, y: 580, width: 28, height: 8, fontSize: 7, align: TextAlignment.Center },
      ageUnit: { x: 200, y: 583, width: 11, height: 11, fontSize: 7, align: TextAlignment.Center },
      // AINDA IMPERFEITO — ver comentário do bloco acima.
      sex: { x: 325, y: 574, width: 11, height: 11, align: TextAlignment.Center },
      race: { x: 95, y: 565, width: 10.8, height: 11, align: TextAlignment.Center },
      motherName: { x: 330, y: 553, width: 230, height: 11 },
    },
    // Corpo (campos 27-52) calibrado em 11/09/2026: grid de 5pt sobreposto
    // ao PDF-base + 2 rounds de render de verificação com
    // debugBorders:true. A maioria dos campos confirmada correta,
    // incluindo os 2 casos que colidiam com a caixa de data vizinha
    // (`tipo_antiviral`/`raio_x_torax` — corrigidos, moveram pra linha
    // própria). Alguns campos de checklist (sintomas/fatores de
    // risco/parainfluenza) mostraram sobreposição de 1 caractere no render
    // de verificação, mas ao conferir as MESMAS coordenadas contra um grid
    // limpo (sem preenchimento) elas batem exatamente com a posição real
    // da caixinha impressa — a sobreposição é provavelmente um artefato de
    // como o PDF de verificação extrai/ordena texto pra leitura, não um
    // erro de posição real (mesma lição já registrada em `data_inicio_
    // tosse`, Coqueluche). `metodologia_rtpcr`/`tipo_rtpcr` (pág. 2) ainda
    // mostraram leve sobreposição após o ajuste — não bloqueante, mas sem
    // confirmação final. Códigos batem com
    // packages/domain/.../schemas/srag.ts.
    bodyBoxes: {
      recebeu_vacina_gripe_12_meses: { x: 395, y: 368, width: 10, height: 10, align: TextAlignment.Center },
      data_ultima_dose_vacina_gripe: { x: 490, y: 368, width: 65, height: 9, comb: true, maxLength: 8, fontSize: 6 },

      sintoma_febre: { x: 45, y: 328, width: 9, height: 9, align: TextAlignment.Center },
      sintoma_tosse: { x: 140, y: 328, width: 9, height: 9, align: TextAlignment.Center },
      sintoma_dor_garganta: { x: 228, y: 328, width: 9, height: 9, align: TextAlignment.Center },
      sintoma_dispneia: { x: 340, y: 328, width: 9, height: 9, align: TextAlignment.Center },
      sintoma_mialgia: { x: 420, y: 328, width: 9, height: 9, align: TextAlignment.Center },
      sintoma_saturacao_o2_menor_95: { x: 475, y: 328, width: 9, height: 9, align: TextAlignment.Center },
      sintoma_desconforto_respiratorio: { x: 45, y: 313, width: 9, height: 9, align: TextAlignment.Center },
      sintoma_outros_especifique: { x: 270, y: 310, width: 290, height: 8, fontSize: 6 },

      fator_risco_pneumopatias_cronicas: { x: 45, y: 280, width: 9, height: 9, align: TextAlignment.Center },
      fator_risco_doenca_cardiovascular_cronica: { x: 230, y: 280, width: 9, height: 9, align: TextAlignment.Center },
      fator_risco_doenca_hepatica_cronica: { x: 420, y: 280, width: 9, height: 9, align: TextAlignment.Center },
      fator_risco_doenca_neurologica_cronica: { x: 45, y: 262, width: 9, height: 9, align: TextAlignment.Center },
      fator_risco_doenca_renal_cronica: { x: 230, y: 262, width: 9, height: 9, align: TextAlignment.Center },
      fator_risco_sindrome_down: { x: 345, y: 262, width: 9, height: 9, align: TextAlignment.Center },
      fator_risco_diabetes_mellitus: { x: 420, y: 262, width: 9, height: 9, align: TextAlignment.Center },
      fator_risco_puerperio: { x: 45, y: 244, width: 9, height: 9, align: TextAlignment.Center },
      fator_risco_obesidade: { x: 230, y: 244, width: 9, height: 9, align: TextAlignment.Center },
      fator_risco_obesidade_imc: { x: 340, y: 242, width: 60, height: 8, fontSize: 6 },
      fator_risco_outros_especifique: { x: 280, y: 225, width: 280, height: 8, fontSize: 6 },

      tipo_antiviral: { x: 555, y: 218, width: 10, height: 10, align: TextAlignment.Center },
      tipo_antiviral_outro_especifique: { x: 150, y: 195, width: 60, height: 8, fontSize: 5 },
      data_inicio_tratamento_antiviral: { x: 490, y: 203, width: 65, height: 9, comb: true, maxLength: 8, fontSize: 6 },

      ocorreu_internacao: { x: 45, y: 170, width: 9, height: 9, align: TextAlignment.Center },
      data_internacao: { x: 150, y: 170, width: 95, height: 9, comb: true, maxLength: 8, fontSize: 6 },
      uf_internacao: { x: 250, y: 170, width: 25, height: 9 },
      municipio_unidade_internacao: { x: 280, y: 170, width: 195, height: 9 },
      nome_unidade_saude_internacao: { x: 45, y: 135, width: 430, height: 9 },

      raio_x_torax: { x: 555, y: 120, width: 10, height: 10, align: TextAlignment.Center },
      raio_x_torax_outro_especifique: { x: 90, y: 90, width: 200, height: 7, fontSize: 5 },
      data_raio_x: { x: 490, y: 105, width: 65, height: 9, comb: true, maxLength: 8, fontSize: 6 },

      suporte_ventilatorio: { x: 555, y: 70, width: 10, height: 10, align: TextAlignment.Center },

      internado_uti: { x: 200, y: 45, width: 9, height: 9, align: TextAlignment.Center },
      data_entrada_uti: { x: 250, y: 40, width: 95, height: 9, comb: true, maxLength: 8, fontSize: 6 },
      data_saida_uti: { x: 420, y: 40, width: 95, height: 9, comb: true, maxLength: 8, fontSize: 6 },

      // Página 2 (page: 1)
      tipo_amostra_coletada: { x: 45, y: 763, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      tipo_amostra_outro_especifique: { x: 320, y: 748, width: 195, height: 7, fontSize: 5, page: 1 },
      data_coleta_amostra: { x: 490, y: 750, width: 65, height: 9, comb: true, maxLength: 8, fontSize: 6, page: 1 },

      metodologia_ifi: { x: 65, y: 706, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      data_resultado_ifi: { x: 45, y: 675, width: 120, height: 9, comb: true, maxLength: 8, fontSize: 6, page: 1 },
      metodologia_rtpcr: { x: 215, y: 717, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      tipo_rtpcr: { x: 200, y: 695, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      data_resultado_rtpcr: { x: 215, y: 675, width: 120, height: 9, comb: true, maxLength: 8, fontSize: 6, page: 1 },
      metodologia_outro: { x: 355, y: 720, width: 9, height: 9, align: TextAlignment.Center, page: 1 },
      metodologia_outro_especifique: { x: 350, y: 700, width: 205, height: 8, fontSize: 6, page: 1 },
      data_resultado_outro_metodo: { x: 460, y: 670, width: 95, height: 9, comb: true, maxLength: 8, fontSize: 6, page: 1 },

      diagnostico_influenza_a: { x: 45, y: 622, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      influenza_a_subtipo: { x: 345, y: 607, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      influenza_a_subtipo_outro_especifique: { x: 490, y: 601, width: 65, height: 7, fontSize: 5, page: 1 },
      diagnostico_influenza_b: { x: 45, y: 595, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      diagnostico_vsr: { x: 170, y: 550, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      diagnostico_parainfluenza_1: { x: 300, y: 550, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      diagnostico_parainfluenza_2: { x: 410, y: 550, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      diagnostico_parainfluenza_3: { x: 500, y: 550, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      diagnostico_adenovirus: { x: 560, y: 550, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      outros_agentes_etiologicos_respiratorios: { x: 150, y: 573, width: 405, height: 8, fontSize: 6, page: 1 },
      diagnostico_outro_virus_agente_especifique: { x: 280, y: 525, width: 280, height: 8, fontSize: 6, page: 1 },

      classificacao_final_srag: { x: 430, y: 497, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      classificacao_final_srag_outros_especifique: { x: 260, y: 460, width: 165, height: 8, fontSize: 6, page: 1 },
      criterio_confirmacao: { x: 430, y: 462, width: 10, height: 10, align: TextAlignment.Center, page: 1 },

      evolucao_clinica: { x: 250, y: 405, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      data_alta_obito: { x: 320, y: 400, width: 95, height: 9, comb: true, maxLength: 8, fontSize: 6, page: 1 },
      data_encerramento: { x: 460, y: 400, width: 95, height: 9, comb: true, maxLength: 8, fontSize: 6, page: 1 },
    },
  },
  // MENINGITE e SARAMPO: calibradas em 12/09/2026 SEM renderização visual —
  // este ambiente não tem pdftoppm/poppler/ImageMagick/PyMuPDF instalado (ao
  // contrário das rodadas anteriores, que usavam o Read tool pra visualizar
  // um PNG renderizado). Método usado aqui: extração de texto posicionado
  // via `pdfjs-dist` (`.scratch/extract-text.mjs`, x/y de cada string real
  // do PDF-base) + a mesma técnica de "transferência de delta" já
  // documentada em MALARIA/CHAGAS/TUBERCULOSE, mas aplicada campo a campo
  // (não um offset uniforme): pra cada campo do cabeçalho (1-16), medi
  // `delta = caixa_já_confirmada_por_pixel_em_ANIMAIS_PECONHENTOS -
  // posição_do_rótulo_em_ANIMAIS_PECONHENTOS` e aplique esse MESMO delta à
  // posição do rótulo equivalente extraída desta ficha (o bloco "Notificação
  // Individual" é byte-idêntico entre todas as fichas Sinan NET clássicas,
  // só a posição vertical/horizontal do bloco muda). Confirmado
  // indiretamente por uma segunda fonte independente: as marcas de comb
  // ("|") das datas/CNS extraídas desta MESMA ficha bateram com o resultado
  // do delta-transfer em todos os campos de data, dentro de ~1-3pt.
  //
  // Corpo (17+): mesmo método, mas sem ficha de referência (cada corpo é
  // medido do zero, como sempre) — coordenada = posição do rótulo real
  // extraída, ajustada pelos mesmos deltas observados no cabeçalho e nas
  // outras fichas já calibradas (rótulo ~15-20pt acima da caixa de
  // resposta). CAMPOS DE MENOR CONFIANÇA (documentados aqui em vez de
  // fingidos): caixinhas pequenas de Sim/Não/código único que não têm
  // nenhuma marca de texto própria (são retângulos vetoriais puros, opacos
  // pra extração de texto) — a posição foi estimada pela proximidade do
  // rótulo, não medida diretamente. Isso afeta especialmente a grade de
  // Resultados Laboratoriais/Exame Sorológico (Meningite: 18 campos de
  // texto livre; Sarampo: 18 campos de código Sarampo/Rubéola/Outras ×
  // IgM/IgG × S1/S2/Re-Teste) e os checkboxes de sintomas/doenças
  // pré-existentes/vacinação. Quando uma segunda fonte de confirmação
  // (render visual real) estiver disponível, revisitar esses campos
  // primeiro.
  MENINGITE: {
    file: 'Meningite_v5.pdf',
    xOffset: 0,
    yOffset: 0,
    headerBoxes: {
      notificationDate: { x: 444.7, y: 686, width: 120, height: 14, comb: true, maxLength: 8, fontSize: 8 },
      symptomOnsetDate: { x: 443.4, y: 627.6, width: 120, height: 14, comb: true, maxLength: 8, fontSize: 8 },
      notifyingUnit: { x: 65.7, y: 627.7, width: 270, height: 11 },
      patientName: { x: 66.7, y: 594.6, width: 375, height: 11 },
      birthDate: { x: 447.2, y: 596.7, width: 119, height: 14, comb: true, maxLength: 8, fontSize: 8 },
      age: { x: 71.7, y: 567.7, width: 28, height: 8, fontSize: 7, align: TextAlignment.Center },
      ageUnit: { x: 111.7, y: 580.7, width: 11, height: 11, fontSize: 7, align: TextAlignment.Center },
      motherName: { x: 243.7, y: 507.7, width: 351, height: 11 },
      cns: { x: 52.6, y: 505.7, width: 174, height: 11, comb: true, maxLength: 15, fontSize: 8 },
      sex: { x: 234.7, y: 581.7, width: 11, height: 11, align: TextAlignment.Center },
      race: { x: 554.0, y: 580.7, width: 10.8, height: 11, align: TextAlignment.Center },
    },
    bodyBoxes: {
      data_investigacao: { x: 70, y: 326, width: 105, height: 9, comb: true, maxLength: 8, fontSize: 6 },
      ocupacao: { x: 245, y: 326, width: 300, height: 9 },
      // Vacinação (campo 33): grade de 8 vacinas × (Sim/Não/Ignorado + Nº
      // Doses + Data da Última Dose). As datas/nº-doses têm marca de comb
      // extraída diretamente do PDF (alta confiança); a caixinha de
      // Sim/Não/Ignorado de cada vacina é um retângulo vetorial sem texto
      // — posição estimada pela proximidade do nome da vacina (confiança
      // menor, ver comentário do bloco acima).
      vacina_polissacaridica_ac: { x: 168, y: 296, width: 9, height: 9, align: TextAlignment.Center },
      vacina_polissacaridica_ac_doses: { x: 182, y: 297, width: 24, height: 9, comb: true, maxLength: 2, fontSize: 6 },
      vacina_polissacaridica_ac_data: { x: 227, y: 295.6, width: 95, height: 9, comb: true, maxLength: 8, fontSize: 6 },
      vacina_polissacaridica_bc: { x: 168, y: 276, width: 9, height: 9, align: TextAlignment.Center },
      vacina_polissacaridica_bc_doses: { x: 182, y: 278, width: 24, height: 9, comb: true, maxLength: 2, fontSize: 6 },
      vacina_polissacaridica_bc_data: { x: 227, y: 276.2, width: 95, height: 9, comb: true, maxLength: 8, fontSize: 6 },
      vacina_conjugada_meningo_c: { x: 168, y: 256, width: 9, height: 9, align: TextAlignment.Center },
      vacina_conjugada_meningo_c_doses: { x: 182, y: 257, width: 24, height: 9, comb: true, maxLength: 2, fontSize: 6 },
      vacina_conjugada_meningo_c_data: { x: 227, y: 256.1, width: 95, height: 9, comb: true, maxLength: 8, fontSize: 6 },
      vacina_bcg: { x: 168, y: 235, width: 9, height: 9, align: TextAlignment.Center },
      vacina_bcg_doses: { x: 182, y: 236, width: 24, height: 9, comb: true, maxLength: 2, fontSize: 6 },
      vacina_bcg_data: { x: 227, y: 235.2, width: 95, height: 9, comb: true, maxLength: 8, fontSize: 6 },
      vacina_triplice: { x: 440, y: 297, width: 9, height: 9, align: TextAlignment.Center },
      vacina_triplice_doses: { x: 411, y: 297, width: 24, height: 9, comb: true, maxLength: 2, fontSize: 6 },
      vacina_triplice_data: { x: 455, y: 297.2, width: 95, height: 9, comb: true, maxLength: 8, fontSize: 6 },
      vacina_hemofilo_hib: { x: 440, y: 277, width: 9, height: 9, align: TextAlignment.Center },
      vacina_hemofilo_hib_doses: { x: 411, y: 274, width: 24, height: 9, comb: true, maxLength: 2, fontSize: 6 },
      vacina_hemofilo_hib_data: { x: 455, y: 275, width: 95, height: 9, comb: true, maxLength: 8, fontSize: 6 },
      vacina_pneumococo: { x: 440, y: 255, width: 9, height: 9, align: TextAlignment.Center },
      vacina_pneumococo_doses: { x: 411, y: 253, width: 24, height: 9, comb: true, maxLength: 2, fontSize: 6 },
      vacina_pneumococo_data: { x: 455, y: 253.2, width: 95, height: 9, comb: true, maxLength: 8, fontSize: 6 },
      vacina_outra: { x: 440, y: 236, width: 9, height: 9, align: TextAlignment.Center },
      vacina_outra_especifique: { x: 375, y: 233, width: 45, height: 7, fontSize: 5 },
      vacina_outra_doses: { x: 411, y: 234, width: 24, height: 9, comb: true, maxLength: 2, fontSize: 6 },
      vacina_outra_data: { x: 455, y: 234.4, width: 95, height: 9, comb: true, maxLength: 8, fontSize: 6 },
      // Doenças Pré-existentes (campo 34): 7 checkboxes sem marca de texto
      // própria, posição estimada pela proximidade do rótulo.
      doenca_preexistente_aids_hiv: { x: 78, y: 199, width: 9, height: 9, align: TextAlignment.Center },
      doenca_preexistente_outras_imunodepressoras: { x: 163, y: 198.5, width: 9, height: 9, align: TextAlignment.Center },
      doenca_preexistente_ira: { x: 330, y: 198.4, width: 9, height: 9, align: TextAlignment.Center },
      doenca_preexistente_tuberculose: { x: 398, y: 198.3, width: 9, height: 9, align: TextAlignment.Center },
      doenca_preexistente_traumatismo: { x: 76, y: 182.7, width: 9, height: 9, align: TextAlignment.Center },
      doenca_preexistente_infeccao_hospitalar: { x: 163, y: 181.9, width: 9, height: 9, align: TextAlignment.Center },
      doenca_preexistente_outra: { x: 282, y: 182.0, width: 9, height: 9, align: TextAlignment.Center },
      doenca_preexistente_outra_especifique: { x: 352, y: 183.5, width: 150, height: 7, fontSize: 5 },
      contato_caso_suspeito_confirmado: { x: 557, y: 150, width: 10, height: 10, align: TextAlignment.Center },
      nome_contato: { x: 40, y: 110, width: 520, height: 9 },
      telefone_contato: { x: 447, y: 107, width: 115, height: 9, comb: true, maxLength: 9, fontSize: 6 },
      endereco_contato: { x: 40, y: 84, width: 530, height: 9 },
      caso_secundario: { x: 557, y: 96, width: 10, height: 10, align: TextAlignment.Center },
      sintoma_cefaleia: { x: 176, y: 72, width: 9, height: 9, align: TextAlignment.Center },
      sintoma_vomitos: { x: 224, y: 72.5, width: 9, height: 9, align: TextAlignment.Center },
      sintoma_rigidez_nuca: { x: 279, y: 72.5, width: 9, height: 9, align: TextAlignment.Center },
      sintoma_abaulamento_fontanela: { x: 358, y: 75, width: 9, height: 9, align: TextAlignment.Center },
      sintoma_petequias_sufusoes_hemorragicas: { x: 424, y: 72, width: 9, height: 9, align: TextAlignment.Center },
      sintoma_febre: { x: 176, y: 57.5, width: 9, height: 9, align: TextAlignment.Center },
      sintoma_convulsoes: { x: 222, y: 57.8, width: 9, height: 9, align: TextAlignment.Center },
      sintoma_kernig_brudzinski: { x: 279, y: 58, width: 9, height: 9, align: TextAlignment.Center },
      sintoma_coma: { x: 358, y: 57.7, width: 9, height: 9, align: TextAlignment.Center },
      sintoma_outros: { x: 423, y: 57.6, width: 9, height: 9, align: TextAlignment.Center },
      sintoma_outros_especifique: { x: 487, y: 59.2, width: 65, height: 7, fontSize: 5 },
      // Página 1 até aqui; Atendimento/Laboratório continuam na página 2.
      ocorreu_hospitalizacao: { x: 557, y: 782, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      data_internacao: { x: 183, y: 778, width: 95, height: 9, comb: true, maxLength: 8, fontSize: 6, page: 1 },
      uf_hospital: { x: 300, y: 780, width: 25, height: 9, maxLength: 2, page: 1 },
      municipio_hospital: { x: 335, y: 780, width: 140, height: 9, page: 1 },
      nome_hospital: { x: 40, y: 754, width: 520, height: 9, page: 1 },
      puncao_lombar: { x: 160, y: 741, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      data_puncao: { x: 185, y: 722, width: 95, height: 9, comb: true, maxLength: 8, fontSize: 6, page: 1 },
      aspecto_liquor: { x: 557, y: 733, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      // Resultados Laboratoriais (campo 49): grade de 18 campos de texto
      // livre (resultado da cultura/CIE/PCR/aglutinação/bacterioscopia/
      // isolamento por material) — nenhuma marca de comb/tick encontrada
      // (linhas em branco puramente vetoriais); posição estimada pela
      // proximidade do rótulo de cada linha, confiança menor.
      lab_cultura_liquor: { x: 150, y: 684, width: 70, height: 9, page: 1 },
      lab_cultura_lesao_petequial: { x: 150, y: 668, width: 70, height: 9, page: 1 },
      lab_cultura_sangue_soro: { x: 150, y: 652, width: 70, height: 9, page: 1 },
      lab_cultura_escarro: { x: 150, y: 636, width: 70, height: 9, page: 1 },
      lab_bacterioscopia_liquor: { x: 150, y: 608, width: 70, height: 9, page: 1 },
      lab_bacterioscopia_lesao_petequial: { x: 150, y: 592, width: 70, height: 9, page: 1 },
      lab_bacterioscopia_sangue_soro: { x: 150, y: 576, width: 70, height: 9, page: 1 },
      lab_bacterioscopia_escarro: { x: 150, y: 560, width: 70, height: 9, page: 1 },
      lab_cie_liquor: { x: 300, y: 684, width: 55, height: 9, page: 1 },
      lab_cie_sangue_soro: { x: 300, y: 671, width: 55, height: 9, page: 1 },
      lab_aglutinacao_latex_liquor: { x: 300, y: 638, width: 55, height: 9, page: 1 },
      lab_aglutinacao_latex_sangue_soro: { x: 300, y: 625, width: 55, height: 9, page: 1 },
      lab_isolamento_viral_liquor: { x: 300, y: 594, width: 55, height: 9, page: 1 },
      lab_isolamento_viral_fezes: { x: 300, y: 578, width: 55, height: 9, page: 1 },
      lab_pcr_liquor: { x: 460, y: 682, width: 90, height: 9, page: 1 },
      lab_pcr_lesao_petequial: { x: 460, y: 665, width: 90, height: 9, page: 1 },
      lab_pcr_sangue_soro: { x: 460, y: 649, width: 90, height: 9, page: 1 },
      lab_pcr_escarro: { x: 460, y: 635, width: 90, height: 9, page: 1 },
      classificacao_caso: { x: 143, y: 497, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      especifique_confirmado: { x: 557, y: 500, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      criterio_confirmacao: { x: 557, y: 445, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      sorogrupo_n_meningitidis: { x: 387, y: 440, width: 150, height: 9, page: 1 },
      numero_comunicantes: { x: 170, y: 397, width: 60, height: 9, page: 1 },
      quimioprofilaxia_comunicantes: { x: 340, y: 398, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      data_quimioprofilaxia: { x: 322, y: 378, width: 95, height: 9, comb: true, maxLength: 8, fontSize: 6, page: 1 },
      doenca_relacionada_trabalho: { x: 480, y: 396, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      evolucao_caso: { x: 275, y: 346, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      data_evolucao: { x: 334, y: 340, width: 95, height: 9, comb: true, maxLength: 8, fontSize: 6, page: 1 },
      data_encerramento: { x: 456, y: 340, width: 95, height: 9, comb: true, maxLength: 8, fontSize: 6, page: 1 },
      quimiocitologico_hemacias: { x: 100, y: 290, width: 70, height: 9, page: 1 },
      quimiocitologico_leucocitos: { x: 270, y: 290, width: 70, height: 9, page: 1 },
      quimiocitologico_monocitos: { x: 460, y: 290, width: 70, height: 9, page: 1 },
      quimiocitologico_neutrofilos: { x: 100, y: 268, width: 70, height: 9, page: 1 },
      quimiocitologico_eosinofilos: { x: 270, y: 268, width: 70, height: 9, page: 1 },
      quimiocitologico_linfocitos: { x: 460, y: 270, width: 70, height: 9, page: 1 },
      quimiocitologico_glicose: { x: 100, y: 248, width: 70, height: 9, page: 1 },
      quimiocitologico_proteinas: { x: 270, y: 248, width: 70, height: 9, page: 1 },
      quimiocitologico_cloreto: { x: 460, y: 250, width: 70, height: 9, page: 1 },
      observacoes_adicionais: { x: 40, y: 194, width: 520, height: 9, page: 1 },
    },
  },
  SARAMPO: {
    file: 'Exantematica_v5.pdf',
    xOffset: 0,
    yOffset: 0,
    // Mesmo método de MENINGITE acima (delta-transfer via extração de texto
    // posicionado, sem renderização visual disponível neste ambiente).
    headerBoxes: {
      notificationDate: { x: 441.6, y: 639.0, width: 120, height: 14, comb: true, maxLength: 8, fontSize: 8 },
      symptomOnsetDate: { x: 440.4, y: 580.7, width: 120, height: 14, comb: true, maxLength: 8, fontSize: 8 },
      notifyingUnit: { x: 62.6, y: 580.7, width: 270, height: 11 },
      patientName: { x: 62.8, y: 544.9, width: 375, height: 11 },
      birthDate: { x: 443.3, y: 547.0, width: 119, height: 14, comb: true, maxLength: 8, fontSize: 8 },
      age: { x: 67.8, y: 517.9, width: 28, height: 8, fontSize: 7, align: TextAlignment.Center },
      ageUnit: { x: 107.8, y: 530.9, width: 11, height: 11, fontSize: 7, align: TextAlignment.Center },
      motherName: { x: 239.7, y: 457.9, width: 351, height: 11 },
      cns: { x: 48.7, y: 455.9, width: 174, height: 11, comb: true, maxLength: 15, fontSize: 8 },
      sex: { x: 230.7, y: 531.9, width: 11, height: 11, align: TextAlignment.Center },
      race: { x: 550.1, y: 530.9, width: 10.8, height: 11, align: TextAlignment.Center },
    },
    bodyBoxes: {
      data_investigacao: { x: 65, y: 267, width: 100, height: 9, comb: true, maxLength: 8, fontSize: 6 },
      ocupacao: { x: 240, y: 267, width: 300, height: 9 },
      vacinado_sarampo_rubeola: { x: 280, y: 246, width: 10, height: 10, align: TextAlignment.Center },
      data_ultima_dose: { x: 449, y: 242, width: 100, height: 9, comb: true, maxLength: 8, fontSize: 6 },
      contato_caso_suspeito_confirmado: { x: 557, y: 222, width: 10, height: 10, align: TextAlignment.Center },
      nome_contato: { x: 40, y: 177.7, width: 520, height: 9 },
      endereco_contato: { x: 40, y: 153, width: 530, height: 9 },
      data_inicio_exantema: { x: 70, y: 118, width: 100, height: 9, comb: true, maxLength: 8, fontSize: 6 },
      data_inicio_febre: { x: 198, y: 117, width: 100, height: 9, comb: true, maxLength: 8, fontSize: 6 },
      sintoma_tosse: { x: 89, y: 94.5, width: 9, height: 9, align: TextAlignment.Center },
      sintoma_coriza: { x: 89, y: 79.2, width: 9, height: 9, align: TextAlignment.Center },
      sintoma_conjuntivite: { x: 89, y: 63, width: 9, height: 9, align: TextAlignment.Center },
      sintoma_artralgia_artrite: { x: 282, y: 95.3, width: 9, height: 9, align: TextAlignment.Center },
      sintoma_ganglios_retroauriculares_occipitais: { x: 282, y: 83, width: 9, height: 9, align: TextAlignment.Center },
      sintoma_dor_retro_ocular: { x: 281, y: 62, width: 9, height: 9, align: TextAlignment.Center },
      // Página 2 a partir daqui.
      ocorreu_hospitalizacao: { x: 170, y: 798, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      data_internacao: { x: 426, y: 782, width: 95, height: 9, comb: true, maxLength: 8, fontSize: 6, page: 1 },
      uf_hospital: { x: 540, y: 783, width: 22, height: 9, maxLength: 2, page: 1 },
      municipio_hospital: { x: 40, y: 757, width: 270, height: 9, page: 1 },
      nome_hospital: { x: 320, y: 757, width: 230, height: 9, page: 1 },
      data_coleta_amostra1: { x: 80, y: 721, width: 95, height: 9, comb: true, maxLength: 8, fontSize: 6, page: 1 },
      data_coleta_amostra2: { x: 280, y: 721, width: 95, height: 9, comb: true, maxLength: 8, fontSize: 6, page: 1 },
      // Grade Sarampo/Rubéola/Outras Exantemáticas × IgM/IgG × S1/S2/
      // Re-Teste (18 campos de código único): layout mais incerto desta
      // ficha — a grade tem cabeçalhos de coluna compartilhados ("IgM IgG"
      // como uma única string extraída, sem separação clara de x) e cada
      // célula de resposta é um retângulo vetorial sem texto. Posição
      // estimada por grade sistemática a partir dos rótulos de linha
      // (S1/S2/Re-Teste) e coluna (Sarampo/Rubéola/Outras) — candidata a
      // revisão quando houver uma segunda fonte de confirmação (render
      // visual real).
      resultado_sarampo_igm_s1: { x: 195, y: 683, width: 10, height: 9, align: TextAlignment.Center, page: 1 },
      resultado_sarampo_igm_s2: { x: 195, y: 664, width: 10, height: 9, align: TextAlignment.Center, page: 1 },
      resultado_sarampo_igm_reteste: { x: 195, y: 646, width: 10, height: 9, align: TextAlignment.Center, page: 1 },
      resultado_sarampo_igg_s1: { x: 220, y: 683, width: 10, height: 9, align: TextAlignment.Center, page: 1 },
      resultado_sarampo_igg_s2: { x: 220, y: 664, width: 10, height: 9, align: TextAlignment.Center, page: 1 },
      resultado_sarampo_igg_reteste: { x: 220, y: 646, width: 10, height: 9, align: TextAlignment.Center, page: 1 },
      resultado_rubeola_igm_s1: { x: 302, y: 683, width: 10, height: 9, align: TextAlignment.Center, page: 1 },
      resultado_rubeola_igm_s2: { x: 302, y: 664, width: 10, height: 9, align: TextAlignment.Center, page: 1 },
      resultado_rubeola_igm_reteste: { x: 302, y: 646, width: 10, height: 9, align: TextAlignment.Center, page: 1 },
      resultado_rubeola_igg_s1: { x: 327, y: 683, width: 10, height: 9, align: TextAlignment.Center, page: 1 },
      resultado_rubeola_igg_s2: { x: 327, y: 664, width: 10, height: 9, align: TextAlignment.Center, page: 1 },
      resultado_rubeola_igg_reteste: { x: 327, y: 646, width: 10, height: 9, align: TextAlignment.Center, page: 1 },
      resultado_outras_igm_s1: { x: 407, y: 683, width: 10, height: 9, align: TextAlignment.Center, page: 1 },
      resultado_outras_igm_s2: { x: 407, y: 664, width: 10, height: 9, align: TextAlignment.Center, page: 1 },
      resultado_outras_igm_reteste: { x: 407, y: 646, width: 10, height: 9, align: TextAlignment.Center, page: 1 },
      resultado_outras_igg_s1: { x: 432, y: 683, width: 10, height: 9, align: TextAlignment.Center, page: 1 },
      resultado_outras_igg_s2: { x: 432, y: 664, width: 10, height: 9, align: TextAlignment.Center, page: 1 },
      resultado_outras_igg_reteste: { x: 432, y: 646, width: 10, height: 9, align: TextAlignment.Center, page: 1 },
      amostra_clinica_coletada: { x: 170, y: 608, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      amostra_tipo_sangue_total: { x: 267, y: 621, width: 10, height: 9, align: TextAlignment.Center, page: 1 },
      amostra_tipo_secrecao_nasofaringea: { x: 267, y: 607, width: 10, height: 9, align: TextAlignment.Center, page: 1 },
      amostra_tipo_urina: { x: 404, y: 622, width: 10, height: 9, align: TextAlignment.Center, page: 1 },
      amostra_tipo_liquor: { x: 404, y: 608, width: 10, height: 9, align: TextAlignment.Center, page: 1 },
      etiologia_viral: { x: 140, y: 590, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      realizou_bloqueio_vacinal: { x: 557, y: 525, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      bloqueio_vacinados_menor_5_anos: { x: 352, y: 528, width: 30, height: 9, comb: true, maxLength: 3, fontSize: 6, page: 1 },
      bloqueio_vacinados_5_a_14_anos: { x: 352, y: 519, width: 30, height: 9, comb: true, maxLength: 3, fontSize: 6, page: 1 },
      bloqueio_vacinados_15_a_39_anos: { x: 352, y: 506, width: 30, height: 9, comb: true, maxLength: 3, fontSize: 6, page: 1 },
      bloqueio_intervalo_tempo: { x: 557, y: 524, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      classificacao_final: { x: 100, y: 485, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      criterio_confirmacao_descarte: { x: 557, y: 475, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      classificacao_final_caso_descartado: { x: 557, y: 440, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      caso_autoctone: { x: 105, y: 382, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      uf_provavel_fonte: { x: 380, y: 397, width: 25, height: 9, maxLength: 2, page: 1 },
      pais_provavel_fonte: { x: 415, y: 397, width: 130, height: 9, page: 1 },
      municipio_provavel_fonte: { x: 100, y: 366, width: 200, height: 9, page: 1 },
      distrito_provavel_fonte: { x: 340, y: 365, width: 110, height: 9, page: 1 },
      bairro_provavel_fonte: { x: 490, y: 365, width: 65, height: 9, page: 1 },
      evolucao_caso: { x: 557, y: 322, width: 10, height: 10, align: TextAlignment.Center, page: 1 },
      data_obito: { x: 320, y: 317, width: 95, height: 9, comb: true, maxLength: 8, fontSize: 6, page: 1 },
      data_encerramento: { x: 452, y: 317, width: 95, height: 9, comb: true, maxLength: 8, fontSize: 6, page: 1 },
      deslocamento_detalhes: { x: 40, y: 273, width: 530, height: 9, page: 1 },
      observacoes_adicionais: { x: 40, y: 200, width: 520, height: 9, page: 1 },
    },
  },
  // COVID19: ficha do "e-SUS Notifica" (sistema diferente do Sinan NET —
  // ver comentário em packages/domain/.../covid19.ts). Layout de blocos
  // rotulados sem numeração, texto livre sobre linhas sublinhadas (não
  // caixinha-por-dígito como o Sinan NET). Cabeçalho calibrado em
  // 11/09/2026: grid de 5pt sobreposto ao PDF-base + 2 rounds de render de
  // verificação com debugBorders:true. notificationDate, cpf, cns,
  // patientName, motherName, birthDate, state e municipality confirmados
  // na linha certa (2 campos — notificationDate e state/municipality —
  // precisaram de ajuste de uma linha inteira na primeira tentativa, já
  // corrigidos). sex/race ficam com a limitação descrita abaixo.
  //
  // LIMITAÇÃO CONHECIDA (arquitetura, não medição): esta ficha marca "X" em
  // UMA de várias caixinhas por campo (ex.: Sexo tem uma caixa "Masculino" e
  // outra "Feminino" separadas — não uma caixa única onde se escreve a
  // letra, como no Sinan NET). O mecanismo atual (`placeField`) só sabe
  // escrever um valor numa posição FIXA por campo, sem escolher entre
  // caixas condicionalmente. Pra `sex`/`race` aqui, o valor é escrito como
  // texto simples perto do rótulo da seção (não dentro da caixinha "certa")
  // — informação visível e correta, mas não no padrão visual "X marcado"
  // desta ficha. Resolver direito exigiria estender `HeaderBox` pra
  // suportar múltiplas posições condicionais por valor — não feito nesta
  // rodada.
  //
  // CAMPOS SEM FONTE DE DADOS (não preenchidos, de propósito — Vitaloop não
  // captura isso hoje): Tem CPF?/Estrangeiro/Profissional de saúde/
  // Profissional de segurança (flags "Marcar X"), Passaporte, Ocupação
  // (CBO), País de origem, etnia indígena, povo/comunidade tradicional,
  // CEP, Logradouro/Número/Bairro/Complemento, Telefone 1/2, E-mail,
  // Município de Notificação (é o município da UNIDADE notificadora, não
  // do paciente — `municipality` mapeia pra "Município de Residência").
  COVID19: {
    file: 'Covid19_v5.pdf',
    xOffset: 0,
    yOffset: 0,
    headerBoxes: {
      notificationDate: { x: 530, y: 695, width: 60, height: 9, fontSize: 6 },
      cpf: { x: 45, y: 655, width: 115, height: 9, comb: true, maxLength: 11, fontSize: 7 },
      cns: { x: 230, y: 655, width: 175, height: 9, comb: true, maxLength: 14, fontSize: 7 },
      patientName: { x: 115, y: 632, width: 440, height: 9, fontSize: 8 },
      motherName: { x: 150, y: 618, width: 405, height: 9, fontSize: 8 },
      birthDate: { x: 120, y: 605, width: 80, height: 9, fontSize: 7 },
      // Ver "LIMITAÇÃO CONHECIDA" acima — texto simples perto do rótulo,
      // não uma caixa "X" marcada.
      sex: { x: 45, y: 583, width: 60, height: 9, fontSize: 6 },
      race: { x: 290, y: 583, width: 60, height: 9, fontSize: 6 },
      state: { x: 140, y: 565, width: 25, height: 9, fontSize: 7 },
      municipality: { x: 250, y: 565, width: 180, height: 9, fontSize: 7 },
    },
    // Corpo calibrado em 11/09/2026: grid de 5pt sobreposto ao PDF-base +
    // 2 rounds de render de verificação com debugBorders:true. A grade de
    // Exames Laboratoriais (8 tipos de teste, página 1) precisou de
    // correção: a 1ª tentativa tinha `estado`/`resultado` 8pt acima da
    // `data_coleta` de cada exame, o que fazia o valor vazar pra
    // linha/exame anterior (confirmado comparando com `data_coleta`, que
    // já batia certo em todas as 8 linhas desde a 1ª tentativa) — corrigido
    // colocando os três campos na mesma altura. Confirmado correto depois
    // do ajuste. Mesma limitação já registrada pro cabeçalho (sex/race):
    // esta ficha inteira usa o padrão "Marcar X" com várias caixinhas por
    // campo, não uma caixa única — o mecanismo atual não escolhe
    // condicionalmente entre elas. **Simplificação aplicada a TODO campo
    // `code` do corpo desta ficha**: o valor é escrito como texto simples
    // numa posição fixa perto do rótulo/primeira opção da linha, não dentro
    // da caixinha exata da opção escolhida. Informação correta e legível,
    // mas não reproduz o "X marcado" visual da ficha original — resolver
    // isso definitivamente exigiria estender `HeaderBox` pra suportar
    // múltiplas posições condicionais por valor (não feito nesta rodada).
    // Campos de tabela repetível (Rastreamento de Contatos) viram um único
    // campo de texto livre, mesmo padrão já usado noutras fichas (ex.:
    // comunicantes de Hepatites Virais, deslocamento de Febre Amarela).
    bodyBoxes: {
      estrategia_testagem: { x: 195, y: 485, width: 10, height: 9 },
      busca_ativa_tipo: { x: 195, y: 460, width: 10, height: 9 },
      busca_ativa_outro_especifique: { x: 240, y: 425, width: 280, height: 8, fontSize: 6 },
      triagem_populacao_tipo: { x: 380, y: 460, width: 10, height: 9 },
      triagem_populacao_outro_especifique: { x: 430, y: 425, width: 130, height: 8, fontSize: 6 },
      local_testagem: { x: 195, y: 403, width: 10, height: 9 },
      local_testagem_outro_especifique: { x: 240, y: 391, width: 280, height: 8, fontSize: 6 },

      sintoma_assintomatico: { x: 195, y: 358, width: 10, height: 9 },
      sintoma_febre: { x: 270, y: 358, width: 10, height: 9 },
      sintoma_dor_garganta: { x: 345, y: 358, width: 10, height: 9 },
      sintoma_dispneia: { x: 420, y: 358, width: 10, height: 9 },
      sintoma_tosse: { x: 465, y: 358, width: 10, height: 9 },
      sintoma_coriza: { x: 510, y: 358, width: 10, height: 9 },
      sintoma_dor_cabeca: { x: 195, y: 348, width: 10, height: 9 },
      sintoma_disturbios_gustativos: { x: 275, y: 348, width: 10, height: 9 },
      sintoma_disturbios_olfativos: { x: 390, y: 348, width: 10, height: 9 },
      sintoma_outros: { x: 470, y: 348, width: 10, height: 9 },
      sintoma_outros_especifique: { x: 500, y: 345, width: 65, height: 7, fontSize: 5 },
      data_inicio_sintomas: { x: 200, y: 336, width: 60, height: 9, comb: true, maxLength: 8, fontSize: 6 },

      condicao_doencas_cardiacas_cronicas: { x: 420, y: 323, width: 10, height: 9 },
      condicao_diabetes: { x: 545, y: 323, width: 10, height: 9 },
      condicao_doencas_respiratorias_cronicas_descompensadas: { x: 45, y: 311, width: 10, height: 9 },
      condicao_puerpera: { x: 420, y: 311, width: 10, height: 9 },
      condicao_gestante: { x: 545, y: 311, width: 10, height: 9 },
      condicao_doencas_renais_cronicas_avancado: { x: 45, y: 299, width: 10, height: 9 },
      condicao_imunossupressao: { x: 420, y: 299, width: 10, height: 9 },
      condicao_obesidade: { x: 545, y: 299, width: 10, height: 9 },
      condicao_doencas_cromossomicas_fragilidade_imunologica: { x: 45, y: 287, width: 10, height: 9 },
      condicao_outros: { x: 420, y: 287, width: 10, height: 9 },
      condicao_outros_especifique: { x: 450, y: 284, width: 110, height: 7, fontSize: 5 },

      recebeu_vacina_covid19: { x: 45, y: 257, width: 10, height: 9 },
      dose1_data: { x: 240, y: 257, width: 60, height: 9, comb: true, maxLength: 8, fontSize: 6 },
      dose1_laboratorio: { x: 310, y: 257, width: 110, height: 9, fontSize: 6 },
      dose1_lote: { x: 440, y: 257, width: 110, height: 9, fontSize: 6 },
      dose2_data: { x: 240, y: 248, width: 60, height: 9, comb: true, maxLength: 8, fontSize: 6 },
      dose2_laboratorio: { x: 310, y: 248, width: 110, height: 9, fontSize: 6 },
      dose2_lote: { x: 440, y: 248, width: 110, height: 9, fontSize: 6 },

      exame_rtpcr_estado: { x: 150, y: 210, width: 10, height: 9 },
      exame_rtpcr_data_coleta: { x: 300, y: 210, width: 55, height: 9, comb: true, maxLength: 8, fontSize: 6 },
      exame_rtpcr_resultado: { x: 400, y: 210, width: 10, height: 9 },
      exame_rtlamp_estado: { x: 150, y: 185, width: 10, height: 9 },
      exame_rtlamp_data_coleta: { x: 300, y: 185, width: 55, height: 9, comb: true, maxLength: 8, fontSize: 6 },
      exame_rtlamp_resultado: { x: 400, y: 185, width: 10, height: 9 },
      exame_iga_estado: { x: 150, y: 160, width: 10, height: 9 },
      exame_iga_data_coleta: { x: 300, y: 160, width: 55, height: 9, comb: true, maxLength: 8, fontSize: 6 },
      exame_iga_resultado: { x: 400, y: 160, width: 10, height: 9 },
      exame_igm_estado: { x: 150, y: 135, width: 10, height: 9 },
      exame_igm_data_coleta: { x: 300, y: 135, width: 55, height: 9, comb: true, maxLength: 8, fontSize: 6 },
      exame_igm_resultado: { x: 400, y: 135, width: 10, height: 9 },
      exame_igg_estado: { x: 150, y: 110, width: 10, height: 9 },
      exame_igg_data_coleta: { x: 300, y: 110, width: 55, height: 9, comb: true, maxLength: 8, fontSize: 6 },
      exame_igg_resultado: { x: 400, y: 110, width: 10, height: 9 },
      exame_anticorpos_totais_estado: { x: 150, y: 85, width: 10, height: 9 },
      exame_anticorpos_totais_data_coleta: { x: 300, y: 85, width: 55, height: 9, comb: true, maxLength: 8, fontSize: 6 },
      exame_anticorpos_totais_resultado: { x: 400, y: 85, width: 10, height: 9 },
      exame_rapido_igm_estado: { x: 150, y: 60, width: 10, height: 9 },
      exame_rapido_igm_data_coleta: { x: 300, y: 60, width: 55, height: 9, comb: true, maxLength: 8, fontSize: 6 },
      exame_rapido_igm_resultado: { x: 400, y: 60, width: 10, height: 9 },
      exame_rapido_igg_estado: { x: 150, y: 35, width: 10, height: 9 },
      exame_rapido_igg_data_coleta: { x: 300, y: 35, width: 55, height: 9, comb: true, maxLength: 8, fontSize: 6 },
      exame_rapido_igg_resultado: { x: 400, y: 35, width: 10, height: 9 },

      // Página 2 (page: 1) — landscape, 841x595.
      exame_rapido_antigeno_estado: { x: 145, y: 545, width: 10, height: 9, page: 1 },
      exame_rapido_antigeno_data_coleta: { x: 350, y: 538, width: 55, height: 9, comb: true, maxLength: 8, fontSize: 6, page: 1 },
      exame_rapido_antigeno_fabricante: { x: 460, y: 545, width: 110, height: 9, fontSize: 6, page: 1 },
      exame_rapido_antigeno_lote: { x: 610, y: 545, width: 110, height: 9, fontSize: 6, page: 1 },
      exame_rapido_antigeno_resultado: { x: 755, y: 545, width: 10, height: 9, page: 1 },

      evolucao_caso: { x: 45, y: 500, width: 10, height: 9, page: 1 },
      classificacao_final: { x: 290, y: 500, width: 10, height: 9, page: 1 },
      data_encerramento: { x: 700, y: 485, width: 95, height: 9, comb: true, maxLength: 8, fontSize: 6, page: 1 },

      observacoes_adicionais: { x: 45, y: 428, width: 750, height: 9, fontSize: 7, page: 1 },
      rastreamento_contatos_detalhes: { x: 45, y: 395, width: 750, height: 9, fontSize: 6, page: 1 },
    },
  },
};

/**
 * Coordenadas da caixa de cada campo (canto inferior esquerdo x,y + largura
 * e altura), calibradas a partir do texto extraído do PDF original com
 * pdf2json.
 */
interface HeaderBox {
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize?: number;
  comb?: boolean;
  maxLength?: number;
  // Campos estreitos de valor único (idade, unidade, sexo, raça/cor) ficam
  // melhor centralizados — o alinhamento padrão do pdf-lib é à esquerda
  // com só ~1pt de respiro, o que em caixas de poucos pontos de largura
  // deixa o texto quase encostando na borda ou no texto vizinho.
  align?: TextAlignment;
  // Só usado em `bodyBoxes` — fichas SINAN têm 1-2 páginas, o corpo (17+)
  // frequentemente cai na segunda. `undefined`/ausente = página 0 (a
  // primeira), igual ao cabeçalho, que nunca sai da página 0.
  page?: number;
}

// Coordenadas de comb (data e CNS) calibradas contando as caixinhas
// impressas de verdade no PDF-base (inspeção visual ampliada + extração
// vetorial), não estimadas. Data = 8 caixinhas (DD MM AAAA, sem espaço
// para barra). CNS = 15 caixinhas, sem agrupamento.
const HEADER_BOXES: Record<string, HeaderBox> = {
  notificationDate: { x: 441.6, y: 689, width: 120, height: 14, comb: true, maxLength: 8, fontSize: 8 },
  symptomOnsetDate: { x: 438.8, y: 633, width: 120, height: 14, comb: true, maxLength: 8, fontSize: 8 },
  // Mesmo padrão do campo 8 (ver patientName): rótulo "Unidade de Saúde
  // (ou outra fonte notificadora)" fica na própria linha, sem espaço ao
  // lado — o valor vai na linha em branco abaixo, ocupando a largura toda
  // até antes do divisor do campo "Código" (x:334.5). Confirmado por
  // varredura de pixel achando as bordas horizontais da linha (632 a 660).
  // x alinhado ao início do próprio texto do rótulo (x:61.31, extraído do
  // PDF), não à borda esquerda da caixa — pedido explícito do usuário pra
  // o valor começar embaixo da primeira letra do rótulo.
  notifyingUnit: { x: 61, y: 633, width: 267, height: 11 },
  // PADRÃO GERAL desta ficha pra todo campo de texto livre (nome, unidade,
  // endereço etc., confirmado pelo usuário com exemplo manuscrito): o
  // rótulo ocupa sua própria linha, sem nada ao lado, e o valor vai na
  // linha em branco ABAIXO do rótulo, ocupando a largura toda disponível
  // — nunca ao lado do rótulo na mesma linha. Vale pra notifyingUnit e
  // motherName (abaixo) e deve valer pra Município de Notificação e
  // campos de Endereço quando forem implementados.
  // Campo 8 especificamente: x alinhado ao início do texto do rótulo
  // "Nome do Paciente" (x:62.05, extraído do PDF — "Osvaldo" começa
  // embaixo do "N" de "Nome"), largura até x:435 (antes da coluna de
  // "9 Data de Nascimento"), confirmado por inspeção visual.
  patientName: { x: 62, y: 600, width: 373, height: 11 },
  birthDate: { x: 442.5, y: 602, width: 119, height: 14, comb: true, maxLength: 8, fontSize: 8 },
  // CORRIGIDO (o usuário reportou o mesmo problema 3 vezes até eu achar a
  // causa raiz): o valor da idade NÃO vai no vão apertado ao lado do
  // rótulo — vai numa linha PRÓPRIA, com duas divisórias/tracinhos
  // impressos, logo ABAIXO de "(ou) Idade" (mesmo princípio de datas/CNS:
  // escrever por cima dos tracinhos, não dentro de caixinhas individuais).
  // Eu vinha ajustando fonte/largura do lugar ERRADO (o vão ao lado da
  // caixinha de unidade) porque nunca tinha achado esses tracinhos — só
  // apareceram numa varredura de pixel bem abaixo do rótulo, quase colados
  // na borda da linha de "Escolaridade". Confirmado com exemplo manuscrito
  // do usuário mostrando "68" escrito bem ali. x/width dão margem de ~6pt
  // antes/depois dos dois tracinhos (x:73.0 e x:86.5).
  age: { x: 67, y: 573, width: 28, height: 8, fontSize: 7, align: TextAlignment.Center },
  // Caixinha própria pro código da unidade (1-Hora 2-Dia 3-Mês 4-Ano) —
  // é a MESMA caixa que eu tinha atribuído por engano ao valor da idade
  // antes (x:107). Confirmado com exemplo manuscrito do usuário: a idade
  // vai na área aberta à esquerda (`age`, acima) e o código da unidade
  // (1/2/3/4) vai dentro desta caixinha fechada.
  ageUnit: { x: 107, y: 586, width: 11, height: 11, fontSize: 7, align: TextAlignment.Center },
  // Mesmo padrão: rótulo "16 Nome da mãe" na própria linha, valor na
  // linha em branco abaixo (linha vai de y:512 a y:540, confirmado por
  // pixel), ocupando a largura toda até a borda direita da página. x
  // alinhado ao início do texto do rótulo (x:239.22, extraído do PDF).
  motherName: { x: 239, y: 513, width: 351, height: 11 },
  // Largura recalibrada por análise de pixel do PNG renderizado (não só
  // extração vetorial): a largura real das 15 caixinhas é ~174pt (15
  // células de ~11.46pt cada), não 150pt como medido antes — a medição
  // anterior cortava a caixa ~24pt antes do fim real, fazendo os dígitos
  // finais derivarem pra direita das divisórias impressas.
  cns: { x: 48, y: 511, width: 174, height: 11, comb: true, maxLength: 15, fontSize: 8 },
  // Campo 11 (Sexo) é uma única caixa de resposta onde se escreve a letra
  // (M/F/I), igual a todo campo de múltipla escolha desta ficha — não é
  // uma caixa de seleção por opção.
  sex: { x: 230, y: 587, width: 11, height: 11, align: TextAlignment.Center },
  // Campo 13 (Raça/Cor): mesmo padrão — código de 1 a 9 na caixinha ao
  // lado do rótulo.
  race: { x: 549.4, y: 586, width: 10.8, height: 11, align: TextAlignment.Center },
};

export const isSinanFormAvailable = (diseaseCode: string): boolean => diseaseCode in FORM_TEMPLATES;

export const generateSinanFormPdf = async (
  diseaseCode: string,
  data: SinanFormData,
  options?: { debugBorders?: boolean; bodyFieldValues?: Record<string, string> },
): Promise<Uint8Array> => {
  const template = FORM_TEMPLATES[diseaseCode];
  if (!template) {
    throw new Error(`Não há modelo de ficha SINAN cadastrado para o agravo "${diseaseCode}".`);
  }

  const templateBytes = await readFile(join(ASSETS_DIR, template.file));
  const pdfDoc = await PDFDocument.load(templateBytes);
  const pages = pdfDoc.getPages();
  const page = pages[0]!;
  const form = pdfDoc.getForm();
  const { xOffset, yOffset } = template;
  const boxes = template.headerBoxes ?? HEADER_BOXES;

  const values: Record<string, string> = {
    // Campos de data são caixinhas de comb (8 dígitos DDMMAAAA, sem "/") —
    // ver HEADER_BOXES. formatDateBR ainda roda antes só pra normalizar
    // entrada ISO/BR, mas o resultado é reduzido a dígitos puros aqui.
    notificationDate: onlyDigits(formatDateBR(data.notificationDate)),
    symptomOnsetDate: onlyDigits(formatDateBR(data.symptomOnsetDate)),
    notifyingUnit: data.notifyingUnit ?? '',
    patientName: data.patientName ?? '',
    birthDate: onlyDigits(formatDateBR(data.birthDate)),
    age: data.age ?? '',
    ageUnit: data.ageUnit ?? '',
    motherName: data.motherName ?? '',
    // CNS também é comb (15 caixinhas sem agrupamento) — dígitos puros.
    cns: onlyDigits(data.cns),
    sex: data.sex ?? '',
    race: data.race ?? '',
    municipality: data.municipality ?? '',
    cpf: onlyDigits(data.cpf),
    state: data.state ?? '',
  };

  // Extraído pra função porque o corpo (bodyBoxes, abaixo) precisa do
  // mesmíssimo comportamento de criação de campo — só muda a página alvo e
  // se o offset do template se aplica (corpo é sempre coordenada absoluta,
  // ver comentário em `FormTemplate.bodyBoxes`).
  const placeField = (fieldKey: string, box: HeaderBox, value: string, targetPage: typeof page, applyOffset: boolean): void => {
    const field = form.createTextField(`${diseaseCode}.${fieldKey}`);
    // setMaxLength precisa vir antes de enableCombing (pdf-lib lança
    // "must have a max length in order to be combed" se a ordem for trocada).
    if (box.comb && box.maxLength) {
      field.setMaxLength(box.maxLength);
      field.enableCombing();
    }
    if (box.align !== undefined) field.setAlignment(box.align);
    field.setText(value);
    field.addToPage(targetPage, {
      x: box.x + (applyOffset ? xOffset : 0),
      y: box.y + (applyOffset ? yOffset : 0),
      width: box.width,
      height: box.height,
      textColor: rgb(0, 0, 0),
      // `undefined` aqui é proposital, não "ausência de valor": addToPage
      // só aplica seu default (fundo branco opaco / borda preta) quando a
      // CHAVE está ausente do objeto (checa via `'key' in options`). Passar
      // undefined explicitamente mantém a chave presente e evita o default —
      // é isso que garante fundo/borda transparentes fora do modo debug.
      // O cast é necessário porque o tipo do pdf-lib não reflete essa
      // distinção sob exactOptionalPropertyTypes.
      backgroundColor: (options?.debugBorders ? rgb(1, 0.95, 0.9) : undefined) as Color,
      borderColor: (options?.debugBorders ? rgb(0.85, 0.2, 0.2) : undefined) as Color,
      borderWidth: options?.debugBorders ? 0.75 : 0,
    });
    if (box.fontSize) field.setFontSize(box.fontSize);
  };

  for (const [name, box] of Object.entries(boxes)) {
    const value = values[name];
    if (!value) continue;
    placeField(name, box, value, page, true);
  }

  // Campos do corpo (17+) — coordenada absoluta, sem offset do template
  // (ver `FormTemplate.bodyBoxes`), podendo cair em qualquer página.
  if (template.bodyBoxes && options?.bodyFieldValues) {
    for (const [name, box] of Object.entries(template.bodyBoxes)) {
      const value = options.bodyFieldValues[name];
      if (!value) continue;
      const targetPage = pages[box.page ?? 0];
      if (!targetPage) continue;
      placeField(name, box, value, targetPage, false);
    }
  }

  // setFontSize só marca o campo como "sujo" (precisa recalcular a
  // aparência); sem forçar essa atualização aqui, o preview em modo debug
  // mostraria o tamanho AUTOMÁTICO calculado no addToPage (que pode ser
  // grande demais pra caber na largura da célula — foi isso que causou o
  // texto de data estourando a caixa), não o tamanho fixo que setFontSize
  // acabou de definir. form.flatten() já faz essa atualização por conta
  // própria, mas só roda fora do modo debug — chamando aqui garante que o
  // preview bata com o resultado final nos dois modos.
  form.updateFieldAppearances();

  // Achata os campos em conteúdo estático da página — sem isso, alguns
  // leitores de PDF destacam widgets de formulário interativos (fundo/realce
  // ao passar o mouse ou ao focar), o que pode aparentar rasura sobre as
  // linhas impressas. Documento final também fica não-editável, como um
  // impresso oficial preenchido.
  if (!options?.debugBorders) {
    form.flatten();
  }

  return pdfDoc.save();
};
