import { AppError, ErrorCategory } from '@vitaloop/shared';
import type { AdministerMedicationInput, CreateNursingRecordInput } from './types.js';

export function validateNursingRecordInput(input: CreateNursingRecordInput): void {
  if (!input.content || input.content.trim().length < 5) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'NURSING_CONTENT_TOO_SHORT',
      message: 'O registro de enfermagem deve possuir no mínimo 5 caracteres.',
    });
  }

  if (input.recordType === 'admission' && input.content.trim().length < 10) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'NURSING_ADMISSION_REASON_REQUIRED',
      message: 'A admissão de enfermagem exige um histórico/motivo detalhado (mínimo 10 caracteres).',
    });
  }
}

export function validateMedicationScheduleInput(scheduledTimes: string[]): void {
  if (!scheduledTimes || scheduledTimes.length === 0) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'SCHEDULE_TIMES_REQUIRED',
      message: 'Deve ser informado ao menos um horário para o aprazamento do medicamento.',
    });
  }

  for (const timeStr of scheduledTimes) {
    const d = new Date(timeStr);
    if (isNaN(d.getTime())) {
      throw new AppError({
        category: ErrorCategory.VALIDATION,
        code: 'INVALID_SCHEDULE_TIME',
        message: `Horário de aprazamento inválido: ${timeStr}`,
      });
    }
  }
}

export function validateAdministerMedicationInput(input: AdministerMedicationInput): void {
  const isNonAdmin = input.status === 'not_administered' || input.status === 'refused' || input.status === 'suspended';

  if (isNonAdmin) {
    if (!input.nonAdminReason || input.nonAdminReason.trim().length < 10) {
      throw new AppError({
        category: ErrorCategory.VALIDATION,
        code: 'MEDICATION_NON_ADMIN_REASON_REQUIRED',
        message: 'A não administração, recusa ou suspensão de medicamento exige justificativa clínica mínima de 10 caracteres.',
      });
    }
  }

  if (input.status === 'administered' && input.bedSideChecked === false) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'BEDSIDE_CHECK_REQUIRED',
      message: 'A confirmação de administração exige a checagem beira-leito (5 Certos de Enfermagem).',
    });
  }
}

export function calculateDefaultScheduleTimes(frequency: string, referenceTime: Date = new Date()): Date[] {
  const freqLower = frequency.toLowerCase().trim();
  const times: Date[] = [];

  let intervalHours = 0;
  if (freqLower.includes('8/8h') || freqLower.includes('8 em 8')) {
    intervalHours = 8;
  } else if (freqLower.includes('12/12h') || freqLower.includes('12 em 12')) {
    intervalHours = 12;
  } else if (freqLower.includes('6/6h') || freqLower.includes('6 em 6')) {
    intervalHours = 6;
  } else if (freqLower.includes('4/4h') || freqLower.includes('4 em 4')) {
    intervalHours = 4;
  } else if (freqLower.includes('1x') || freqLower.includes('uma vez')) {
    intervalHours = 24;
  }

  if (intervalHours > 0) {
    const totalDoses = Math.floor(24 / intervalHours);
    for (let i = 0; i < totalDoses; i++) {
      const nextDate = new Date(referenceTime.getTime() + i * intervalHours * 60 * 60 * 1000);
      times.push(nextDate);
    }
  } else {
    // Horário único padrão
    times.push(new Date(referenceTime.getTime() + 30 * 60 * 1000));
  }

  return times;
}

