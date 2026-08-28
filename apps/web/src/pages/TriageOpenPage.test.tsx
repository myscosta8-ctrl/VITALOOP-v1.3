/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TriageOpenPage } from './TriageOpenPage.js';

const get = vi.fn();
const post = vi.fn();
const patch = vi.fn();

const mockApi = { get, post, patch };

vi.mock('../context/session-context.js', () => ({
  useSession: () => ({ api: mockApi }),
}));

describe('TriageOpenPage UI Tests', () => {
  beforeEach(() => {
    post.mockReset();
  });

  const renderPage = (encounterId = 'enc-123') =>
    render(<TriageOpenPage encounterId={encounterId} />);

  it('renderiza o formulário de triagem e classificação de risco', () => {
    renderPage();
    expect(screen.getByText(/Triagem e Classificação de Risco/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Queixa Principal \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/PA Sistólica/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Classificação de Risco \/ Cor Manchester \*/i)).toBeInTheDocument();
  });

  it('exibe erro ao tentar submeter sem queixa principal', async () => {
    renderPage();
    const form = screen.getByRole('button', { name: /Concluir Triagem/i }).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/A queixa principal é obrigatória/i)).toBeInTheDocument();
    });
  });

  it('submete triagem válida e chama API post', async () => {
    post.mockResolvedValueOnce({
      id: 'tri-123',
      encounterId: 'enc-123',
      chiefComplaint: 'Dor de cabeça forte',
      riskColor: 'yellow',
    });

    renderPage();

    fireEvent.change(screen.getByLabelText(/Queixa Principal \*/i), {
      target: { value: 'Dor de cabeça forte' },
    });
    fireEvent.change(screen.getByLabelText(/PA Sistólica/i), {
      target: { value: '120' },
    });

    const submitBtn = screen.getByRole('button', { name: /Concluir Triagem/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(post).toHaveBeenCalledWith('/api/v1/encounters/enc-123/triage', expect.objectContaining({
        chiefComplaint: 'Dor de cabeça forte',
        vitals: expect.objectContaining({ systolicBp: 120 }),
        riskColor: 'yellow',
      }));
    });
  });
});
