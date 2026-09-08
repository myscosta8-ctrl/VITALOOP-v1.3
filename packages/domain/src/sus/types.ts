import type { UUID } from '@vitaloop/shared';

export interface SigtapProcedure {
  code: string;
  name: string;
  ambulatoryValue: number;
  hospitalValue: number;
  minAgeMonths: number;
  maxAgeMonths: number;
  allowedSex: 'M' | 'F' | 'BOTH';
  requireCid: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface AihRequest {
  id: UUID;
  encounterId: UUID;
  patientId: UUID;
  requesterId: UUID;
  mainProcedureCode: string;
  secondaryProcedureCode?: string | null;
  mainCid10: string;
  secondaryCid10?: string | null;
  clinicalJustification: string;
  status: 'draft' | 'submitted' | 'validated' | 'rejected';
  // Campos clínicos/administrativos que faltavam pra bater com o impresso
  // oficial (ver aih-clinical-schema.ts) — história da doença atual,
  // estado geral, clínica/especialidade, caráter, médico solicitante,
  // etc. Opcional pra não quebrar registros já existentes sem esse dado.
  formFields?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAihRequestInput {
  encounterId: UUID;
  patientId: UUID;
  mainProcedureCode: string;
  secondaryProcedureCode?: string | null | undefined;
  mainCid10: string;
  secondaryCid10?: string | null | undefined;
  clinicalJustification: string;
  formFields?: Record<string, string> | undefined;
}

export interface ApacRequest {
  id: UUID;
  encounterId: UUID;
  patientId: UUID;
  requesterId: UUID;
  mainProcedureCode: string;
  secondaryProcedureCode?: string | null;
  mainCid10: string;
  secondaryCid10?: string | null;
  clinicalJustification: string;
  status: 'draft' | 'submitted' | 'validated' | 'rejected';
  // Campos administrativos do laudo (descrição do diagnóstico, CID de causas
  // associadas, dados do profissional solicitante, dados de autorização —
  // preenchidos depois pelo autorizador, não pelo solicitante — e do
  // estabelecimento executante). Ver apac-clinical-schema.ts.
  formFields?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateApacRequestInput {
  encounterId: UUID;
  patientId: UUID;
  mainProcedureCode: string;
  secondaryProcedureCode?: string | null | undefined;
  mainCid10: string;
  secondaryCid10?: string | null | undefined;
  clinicalJustification: string;
  formFields?: Record<string, string> | undefined;
}

export interface CompatibilityValidationResult {
  isValid: boolean;
  errors: string[];
}
