import { AppError, ErrorCategory } from '@vitaloop/shared';

export function escapeHtml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function detectSqlInjectionPattern(input: string): boolean {
  if (!input) return false;
  const sqliPatterns = [
    /(\b(select|insert|update|delete|drop|union|alter|exec|execute)\b)/i,
    /(--|;\s*--|\/\*|\*\/)/,
    /(\b(or|and)\b\s+['"]?\d+['"]?\s*=\s*['"]?\d+['"]?)/i,
    /('|"|\b)(or|and)\b\s*('|")/i,
    /(';|";)/,
  ];
  return sqliPatterns.some((pattern) => pattern.test(input));
}

export function validateOwnershipIdor(
  requestedResourceId: string,
  allowedResourceIds: string[],
): void {
  if (!allowedResourceIds.includes(requestedResourceId)) {
    throw new AppError({
      category: ErrorCategory.ACCESS,
      code: 'IDOR_ACCESS_DENIED',
      message: 'Acesso negado: você não possui permissão para acessar o recurso especificado.',
    });
  }
}
