// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ShiftSectorGate } from './ShiftSectorGate.js';

const get = vi.fn();
const post = vi.fn();

const mockApi = { get, post };
let mockIdentity: { roles: string[] } | null = { roles: ['nursing_technician'] };

vi.mock('../context/session-context.js', () => ({
  useSession: () => ({ api: mockApi, identity: mockIdentity }),
}));

const SECTORS = [
  { id: 'sector-1', name: 'Sala Vermelha', code: 'SALA_VERMELHA', capacity: 4, createdAt: '2026-09-01T00:00:00.000Z' },
];

describe('ShiftSectorGate Component Test', () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
    mockIdentity = { roles: ['nursing_technician'] };
  });

  it('pede a escolha de setor pro técnico de enfermagem sem seleção vigente, e libera após confirmar', async () => {
    get.mockImplementation((path: string) => {
      if (path === '/api/v1/shift-sector-selection/me') return Promise.resolve(null);
      if (path === '/api/v1/bed-sectors') return Promise.resolve(SECTORS);
      return Promise.reject(new Error(`unexpected GET ${path}`));
    });
    post.mockResolvedValue({
      area: 'internacao',
      bedSectorId: 'sector-1',
      selectedAt: '2026-09-09T08:00:00.000Z',
      expiresAt: '2026-09-09T20:00:00.000Z',
    });

    render(
      <ShiftSectorGate>
        <p>Conteúdo protegido</p>
      </ShiftSectorGate>,
    );

    await waitFor(() => {
      expect(screen.getByText('Em qual setor você está hoje?')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Área'), { target: { value: 'internacao' } });
    fireEvent.change(screen.getByLabelText('Setor'), { target: { value: 'sector-1' } });
    fireEvent.click(screen.getByRole('button', { name: /Confirmar e entrar/i }));

    await waitFor(() => {
      expect(post).toHaveBeenCalledWith('/api/v1/shift-sector-selection', {
        area: 'internacao',
        bedSectorId: 'sector-1',
      });
    });

    expect(await screen.findByText('Conteúdo protegido')).toBeInTheDocument();
  });

  it('libera direto quem não é técnico de enfermagem, sem chamar a API', () => {
    mockIdentity = { roles: ['doctor'] };

    render(
      <ShiftSectorGate>
        <p>Conteúdo protegido</p>
      </ShiftSectorGate>,
    );

    expect(screen.getByText('Conteúdo protegido')).toBeInTheDocument();
    expect(get).not.toHaveBeenCalled();
  });
});
