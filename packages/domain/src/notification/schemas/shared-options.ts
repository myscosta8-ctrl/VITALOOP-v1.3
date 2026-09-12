import type { SinanBodyField, SinanFieldOption, SinanFieldVisibleWhen } from '../types.js';

/**
 * Opções e campos reutilizáveis entre as fichas SINAN de doenças diferentes.
 * Extraídos do padrão que se repete em praticamente toda ficha de notificação
 * compulsória (Sim/Não/Ignorado, resultado de exame, evolução do caso) — não
 * são específicos de nenhuma doença, então ficam num arquivo à parte em vez
 * de duplicados em cada `schemas/<doenca>.ts`.
 *
 * Códigos de campo aqui são semânticos (ex.: `febre`, `evolucao_caso`), não o
 * número oficial impresso na ficha — decisão registrada no plano de rollout:
 * o preenchimento do PDF do corpo da ficha (campos 17+) ainda não existe pra
 * nenhuma doença, então não há hoje necessidade de numeração oficial. Ver
 * `packages/domain/src/notification/schemas/animais-peconhentos.ts` pro
 * padrão oposto (número oficial), usado só quando o PDF já foi calibrado.
 */

export const SIM_NAO_IGN_OPTIONS: readonly SinanFieldOption[] = [
  { code: '1', label: 'Sim' },
  { code: '2', label: 'Não' },
  { code: '9', label: 'Ignorado' },
];

export const LAB_RESULTADO_OPTIONS: readonly SinanFieldOption[] = [
  { code: '1', label: 'Positivo' },
  { code: '2', label: 'Negativo' },
  { code: '3', label: 'Inconclusivo' },
  { code: '4', label: 'Não Realizado' },
];

export const EVOLUCAO_CASO_OPTIONS: readonly SinanFieldOption[] = [
  { code: '1', label: 'Cura' },
  { code: '2', label: 'Óbito pela doença' },
  { code: '3', label: 'Óbito por outras causas' },
  { code: '4', label: 'Em Tratamento' },
  { code: '5', label: 'Transferência' },
  { code: '6', label: 'Abandono' },
  { code: '9', label: 'Ignorado' },
];

/** Campo Sim/Não/Ignorado — usado pra sintomas/sinais em checklist e perguntas binárias. */
export const simNaoIgnField = (
  code: string,
  label: string,
  extra?: Partial<Omit<SinanBodyField, 'code' | 'label' | 'type' | 'options'>>,
): SinanBodyField => ({
  code,
  label,
  type: 'code',
  options: SIM_NAO_IGN_OPTIONS,
  ...extra,
});

/** Campo de resultado de exame laboratorial (Positivo/Negativo/Inconclusivo/Não Realizado). */
export const labResultadoField = (
  code: string,
  label: string,
  extra?: Partial<Omit<SinanBodyField, 'code' | 'label' | 'type' | 'options'>>,
): SinanBodyField => ({
  code,
  label,
  type: 'code',
  options: LAB_RESULTADO_OPTIONS,
  ...extra,
});

/** Campo padrão "Evolução do Caso" — quase toda ficha termina com ele. */
export const evolucaoCasoField = (
  extra?: Partial<Omit<SinanBodyField, 'code' | 'label' | 'type' | 'options'>>,
): SinanBodyField => ({
  code: 'evolucao_caso',
  label: 'Evolução do Caso',
  type: 'code',
  options: EVOLUCAO_CASO_OPTIONS,
  ...extra,
});

/** Grupo de sintomas/sinais em checklist: um campo Sim/Não/Ignorado por item. */
export const checklistFields = (
  items: ReadonlyArray<readonly [code: string, label: string]>,
  visibleWhen?: SinanFieldVisibleWhen,
): SinanBodyField[] => items.map(([code, label]) => simNaoIgnField(code, label, visibleWhen ? { visibleWhen } : undefined));
