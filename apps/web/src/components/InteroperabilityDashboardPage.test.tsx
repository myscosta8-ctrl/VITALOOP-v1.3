// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InteroperabilityDashboardPage } from './InteroperabilityDashboardPage.js';

const get = vi.fn();
const post = vi.fn();

const mockApi = { get, post };

vi.mock('../context/session-context.js', () => ({
  useSession: () => ({ api: mockApi }),
}));

describe('InteroperabilityDashboardPage Component Test (INT-001..003, INT-009)', () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
  });

  it('renderiza painel de interoperabilidade, lista mensagens do barramento e injeta laudo HL7 LIS', async () => {
    get.mockResolvedValue([
      {
        id: 'msg-1',
        messageType: 'HL7_ORU_R01',
        sender: 'LIS_LABORATORY',
        status: 'processed',
        createdAt: new Date().toISOString(),
      },
    ]);
    post.mockResolvedValue({ id: 'msg-2', messageType: 'HL7_ORU_R01', status: 'processed' });

    render(<InteroperabilityDashboardPage />);

    expect(screen.getByTestId('interoperability-dashboard')).toBeTruthy();
    expect(screen.getByText('Painel de Interoperabilidade e Barramento FHIR R4 / HL7 (INT-001..003, INT-009)')).toBeTruthy();

    await waitFor(() => {
      expect(get).toHaveBeenCalledWith('/api/v1/integration/messages');
    });

    expect(screen.getByTestId('messages-table')).toBeTruthy();

    const sendBtn = screen.getByTestId('send-hl7-btn');
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(post).toHaveBeenCalledWith('/api/v1/integration/hl7/oru', expect.objectContaining({ rawPayload: expect.any(String) }));
    });

    expect(screen.getByTestId('integration-status-msg').textContent).toContain('Mensagem HL7 recebida e processada com sucesso');
  });
});
