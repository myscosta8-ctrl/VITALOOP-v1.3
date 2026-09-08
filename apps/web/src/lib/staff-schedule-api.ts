import type { ApiClient } from './api-client.js';

export type LeaveType = 'ferias' | 'atestado' | 'licenca' | 'outro';

export interface StaffUser {
  id: string;
  name: string;
  status: string;
  roles: readonly string[];
}

export interface StaffLeave {
  id: string;
  userId: string;
  userName: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  notes?: string | null;
  createdAt: string;
}

export interface StaffShift {
  id: string;
  userId: string;
  userName: string;
  shiftDate: string;
  shiftPeriod: string;
  roleAtShift?: string | null;
  notes?: string | null;
  createdAt: string;
}

export const createStaffScheduleApi = (api: ApiClient) => ({
  listUsers: async (): Promise<StaffUser[]> => api.get<StaffUser[]>('/api/v1/staff/users'),

  listLeaves: async (): Promise<StaffLeave[]> => api.get<StaffLeave[]>('/api/v1/staff/leaves'),

  createLeave: async (
    userId: string,
    leaveType: LeaveType,
    startDate: string,
    endDate: string,
    notes?: string | null,
  ): Promise<StaffLeave> => api.post<StaffLeave>('/api/v1/staff/leaves', { userId, leaveType, startDate, endDate, notes }),

  deleteLeave: async (id: string) => api.delete(`/api/v1/staff/leaves/${id}`),

  listShifts: async (): Promise<StaffShift[]> => api.get<StaffShift[]>('/api/v1/staff/shifts'),

  createShift: async (
    userId: string,
    shiftDate: string,
    shiftPeriod: string,
    roleAtShift?: string | null,
    notes?: string | null,
  ): Promise<StaffShift> =>
    api.post<StaffShift>('/api/v1/staff/shifts', { userId, shiftDate, shiftPeriod, roleAtShift, notes }),

  deleteShift: async (id: string) => api.delete(`/api/v1/staff/shifts/${id}`),
});
