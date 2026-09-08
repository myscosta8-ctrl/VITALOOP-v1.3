// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NursingTherapeuticPlanModal } from './NursingTherapeuticPlanModal.js';

const get = vi.fn();
const post = vi.fn();

const mockApi = { get, post };

vi.mock('../context/session-context.js', () => ({
  useSession: () => ({ api: mockApi }),
}));

const SCHEMA = {
  schemaCode: 'NURSING_THERAPEUTIC_PLAN',
  groups: [
    {
      title: 'Resumo e Diagnósticos de Enfermagem',
      fields: [
        { code: 'resumo_projeto', label: 'Resumo do projeto', type: 'text', required: true },
      ],
    },
  ],
};

describe('NursingTherapeuticPlanModal Component Test', () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
  });

  it('carrega o schema, preenche e registra o projeto com sucesso', async () => {
    get.mockResolvedValue(SCHEMA);
    post.mockResolvedValue({
      id: 'ntp-1',
      encounterId: 'enc-123',
      patientId: 'pat-456',
      requestedBy: 'user-1',
      formFields: { resumo_projeto: 'Prevenção de riscos hospitalares.' },
      createdAt: new Date().toISOString(),
    });

    render(<NursingTherapeuticPlanModal encounterId="enc-123" patientId="pat-456" />);

    await waitFor(() => {
      expect(get).toHaveBeenCalledWith('/api/v1/nursing-therapeutic-plan/nursing-therapeutic-plan-schema');
    });

    await waitFor(() => {
      expect(screen.getByTestId('dynamic-clinical-form')).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText('Resumo do projeto *'), {
      target: { value: 'Prevenção de riscos hospitalares.' },
    });

    fireEvent.click(screen.getByTestId('submit-nursing-therapeutic-plan-btn'));

    await waitFor(() => {
      expect(post).toHaveBeenCalledWith('/api/v1/nursing-therapeutic-plan/nursing-therapeutic-plans', {
        patientId: 'pat-456',
        encounterId: 'enc-123',
        formFields: { resumo_projeto: 'Prevenção de riscos hospitalares.' },
      });
    });

    expect(screen.getByTestId('nursing-therapeutic-plan-status-msg').textContent).toContain('registrado com sucesso');
  });
});
