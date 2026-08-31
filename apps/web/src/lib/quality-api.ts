export async function printClinicalDocumentPdf(documentId: string, payload: { documentType: string; patientName: string; issuerName: string; content: string }) {
  const res = await fetch(`/api/v1/quality/documents/${documentId}/print`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Erro ao gerar leiaute de impressão PDF do documento.');
  }
  return res.json();
}

export async function simulateConcurrencyCheck(currentVersion: number, expectedVersion: number) {
  const res = await fetch('/api/v1/quality/simulate-concurrency', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentVersion, expectedVersion }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Erro no teste de concorrência.');
  }
  return res.json();
}

export async function executeBackupRestoreJob(jobType: 'backup_logical' | 'restore_validation' | 'dr_failover', snapshotHash?: string) {
  const res = await fetch('/api/v1/quality/backup-restore/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobType, snapshotHash }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Erro ao executar job de backup/restore.');
  }
  return res.json();
}

export async function fetchBackupRestoreJobs() {
  const res = await fetch('/api/v1/quality/backup-restore/jobs');
  if (!res.ok) throw new Error('Erro ao consultar histórico de jobs de DR.');
  return res.json();
}