export function calculateScaleScore(scaleType: string, scoreDetails: Record<string, unknown>): { totalScore: number; riskLevel: 'low' | 'moderate' | 'high' | 'severe' } {
  let totalScore = 0;
  for (const val of Object.values(scoreDetails)) {
    if (typeof val === 'number') {
      totalScore += val;
    }
  }

  if (scaleType === 'braden') {
    // Braden: 6..23. <= 12 High, 13..14 Moderate, 15..18 Low Risk
    if (totalScore <= 12) return { totalScore, riskLevel: 'high' };
    if (totalScore <= 14) return { totalScore, riskLevel: 'moderate' };
    return { totalScore, riskLevel: 'low' };
  }

  if (scaleType === 'morse') {
    // Morse: 0..125. >= 45 High, 25..44 Moderate, < 25 Low Risk
    if (totalScore >= 45) return { totalScore, riskLevel: 'high' };
    if (totalScore >= 25) return { totalScore, riskLevel: 'moderate' };
    return { totalScore, riskLevel: 'low' };
  }

  if (scaleType === 'glasgow') {
    // Glasgow: 3..15. <= 8 Severe, 9..12 Moderate, 13..15 Low Risk
    if (totalScore <= 8) return { totalScore, riskLevel: 'severe' };
    if (totalScore <= 12) return { totalScore, riskLevel: 'moderate' };
    return { totalScore, riskLevel: 'low' };
  }

  if (scaleType === 'mews') {
    // MEWS: 0..14. >= 5 Severe, 3..4 Moderate, < 3 Low Risk
    if (totalScore >= 5) return { totalScore, riskLevel: 'severe' };
    if (totalScore >= 3) return { totalScore, riskLevel: 'moderate' };
    return { totalScore, riskLevel: 'low' };
  }

  return { totalScore, riskLevel: 'low' };
}

export function validateNursingSaeInput(input: { diagnoses: Array<{ code: string; title: string }>; prescriptions: Array<{ careDescription: string }> }): void {
  if (!input.diagnoses || input.diagnoses.length === 0) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'SAE_DIAGNOSIS_REQUIRED',
      message: 'Ao menos um diagnóstico de enfermagem deve ser informado na SAE.',
    });
  }

  if (!input.prescriptions || input.prescriptions.length === 0) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'SAE_PRESCRIPTION_REQUIRED',
      message: 'Ao menos um cuidado/intervenção de enfermagem deve ser prescrito.',
    });
  }

  for (const diag of input.diagnoses) {
    if (!diag.title || diag.title.trim().length < 3) {
      throw new AppError({
        category: ErrorCategory.VALIDATION,
        code: 'SAE_DIAGNOSIS_TITLE_REQUIRED',
        message: 'O título do diagnóstico de enfermagem deve possuir no mínimo 3 caracteres.',
      });
    }
  }

  for (const pres of input.prescriptions) {
    if (!pres.careDescription || pres.careDescription.trim().length < 5) {
      throw new AppError({
        category: ErrorCategory.VALIDATION,
        code: 'SAE_CARE_DESCRIPTION_TOO_SHORT',
        message: 'A descrição do cuidado prescrito de enfermagem deve ter no mínimo 5 caracteres.',
      });
    }
  }
}

export function validateFluidBalanceInput(input: { volumeMl: number; fluidType: string; direction: string }): void {
  if (!input.volumeMl || input.volumeMl <= 0) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'FLUID_VOLUME_INVALID',
      message: 'O volume do balanço hídrico deve ser maior que zero (mL).',
    });
  }

  if (input.direction !== 'intake' && input.direction !== 'output') {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'FLUID_DIRECTION_INVALID',
      message: 'A direção do balanço hídrico deve ser "intake" (entrada) ou "output" (saída).',
    });
  }
}

export function validateInvasiveDeviceInput(input: { deviceType: string; anatomicalSite: string }): void {
  if (!input.deviceType) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'DEVICE_TYPE_REQUIRED',
      message: 'O tipo do dispositivo invasivo é obrigatório.',
    });
  }

  if (!input.anatomicalSite || input.anatomicalSite.trim().length < 3) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'ANATOMICAL_SITE_REQUIRED',
      message: 'O sítio anatômico de inserção do dispositivo deve ter no mínimo 3 caracteres.',
    });
  }
}

