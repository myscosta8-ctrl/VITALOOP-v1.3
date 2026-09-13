// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NursingSaeView } from './NursingSaeView.js';

const get = vi.fn().mockResolvedValue([]);
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
    await waitFor(() => expect(screen.getByTestId('scale-tab-braden')).toBeDefined());

    // Preenche as 6 subescalas de Braden e aplica.
    fireEvent.change(screen.getByTestId('scale-field-sensory'), { target: { value: '2' } });
    fireEvent.change(screen.getByTestId('scale-field-moisture'), { target: { value: '2' } });
    fireEvent.change(screen.getByTestId('scale-field-activity'), { target: { value: '2' } });
    fireEvent.change(screen.getByTestId('scale-field-mobility'), { target: { value: '2' } });
    fireEvent.change(screen.getByTestId('scale-field-nutrition'), { target: { value: '2' } });
    fireEvent.change(screen.getByTestId('scale-field-friction'), { target: { value: '1' } });

    fireEvent.click(screen.getByTestId('apply-braden-btn'));
    const msg = await screen.findByTestId('sae-msg');
    expect(msg.textContent).toContain('aplicada. Escore: 11');
  });
});
