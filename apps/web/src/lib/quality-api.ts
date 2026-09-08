import type { ApiClient } from './api-client.js';

export interface PrintClinicalDocumentResult {
  documentId: string;
  formattedText: string;
  footerChecksum: string;
}

export interface ConcurrencyCheckResult {
  status: string;
}

export interface BackupRestoreJob {
  id: string;
  jobType: string;
  status: string;
  snapshotHash: string;
}

export const createQualityApi = (api: ApiClient) => ({
  printClinicalDocumentPdf: (
    documentId: string,
    payload: { documentType: string; patientName: string; issuerName: string; content: string },
  ): Promise<PrintClinicalDocumentResult> =>
    api.post<PrintClinicalDocumentResult>(`/api/v1/quality/documents/${documentId}/print`, payload),

  simulateConcurrencyCheck: (currentVersion: number, expectedVersion: number): Promise<ConcurrencyCheckResult> =>
    api.post<ConcurrencyCheckResult>('/api/v1/quality/simulate-concurrency', { currentVersion, expectedVersion }),

  executeBackupRestoreJob: (
    jobType: 'backup_logical' | 'restore_validation' | 'dr_failover',
    snapshotHash?: string,
  ): Promise<BackupRestoreJob> => api.post<BackupRestoreJob>('/api/v1/quality/backup-restore/execute', { jobType, snapshotHash }),

  fetchBackupRestoreJobs: (): Promise<BackupRestoreJob[]> => api.get<BackupRestoreJob[]>('/api/v1/quality/backup-restore/jobs'),
});
