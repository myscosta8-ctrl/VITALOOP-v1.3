import { AppError, ErrorCategory } from '@vitaloop/shared';
import type {
  PrescriptionCancelInput,
  PrescriptionCreateInput,
  PrescriptionItemInput,
  RouteOfAdministration,
} from './types.js';

export const ALLOWED_ROUTES: readonly RouteOfAdministration[] = [
  'VO',
  'EV',
  'IM',
  'SC',
  'SL',
  'Inalatoria',
  'Topica',
  'Outra',
];

/**
 * Normaliza e verifica se um medicamento prescrito coincide com alguma alergia cadastrada no paciente.
 */
export const checkPatientAllergies = (
  medicationName: string,
  activeSubstance: string | null | undefined,
  knownAllergies: readonly string[],
): string | null => {
  if (!knownAllergies || knownAllergies.length === 0) return null;

  const medLower = (medicationName || '').toLowerCase();
  const subLower = (activeSubstance || '').toLowerCase();

  for (const allergy of knownAllergies) {
    const rawAllergy = (allergy || '').trim().toLowerCase();
    if (!rawAllergy) continue;

    // Se a alergia faz parte do nome do medicamento ou da substância ativa (ex.: 'dipirona', 'penicilina', 'amoxicilina')
    if (
      medLower.includes(rawAllergy) ||
      (subLower && (subLower.includes(rawAllergy) || rawAllergy.includes(subLower)))
    ) {
      return allergy.trim();
    }
  }

  return null;
};

/**
 * Valida os dados de um item de prescrição médica.
 */
export const validatePrescriptionItemInput = (item: PrescriptionItemInput): PrescriptionItemInput => {
  const medicationName = (item.medicationName || '').trim();
  if (!medicationName) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'PRESCRIPTION_ITEM_MEDICATION_REQUIRED',
      message: 'O nome do medicamento é obrigatório no item da prescrição.',
    });
  }

  if (typeof item.dose !== 'number' || item.dose <= 0 || Number.isNaN(item.dose)) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'PRESCRIPTION_ITEM_DOSE_INVALID',
      message: `Dose inválida para o medicamento '${medicationName}'. A dose deve ser maior que zero.`,
    });
  }

  const doseUnit = (item.doseUnit || '').trim();
  if (!doseUnit) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'PRESCRIPTION_ITEM_DOSE_UNIT_REQUIRED',
      message: `A unidade de medida da dose é obrigatória para '${medicationName}'.`,
    });
  }

  if (!ALLOWED_ROUTES.includes(item.route)) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'PRESCRIPTION_ITEM_ROUTE_INVALID',
      message: `Via de administração inválida '${item.route}' para '${medicationName}'.`,
    });
  }

  const frequency = (item.frequency || '').trim();
  if (!frequency) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'PRESCRIPTION_ITEM_FREQUENCY_REQUIRED',
      message: `A frequência/posologia é obrigatória para '${medicationName}'.`,
    });
  }

  return {
    ...item,
    medicationName,
    activeSubstance: item.activeSubstance ? item.activeSubstance.trim() : null,
    doseUnit,
    frequency,
    duration: item.duration ? item.duration.trim() : null,
    instructions: item.instructions ? item.instructions.trim() : null,
  };
};

/**
 * Valida a criação de uma prescrição médica estruturada e executa a checagem de alergias (MEDC-001..019).
 */
export const validatePrescriptionCreateInput = (
  input: PrescriptionCreateInput,
): {
  validatedInput: PrescriptionCreateInput;
  detectedAllergies: readonly { item: PrescriptionItemInput; allergen: string }[];
} => {
  if (!input.consultationId || !input.encounterId || !input.patientId) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'PRESCRIPTION_MISSING_REQUIRED_IDS',
      message: 'Consulta médica, Atendimento e Paciente são obrigatórios para a prescrição.',
    });
  }

  if (!input.items || !Array.isArray(input.items) || input.items.length === 0) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'PRESCRIPTION_NO_ITEMS',
      message: 'A prescrição médica deve conter pelo menos um medicamento/item.',
    });
  }

  const validatedItems = input.items.map(validatePrescriptionItemInput);
  const knownAllergies = input.knownPatientAllergies || [];

  const detectedAllergies: { item: PrescriptionItemInput; allergen: string }[] = [];

  for (const item of validatedItems) {
    const allergen = checkPatientAllergies(item.medicationName, item.activeSubstance, knownAllergies);
    if (allergen) {
      detectedAllergies.push({ item, allergen });
    }
  }

  const overrideJustification = (input.overrideJustification || '').trim();

  // Regra crítica MEDC-016: Se houver alergia detectada, exige justificativa médica válida (min 10 caracteres)
  if (detectedAllergies.length > 0) {
    if (!overrideJustification || overrideJustification.length < 10) {
      const allergenList = detectedAllergies.map((a) => a.allergen).join(', ');
      throw new AppError({
        category: ErrorCategory.VALIDATION,
        code: 'ALLERGY_ALERT_REQUIRES_JUSTIFICATION',
        message: `Alerta de Alergia detectado para [${allergenList}]. Para prescrever, informe uma justificativa médica detalhada (mínimo 10 caracteres).`,
      });
    }
  }

  return {
    validatedInput: {
      ...input,
      items: validatedItems,
      notes: input.notes ? input.notes.trim() : null,
      overrideJustification: overrideJustification || null,
    },
    detectedAllergies,
  };
};

/**
 * Valida o cancelamento de uma prescrição médica (MEDC-010).
 */
export const validatePrescriptionCancelInput = (
  input: PrescriptionCancelInput,
): PrescriptionCancelInput => {
  if (!input.prescriptionId) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'PRESCRIPTION_MISSING_ID',
      message: 'ID da prescrição é obrigatório.',
    });
  }

  const cancelReason = (input.cancelReason || '').trim();
  if (!cancelReason) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'PRESCRIPTION_CANCEL_REASON_REQUIRED',
      message: 'O motivo do cancelamento da prescrição médica é obrigatório.',
    });
  }

  return {
    prescriptionId: input.prescriptionId,
    cancelReason,
  };
};
