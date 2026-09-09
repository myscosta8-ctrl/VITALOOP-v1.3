import type { ApiClient } from './api-client.js';

export interface StaffRole {
  code: string;
  name: string;
}

export interface StaffSector {
  id: string;
  name: string;
}

export interface StaffAccount {
  id: string;
  username: string;
  name: string;
  status: string;
  roles: readonly string[];
  sectors: readonly string[];
}

export interface CreateStaffAccountInput {
  name: string;
  username: string;
  password: string;
  roleCode: string;
  sectorId: string;
}

export const createStaffAccountsApi = (api: ApiClient) => ({
  listRoles: async (): Promise<StaffRole[]> => api.get<StaffRole[]>('/api/v1/staff/accounts/roles'),

  listSectors: async (): Promise<StaffSector[]> => api.get<StaffSector[]>('/api/v1/staff/accounts/sectors'),

  listAccounts: async (): Promise<StaffAccount[]> => api.get<StaffAccount[]>('/api/v1/staff/accounts'),

  createAccount: async (input: CreateStaffAccountInput): Promise<StaffAccount> =>
    api.post<StaffAccount>('/api/v1/staff/accounts', input),
});
