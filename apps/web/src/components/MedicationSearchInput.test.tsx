/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MedicationSearchInput } from './MedicationSearchInput.js';

const get = vi.fn();
const post = vi.fn();

const mockApi = { get, post };

vi.mock('../context/session-context.js', () => ({
  useSession: () => ({ api: mockApi }),
}));

describe('MedicationSearchInput Component Tests', () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
  });

  it('renderiza o campo de busca de medicamento', () => {
    render(<MedicationSearchInput onSelect={() => {}} selectedItem={null} />);
    expect(screen.getByPlaceholderText(/Digite o nome ou princípio ativo/i)).toBeInTheDocument();
  });

  it('exibe medicamentos encontrados ao digitar', async () => {
    get.mockResolvedValueOnce([
      { id: '1', code: 'MED-001', name: 'Dipirona 500mg', activeSubstance: 'dipirona', isActive: true },
    ]);

    render(<MedicationSearchInput onSelect={() => {}} selectedItem={null} />);

    const input = screen.getByPlaceholderText(/Digite o nome ou princípio ativo/i);
    fireEvent.change(input, { target: { value: 'Dipirona' } });

    await waitFor(() => {
      expect(screen.getByText(/Dipirona 500mg/i)).toBeInTheDocument();
    });
  });
});
