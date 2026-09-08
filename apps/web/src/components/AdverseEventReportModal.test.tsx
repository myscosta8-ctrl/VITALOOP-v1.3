// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AdverseEventReportModal } from './AdverseEventReportModal.js';

const get = vi.fn();
const post = vi.fn();

const mockApi = { get, post };

vi.mock('../context/session-context.js', () => ({
  useSession: () => ({ api: mockApi }),
}));

describe('AdverseEventReportModal Component Test (SAF-001..011)', () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
  });

  it('renderiza modal NSP e notifica evento adverso com sucesso', async () => {
    post.mockResolvedValue({ id: 'adv-event-123', status: 'reported' });

    render(<AdverseEventReportModal encounterId="enc-123" patientId="pat-456" />);

    expect(screen.getByTestId('adverse-event-modal')).toBeTruthy();
    expect(screen.getByText('Núcleo de Segurança do Paciente (NSP / ANVISA RDC 36)')).toBeTruthy();

    const submitBtn = screen.getByTestId('report-btn');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(post).toHaveBeenCalledWith(
        '/api/v1/safety/adverse-events',
        expect.objectContaining({
          encounterId: 'enc-123',
          eventCategory: 'medicação',
          severity: 'mild',
        }),
      );
    });

    expect(screen.getByTestId('safety-msg').textContent).toContain('Notificação do NSP registrada com sucesso!');
  });
});
