/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CidSearchInput } from './CidSearchInput.js';

const get = vi.fn();
const post = vi.fn();
const patch = vi.fn();

const mockApi = { get, post, patch };

vi.mock('../context/session-context.js', () => ({
  useSession: () => ({ api: mockApi }),
}));

describe('CidSearchInput Component Tests', () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
    patch.mockReset();
  });

  it('renderiza o campo de busca de CID-10', () => {
    render(<CidSearchInput onSelect={() => {}} selectedItem={null} />);
    expect(screen.getByPlaceholderText(/Digite o código \(ex: J18.9\)/i)).toBeInTheDocument();
  });

  it('exibe resultados ao digitar', async () => {
    get.mockResolvedValueOnce([
      { code: 'J18.9', description: 'Pneumonia não especificada', isActive: true },
    ]);

    render(<CidSearchInput onSelect={() => {}} selectedItem={null} />);

    const input = screen.getByPlaceholderText(/Digite o código \(ex: J18.9\)/i);
    fireEvent.change(input, { target: { value: 'J18' } });

    await waitFor(() => {
      expect(screen.getByText(/Pneumonia não especificada/i)).toBeInTheDocument();
    });
  });

  it('exibe item selecionado e permite trocar', () => {
    const handleClear = vi.fn();
    render(
      <CidSearchInput
        onSelect={() => {}}
        selectedItem={{ code: 'J18.9', description: 'Pneumonia não especificada', isActive: true }}
        onClear={handleClear}
      />,
    );

    expect(screen.getByText(/\[J18.9\]/i)).toBeInTheDocument();
    expect(screen.getByText(/Pneumonia não especificada/i)).toBeInTheDocument();

    const clearBtn = screen.getByRole('button', { name: /Trocar/i });
    fireEvent.click(clearBtn);
    expect(handleClear).toHaveBeenCalled();
  });
});
