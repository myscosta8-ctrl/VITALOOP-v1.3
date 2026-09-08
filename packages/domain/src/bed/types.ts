import type { UUID, IsoTimestamp } from '@vitaloop/shared';

export type BedStatus = 'available' | 'occupied' | 'reserved' | 'cleaning' | 'blocked' | 'maintenance';
export type BedAllocationStatus = 'active' | 'transferred' | 'discharged';

export interface BedSectorData {
  id: UUID;
  name: string;
  code: string;
  description?: string | null | undefined;
  capacity: number;
  createdAt: IsoTimestamp;
}

export interface BedData {
  id: UUID;
  sectorId: UUID;
  bedNumber: string;
  status: BedStatus;
  isExtra: boolean;
  isIsolation: boolean;
  expiresAt?: IsoTimestamp | null | undefined;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}

export interface BedAllocationData {
  id: UUID;
  bedId: UUID;
  encounterId: UUID;
  patientId: UUID;
  status: BedAllocationStatus;
  allocatedBy: UUID;
  allocatedAt: IsoTimestamp;
  dischargedAt?: IsoTimestamp | null | undefined;
  transferReason?: string | null | undefined;
  regulationCode?: string | null | undefined;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}

export interface AllocateBedInput {
  bedId: UUID;
  encounterId: UUID;
  patientId: UUID;
  allocatedBy: UUID;
  regulationCode?: string | null | undefined;
}

export interface TransferBedInput {
  allocationId: UUID;
  sourceBedId: UUID;
  targetBedId: UUID;
  encounterId: UUID;
  patientId: UUID;
  transferredBy: UUID;
  transferReason: string;
}

export interface DischargeBedInput {
  allocationId: UUID;
  bedId: UUID;
  encounterId: UUID;
  patientId: UUID;
  dischargedBy: UUID;
}
