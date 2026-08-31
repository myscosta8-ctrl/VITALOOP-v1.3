// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ObservabilityDashboard } from './ObservabilityDashboard.js';
import * as obsApi from '../lib/observability-api.js';

vi.mock('../lib/observability-api.js', () => ({
  postSystemMetric: vi.fn(),
  fetchSystemMetrics: vi.fn(),
  fetchDrStatus: vi.fn(),
}));

describe('ObservabilityDashboard Component Test (PRD-011..020)', () => {
  it('renderiza dashboard de observabilidade, emite telemetria e valida DR ambiental', async () => {
    vi.mocked(obsApi.postSystemMetric).mockResolvedValue({ data: { id: 'm-1' } });
    vi.mocked(obsApi.fetchSystemMetrics).mockResolvedValue({
      data: {
        health: { availabilityPercent: 99.9, avgLatencyMs: 145, isHealthy: true },
        metrics: [],
      },
    });
    vi.mocked(obsApi.fetchDrStatus).mockResolvedValue({
      data: { offsiteBackup: true, rpoMinutes: 15, rtoMinutes: 60 },
    });

    render(<ObservabilityDashboard />);

    expect(screen.getByTestId('observability-dashboard')).toBeTruthy();

    const emitBtn = screen.getByTestId('emit-metric-btn');
    fireEvent.click(emitBtn);
    await waitFor(() => {
      expect(obsApi.postSystemMetric).toHaveBeenCalledWith('http_request_duration_ms', 145, { path: '/api/v1/patients' });
    });

    const loadMetricsBtn = screen.getByTestId('load-metrics-btn');
    fireEvent.click(loadMetricsBtn);
    await waitFor(() => {
      expect(obsApi.fetchSystemMetrics).toHaveBeenCalled();
    });
    expect(screen.getByTestId('health-summary')).toBeTruthy();

    const drBtn = screen.getByTestId('check-dr-btn');
    fireEvent.click(drBtn);
    await waitFor(() => {
      expect(obsApi.fetchDrStatus).toHaveBeenCalled();
    });
    expect(screen.getByTestId('dr-summary')).toBeTruthy();
  });
});
