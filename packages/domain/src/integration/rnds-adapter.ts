import { AppError, ErrorCategory } from '@vitaloop/shared';

export interface RndsBundlePayload {
  patientCns: string;
  encounterId: string;
  clinicalSummary: string;
}

export function buildRndsBundle(payload: RndsBundlePayload) {
  if (!payload.patientCns || payload.patientCns.trim().length < 11) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'INVALID_CNS',
      message: 'Cartão Nacional de Saúde (CNS) do paciente é obrigatório para envio RNDS/DATASUS.',
    });
  }

  return {
    resourceType: 'Bundle',
    type: 'document',
    timestamp: new Date().toISOString(),
    entry: [
      {
        fullUrl: `urn:uuid:${payload.encounterId}`,
        resource: {
          resourceType: 'Composition',
          status: 'final',
          subject: { identifier: { value: payload.patientCns } },
          title: 'Sumário de Atendimento de Urgência UPA 24h',
          section: [{ title: 'Resumo Clínico', text: { status: 'generated', div: payload.clinicalSummary } }],
        },
      },
    ],
  };
}
