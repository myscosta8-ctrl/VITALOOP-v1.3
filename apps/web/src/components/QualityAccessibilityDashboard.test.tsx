// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QualityAccessibilityDashboard } from './QualityAccessibilityDashboard.js';
import * as qualityApi from '../lib/quality-api.js';

vi.mock('../lib/quality-api.js', () => ({
  printClinicalDocumentPdf: vi.fn(),
  simulateConcurrencyCheck: vi.fn(),
}));

describe('QualityAccessibilityDashboard Component Test (QLT-001..015)', () => {
  it('renderiza painel de qualidade/acessibilidade, testa impressão PDF, concorrência e exibe checklist ARIA', async () => {
    vi.mocked(qualityApi.printClinicalDocumentPdf).mockResolvedValue({
      data: {
        documentId: 'doc-100',
        formattedText: 'VITALOOP UPA 24H - IMPRESSÃO OFICIAL',
        footerChecksum: 'CHK-PDF-12345',
      },
    });

    vi.mocked(qualityApi.simulateConcurrencyCheck).mockResolvedValue({
      data: { status: 'CONCURRENCY_OK' },
    });

    render(<QualityAccessibilityDashboard />);

    expect(screen.getByTestId('quality-accessibility-dashboard')).toBeTruthy();
    expect(screen.getByText('Painel de Qualidade Global, Impressão PDF & Acessibilidade (QLT-001..015)')).toBeTruthy();

    const printBtn = screen.getByTestId('print-pdf-btn');
    fireEvent.click(printBtn);

    await waitFor(() => {
      expect(qualityApi.printClinicalDocumentPdf).toHaveBeenCalledWith('doc-100', expect.any(Object));
    });

    expect(screen.getByTestId('quality-status-msg').textContent).toContain('Checksum: CHK-PDF-12345');
    expect(screen.getByTestId('pdf-preview-display').textContent).toContain('VITALOOP UPA 24H');

    const concBtn = screen.getByTestId('test-concurrency-btn');
    fireEvent.click(concBtn);

    await waitFor(() => {
      expect(qualityApi.simulateConcurrencyCheck).toHaveBeenCalledWith(1, 1);
    });

    expect(screen.getByTestId('concurrency-msg').textContent).toContain('Sem conflito');
    expect(screen.getByTestId('accessibility-checklist')).toBeTruthy();
  });
});
