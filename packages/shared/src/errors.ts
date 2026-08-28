/**
 * Códigos de erro estáveis por categoria (Doc 2 §34).
 * Mensagens não devem expor PII nem detalhes de segurança.
 */

export const ErrorCategory = {
  AUTH: 'AUTH',
  ACCESS: 'ACCESS',
  VALIDATION: 'VALIDATION',
  CLINICAL: 'CLINICAL',
  CONFLICT: 'CONFLICT',
  STATE: 'STATE',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMIT: 'RATE_LIMIT',
  INTERNAL: 'INTERNAL',
} as const;

export type ErrorCategory = (typeof ErrorCategory)[keyof typeof ErrorCategory];

/** Mapeamento categoria -> código HTTP sugerido (Doc 2 §32). */
export const httpStatusForCategory: Record<ErrorCategory, number> = {
  AUTH: 401,
  ACCESS: 403,
  VALIDATION: 400,
  CLINICAL: 422,
  CONFLICT: 409,
  STATE: 422,
  NOT_FOUND: 404,
  RATE_LIMIT: 429,
  INTERNAL: 500,
};

export interface AppErrorShape {
  readonly category: ErrorCategory;
  readonly code: string;
  readonly message: string;
  readonly details?: ReadonlyArray<{ field?: string; issue: string }>;
}

/**
 * AppError — erro de aplicação/domínio com código estável.
 * `code` deve seguir o padrão CATEGORIA_DESCRICAO (ex.: STATE_INVALID_TRANSITION).
 */
export class AppError extends Error implements AppErrorShape {
  readonly category: ErrorCategory;
  readonly code: string;
  readonly details?: ReadonlyArray<{ field?: string; issue: string }>;

  constructor(shape: AppErrorShape) {
    super(shape.message);
    this.name = 'AppError';
    this.category = shape.category;
    this.code = shape.code;
    if (shape.details) this.details = shape.details;
  }

  get httpStatus(): number {
    return httpStatusForCategory[this.category];
  }

  toJSON(): AppErrorShape {
    return {
      category: this.category,
      code: this.code,
      message: this.message,
      ...(this.details ? { details: this.details } : {}),
    };
  }
}
