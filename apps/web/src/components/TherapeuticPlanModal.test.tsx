// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TherapeuticPlanModal } from './TherapeuticPlanModal.js';

const get = vi.fn();
const post = vi.fn();

const mockApi = { get, post };

vi.mock('../context/session-context.js', () => ({
  useSession: () => ({ api: mockApi }),
}));

const SCHEMA = {
  schemaCode: 'THERAPEUTIC_PLAN',
  groups: [
    {
      title: 'Diagnóstico e Motivo',
      fields: [
        { code: 'diagnostico_principal', label: 'Diagnóstico principal', type: 'text', required: true },
      ],
    },
  ],
};

describe('TherapeuticPlanModal Component Test', () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
  });

  it('carrega o schema, preenche e registra o plano com sucesso', async () => {
    get.mockResolvedValue(SCHEMA);
    post.mockResolvedValue({
      id: 'plan-1',
      encounterId: 'enc-123',
      patientId: 'pat-456',
      requestedBy: 'user-1',
      formFields: { diagnostico_principal: 'Pneumonia comunitária' },
      createdAt: new Date().toISOString(),
    });

    render(<TherapeuticPlanModal encounterId="enc-123" patientId="pat-456" />);

    await waitFor(() => {
      expect(get).toHaveBeenCalledWith('/api/v1/therapeutic-plan/therapeutic-plan-schema');
    });

    await waitFor(() => {
      expect(screen.getByTestId('dynamic-clinical-form')).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText('Diagnóstico principal *'), {
      target: { value: 'Pneumonia comunitária' },
    });

    fireEvent.click(screen.getByTestId('submit-therapeutic-plan-btn'));

    await waitFor(() => {
      expect(post).toHaveBeenCalledWith('/api/v1/therapeutic-plan/therapeutic-plans', {
        patientId: 'pat-456',
        encounterId: 'enc-123',
        formFields: { diagnostico_principal: 'Pneumonia comunitária' },
      });
    });

    expect(screen.getByTestId('therapeutic-plan-status-msg').textContent).toContain('registrado com sucesso');
  });
});
