import type { UUID } from '@vitaloop/shared';

export type IncidentSeverity = 'near_miss' | 'no_harm' | 'mild' | 'moderate' | 'severe' | 'death';

export type IsolationType = 'standard' | 'contact' | 'droplet' | 'airborne' | 'protective';

export interface AdverseEvent {
  id: UUID;
  encounterId?: UUID | null;
  patientId?: UUID | null;
  reporterId?: UUID | null;
  isAnonymous: boolean;
  eventCategory: string;
  severity: IncidentSeverity;
  eventDate: string;
  description: string;
  immediateAction?: string | null;
  isEpidemiologicalNotification: boolean;
  sinanCode?: string | null;
  status: 'reported' | 'under_investigation' | 'closed';
  createdAt: string;
  updatedAt: string;
}

export interface PatientIsolation {
  id: UUID;
  encounterId: UUID;
  patientId: UUID;
  isolationType: IsolationType;
  reason: string;
  pathogenSuspected?: string | null;
  prescribedBy: UUID;
  startAt: string;
  endAt?: string | null;
  endedBy?: UUID | null;
  isActive: boolean;
  createdAt: string;
}

export interface AdverseEventInvestigation {
  id: UUID;
  eventId: UUID;
  investigatorId: UUID;
  rootCauseAnalysis: string;
  actionPlan: string;
  preventiveMeasures?: string | null;
  closedAt?: string | null;
  createdAt: string;
}

export interface CreateAdverseEventInput {
  encounterId?: UUID | null | undefined;
  patientId?: UUID | null | undefined;
  isAnonymous?: boolean | undefined;
  eventCategory: string;
  severity: IncidentSeverity;
  description: string;
  immediateAction?: string | null | undefined;
  isEpidemiologicalNotification?: boolean | undefined;
  sinanCode?: string | null | undefined;
}

export interface CreatePatientIsolationInput {
  encounterId: UUID;
  patientId: UUID;
  isolationType: IsolationType;
  reason: string;
  pathogenSuspected?: string | null | undefined;
}
