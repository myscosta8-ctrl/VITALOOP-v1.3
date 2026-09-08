// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PharmacyFollowUpModal } from './PharmacyFollowUpModal.js';

const get = vi.fn();
const post = vi.fn();

const mockApi = { get, post };

vi.mock('../context/session-context.js', () => ({
  useSession: () => ({ api: mockApi }),
}));

const SCHEMA = {
  schemaCode: 'PHARMACY_CLINICAL_FOLLOWUP',
  groups: [
    {
      title: 'Acompanhamento Farmacêutico (evolução)',
      fields: [
        {
          code: 'projeto_terapeutico_seguimento',
          label: 'Projeto terapêutico / seguimento farmacêutico',
          type: 'text',
          required: true,
        },
      ],
    },
  ],
};

describe('PharmacyFollowUpModal Component Test', () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
  });

  it('carrega o schema, preenche e registra o acompanhamento com sucesso', async () => {
    get.mockResolvedValue(SCHEMA);
    post.mockResolvedValue({
      id: 'pf-1',
      encounterId: 'enc-123',
      patientId: 'pat-456',
      requestedBy: 'user-1',
      formFields: { projeto_terapeutico_seguimento: 'Seguimento diário.' },
      createdAt: new Date().toISOString(),
    });

    render(<PharmacyFollowUpModal encounterId="enc-123" patientId="pat-456" />);

    await waitFor(() => {
      expect(get).toHaveBeenCalledWith('/api/v1/pharmacy-followup/pharmacy-followup-schema');
    });

    await waitFor(() => {
      expect(screen.getByTestId('dynamic-clinical-form')).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText('Projeto terapêutico / seguimento farmacêutico *'), {
      target: { value: 'Seguimento diário.' },
    });

    fireEvent.click(screen.getByTestId('submit-pharmacy-followup-btn'));

    await waitFor(() => {
      expect(post).toHaveBeenCalledWith('/api/v1/pharmacy-followup/pharmacy-followups', {
        patientId: 'pat-456',
        encounterId: 'enc-123',
        formFields: { projeto_terapeutico_seguimento: 'Seguimento diário.' },
      });
    });

    expect(screen.getByTestId('pharmacy-followup-status-msg').textContent).toContain('registrado com sucesso');
  });
});
