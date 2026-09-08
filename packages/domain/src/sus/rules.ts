import { AppError, ErrorCategory } from '@vitaloop/shared';
import type {
  SigtapProcedure,
  CreateAihRequestInput,
  CreateApacRequestInput,
  CompatibilityValidationResult,
} from './types.js';

export function validateSigtapCompatibility(
  procedure: SigtapProcedure,
  patientAgeMonths: number,
  patientSex: 'male' | 'female' | 'undetermined',
  cid10?: string | null,
): CompatibilityValidationResult {
  const errors: string[] = [];

  // 1. Validação de Idade (SUS-005)
  if (patientAgeMonths < procedure.minAgeMonths || patientAgeMonths > procedure.maxAgeMonths) {
    errors.push(`Idade do paciente (${Math.floor(patientAgeMonths / 12)} anos) fora da faixa permitida para o procedimento (${Math.floor(procedure.minAgeMonths / 12)} a ${Math.floor(procedure.maxAgeMonths / 12)} anos).`);
  }

  // 2. Validação de Sexo (SUS-005)
  if (procedure.allowedSex !== 'BOTH') {
    const expectedSex = procedure.allowedSex === 'F' ? 'female' : 'male';
    if (patientSex !== expectedSex) {
      errors.push(`Procedimento restrito ao sexo ${procedure.allowedSex === 'F' ? 'Feminino' : 'Masculino'}.`);
    }
  }

  // 3. Validação de CID-10 Obrigatório (SUS-003, SUS-005)
  if (procedure.requireCid && (!cid10 || cid10.trim().length < 3)) {
    errors.push('Diagnóstico CID-10 é obrigatório para este procedimento SIGTAP.');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// AIH e APAC compartilham o mesmo formato de campos "procedimento SIGTAP +
// CID-10 principal + justificativa clínica" (irmãos: internação vs.
// procedimento ambulatorial) — mesma validação, só muda o rótulo do
// documento na mensagem de erro.
function validateProcedureBasedRequestInput(
  input: { mainProcedureCode: string; mainCid10: string; clinicalJustification: string },
  docLabel: string,
): void {
  if (!input.mainProcedureCode || input.mainProcedureCode.trim().length < 10) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'INVALID_PROCEDURE_CODE',
      message: 'Código de procedimento SIGTAP principal inválido (10 dígitos obrigatórios).',
    });
  }

  if (!input.mainCid10 || input.mainCid10.trim().length < 3) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'MAIN_CID_REQUIRED',
      message: `Código CID-10 principal é obrigatório para a emissão do laudo de ${docLabel}.`,
    });
  }

  if (!input.clinicalJustification || input.clinicalJustification.trim().length < 15) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'JUSTIFICATION_TOO_SHORT',
      message: `A justificativa clínica de solicitação de ${docLabel} deve possuir no mínimo 15 caracteres.`,
    });
  }
}

export function validateAihRequestInput(input: CreateAihRequestInput): void {
  validateProcedureBasedRequestInput(input, 'AIH');
}

export function validateApacRequestInput(input: CreateApacRequestInput): void {
  validateProcedureBasedRequestInput(input, 'APAC');
}
