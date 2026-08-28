/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MedicalConsultationPage } from './MedicalConsultationPage.js';

const get = vi.fn();
const post = vi.fn();
const patch = vi.fn();

const mockApi = { get, post, patch };

vi.mock('../context/session-context.js', () => ({
  useSession: () => ({ api: mockApi }),
}));

describe('MedicalConsultationPage UI Tests', () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
    patch.mockReset();
  });

  it('renderiza o formulário de consulta médica', async () => {
    get.mockImplementation(async (url: string) => {
      if (url.includes('/triage')) {
        return { riskColor: 'yellow', chiefComplaint: 'Dor de cabeça' };
      }
      if (url.includes('/consultation')) {
        const err = new Error('Not Found');
        (err as unknown as { status: number }).status = 404;
        throw err;
      }
      return {};
    });

    render(<MedicalConsultationPage encounterId="enc-123" />);

    await waitFor(() => {
      expect(screen.getByText(/Consulta Médica de UPA/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Queixa Principal \*/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/História da Moléstia Atual \(HMA\) \*/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Exame Físico Geral \*/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Hipótese Diagnóstica Clínica \*/i)).toBeInTheDocument();
    });
  });

  it('submete a consulta médica com sucesso', async () => {
    get.mockImplementation(async (url: string) => {
      if (url.includes('/triage')) {
        return { riskColor: 'yellow', chiefComplaint: 'Dor de cabeça' };
      }
      if (url.includes('/consultation')) {
        const err = new Error('Not Found');
        (err as unknown as { status: number }).status = 404;
        throw err;
      }
      return {};
    });

    post.mockResolvedValueOnce({
      id: 'cons-1',
      encounterId: 'enc-123',
      patientId: 'pat-1',
      doctorId: 'doc-1',
      chiefComplaint: 'Dor de cabeça',
      historyPresentIllness: 'Paciente com dor de cabeça há 2 horas',
      generalExam: 'BEG',
      diagnosticHypothesis: 'Cefaleia tensional',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    render(<MedicalConsultationPage encounterId="enc-123" />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Queixa Principal \*/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/História da Moléstia Atual \(HMA\) \*/i), {
      target: { value: 'Paciente com dor de cabeça há 2 horas' },
    });
    fireEvent.change(screen.getByLabelText(/Exame Físico Geral \*/i), {
      target: { value: 'BEG' },
    });
    fireEvent.change(screen.getByLabelText(/Hipótese Diagnóstica Clínica \*/i), {
      target: { value: 'Cefaleia tensional' },
    });

    const submitBtn = screen.getByRole('button', { name: /Registrar Consulta Médica/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(post).toHaveBeenCalledWith('/api/v1/encounters/enc-123/consultation', expect.objectContaining({
        chiefComplaint: 'Dor de cabeça',
        historyPresentIllness: 'Paciente com dor de cabeça há 2 horas',
        generalExam: 'BEG',
        diagnosticHypothesis: 'Cefaleia tensional',
      }));
    });
  });
});
