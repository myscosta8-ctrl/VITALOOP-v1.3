/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueueDashboardPage } from './QueueDashboardPage.js';

const get = vi.fn();
const post = vi.fn();
const patch = vi.fn();

const mockApi = { get, post, patch };

vi.mock('../context/session-context.js', () => ({
  useSession: () => ({ api: mockApi }),
}));

describe('QueueDashboardPage UI Tests', () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
    patch.mockReset();
  });

  it('renderiza o painel de filas assistenciais e lista de senhas', async () => {
    get.mockImplementation(async (url: string) => {
      if (url === '/api/v1/queues') {
        return [{ id: 'q-1', name: 'Fila de Atendimento Médico', queueType: 'medical', isActive: true }];
      }
      if (url.includes('/tickets')) {
        return [
          {
            id: 'tck-1',
            queueId: 'q-1',
            encounterId: 'enc-1',
            patientId: 'pat-1',
            ticketNumber: 'SENHA-A01',
            priorityScore: 6000,
            riskColor: 'yellow',
            status: 'waiting',
            callCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ];
      }
      return [];
    });

    render(<QueueDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/Painel de Gestão e Chamada de Filas/i)).toBeInTheDocument();
      expect(screen.getByText('SENHA-A01')).toBeInTheDocument();
      expect(screen.getByText(/Amarelo \(Urgente\)/i)).toBeInTheDocument();
    });
  });

  it('chama o paciente para o consultório ao clicar em Chamar', async () => {
    get.mockImplementation(async (url: string) => {
      if (url === '/api/v1/queues') {
        return [{ id: 'q-1', name: 'Fila de Atendimento Médico', queueType: 'medical', isActive: true }];
      }
      if (url.includes('/tickets')) {
        return [
          {
            id: 'tck-1',
            queueId: 'q-1',
            encounterId: 'enc-1',
            patientId: 'pat-1',
            ticketNumber: 'SENHA-A01',
            priorityScore: 6000,
            riskColor: 'yellow',
            status: 'waiting',
            callCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ];
      }
      return [];
    });

    post.mockResolvedValueOnce({
      id: 'tck-1',
      status: 'called',
      callRoom: 'Consultório 01',
      callCount: 1,
    });

    render(<QueueDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('SENHA-A01')).toBeInTheDocument();
    });

    const callBtn = screen.getByRole('button', { name: /Chamar/i });
    fireEvent.click(callBtn);

    await waitFor(() => {
      expect(post).toHaveBeenCalledWith('/api/v1/queues/tickets/tck-1/call', {
        callRoom: 'Consultório 01',
      });
    });
  });
});
