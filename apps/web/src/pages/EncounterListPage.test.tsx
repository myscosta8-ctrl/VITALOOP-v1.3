/** @vitest-environment jsdom */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { EncounterListPage } from './EncounterListPage.js';
import type { Encounter } from '../lib/encounters-api.js';

const get = vi.fn();
const post = vi.fn();
const patch = vi.fn();

const mockApi = { get, post, patch };

vi.mock('../context/session-context.js', () => ({
  useSession: () => ({ api: mockApi }),
}));

describe('EncounterListPage UI Component', () => {
  const mockEncounters: Encounter[] = [
    {
      id: 'enc-uuid-1',
      patientId: 'pat-uuid-12345678',
      institutionId: 'inst-1',
      encounterType: 'urgency',
      origin: 'spontaneous',
      chiefComplaint: 'Dor no peito',
      status: 'created',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    get.mockReset();
    patch.mockReset();
  });

  it('carrega e lista os atendimentos', async () => {
    get.mockResolvedValue(mockEncounters);

    render(<EncounterListPage />);

    expect(await screen.findByText('Atendimentos abertos (UPA 24h)')).toBeInTheDocument();
    expect(await screen.findByText('Dor no peito')).toBeInTheDocument();
    expect(screen.getByText('created')).toBeInTheDocument();
  });

  it('abre o modal e atualiza o status do atendimento', async () => {
    get.mockResolvedValue(mockEncounters);
    patch.mockResolvedValueOnce({
      ...mockEncounters[0]!,
      status: 'triage_pending',
    });

    const user = userEvent.setup();
    render(<EncounterListPage />);

    const advanceBtn = await screen.findByText('Avançar Status');
    await user.click(advanceBtn);

    expect(await screen.findByText('Alterar Status do Atendimento')).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: /Confirmar Alteração/i });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(patch).toHaveBeenCalledWith('/api/v1/encounters/enc-uuid-1/status', {
        status: 'triage_pending',
        cancelReason: null,
        postConsultationDetail: null,
        expectedUpdatedAt: mockEncounters[0]!.updatedAt,
      });
    });
  });
});
