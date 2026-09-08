// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PharmacyDispenseModal } from './PharmacyDispenseModal.js';

const get = vi.fn();
const post = vi.fn();

const mockApi = { get, post };

vi.mock('../context/session-context.js', () => ({
  useSession: () => ({ api: mockApi }),
}));

describe('PharmacyDispenseModal Component Test (INT-004)', () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
  });

  it('renderiza modal de dispensação e solicita dispensação na farmácia com sucesso', async () => {
    post.mockResolvedValue({ id: 'disp-123', status: 'dispensed' });

    render(<PharmacyDispenseModal encounterId="enc-123" patientId="pat-456" />);

    expect(screen.getByTestId('pharmacy-dispense-modal')).toBeTruthy();
    expect(screen.getByText('Dispensação Eletrônica — Farmácia Central (INT-004)')).toBeTruthy();

    const dispenseBtn = screen.getByTestId('dispense-btn');
    fireEvent.click(dispenseBtn);

    await waitFor(() => {
      expect(post).toHaveBeenCalledWith('/api/v1/integration/pharmacy/dispense', {
        encounterId: 'enc-123',
        patientId: 'pat-456',
        items: [{ medicationName: 'Dipirona 500mg IV', quantity: 2, dosage: '1 ampola IV de 6/6h' }],
      });
    });

    expect(screen.getByTestId('pharmacy-status-msg').textContent).toContain('Dispensação enviada para Farmácia Central');
  });
});
