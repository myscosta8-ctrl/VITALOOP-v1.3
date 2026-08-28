/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExamSearchInput } from './ExamSearchInput.js';

const get = vi.fn();
const post = vi.fn();

const mockApi = { get, post };

vi.mock('../context/session-context.js', () => ({
  useSession: () => ({ api: mockApi }),
}));

describe('ExamSearchInput Component Tests', () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
  });

  it('renderiza o campo de busca de exame', () => {
    render(<ExamSearchInput onSelect={() => {}} selectedItem={null} />);
    expect(screen.getByPlaceholderText(/Digite o nome ou código do exame/i)).toBeInTheDocument();
  });

  it('exibe exames encontrados ao digitar', async () => {
    get.mockResolvedValueOnce([
      { id: '1', code: 'EXA-001', name: 'Hemograma Completo', type: 'laboratory', isActive: true },
    ]);

    render(<ExamSearchInput onSelect={() => {}} selectedItem={null} />);

    const input = screen.getByPlaceholderText(/Digite o nome ou código do exame/i);
    fireEvent.change(input, { target: { value: 'Hemograma' } });

    await waitFor(() => {
      expect(screen.getByText(/Hemograma Completo/i)).toBeInTheDocument();
    });
  });
});
