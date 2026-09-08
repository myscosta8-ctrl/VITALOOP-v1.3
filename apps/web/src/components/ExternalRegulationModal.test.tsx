// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExternalRegulationModal } from './ExternalRegulationModal.js';

const get = vi.fn();
const post = vi.fn();
const patch = vi.fn();

const mockApi = { get, post, patch };

vi.mock('../context/session-context.js', () => ({
  useSession: () => ({ api: mockApi }),
}));

describe('ExternalRegulationModal Component Test (SUS-007..010)', () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
    patch.mockReset();
  });

  it('renderiza modal de regulação médica, envia solicitação e confirma transferência inter-hospitalar', async () => {
    post.mockImplementation((path: string) => {
      if (path === '/api/v1/regulation/requests') {
        return Promise.resolve({ id: 'reg-789-xyz', status: 'requested' });
      }
      if (path === '/api/v1/sus/aih-requests/aih-123-abc/close') {
        return Promise.resolve({ id: 'aih-123-abc', closedAt: new Date().toISOString() });
      }
      return Promise.reject(new Error(`unexpected POST ${path}`));
    });
    patch.mockResolvedValue({ id: 'reg-789-xyz', status: 'transferred' });

    render(<ExternalRegulationModal encounterId="enc-123" patientId="pat-456" aihRequestId="aih-123-abc" />);

    expect(screen.getByTestId('regulation-modal')).toBeTruthy();
    expect(screen.getByText('Regulação Médica e Transferência Inter-Hospitalar (SUS-007..010)')).toBeTruthy();

    const submitBtn = screen.getByTestId('submit-regulation-btn');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(post).toHaveBeenCalledWith(
        '/api/v1/regulation/requests',
        expect.objectContaining({
          encounterId: 'enc-123',
          patientId: 'pat-456',
          aihRequestId: 'aih-123-abc',
          destinationFacility: 'Hospital das Clínicas - HCFMUSP',
          specialty: 'Cardiologia Intensiva',
        }),
      );
    });

    expect(screen.getByTestId('regulation-msg').textContent).toContain('Solicitação de regulação externa enviada com sucesso!');

    const confirmBtn = screen.getByTestId('confirm-transfer-btn');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(patch).toHaveBeenCalledWith('/api/v1/regulation/requests/reg-789-xyz/status', {
        targetStatus: 'transferred',
        cancellationReason: undefined,
      });
      expect(post).toHaveBeenCalledWith('/api/v1/sus/aih-requests/aih-123-abc/close');
    });

    expect(screen.getByTestId('regulation-msg').textContent).toContain('Transferência hospitalar confirmada e lote de AIH encerrado');
  });
});
