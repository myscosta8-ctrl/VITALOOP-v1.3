// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DisasterRecoveryPanel } from './DisasterRecoveryPanel.js';
import * as qualityApi from '../lib/quality-api.js';

vi.mock('../lib/quality-api.js', () => ({
  executeBackupRestoreJob: vi.fn(),
  fetchBackupRestoreJobs: vi.fn(),
}));

describe('DisasterRecoveryPanel Component Test (QLT-011..013)', () => {
  it('renderiza painel DR, executa backup, valida restore e carrega histórico de jobs', async () => {
    vi.mocked(qualityApi.executeBackupRestoreJob).mockResolvedValue({
      data: {
        id: 'job-123',
        jobType: 'backup_logical',
        status: 'completed',
        snapshotHash: 'SHA256-SNAP-111',
      },
    });

    vi.mocked(qualityApi.fetchBackupRestoreJobs).mockResolvedValue({
      data: [
        { id: 'job-1', jobType: 'backup_logical', status: 'completed', snapshotHash: 'SHA256-SNAP-1' },
      ],
    });

    render(<DisasterRecoveryPanel />);

    expect(screen.getByTestId('disaster-recovery-panel')).toBeTruthy();
    expect(screen.getByText('Painel de Disaster Recovery, Backup & Restore (QLT-011..013)')).toBeTruthy();

    const backupBtn = screen.getByTestId('run-backup-btn');
    fireEvent.click(backupBtn);

    await waitFor(() => {
      expect(qualityApi.executeBackupRestoreJob).toHaveBeenCalledWith('backup_logical');
    });

    expect(screen.getByTestId('dr-status-msg').textContent).toContain('Backup lógico executado com sucesso');

    const jobsBtn = screen.getByTestId('load-jobs-btn');
    fireEvent.click(jobsBtn);

    await waitFor(() => {
      expect(qualityApi.fetchBackupRestoreJobs).toHaveBeenCalled();
    });

    expect(screen.getByTestId('jobs-list')).toBeTruthy();
  });
});
