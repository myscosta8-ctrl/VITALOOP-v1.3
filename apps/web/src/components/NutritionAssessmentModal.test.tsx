// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NutritionAssessmentModal } from './NutritionAssessmentModal.js';

const get = vi.fn();
const post = vi.fn();

const mockApi = { get, post };

vi.mock('../context/session-context.js', () => ({
  useSession: () => ({ api: mockApi }),
}));

const SCHEMA = {
  schemaCode: 'NUTRITION_ASSESSMENT',
  groups: [
    {
      title: 'Diagnóstico e Conduta Nutricional',
      fields: [
        {
          code: 'diagnostico_nutricional',
          label: 'Diagnóstico nutricional',
          type: 'code',
          required: true,
          options: [
            { code: 'eutrofico', label: 'Eutrófico' },
            { code: 'obesidade', label: 'Obesidade' },
          ],
        },
      ],
    },
  ],
};

describe('NutritionAssessmentModal Component Test', () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
  });

  it('carrega o schema, preenche e registra a avaliação com sucesso', async () => {
    get.mockResolvedValue(SCHEMA);
    post.mockResolvedValue({
      id: 'nut-1',
      encounterId: 'enc-123',
      patientId: 'pat-456',
      requestedBy: 'user-1',
      formFields: { diagnostico_nutricional: 'eutrofico' },
      createdAt: new Date().toISOString(),
    });

    render(<NutritionAssessmentModal encounterId="enc-123" patientId="pat-456" />);

    await waitFor(() => {
      expect(get).toHaveBeenCalledWith('/api/v1/nutrition/nutrition-assessment-schema');
    });

    await waitFor(() => {
      expect(screen.getByTestId('dynamic-clinical-form')).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText('Diagnóstico nutricional *'), {
      target: { value: 'eutrofico' },
    });

    fireEvent.click(screen.getByTestId('submit-nutrition-btn'));

    await waitFor(() => {
      expect(post).toHaveBeenCalledWith('/api/v1/nutrition/nutrition-assessments', {
        patientId: 'pat-456',
        encounterId: 'enc-123',
        formFields: { diagnostico_nutricional: 'eutrofico' },
      });
    });

    expect(screen.getByTestId('nutrition-status-msg').textContent).toContain('registrada com sucesso');
  });
});
