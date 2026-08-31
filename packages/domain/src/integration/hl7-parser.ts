import { AppError, ErrorCategory } from '@vitaloop/shared';
import type { ParsedHl7Result } from './types.js';

export function parseHl7OruMessage(rawPayload: string): ParsedHl7Result {
  if (!rawPayload || !rawPayload.includes('MSH')) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'INVALID_HL7_PAYLOAD',
      message: 'Mensagem HL7 inválida: segmento MSH de cabeçalho não encontrado.',
    });
  }

  const lines = rawPayload.split(/\r?\n|\r/);
  let controlId = 'UNKNOWN';
  let patientId: string | undefined;
  let patientName: string | undefined;
  let observationValue: string | undefined;
  let observationUnit: string | undefined;
  let resultStatus: string | undefined;

  for (const line of lines) {
    if (line.startsWith('MSH')) {
      const parts = line.split('|');
      controlId = parts[9] || 'CTRL-1001';
    } else if (line.startsWith('PID')) {
      const parts = line.split('|');
      patientId = parts[3] || undefined;
      patientName = parts[5]?.replace('^', ' ') || undefined;
    } else if (line.startsWith('OBX')) {
      const parts = line.split('|');
      observationValue = parts[5] || undefined;
      observationUnit = parts[6] || undefined;
      resultStatus = parts[11] || 'F';
    }
  }

  return {
    messageType: 'ORU^R01',
    controlId,
    patientId,
    patientName,
    observationValue,
    observationUnit,
    resultStatus,
  };
}

export function parseHl7OrmMessage(rawPayload: string): ParsedHl7Result {
  if (!rawPayload || !rawPayload.includes('MSH')) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'INVALID_HL7_PAYLOAD',
      message: 'Mensagem HL7 RIS/ORM inválida: segmento MSH não encontrado.',
    });
  }

  const lines = rawPayload.split(/\r?\n|\r/);
  let controlId = 'UNKNOWN';

  for (const line of lines) {
    if (line.startsWith('MSH')) {
      const parts = line.split('|');
      controlId = parts[9] || 'CTRL-2002';
    }
  }

  return {
    messageType: 'ORM^O01',
    controlId,
    resultStatus: 'requested',
  };
}
