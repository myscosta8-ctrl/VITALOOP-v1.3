// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SocialWorkAssessmentModal } from './SocialWorkAssessmentModal.js';

const get = vi.fn();
const post = vi.fn();

const mockApi = { get, post };

vi.mock('../context/session-context.js', () => ({
  useSession: () => ({ api: mockApi }),
}));

const SCHEMA = {
  schemaCode: 'SOCIAL_WORK_ASSESSMENT',
  groups: [
    {
      title: 'Motivo da Avaliação',
      fields: [
        { code: 'motivo_avaliacao', label: 'Motivo do encaminhamento/avaliação', type: 'text', required: true },
      ],
    },
  ],
};

describe('SocialWorkAssessmentModal Component Test', () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
  });

  it('carrega o schema, preenche e registra a avaliação com sucesso', async () => {
    get.mockResolvedValue(SCHEMA);
    post.mockResolvedValue({
      id: 'sw-1',
      encounterId: 'enc-123',
      patientId: 'pat-456',
      requestedBy: 'user-1',
      formFields: { motivo_avaliacao: 'Paciente em situação de rua' },
      createdAt: new Date().toISOString(),
    });

    render(<SocialWorkAssessmentModal encounterId="enc-123" patientId="pat-456" />);

    await waitFor(() => {
      expect(get).toHaveBeenCalledWith('/api/v1/social-work/social-work-assessment-schema');
    });

    await waitFor(() => {
      expect(screen.getByTestId('dynamic-clinical-form')).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText('Motivo do encaminhamento/avaliação *'), {
      target: { value: 'Paciente em situação de rua' },
    });

    fireEvent.click(screen.getByTestId('submit-social-work-btn'));

    await waitFor(() => {
      expect(post).toHaveBeenCalledWith('/api/v1/social-work/social-work-assessments', {
        patientId: 'pat-456',
        encounterId: 'enc-123',
        formFields: { motivo_avaliacao: 'Paciente em situação de rua' },
      });
    });

    expect(screen.getByTestId('social-work-status-msg').textContent).toContain('registrada com sucesso');
  });
});
