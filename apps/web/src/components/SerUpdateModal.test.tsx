// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SerUpdateModal } from './SerUpdateModal.js';

const get = vi.fn();
const post = vi.fn();

const mockApi = { get, post };

vi.mock('../context/session-context.js', () => ({
  useSession: () => ({ api: mockApi }),
}));

const SCHEMA = {
  schemaCode: 'SER_UPDATE',
  groups: [
    {
      title: 'Evolução',
      fields: [
        { code: 'evolucao_diaria', label: 'Evolução diária', type: 'text', required: true },
      ],
    },
  ],
};

describe('SerUpdateModal Component Test', () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
  });

  it('carrega o schema, preenche e registra a atualização com sucesso', async () => {
    get.mockResolvedValue(SCHEMA);
    post.mockResolvedValue({
      id: 'ser-1',
      encounterId: 'enc-123',
      patientId: 'pat-456',
      requestedBy: 'user-1',
      formFields: { evolucao_diaria: 'Paciente estável, aguardando vaga.' },
      createdAt: new Date().toISOString(),
    });

    render(<SerUpdateModal encounterId="enc-123" patientId="pat-456" />);

    await waitFor(() => {
      expect(get).toHaveBeenCalledWith('/api/v1/ser/ser-update-schema');
    });

    await waitFor(() => {
      expect(screen.getByTestId('dynamic-clinical-form')).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText('Evolução diária *'), {
      target: { value: 'Paciente estável, aguardando vaga.' },
    });

    fireEvent.click(screen.getByTestId('submit-ser-btn'));

    await waitFor(() => {
      expect(post).toHaveBeenCalledWith('/api/v1/ser/ser-updates', {
        patientId: 'pat-456',
        encounterId: 'enc-123',
        formFields: { evolucao_diaria: 'Paciente estável, aguardando vaga.' },
      });
    });

    expect(screen.getByTestId('ser-status-msg').textContent).toContain('registrada com sucesso');
  });
});
