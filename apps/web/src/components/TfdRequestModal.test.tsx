// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TfdRequestModal } from './TfdRequestModal.js';

const get = vi.fn();
const post = vi.fn();

const mockApi = { get, post };

vi.mock('../context/session-context.js', () => ({
  useSession: () => ({ api: mockApi }),
}));

const SCHEMA = {
  schemaCode: 'TFD_REQUEST',
  groups: [
    {
      title: 'Quadro Clínico',
      fields: [
        { code: 'diagnostico', label: 'Diagnóstico', type: 'text', required: true },
      ],
    },
  ],
};

describe('TfdRequestModal Component Test', () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
  });

  it('carrega o schema, preenche e registra o laudo com sucesso', async () => {
    get.mockResolvedValue(SCHEMA);
    post.mockResolvedValue({
      id: 'tfd-1',
      encounterId: 'enc-123',
      patientId: 'pat-456',
      requestedBy: 'user-1',
      formFields: { diagnostico: 'Insuficiência renal crônica' },
      createdAt: new Date().toISOString(),
    });

    render(<TfdRequestModal encounterId="enc-123" patientId="pat-456" />);

    await waitFor(() => {
      expect(get).toHaveBeenCalledWith('/api/v1/tfd/tfd-request-schema');
    });

    await waitFor(() => {
      expect(screen.getByTestId('dynamic-clinical-form')).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText('Diagnóstico *'), {
      target: { value: 'Insuficiência renal crônica' },
    });

    fireEvent.click(screen.getByTestId('submit-tfd-btn'));

    await waitFor(() => {
      expect(post).toHaveBeenCalledWith('/api/v1/tfd/tfd-requests', {
        patientId: 'pat-456',
        encounterId: 'enc-123',
        formFields: { diagnostico: 'Insuficiência renal crônica' },
      });
    });

    expect(screen.getByTestId('tfd-status-msg').textContent).toContain('registrado com sucesso');
  });
});
