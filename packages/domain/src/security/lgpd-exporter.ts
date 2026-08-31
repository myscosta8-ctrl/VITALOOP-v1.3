import { AppError, ErrorCategory } from '@vitaloop/shared';

export interface LgpdPatientInput {
  id: string;
  fullName: string;
  cpf?: string | null | undefined;
  cns?: string | null | undefined;
  birthDate?: string | null | undefined;
  sex?: string | null | undefined;
  encountersCount: number;
}

export interface LgpdReportOutput {
  reportId: string;
  generatedAt: string;
  patientId: string;
  legalBasis: string;
  personalData: {
    fullName: string;
    maskedCpf: string;
    cns?: string | undefined;
    birthDate?: string | undefined;
    sex?: string | undefined;
  };
  processingSummary: {
    encountersCount: number;
    dataRetentionYears: number;
    purpose: string;
  };
  dataHash: string;
}

export function buildLgpdPersonalDataReport(patient: LgpdPatientInput): LgpdReportOutput {
  if (!patient || !patient.id || !patient.fullName) {
    throw new AppError({
      category: ErrorCategory.VALIDATION,
      code: 'INVALID_PATIENT_FOR_LGPD_REPORT',
      message: 'Dados do paciente insuficientes para geração do relatório de transparência LGPD.',
    });
  }

  const rawCpf = patient.cpf ? patient.cpf.replace(/\D/g, '') : '';
  const maskedCpf = rawCpf.length === 11
    ? `${rawCpf.slice(0, 3)}.***.***-${rawCpf.slice(9)}`
    : (patient.cpf || 'NÃO INFORMADO');

  const reportId = `LGPD-EXT-REL-${Date.now()}`;
  const generatedAt = new Date().toISOString();

  // Gerar hash simples do extrato para verificação de integridade
  const dataSummaryStr = `${patient.id}:${patient.fullName}:${maskedCpf}:${generatedAt}`;
  let hash = 0;
  for (let i = 0; i < dataSummaryStr.length; i++) {
    const char = dataSummaryStr.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  const dataHash = `SHA256-SIM-${Math.abs(hash).toString(16)}`;

  return {
    reportId,
    generatedAt,
    patientId: patient.id,
    legalBasis: 'Lei 13.709/2018 (LGPD Art. 7, II - Cumprimento de obrigação legal e Art. 7, VIII - Tutela da saúde)',
    personalData: {
      fullName: patient.fullName,
      maskedCpf,
      cns: patient.cns || undefined,
      birthDate: patient.birthDate || undefined,
      sex: patient.sex || undefined,
    },
    processingSummary: {
      encountersCount: patient.encountersCount,
      dataRetentionYears: 20,
      purpose: 'Prestação de serviços de saúde pública emergencial na UPA 24h',
    },
    dataHash,
  };
}
