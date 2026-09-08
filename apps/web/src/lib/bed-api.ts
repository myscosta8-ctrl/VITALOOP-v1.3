import type { ApiClient } from './api-client';

export interface BedSectorData {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  capacity: number;
  createdAt: string;
}

export interface BedData {
  id: string;
  sectorId: string;
  sectorName?: string;
  bedNumber: string;
  status: 'available' | 'occupied' | 'reserved' | 'cleaning' | 'blocked' | 'maintenance';
  isExtra: boolean;
  isIsolation: boolean;
  expiresAt?: string | null;
  allocationId?: string | null;
  encounterId?: string | null;
  patientId?: string | null;
  patientName?: string | null;
  allocatedAt?: string | null;
  stayHours?: number;
  is24hLimitExceeded?: boolean;
}

export interface SectorMapData {
  sector: BedSectorData;
  beds: BedData[];
  metrics: {
    totalBeds: number;
    occupiedBeds: number;
    availableBeds: number;
    cleaningBeds: number;
    occupancyRatePercentage: number;
  };
}

export const createBedApi = (api: ApiClient) => ({
  getSectors: async (): Promise<BedSectorData[]> => {
    return api.get<BedSectorData[]>('/api/v1/bed-sectors');
  },

  getBedsMap: async (): Promise<SectorMapData[]> => {
    return api.get<SectorMapData[]>('/api/v1/beds/map');
  },

  createExtraBed: async (sectorId: string, bedNumber: string, isIsolation = false): Promise<BedData> => {
    return api.post<BedData>('/api/v1/beds', { sectorId, bedNumber, isExtra: true, isIsolation });
  },

  createSector: async (
    name: string,
    code: string,
    capacity: number,
    description?: string | null,
  ): Promise<BedSectorData> => {
    return api.post<BedSectorData>('/api/v1/bed-sectors', { name, code, capacity, description });
  },

  allocateBed: async (encounterId: string, bedId: string, patientId: string, regulationCode?: string | null) => {
    return api.post(`/api/v1/encounters/${encounterId}/beds/allocate`, { bedId, patientId, regulationCode });
  },

  transferBed: async (allocationId: string, targetBedId: string, transferReason: string) => {
    return api.post(`/api/v1/bed-allocations/${allocationId}/transfer`, { targetBedId, transferReason });
  },

  dischargeBed: async (allocationId: string) => {
    return api.post(`/api/v1/bed-allocations/${allocationId}/discharge`, {});
  },

  updateBedStatus: async (bedId: string, status: BedData['status']) => {
    return api.patch(`/api/v1/beds/${bedId}/status`, { status });
  },
});
