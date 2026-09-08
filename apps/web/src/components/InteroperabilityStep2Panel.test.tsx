// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InteroperabilityStep2Panel } from './InteroperabilityStep2Panel.js';

const get = vi.fn();
const post = vi.fn();

const mockApi = { get, post };

vi.mock('../context/session-context.js', () => ({
  useSession: () => ({ api: mockApi }),
}));

describe('InteroperabilityStep2Panel Component Test (INT-006..007)', () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
  });

  it('renderiza painel de RNDS/lote de AIH e envia pacote para RNDS', async () => {
    post.mockImplementation((path: string) => {
      if (path === '/api/v1/integration/rnds/send-bundle') {
        return Promise.resolve({ id: 'rnds-msg-456', status: 'processed' });
      }
      if (path === '/api/v1/sus/aih-batches/export') {
        return Promise.resolve({ id: 'batch-789', batchNumber: 'LOTE-AIH-9988' });
      }
      return Promise.reject(new Error(`unexpected POST ${path}`));
    });

    render(<InteroperabilityStep2Panel encounterId="enc-123" aihId="aih-789" />);

    expect(screen.getByTestId('step2-interop-panel')).toBeTruthy();
    expect(screen.getByText('Barramento RNDS e Exportação de Lote de AIH (INT-006..007)')).toBeTruthy();

    const rndsBtn = screen.getByTestId('send-rnds-btn');
    fireEvent.click(rndsBtn);

    await waitFor(() => {
      expect(post).toHaveBeenCalledWith('/api/v1/integration/rnds/send-bundle', {
        patientCns: '700000000000001',
        encounterId: 'enc-123',
        clinicalSummary: expect.any(String),
      });
    });

    expect(screen.getByTestId('step2-status-msg').textContent).toContain('Pacote FHIR enviado para o barramento RNDS/DATASUS');

    const exportAihBtn = screen.getByTestId('export-aih-batch-btn');
    fireEvent.click(exportAihBtn);

    await waitFor(() => {
      expect(post).toHaveBeenCalledWith('/api/v1/sus/aih-batches/export', { aihIds: ['aih-789'] });
    });

    expect(screen.getByTestId('step2-status-msg').textContent).toContain('Lote de AIH exportado com sucesso');
  });
});
