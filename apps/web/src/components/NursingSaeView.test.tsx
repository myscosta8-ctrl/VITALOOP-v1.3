// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NursingSaeView } from './NursingSaeView.js';

vi.mock('../lib/nursing-sae-api.js', () => ({
  createNursingSae: vi.fn().mockResolvedValue({ status: 'success' }),
  applyNursingScale: vi.fn().mockResolvedValue({ data: { total_score: 11, risk_level: 'high' } }),
  recordFluidBalance: vi.fn().mockResolvedValue({ status: 'success' }),
  insertInvasiveDevice: vi.fn().mockResolvedValue({ status: 'success' }),
}));

describe('NursingSaeView Component', () => {
  it('renderiza o formulário de SAE, escalas, balanço e dispositivos', async () => {
    render(<NursingSaeView encounterId="encounter-123" />);

    expect(screen.getByTestId('nursing-sae-view')).toBeDefined();
    expect(screen.getByTestId('apply-braden-btn')).toBeDefined();

    fireEvent.click(screen.getByTestId('apply-braden-btn'));
    const msg = await screen.findByTestId('sae-msg');
    expect(msg.textContent).toContain('Escala de Braden aplicada. Escore: 11 (Risco: high)');
  });
});
