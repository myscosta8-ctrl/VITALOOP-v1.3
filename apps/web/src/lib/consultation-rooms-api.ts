import type { ApiClient } from './api-client.js';

export interface ConsultationRoom {
  readonly id: string;
  readonly institutionId: string;
  readonly name: string;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export const createConsultationRoomsApi = (api: ApiClient) => ({
  listRooms: () => api.get<readonly ConsultationRoom[]>('/api/v1/consultation-rooms'),
});

export type ConsultationRoomsApi = ReturnType<typeof createConsultationRoomsApi>;
