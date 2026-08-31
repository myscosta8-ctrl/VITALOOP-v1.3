import { describe, it, expect } from 'vitest';
import { executeBackupJob, validateRestoreIntegrity } from './dr-manager.js';

describe('Regras de Domínio — Backup, Restore e Disaster Recovery (QLT-011..013)', () => {
  it('1. QLT-011 — Executa job de backup lógico e gera metadados com RPO/RTO', () => {
    const job = executeBackupJob({ jobType: 'backup_logical' });
    expect(job.jobId).toContain('JOB-BK-');
    expect(job.status).toBe('completed');
    expect(job.rpoMinutes).toBe(15);
    expect(job.rtoMinutes).toBe(60);
    expect(job.snapshotHash).toBeTruthy();
  });

  it('2. QLT-012 — Valida integridade do hash entre o snapshot de backup e o restore', () => {
    const hash = 'SHA256-SNAP-998877';
    expect(validateRestoreIntegrity(hash, 'SHA256-SNAP-998877')).toBe(true);
    expect(validateRestoreIntegrity(hash, 'SHA256-SNAP-MUTATED')).toBe(false);
  });
});
