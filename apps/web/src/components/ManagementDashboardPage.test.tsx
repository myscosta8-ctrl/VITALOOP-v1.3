// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ManagementDashboardPage } from './ManagementDashboardPage.js';

const get = vi.fn();
const post = vi.fn();
const getText = vi.fn();

const mockApi = { get, post, getText };

vi.mock('../context/session-context.js', () => ({
  useSession: () => ({ api: mockApi }),
}));

describe('ManagementDashboardPage Component Test (MGT-001..010)', () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
    getText.mockReset();
  });

  it('carrega e exibe KPIs operacionais e alertas gerenciais', async () => {
    get.mockResolvedValue({
      summary: {
        activeEncountersCount: 12,
        triagePendingCount: 3,
        consultationPendingCount: 5,
        occupiedBedsCount: 8,
        totalBedsCount: 10,
        bedOccupancyRate: 80,
      },
      averageTmpHours: 4.2,
      alerts: [
        {
          id: 'alert-1',
          severity: 'warning',
          message: 'Fila de espera excedendo limiar normal',
        },
      ],
    });

    render(<ManagementDashboardPage />);

    expect(screen.getByTestId('loading-dashboard')).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByTestId('management-dashboard')).toBeTruthy();
    });

    expect(screen.getByText('Gestão Operacional UPA 24h (MGT-001..010)')).toBeTruthy();
    expect(screen.getByTestId('kpis-summary').textContent).toContain('Atendimentos Ativos: 12');
    expect(screen.getByTestId('kpis-summary').textContent).toContain('Ocupação de Leitos: 80%');

    // Teste do botão de exportação CSV
    getText.mockResolvedValue('Header1;Header2\nValue1;Value2');
    window.URL.createObjectURL = vi.fn().mockReturnValue('blob:http://localhost/123');

    const exportBtn = screen.getByTestId('export-csv-btn');
    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(getText).toHaveBeenCalledWith('/api/v1/management/reports/export?format=csv');
    });
  });
});
