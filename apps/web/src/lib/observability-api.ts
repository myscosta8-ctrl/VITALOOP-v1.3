import type { ApiClient } from './api-client.js';

export interface SystemHealth {
  availabilityPercent?: number;
  avgLatencyMs?: number;
  isHealthy?: boolean;
}

export interface SystemMetricsResult {
  health: SystemHealth;
  metrics: unknown[];
}

export interface DrStatus {
  offsiteBackup?: boolean;
  rpoMinutes?: number;
  rtoMinutes?: number;
}

export const createObservabilityApi = (api: ApiClient) => ({
  postSystemMetric: (metricName: string, metricValue: number, tags?: Record<string, string>): Promise<{ id: string }> =>
    api.post<{ id: string }>('/api/v1/observability/metrics', { metricName, metricValue, tags }),

  fetchSystemMetrics: (): Promise<SystemMetricsResult> => api.get<SystemMetricsResult>('/api/v1/observability/metrics'),

  fetchDrStatus: (): Promise<DrStatus> => api.get<DrStatus>('/api/v1/observability/dr-status'),
});
