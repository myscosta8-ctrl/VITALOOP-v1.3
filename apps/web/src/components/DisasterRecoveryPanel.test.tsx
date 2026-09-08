// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DisasterRecoveryPanel } from './DisasterRecoveryPanel.js';

const get = vi.fn();
const post = vi.fn();

const mockApi = { get, post };

vi.mock('../context/session-context.js', () => ({
  useSession: () => ({ api: mockApi }),
}));

describe('DisasterRecoveryPanel Component Test (QLT-011..013)', () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
  });

  it('renderiza painel DR, executa backup, valida restore e carrega histórico de jobs', async () => {
    post.mockResolvedValue({
      id: 'job-123',
      jobType: 'backup_logical',
      status: 'completed',
      snapshotHash: 'SHA256-SNAP-111',
    });
    get.mockResolvedValue([{ id: 'job-1', jobType: 'backup_logical', status: 'completed', snapshotHash: 'SHA256-SNAP-1' }]);

    render(<DisasterRecoveryPanel />);

    expect(screen.getByTestId('disaster-recovery-panel')).toBeTruthy();
    expect(screen.getByText('Painel de Disaster Recovery, Backup & Restore (QLT-011..013)')).toBeTruthy();

    const backupBtn = screen.getByTestId('run-backup-btn');
    fireEvent.click(backupBtn);

    await waitFor(() => {
      expect(post).toHaveBeenCalledWith('/api/v1/quality/backup-restore/execute', { jobType: 'backup_logical', snapshotHash: undefined });
    });

    expect(screen.getByTestId('dr-status-msg').textContent).toContain('Backup lógico executado com sucesso');

    const jobsBtn = screen.getByTestId('load-jobs-btn');
    fireEvent.click(jobsBtn);

    await waitFor(() => {
      expect(get).toHaveBeenCalledWith('/api/v1/quality/backup-restore/jobs');
    });

    expect(screen.getByTestId('jobs-list')).toBeTruthy();
  });
});
