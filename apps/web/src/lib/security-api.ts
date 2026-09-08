import type { ApiClient } from './api-client.js';

export interface SecurityHardeningStatus {
  idorProtection: boolean;
  privilegeEscalationProtection: boolean;
  rlsEnforcement: boolean;
  rbacEnforcement: boolean;
  sqliProtection: boolean;
  xssSanitizer: boolean;
  corsRestricted: boolean;
  securityHeaders: boolean;
  logsMasked: boolean;
}

export interface SecurityAlertEvent {
  id: string;
  eventType: string;
}

export interface LgpdPatientReport {
  reportId: string;
  personalData: { fullName: string; maskedCpf: string };
  legalBasis: string;
  dataHash: string;
}

export interface LgpdRetentionPolicy {
  id: string;
  entityType: string;
  retentionYears: number;
  description: string;
}

export const createSecurityApi = (api: ApiClient) => ({
  fetchSecurityHardeningStatus: (): Promise<SecurityHardeningStatus> =>
    api.get<SecurityHardeningStatus>('/api/v1/security/hardening-status'),

  sendSecurityAlertEvent: (
    eventType: string,
    severity: 'INFO' | 'WARNING' | 'CRITICAL',
    endpoint: string,
    payloadSummary?: string,
  ): Promise<SecurityAlertEvent> => api.post<SecurityAlertEvent>('/api/v1/security/events', { eventType, severity, endpoint, payloadSummary }),

  exportLgpdPatientReport: (patientId: string): Promise<LgpdPatientReport> =>
    api.post<LgpdPatientReport>(`/api/v1/lgpd/patients/${patientId}/export`),

  fetchLgpdRetentionPolicies: (): Promise<LgpdRetentionPolicy[]> => api.get<LgpdRetentionPolicy[]>('/api/v1/lgpd/retention-policies'),
});
