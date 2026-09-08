// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PhysiotherapyAssessmentModal } from './PhysiotherapyAssessmentModal.js';

const get = vi.fn();
const post = vi.fn();

const mockApi = { get, post };

vi.mock('../context/session-context.js', () => ({
  useSession: () => ({ api: mockApi }),
}));

const SCHEMA = {
  schemaCode: 'PHYSIOTHERAPY_ASSESSMENT',
  groups: [
    {
      title: 'Diagnóstico e Conduta Fisioterapêutica',
      fields: [
        { code: 'diagnostico_cinetico_funcional', label: 'Diagnóstico cinético-funcional', type: 'text', required: true },
      ],
    },
  ],
};

describe('PhysiotherapyAssessmentModal Component Test', () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
  });

  it('carrega o schema, preenche e registra a avaliação com sucesso', async () => {
    get.mockResolvedValue(SCHEMA);
    post.mockResolvedValue({
      id: 'physio-1',
      encounterId: 'enc-123',
      patientId: 'pat-456',
      requestedBy: 'user-1',
      formFields: { diagnostico_cinetico_funcional: 'Redução de mobilidade em MMII' },
      createdAt: new Date().toISOString(),
    });

    render(<PhysiotherapyAssessmentModal encounterId="enc-123" patientId="pat-456" />);

    await waitFor(() => {
      expect(get).toHaveBeenCalledWith('/api/v1/physiotherapy/physiotherapy-assessment-schema');
    });

    await waitFor(() => {
      expect(screen.getByTestId('dynamic-clinical-form')).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText('Diagnóstico cinético-funcional *'), {
      target: { value: 'Redução de mobilidade em MMII' },
    });

    fireEvent.click(screen.getByTestId('submit-physiotherapy-btn'));

    await waitFor(() => {
      expect(post).toHaveBeenCalledWith('/api/v1/physiotherapy/physiotherapy-assessments', {
        patientId: 'pat-456',
        encounterId: 'enc-123',
        formFields: { diagnostico_cinetico_funcional: 'Redução de mobilidade em MMII' },
      });
    });

    expect(screen.getByTestId('physiotherapy-status-msg').textContent).toContain('registrada com sucesso');
  });
});
