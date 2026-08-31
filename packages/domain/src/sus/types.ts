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
}

export interface CompatibilityValidationResult {
  isValid: boolean;
  errors: string[];
}
