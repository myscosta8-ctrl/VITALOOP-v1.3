// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LgpdPrivacyPanel } from './LgpdPrivacyPanel.js';
import * as secApi from '../lib/security-api.js';

vi.mock('../lib/security-api.js', () => ({
  exportLgpdPatientReport: vi.fn(),
  fetchLgpdRetentionPolicies: vi.fn(),
}));

describe('LgpdPrivacyPanel Component Test (SEC-T-012..016)', () => {
  it('renderiza painel LGPD, gera extrato do titular com CPF mascarado e carrega políticas de retenção', async () => {
    vi.mocked(secApi.exportLgpdPatientReport).mockResolvedValue({
      data: {
        reportId: 'LGPD-EXT-REL-9988',
        personalData: { fullName: 'Maria Souza', maskedCpf: '123.***.***-99' },
        legalBasis: 'Lei 13.709/2018',
        dataHash: 'SHA256-12345',
      },
    });

    vi.mocked(secApi.fetchLgpdRetentionPolicies).mockResolvedValue({
      data: [
        { id: 'pol-1', entityType: 'medical_records', retentionYears: 20, description: 'Prontuário 20 anos' },
      ],
    });

    render(<LgpdPrivacyPanel patientId="pat-123" />);

    expect(screen.getByTestId('lgpd-privacy-panel')).toBeTruthy();
    expect(screen.getByText('Painel de Privacidade, Transparência LGPD e Retenção (SEC-T-012..016)')).toBeTruthy();

    const exportBtn = screen.getByTestId('export-lgpd-btn');
    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(secApi.exportLgpdPatientReport).toHaveBeenCalledWith('pat-123');
    });

    expect(screen.getByTestId('lgpd-status-msg').textContent).toContain('Extrato de transparência LGPD gerado com sucesso');
    expect(screen.getByTestId('lgpd-report-display')).toBeTruthy();
    expect(screen.getByText(/123\.\*\*\*\.\*\*\*-99/)).toBeTruthy();

    const retentionBtn = screen.getByTestId('load-retention-btn');
    fireEvent.click(retentionBtn);

    await waitFor(() => {
      expect(secApi.fetchLgpdRetentionPolicies).toHaveBeenCalled();
    });

    expect(screen.getByTestId('retention-policies-list')).toBeTruthy();
    expect(screen.getByText(/Prontuário 20 anos/)).toBeTruthy();
  });
});
