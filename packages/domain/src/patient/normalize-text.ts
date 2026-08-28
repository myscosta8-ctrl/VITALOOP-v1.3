/**
 * Espelha `app.normalize_text()` (migrations 0017/0018): minúsculas, sem
 * acentos, sem espaços nas pontas, espaços internos colapsados. Usado para
 * comparação de nomes na detecção de duplicidade fraca (`duplicate-detection.ts`),
 * em paridade com a função SQL homônima já testada no banco (T3/PHASE_2_STEP_1_REPORT).
 */

// Faixa Unicode dos diacríticos combinantes U+0300-U+036F (equivalente a unaccent para latim).
const COMBINING_DIACRITICS_RE = /[̀-ͯ]/g;

export const normalizeText = (raw: string | null | undefined): string | null => {
  if (raw === null || raw === undefined) return null;
  const stripped = raw
    .normalize('NFD')
    .replace(COMBINING_DIACRITICS_RE, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
  return stripped === '' ? null : stripped;
};
