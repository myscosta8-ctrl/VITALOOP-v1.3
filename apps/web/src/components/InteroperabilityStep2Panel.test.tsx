// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InteroperabilityStep2Panel } from './InteroperabilityStep2Panel.js';
import * as intApi from '../lib/integration-api.js';

vi.mock('../lib/integration-api.js', () => ({
  dispensePharmacyMedications: vi.fn(),
  exportAihBatch: vi.fn(),
  sendRndsBundle: vi.fn(),
}));

describe('InteroperabilityStep2Panel Component Test (INT-004..008)', () => {
  it('renderiza painel da etapa 2, solicita dispensação na farmácia e envia pacote para RNDS', async () => {
    vi.mocked(intApi.dispensePharmacyMedications).mockResolvedValue({
      data: { id: 'disp-123', status: 'dispensed' },
    });

    vi.mocked(intApi.sendRndsBundle).mockResolvedValue({
      data: { id: 'rnds-msg-456', status: 'processed' },
    });

    vi.mocked(intApi.exportAihBatch).mockResolvedValue({
      data: { id: 'batch-789', batchNumber: 'LOTE-AIH-9988' },
    });

    render(<InteroperabilityStep2Panel encounterId="enc-123" patientId="pat-456" aihId="aih-789" />);

    expect(screen.getByTestId('step2-interop-panel')).toBeTruthy();
    expect(screen.getByText('Barramento de Farmácia, Regulação SISREG/CROSS, RNDS e AIH (INT-004..008)')).toBeTruthy();

    const dispenseBtn = screen.getByTestId('dispense-btn');
    fireEvent.click(dispenseBtn);

    await waitFor(() => {
      expect(intApi.dispensePharmacyMedications).toHaveBeenCalledWith('enc-123', 'pat-456', expect.any(Array));
    });

    expect(screen.getByTestId('step2-status-msg').textContent).toContain('Dispensação enviada para Farmácia Central');

    const rndsBtn = screen.getByTestId('send-rnds-btn');
    fireEvent.click(rndsBtn);

    await waitFor(() => {
      expect(intApi.sendRndsBundle).toHaveBeenCalledWith('700000000000001', 'enc-123', expect.any(String));
    });

    expect(screen.getByTestId('step2-status-msg').textContent).toContain('Pacote FHIR enviado para o barramento RNDS/DATASUS');

    const exportAihBtn = screen.getByTestId('export-aih-batch-btn');
    fireEvent.click(exportAihBtn);

    await waitFor(() => {
      expect(intApi.exportAihBatch).toHaveBeenCalledWith(['aih-789']);
    });

    expect(screen.getByTestId('step2-status-msg').textContent).toContain('Lote de AIH exportado com sucesso');
  });
});
