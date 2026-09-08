// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ObservabilityDashboard } from './ObservabilityDashboard.js';

const get = vi.fn();
const post = vi.fn();

const mockApi = { get, post };

vi.mock('../context/session-context.js', () => ({
  useSession: () => ({ api: mockApi }),
}));

describe('ObservabilityDashboard Component Test (PRD-011..020)', () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
  });

  it('renderiza dashboard de observabilidade, emite telemetria e valida DR ambiental', async () => {
    post.mockResolvedValue({ id: 'm-1' });
    get.mockImplementation((path: string) => {
      if (path === '/api/v1/observability/metrics') {
        return Promise.resolve({
          health: { availabilityPercent: 99.9, avgLatencyMs: 145, isHealthy: true },
          metrics: [],
        });
      }
      if (path === '/api/v1/observability/dr-status') {
        return Promise.resolve({ offsiteBackup: true, rpoMinutes: 15, rtoMinutes: 60 });
      }
      return Promise.reject(new Error(`unexpected GET ${path}`));
    });

    render(<ObservabilityDashboard />);

    expect(screen.getByTestId('observability-dashboard')).toBeTruthy();

    const emitBtn = screen.getByTestId('emit-metric-btn');
    fireEvent.click(emitBtn);
    await waitFor(() => {
      expect(post).toHaveBeenCalledWith('/api/v1/observability/metrics', {
        metricName: 'http_request_duration_ms',
        metricValue: 145,
        tags: { path: '/api/v1/patients' },
      });
    });

    const loadMetricsBtn = screen.getByTestId('load-metrics-btn');
    fireEvent.click(loadMetricsBtn);
    await waitFor(() => {
      expect(get).toHaveBeenCalledWith('/api/v1/observability/metrics');
    });
    expect(screen.getByTestId('health-summary')).toBeTruthy();

    const drBtn = screen.getByTestId('check-dr-btn');
    fireEvent.click(drBtn);
    await waitFor(() => {
      expect(get).toHaveBeenCalledWith('/api/v1/observability/dr-status');
    });
    expect(screen.getByTestId('dr-summary')).toBeTruthy();
  });
});
