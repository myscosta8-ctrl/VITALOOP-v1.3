// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InteroperabilityDashboardPage } from './InteroperabilityDashboardPage.js';
import * as intApi from '../lib/integration-api.js';

vi.mock('../lib/integration-api.js', () => ({
  fetchIntegrationMessages: vi.fn(),
  sendHl7OruMessage: vi.fn(),
}));

describe('InteroperabilityDashboardPage Component Test (INT-001..003, INT-009)', () => {
  it('renderiza painel de interoperabilidade, lista mensagens do barramento e injeta laudo HL7 LIS', async () => {
    vi.mocked(intApi.fetchIntegrationMessages).mockResolvedValue({
      data: [
        {
          id: 'msg-1',
          messageType: 'HL7_ORU_R01',
          sender: 'LIS_LABORATORY',
          status: 'processed',
          createdAt: new Date().toISOString(),
        },
      ],
    });

    vi.mocked(intApi.sendHl7OruMessage).mockResolvedValue({
      data: {
        id: 'msg-2',
        messageType: 'HL7_ORU_R01',
        status: 'processed',
      },
    });

    render(<InteroperabilityDashboardPage />);

    expect(screen.getByTestId('interoperability-dashboard')).toBeTruthy();
    expect(screen.getByText('Painel de Interoperabilidade e Barramento FHIR R4 / HL7 (INT-001..003, INT-009)')).toBeTruthy();

    await waitFor(() => {
      expect(intApi.fetchIntegrationMessages).toHaveBeenCalled();
    });

    expect(screen.getByTestId('messages-table')).toBeTruthy();

    const sendBtn = screen.getByTestId('send-hl7-btn');
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(intApi.sendHl7OruMessage).toHaveBeenCalled();
    });

    expect(screen.getByTestId('integration-status-msg').textContent).toContain('Mensagem HL7 recebida e processada com sucesso');
  });
});
