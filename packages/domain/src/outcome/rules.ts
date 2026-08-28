import { AppError, ErrorCategory } from '@vitaloop/shared';
import type { OutcomeCreateInput, OutcomeType } from './types.js';

export const determineTargetEncounterStatus = (outcomeType: OutcomeType): 'completed' | 'canceled' => {
  if (outcomeType === 'evasion') {
    return 'canceled';
  }
  return 'completed';
};

export const validateOutcomeCreateInput = (input: OutcomeCreateInput): OutcomeCreateInput => {
  if (!input.encounterId || !input.patientId) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'OUTCOME_MISSING_REQUIRED_IDS',
      message: 'Atendimento e Paciente são obrigatórios para o desfecho assistencial.',
    });
  }

  if (!input.outcomeType) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'OUTCOME_TYPE_REQUIRED',
      message: 'O tipo de desfecho assistencial é obrigatório.',
    });
  }

  // Regra de Ouro UPA (OUT-001): Alta médica exige diagnóstico principal ativo registrado
  if (input.outcomeType === 'medical_discharge') {
    if (!input.consultationId) {
      throw new AppError({
        category: ErrorCategory.VALIDATION,
        code: 'DISCHARGE_REQUIRES_CONSULTATION',
        message: 'Não é possível dar alta médica a um atendimento sem consulta médica iniciada.',
      });
    }

    if (input.hasPrimaryDiagnosis === false) {
      throw new AppError({
        category: ErrorCategory.VALIDATION,
        code: 'DISCHARGE_REQUIRES_PRIMARY_DIAGNOSIS',
        message: 'Regra Clínica: A concessão de alta médica exige pelo menos um Diagnóstico Principal (CID-10) ativo registrado.',
      });
    }
  }

  // Regra OUT-003: Alta a pedido exige justificativa médica/termo de responsabilidade (mínimo 10 caracteres)
  if (input.outcomeType === 'discharge_against_medical_advice') {
    const notes = (input.notes || '').trim();
    if (!notes || notes.length < 10) {
      throw new AppError({
        category: ErrorCategory.VALIDATION,
        code: 'DISCHARGE_AGAINST_ADVICE_NOTES_REQUIRED',
        message: 'A alta a pedido exige o registro detalhado da justificativa / termo de responsabilidade em observações (mínimo 10 caracteres).',
      });
    }
  }

  // Regra OUT-005: Transferência externa exige unidade receptora de destino
  if (input.outcomeType === 'transfer') {
    const dest = (input.destinationUnit || '').trim();
    if (!dest || dest.length < 3) {
      throw new AppError({
        category: ErrorCategory.VALIDATION,
        code: 'TRANSFER_DESTINATION_REQUIRED',
        message: 'A transferência externa exige a indicação da unidade hospitalar de destino.',
      });
    }
  }

  // Regra OUT-007: Óbito exige data/hora da constatação e causa mortis
  if (input.outcomeType === 'death') {
    if (!input.deathTimestamp) {
      throw new AppError({
        category: ErrorCategory.VALIDATION,
        code: 'DEATH_TIMESTAMP_REQUIRED',
        message: 'O registro de óbito exige a data e hora exatas da constatação médica.',
      });
    }

    const notes = (input.notes || '').trim();
    if (!notes) {
      throw new AppError({
        category: ErrorCategory.VALIDATION,
        code: 'DEATH_NOTES_REQUIRED',
        message: 'O registro de óbito exige a descrição da causa mortis / circunstâncias em observações.',
      });
    }
  }

  return {
    ...input,
    notes: input.notes ? input.notes.trim() : null,
    destinationUnit: input.destinationUnit ? input.destinationUnit.trim() : null,
    regulationCode: input.regulationCode ? input.regulationCode.trim() : null,
    dischargeInstructions: input.dischargeInstructions ? input.dischargeInstructions.trim() : null,
  };
};
