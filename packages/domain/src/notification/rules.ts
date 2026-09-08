/**
 * Regras de validação/visibilidade dos campos clínicos do SINAN — hoje só
 * reexporta o motor genérico (`@vitaloop/domain`'s `clinical-forms`), sem
 * lógica própria. Mantido como módulo separado (em vez de apagar e apontar
 * direto pra `clinical-forms`) porque o nome comunica melhor o contexto de
 * uso (notificação compulsória) pra quem lê o código da API/web.
 */
export {
  validateFormValues as validateBodyFieldValues,
  sanitizeFormValues as sanitizeBodyFieldValues,
} from '../clinical-forms/rules.js';
// isFieldVisible/visibleFields não são renomeados — sem apelido pra evitar
// colisão de nome no índice raiz do domínio (várias features reexportam o
// motor genérico). Importe direto de `clinical-forms` quando precisar.
