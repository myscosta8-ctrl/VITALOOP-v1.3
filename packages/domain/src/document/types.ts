import type { UUID } from '@vitaloop/shared';

export type ClinicalDocumentType =
  | 'medical_certificate'
  | 'attendance_declaration'
  | 'companion_certificate'
  | 'medical_report'
  | 'procedure_request';

export type ClinicalDocumentStatus = 'issued' | 'revoked' | 'rectified';

export interface DocumentTemplate {
  id: UUID;
  documentType: ClinicalDocumentType;
  title: string;
  bodyTemplate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClinicalDocument {
  id: UUID;
  encounterId: UUID;
  patientId: UUID;
  issuerId: UUID;
  documentType: ClinicalDocumentType;
  status: ClinicalDocumentStatus;
  title: string;
  content: string;
  daysOff?: number | null;
  daysOffText?: string | null;
  includeCid: boolean;
  cidCode?: string | null;
  companionName?: string | null;
  integrityHash: string;
  revocationReason?: string | null;
  revokedAt?: string | null;
  revokedBy?: UUID | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentVersion {
  id: UUID;
  documentId: UUID;
  versionNumber: number;
  content: string;
  integrityHash: string;
  modifiedBy: UUID;
  changeReason: string;
  createdAt: string;
}

export interface CreateClinicalDocumentInput {
  documentType: ClinicalDocumentType;
  title: string;
  content: string;
  daysOff?: number | null | undefined;
  includeCid?: boolean | undefined;
  cidCode?: string | null | undefined;
  companionName?: string | null | undefined;
}

export interface RevokeClinicalDocumentInput {
  revocationReason: string;
}
