// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FluidBalanceModal } from './FluidBalanceModal.js';

const get = vi.fn();
const post = vi.fn();

const mockApi = { get, post };

vi.mock('../context/session-context.js', () => ({
  useSession: () => ({ api: mockApi }),
}));

const PERIOD = {
  id: 'period-1',
  encounterId: 'enc-123',
  patientId: 'pat-456',
  balanceNumber: 1,
  status: 'open',
  referenceDate: '2026-09-07',
  periodStart: '2026-09-07T07:00:00.000Z',
  createdBy: 'user-1',
  createdAt: '2026-09-07T07:00:00.000Z',
  updatedAt: '2026-09-07T07:00:00.000Z',
};

const PERIOD_DETAIL = {
  ...PERIOD,
  entries: [],
  totals: { totalGainMl: 0, totalLossMl: 0, netBalanceMl: 0 },
};

describe('FluidBalanceModal Component Test', () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
  });

  it('cria/carrega o período corrente, lança um item e atualiza os totais', async () => {
    post.mockImplementation((path: string) => {
      if (path === '/api/v1/encounters/enc-123/fluid-balance/periods') {
        return Promise.resolve(PERIOD);
      }
      if (path === '/api/v1/fluid-balance/periods/period-1/entries') {
        return Promise.resolve({
          id: 'entry-1',
          periodId: 'period-1',
          direction: 'gain',
          itemName: 'Soro Fisiológico 0,9%',
          volumeMl: 200,
          entryDate: '2026-09-07',
          entryHour: 14,
          entryMinute: 0,
          recordedBy: 'user-1',
          createdAt: '2026-09-07T14:00:00.000Z',
        });
      }
      return Promise.reject(new Error(`unexpected POST ${path}`));
    });

    get.mockImplementation((path: string) => {
      if (path === '/api/v1/fluid-balance/periods/period-1') {
        return Promise.resolve(PERIOD_DETAIL);
      }
      if (path === '/api/v1/encounters/enc-123/fluid-balance/periods') {
        return Promise.resolve([{ ...PERIOD, totals: { totalGainMl: 0, totalLossMl: 0, netBalanceMl: 0 } }]);
      }
      return Promise.reject(new Error(`unexpected GET ${path}`));
    });

    render(<FluidBalanceModal encounterId="enc-123" />);

    await waitFor(() => {
      expect(screen.getByTestId('fluid-balance-header').textContent).toContain('Balanço Hídrico: 1');
    });

    fireEvent.change(screen.getByTestId('item-name-input'), { target: { value: 'Soro Fisiológico 0,9%' } });
    fireEvent.change(screen.getByTestId('volume-input'), { target: { value: '200' } });

    fireEvent.click(screen.getByTestId('add-entry-btn'));

    await waitFor(() => {
      expect(post).toHaveBeenCalledWith(
        '/api/v1/fluid-balance/periods/period-1/entries',
        expect.objectContaining({ direction: 'gain', itemName: 'Soro Fisiológico 0,9%', volumeMl: 200 }),
      );
    });

    expect(screen.getByTestId('fluid-balance-msg').textContent).toContain('Lançamento registrado com sucesso!');
  });
});
