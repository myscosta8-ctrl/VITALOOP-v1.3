/** @vitest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { EncounterOpenPage } from './EncounterOpenPage.js';

const get = vi.fn();
const post = vi.fn();
const patch = vi.fn();

const mockApi = { get, post, patch };

vi.mock('../context/session-context.js', () => ({
  useSession: () => ({ api: mockApi }),
}));

describe('EncounterOpenPage UI Component', () => {
  beforeEach(() => {
    post.mockReset();
  });

  it('renderiza o formulário de abertura de atendimento', () => {
    render(<EncounterOpenPage />);
    expect(screen.getByText('Abertura de Atendimento (UPA 24h)')).toBeInTheDocument();
    expect(screen.getByLabelText(/ID do Paciente/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Queixa Principal/i)).toBeInTheDocument();
  });

  it('exibe mensagem de erro se os campos obrigatórios estiverem vazios', async () => {
    render(<EncounterOpenPage />);
    const submitBtn = screen.getByRole('button', { name: /Abrir Atendimento/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('O ID do paciente é obrigatório.');
    });
  });

  it('chama API de atendimento com sucesso', async () => {
    const mockCreated = {
      id: 'enc-uuid-123',
      patientId: 'pat-uuid-123',
      institutionId: 'inst-123',
      encounterType: 'urgency',
      origin: 'spontaneous',
      chiefComplaint: 'Febre alta',
      status: 'created',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    post.mockResolvedValueOnce(mockCreated);

    render(<EncounterOpenPage />);
    fireEvent.change(screen.getByLabelText(/ID do Paciente/i), {
      target: { value: 'pat-uuid-123' },
    });
    fireEvent.change(screen.getByLabelText(/Queixa Principal/i), {
      target: { value: 'Febre alta' },
    });

    const submitBtn = screen.getByRole('button', { name: /Abrir Atendimento/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(post).toHaveBeenCalledWith('/api/v1/encounters', {
        patientId: 'pat-uuid-123',
        encounterType: 'urgency',
        origin: 'spontaneous',
        chiefComplaint: 'Febre alta',
      });
      expect(screen.getByRole('status')).toHaveTextContent(
        'Atendimento aberto com sucesso! ID: enc-uuid-123',
      );
    });
  });
});
