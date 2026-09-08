// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LgpdPrivacyPanel } from './LgpdPrivacyPanel.js';

const get = vi.fn();
const post = vi.fn();

const mockApi = { get, post };

vi.mock('../context/session-context.js', () => ({
  useSession: () => ({ api: mockApi }),
}));

describe('LgpdPrivacyPanel Component Test (SEC-T-012..016)', () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
  });

  it('renderiza painel LGPD, gera extrato do titular com CPF mascarado e carrega políticas de retenção', async () => {
    post.mockResolvedValue({
      reportId: 'LGPD-EXT-REL-9988',
      personalData: { fullName: 'Maria Souza', maskedCpf: '123.***.***-99' },
      legalBasis: 'Lei 13.709/2018',
      dataHash: 'SHA256-12345',
    });
    get.mockResolvedValue([{ id: 'pol-1', entityType: 'medical_records', retentionYears: 20, description: 'Prontuário 20 anos' }]);

    render(<LgpdPrivacyPanel patientId="pat-123" />);

    expect(screen.getByTestId('lgpd-privacy-panel')).toBeTruthy();
    expect(screen.getByText('Painel de Privacidade, Transparência LGPD e Retenção (SEC-T-012..016)')).toBeTruthy();

    const exportBtn = screen.getByTestId('export-lgpd-btn');
    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(post).toHaveBeenCalledWith('/api/v1/lgpd/patients/pat-123/export');
    });

    expect(screen.getByTestId('lgpd-status-msg').textContent).toContain('Extrato de transparência LGPD gerado com sucesso');
    expect(screen.getByTestId('lgpd-report-display')).toBeTruthy();
    expect(screen.getByText(/123\.\*\*\*\.\*\*\*-99/)).toBeTruthy();

    const retentionBtn = screen.getByTestId('load-retention-btn');
    fireEvent.click(retentionBtn);

    await waitFor(() => {
      expect(get).toHaveBeenCalledWith('/api/v1/lgpd/retention-policies');
    });

    expect(screen.getByTestId('retention-policies-list')).toBeTruthy();
    expect(screen.getByText(/Prontuário 20 anos/)).toBeTruthy();
  });
});
