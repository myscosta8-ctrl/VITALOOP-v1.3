import React, { useState } from 'react';
import { executeBackupRestoreJob, fetchBackupRestoreJobs } from '../lib/quality-api.js';

export const DisasterRecoveryPanel: React.FC = () => {
  const [jobs, setJobs] = useState<Array<{ id: string; jobType: string; status: string; snapshotHash: string }>>([]);
  const [msg, setMsg] = useState('');

  const handleRunBackup = async () => {
    try {
      const res = await executeBackupRestoreJob('backup_logical');
      setMsg(`Backup lógico executado com sucesso! Job ID: ${res.data.id} | Snapshot: ${res.data.snapshotHash}`);
    } catch (err: unknown) {
      setMsg((err as Error).message);
    }
  };

  const handleRunRestore = async () => {
    try {
      const res = await executeBackupRestoreJob('restore_validation', 'SHA256-SNAP-99');
      setMsg(`Validação de restore executada com sucesso! Status: ${res.data.status}`);
    } catch (err: unknown) {
      setMsg((err as Error).message);
    }
  };

  const handleLoadJobs = async () => {
    try {
      const res = await fetchBackupRestoreJobs();
      setJobs(res.data);
    } catch (err: unknown) {
      setMsg((err as Error).message);
    }
  };

  return (
    <div data-testid="disaster-recovery-panel">
      <h2>Painel de Disaster Recovery, Backup & Restore (QLT-011..013)</h2>
      {msg && <p data-testid="dr-status-msg">{msg}</p>}

      <section>
        <h3>1. Execução de Backup Lógico (QLT-011)</h3>
        <button type="button" onClick={handleRunBackup} data-testid="run-backup-btn">
          Executar Backup Lógico do Banco
        </button>
      </section>

      <section style={{ marginTop: '15px' }}>
        <h3>2. Validação de Restore & Integridade (QLT-012)</h3>
        <button type="button" onClick={handleRunRestore} data-testid="run-restore-btn">
          Validar Restore de Backup
        </button>
      </section>

      <section style={{ marginTop: '15px' }}>
        <h3>3. Histórico e Métricas de Disaster Recovery (QLT-013)</h3>
        <p><strong>RPO Alvo:</strong> 15 minutos | <strong>RTO Alvo:</strong> 60 minutos</p>
        <button type="button" onClick={handleLoadJobs} data-testid="load-jobs-btn">
          Carregar Histórico de Jobs
        </button>

        {jobs.length > 0 && (
          <ul data-testid="jobs-list">
            {jobs.map((j) => (
              <li key={j.id}>
                <strong>{j.jobType}:</strong> {j.status} ({j.snapshotHash})
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};
