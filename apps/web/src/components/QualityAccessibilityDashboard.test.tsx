// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QualityAccessibilityDashboard } from './QualityAccessibilityDashboard.js';

const get = vi.fn();
const post = vi.fn();

const mockApi = { get, post };

vi.mock('../context/session-context.js', () => ({
  useSession: () => ({ api: mockApi }),
}));

describe('QualityAccessibilityDashboard Component Test (QLT-001..015)', () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
  });

  it('renderiza painel de qualidade/acessibilidade, testa impressão PDF, concorrência e exibe checklist ARIA', async () => {
    post.mockImplementation((path: string) => {
      if (path === '/api/v1/quality/documents/doc-100/print') {
        return Promise.resolve({
          documentId: 'doc-100',
          formattedText: 'VITALOOP UPA 24H - IMPRESSÃO OFICIAL',
          footerChecksum: 'CHK-PDF-12345',
        });
      }
      if (path === '/api/v1/quality/simulate-concurrency') {
        return Promise.resolve({ status: 'CONCURRENCY_OK' });
      }
      return Promise.reject(new Error(`unexpected POST ${path}`));
    });

    render(<QualityAccessibilityDashboard />);

    expect(screen.getByTestId('quality-accessibility-dashboard')).toBeTruthy();
    expect(screen.getByText('Painel de Qualidade Global, Impressão PDF & Acessibilidade (QLT-001..015)')).toBeTruthy();

    const printBtn = screen.getByTestId('print-pdf-btn');
    fireEvent.click(printBtn);

    await waitFor(() => {
      expect(post).toHaveBeenCalledWith('/api/v1/quality/documents/doc-100/print', expect.any(Object));
    });

    expect(screen.getByTestId('quality-status-msg').textContent).toContain('Checksum: CHK-PDF-12345');
    expect(screen.getByTestId('pdf-preview-display').textContent).toContain('VITALOOP UPA 24H');

    const concBtn = screen.getByTestId('test-concurrency-btn');
    fireEvent.click(concBtn);

    await waitFor(() => {
      expect(post).toHaveBeenCalledWith('/api/v1/quality/simulate-concurrency', { currentVersion: 1, expectedVersion: 1 });
    });

    expect(screen.getByTestId('concurrency-msg').textContent).toContain('Sem conflito');
    expect(screen.getByTestId('accessibility-checklist')).toBeTruthy();
  });
});
