/**
 * Erros de domínio do Paciente — códigos estáveis (Doc 2 §34), mesmo padrão
 * de `AppError` já usado no restante do projeto (`packages/shared/src/errors.ts`).
 */

import { AppError, ErrorCategory } from '@vitaloop/shared';

export const patientRequiredFieldError = (field: string): AppError =>
  new AppError({
    category: ErrorCategory.VALIDATION,
    code: 'PATIENT_REQUIRED_FIELD',
    message: `Campo obrigatório ausente para cadastro de paciente: ${field}.`,
    details: [{ field, issue: 'obrigatório' }],
  });

export const invalidCpfError = (raw: string): AppError =>
  new AppError({
    category: ErrorCategory.VALIDATION,
    code: 'PATIENT_INVALID_CPF',
    message: 'CPF inválido.',
    details: [{ field: 'cpf', issue: raw }],
  });

export const invalidCnsError = (raw: string): AppError =>
  new AppError({
    category: ErrorCategory.VALIDATION,
    code: 'PATIENT_INVALID_CNS',
    message: 'CNS inválido.',
    details: [{ field: 'cns', issue: raw }],
  });

export const invalidBirthDateError = (raw: string): AppError =>
  new AppError({
    category: ErrorCategory.VALIDATION,
    code: 'PATIENT_INVALID_BIRTH_DATE',
    message: 'Data de nascimento inválida ou futura.',
    details: [{ field: 'birthDate', issue: raw }],
  });

/** Tentativa de alterar campo imutável (ex.: número de prontuário, conteúdo de alergia). */
export const immutableFieldError = (field: string, entity: string): AppError =>
  new AppError({
    category: ErrorCategory.CONFLICT,
    code: 'PATIENT_IMMUTABLE_FIELD',
    message: `Campo '${field}' de ${entity} é imutável após criado; registre um novo evento em vez de alterar.`,
    details: [{ field, issue: 'imutável' }],
  });

/**
 * Duplicidade forte/conflito detectada e o chamador não confirmou
 * explicitamente a criação mesmo assim (Doc 1 §11: "confirmação antes de
 * criar provável duplicado").
 */
export const duplicateNotConfirmedError = (
  strength: 'strong' | 'conflict',
): AppError =>
  new AppError({
    category: ErrorCategory.CONFLICT,
    code: 'PATIENT_DUPLICATE_NOT_CONFIRMED',
    message:
      strength === 'conflict'
        ? 'Possível conflito de identidade (mesmo CPF/CNS, nome diferente) — requer revisão humana antes de prosseguir.'
        : 'Possível duplicidade forte (mesmo CPF/CNS) — confirmação explícita necessária antes de criar novo cadastro.',
    details: [{ field: 'duplicate', issue: strength }],
  });

/** Solicitação de merge com origem e destino iguais (Doc 1/2 — regra estrutural do schema). */
export const mergeSameSourceAndTargetError = (): AppError =>
  new AppError({
    category: ErrorCategory.VALIDATION,
    code: 'PATIENT_MERGE_SAME_PATIENT',
    message: 'Paciente de origem e destino do merge não podem ser o mesmo registro.',
  });

/**
 * Execução de merge (reatribuição de dados clínicos) — NÃO DEFINIDO no
 * schema (Doc 1/2/3/4 não especificam suficientemente as regras). Qualquer
 * tentativa de ir além de solicitar/aprovar/rejeitar é bloqueada aqui.
 */
export const mergeExecutionNotDefinedError = (): AppError =>
  new AppError({
    category: ErrorCategory.STATE,
    code: 'PATIENT_MERGE_EXECUTION_NOT_DEFINED',
    message:
      'Execução de merge de paciente (reatribuição de dados clínicos) depende de decisão institucional ainda não tomada — apenas solicitação/aprovação/rejeição são suportadas.',
  });

export const patientNotFoundError = (): AppError =>
  new AppError({
    category: ErrorCategory.NOT_FOUND,
    code: 'PATIENT_NOT_FOUND',
    message: 'Paciente não encontrado.',
  });
