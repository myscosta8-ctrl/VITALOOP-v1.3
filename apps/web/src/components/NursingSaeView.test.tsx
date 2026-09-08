// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NursingSaeView } from './NursingSaeView.js';

const get = vi.fn();
const post = vi.fn().mockResolvedValue({ status: 'success' });

const mockApi = { get, post };

vi.mock('../context/session-context.js', () => ({
  useSession: () => ({ api: mockApi }),
}));

describe('NursingSaeView Component', () => {
  it('renderiza o formulário de SAE, escalas, balanço e dispositivos', async () => {
    post.mockImplementation((path: string) => {
      if (path.endsWith('/nursing/scales')) {
        return Promise.resolve({ total_score: 11, risk_level: 'high' });
      }
      return Promise.resolve({ status: 'success' });
    });

    render(<NursingSaeView encounterId="encounter-123" />);

    expect(screen.getByTestId('nursing-sae-view')).toBeDefined();
    expect(screen.getByTestId('apply-braden-btn')).toBeDefined();

    fireEvent.click(screen.getByTestId('apply-braden-btn'));
    const msg = await screen.findByTestId('sae-msg');
    expect(msg.textContent).toContain('Escala de Braden aplicada. Escore: 11 (Risco: high)');
  });
});
