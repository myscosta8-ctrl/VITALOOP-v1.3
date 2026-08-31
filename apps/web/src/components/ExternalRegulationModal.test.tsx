// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExternalRegulationModal } from './ExternalRegulationModal.js';
import * as regApi from '../lib/regulation-api.js';

vi.mock('../lib/regulation-api.js', () => ({
  createExternalRegulation: vi.fn(),
  updateRegulationStatus: vi.fn(),
  closeAihRequest: vi.fn(),
}));

describe('ExternalRegulationModal Component Test (SUS-007..010)', () => {
  it('renderiza modal de regulação médica, envia solicitação e confirma transferência inter-hospitalar', async () => {
    vi.mocked(regApi.createExternalRegulation).mockResolvedValue({
      data: {
        id: 'reg-789-xyz',
        status: 'requested',
      },
    });

    vi.mocked(regApi.updateRegulationStatus).mockResolvedValue({
      data: {
        id: 'reg-789-xyz',
        status: 'transferred',
      },
    });

    vi.mocked(regApi.closeAihRequest).mockResolvedValue({
      data: {
        id: 'aih-123-abc',
        closedAt: new Date().toISOString(),
      },
    });

    render(<ExternalRegulationModal encounterId="enc-123" patientId="pat-456" aihRequestId="aih-123-abc" />);

    expect(screen.getByTestId('regulation-modal')).toBeTruthy();
    expect(screen.getByText('Regulação Médica e Transferência Inter-Hospitalar (SUS-007..010)')).toBeTruthy();

    const submitBtn = screen.getByTestId('submit-regulation-btn');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(regApi.createExternalRegulation).toHaveBeenCalledWith(expect.objectContaining({
        encounterId: 'enc-123',
        patientId: 'pat-456',
        aihRequestId: 'aih-123-abc',
        destinationFacility: 'Hospital das Clínicas - HCFMUSP',
        specialty: 'Cardiologia Intensiva',
      }));
    });

    expect(screen.getByTestId('regulation-msg').textContent).toContain('Solicitação de regulação externa enviada com sucesso!');

    const confirmBtn = screen.getByTestId('confirm-transfer-btn');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(regApi.updateRegulationStatus).toHaveBeenCalledWith('reg-789-xyz', 'transferred');
      expect(regApi.closeAihRequest).toHaveBeenCalledWith('aih-123-abc');
    });

    expect(screen.getByTestId('regulation-msg').textContent).toContain('Transferência hospitalar confirmada e lote de AIH encerrado');
  });
});
