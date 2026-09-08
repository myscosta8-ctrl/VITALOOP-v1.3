import type { ApiClient } from './api-client.js';

export interface ManagementAlertItem {
  id: string;
  severity: string;
  message: string;
}

export interface DashboardData {
  summary: {
    activeEncountersCount: number;
    triagePendingCount: number;
    consultationPendingCount: number;
    occupiedBedsCount: number;
    totalBedsCount: number;
    bedOccupancyRate: number;
  };
  averageTmpHours: number;
  alerts: ManagementAlertItem[];
}

export const createManagementApi = (api: ApiClient) => ({
  fetchDashboardData: (): Promise<DashboardData> => api.get<DashboardData>('/api/v1/management/dashboard'),

  fetchManagementAlerts: (): Promise<ManagementAlertItem[]> => api.get<ManagementAlertItem[]>('/api/v1/management/alerts'),

  acknowledgeAlert: (alertId: string): Promise<{ id: string }> =>
    api.post<{ id: string }>(`/api/v1/management/alerts/${alertId}/acknowledge`),

  // Resposta é texto CSV puro, não o envelope JSON `{ data: ... }` — usa
  // `getText` em vez de `get` (ver apps/web/src/lib/api-client.ts).
  exportManagementReportCsv: (): Promise<string> => api.getText('/api/v1/management/reports/export?format=csv'),
});
