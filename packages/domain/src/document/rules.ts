import { AppError, ErrorCategory } from '@vitaloop/shared';
import type { CreateClinicalDocumentInput, RevokeClinicalDocumentInput } from './types.js';

export function numberToWords(num: number): string {
  const words: Record<number, string> = {
    1: 'um',
    2: 'dois',
    3: 'três',
    4: 'quatro',
    5: 'cinco',
    6: 'seis',
    7: 'sete',
    8: 'oito',
    9: 'nove',
    10: 'dez',
    11: 'onze',
    12: 'doze',
    13: 'treze',
    14: 'catorze',
    15: 'quinze',
    16: 'dezesseis',
    17: 'dezessete',
    18: 'dezoito',
    19: 'dezenove',
    20: 'vinte',
    30: 'trinta',
  };

  if (words[num]) return words[num];
  if (num > 20 && num < 30) return `vinte e ${words[num - 20]}`;
  return num.toString();
}

export function validateClinicalDocumentInput(input: CreateClinicalDocumentInput): void {
  if (!input.title || input.title.trim().length < 3) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'DOCUMENT_TITLE_REQUIRED',
      message: 'O título do documento deve possuir no mínimo 3 caracteres.',
    });
  }

  if (!input.content || input.content.trim().length < 10) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'DOCUMENT_CONTENT_TOO_SHORT',
      message: 'O conteúdo do documento clínico deve possuir no mínimo 10 caracteres.',
    });
  }

  if (input.documentType === 'medical_certificate') {
    if (typeof input.daysOff !== 'number' || input.daysOff <= 0) {
      throw new AppError({
        category: ErrorCategory.VALIDATION,
        code: 'DAYS_OFF_REQUIRED',
        message: 'O atestado médico exige a quantidade de dias de afastamento (maior que zero).',
      });
    }
  }

  if (input.documentType === 'companion_certificate') {
    if (!input.companionName || input.companionName.trim().length < 3) {
      throw new AppError({
        category: ErrorCategory.VALIDATION,
        code: 'COMPANION_NAME_REQUIRED',
        message: 'O atestado de acompanhante exige o nome do acompanhante (mínimo 3 caracteres).',
      });
    }
  }
}

export function validateRevokeClinicalDocumentInput(input: RevokeClinicalDocumentInput): void {
  if (!input.revocationReason || input.revocationReason.trim().length < 10) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'REVOCATION_REASON_REQUIRED',
      message: 'O cancelamento/retificação de documento exige justificativa clínica mínima de 10 caracteres.',
    });
  }
}
