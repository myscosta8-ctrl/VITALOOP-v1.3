import type { UUID } from '@vitaloop/shared';

export type RegulationPriority = 'low' | 'medium' | 'high' | 'emergency';
export type TransportType = 'basic_ambulance' | 'uti_mobile' | 'samu' | 'own_means';
export type RegulationStatus = 'requested' | 'in_regulation' | 'accepted' | 'transferred' | 'canceled';

export interface ExternalRegulation {
  id: UUID;
  encounterId: UUID;
  patientId: UUID;
  requesterId: UUID;
  aihRequestId?: UUID | null;
  destinationFacility: string;
  specialty: string;
  priority: RegulationPriority;
  transportType: TransportType;
  status: RegulationStatus;
  cancellationReason?: string | null;
  confirmedAt?: string | null;
  confirmedBy?: UUID | null;
  createdAt: string;
  updatedAt: string;
}

export interface RegulationDocument {
  id: UUID;
  regulationId: UUID;
  documentType: 'clinical_report' | 'exam_result' | 'aih_form';
  documentId?: UUID | null;
  notes?: string | null;
  attachedBy: UUID;
  createdAt: string;
}

export interface CreateRegulationInput {
  encounterId: UUID;
  patientId: UUID;
  aihRequestId?: UUID | null | undefined;
  destinationFacility: string;
  specialty: string;
  priority: RegulationPriority;
  transportType: TransportType;
}

export interface UpdateRegulationStatusInput {
  regulationId: UUID;
  targetStatus: RegulationStatus;
  cancellationReason?: string | null | undefined;
}
