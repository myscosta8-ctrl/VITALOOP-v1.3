import type { UUID } from '@vitaloop/shared';

export type IntegrationMessageType = 'HL7_ORU_R01' | 'HL7_ORM_O01' | 'DICOM_WADO' | 'FHIR_REST';
export type IntegrationStatus = 'received' | 'processed' | 'failed';

export interface IntegrationMessageRecord {
  id: UUID;
  messageType: IntegrationMessageType;
  sender: string;
  rawPayload: string;
  parsedJson?: Record<string, unknown> | null;
  status: IntegrationStatus;
  errorMessage?: string | null;
  encounterId?: UUID | null;
  patientId?: UUID | null;
  createdAt: string;
  updatedAt: string;
}

export interface ParsedHl7Result {
  messageType: string;
  controlId: string;
  patientId?: string | undefined;
  patientName?: string | undefined;
  observationValue?: string | undefined;
  observationUnit?: string | undefined;
  resultStatus?: string | undefined;
}

export interface DicomStudyRecord {
  id: UUID;
  encounterId: UUID;
  patientId: UUID;
  studyInstanceUid: string;
  modality: string;
  description: string;
  seriesCount: number;
  instanceCount: number;
  wadoUrl: string;
  createdAt: string;
}

export interface FhirPatientResource {
  resourceType: 'Patient';
  id: string;
  name: Array<{ text: string }>;
  gender?: 'male' | 'female' | 'other' | 'unknown' | undefined;
  birthDate?: string | undefined;
}

export interface FhirEncounterResource {
  resourceType: 'Encounter';
  id: string;
  status: string;
  class: { code: string; display: string };
  subject: { reference: string };
}
