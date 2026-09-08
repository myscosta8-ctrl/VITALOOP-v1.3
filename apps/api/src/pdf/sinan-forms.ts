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
}

const FORM_TEMPLATES: Record<string, FormTemplate> = {
  ACIDENTE_ANIMAL_PECONHENTO: { file: 'Animais_Peconhentos_v5.pdf', xOffset: 0, yOffset: 0 },
  // Campo 7 nesta ficha se chama "Data do Atendimento" (não "Data dos
  // Primeiros Sintomas" — não existe "sintoma" num atendimento profilático).
  // Mapeado no mesmo slot `symptomOnsetDate` porque é estruturalmente a
  // mesma posição/tipo de campo (segunda data do cabeçalho); quem chamar
  // generateSinanFormPdf pra esta ficha deve passar a data do atendimento
  // nesse campo.
  ATENDIMENTO_ANTIRRABICO: { file: 'anti_rabico_v5.pdf', xOffset: 1.5, yOffset: 39.75 },
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
  options?: { debugBorders?: boolean },
): Promise<Uint8Array> => {
  const template = FORM_TEMPLATES[diseaseCode];
  if (!template) {
    throw new Error(`Não há modelo de ficha SINAN cadastrado para o agravo "${diseaseCode}".`);
  }

  const templateBytes = await readFile(join(ASSETS_DIR, template.file));
  const pdfDoc = await PDFDocument.load(templateBytes);
  const page = pdfDoc.getPage(0);
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
  };

  for (const [name, box] of Object.entries(boxes)) {
    const value = values[name];
    if (!value) continue;

    const field = form.createTextField(`${diseaseCode}.${name}`);
    // setMaxLength precisa vir antes de enableCombing (pdf-lib lança
    // "must have a max length in order to be combed" se a ordem for trocada).
    if (box.comb && box.maxLength) {
      field.setMaxLength(box.maxLength);
      field.enableCombing();
    }
    if (box.align !== undefined) field.setAlignment(box.align);
    field.setText(value);
    field.addToPage(page, {
      x: box.x + xOffset,
      y: box.y + yOffset,
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
