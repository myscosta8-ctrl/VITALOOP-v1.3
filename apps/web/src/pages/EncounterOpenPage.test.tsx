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
    get.mockReset();
    post.mockReset();
  });

  it('renderiza a etapa de identificação do paciente (recepção real, não só um ID colado)', () => {
    render(<EncounterOpenPage />);
    expect(screen.getByText('Recepção — Abertura de Atendimento (UPA 24h)')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Buscar por nome ou CPF/i)).toBeInTheDocument();
    expect(screen.getByText(/Cadastrar Novo Paciente/i)).toBeInTheDocument();
  });

  it('busca paciente existente, seleciona e abre o atendimento com motivo da visita', async () => {
    const mockPatient = {
      id: 'pat-uuid-123',
      medicalRecordNumber: 'MRN-001',
      fullName: 'Maria da Silva',
      birthDate: '1990-01-01',
    };
    const mockCreated = {
      id: 'enc-uuid-123',
      patientId: 'pat-uuid-123',
      encounterType: 'urgency',
      origin: 'spontaneous',
      chiefComplaint: 'Febre alta',
      status: 'created',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    get.mockResolvedValueOnce([mockPatient]);
    post.mockResolvedValueOnce(mockCreated);

    render(<EncounterOpenPage />);

    fireEvent.change(screen.getByPlaceholderText(/Buscar por nome ou CPF/i), {
      target: { value: 'Maria' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^Buscar$/i }));

    await waitFor(() => expect(screen.getByText('Maria da Silva')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /Usar este paciente/i }));

    await waitFor(() => expect(screen.getByText(/Abertura do Atendimento/i)).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText(/dor abdominal, febre, trauma/i), {
      target: { value: 'Febre alta' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Abrir Atendimento/i }));

    await waitFor(() => {
      expect(post).toHaveBeenCalledWith('/api/v1/encounters', {
        patientId: 'pat-uuid-123',
        encounterType: 'urgency',
        origin: 'spontaneous',
        chiefComplaint: 'Febre alta',
      });
    });
  });
});
