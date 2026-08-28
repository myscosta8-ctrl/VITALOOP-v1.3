// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AdverseEventReportModal } from './AdverseEventReportModal.js';
import * as safetyApi from '../lib/safety-api.js';

vi.mock('../lib/safety-api.js', () => ({
  reportAdverseEvent: vi.fn(),
  prescribeIsolation: vi.fn(),
}));

describe('AdverseEventReportModal Component Test (SAF-001..011)', () => {
  it('renderiza modal NSP e notifica evento adverso com sucesso', async () => {
    vi.mocked(safetyApi.reportAdverseEvent).mockResolvedValue({
      data: {
        id: 'adv-event-123',
        status: 'reported',
      },
    });

    render(<AdverseEventReportModal encounterId="enc-123" patientId="pat-456" />);

    expect(screen.getByTestId('adverse-event-modal')).toBeTruthy();
    expect(screen.getByText('Núcleo de Segurança do Paciente (NSP / ANVISA RDC 36)')).toBeTruthy();

    const submitBtn = screen.getByTestId('report-btn');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(safetyApi.reportAdverseEvent).toHaveBeenCalledWith(expect.objectContaining({
        encounterId: 'enc-123',
        eventCategory: 'medicação',
        severity: 'mild',
      }));
    });

    expect(screen.getByTestId('safety-msg').textContent).toContain('Notificação do NSP registrada com sucesso!');
  });
});
