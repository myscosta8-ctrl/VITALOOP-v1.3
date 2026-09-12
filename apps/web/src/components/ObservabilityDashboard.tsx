import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useSession } from '../context/session-context.js';
import { createObservabilityApi } from '../lib/observability-api.js';
import { Card, CardContent, CardHeader } from './ui/card.js';
import { Button } from './ui/button.js';

export const ObservabilityDashboard: React.FC = () => {
  const { api } = useSession();
  const observabilityApi = createObservabilityApi(api);

  const [msg, setMsg] = useState('');

  const loadMetricsMutation = useMutation({
    mutationFn: () => observabilityApi.fetchSystemMetrics(),
    onSuccess: () => setMsg('Métricas de observabilidade carregadas com sucesso!'),
    onError: (err: unknown) => setMsg((err as Error).message),
  });

  const emitMetricMutation = useMutation({
    mutationFn: () => observabilityApi.postSystemMetric('http_request_duration_ms', 145, { path: '/api/v1/patients' }),
    onSuccess: () => setMsg('Métrica de telemetria emitida com sucesso!'),
    onError: (err: unknown) => setMsg((err as Error).message),
  });

  const checkDrMutation = useMutation({
    mutationFn: () => observabilityApi.fetchDrStatus(),
    onSuccess: () => setMsg('Status de Disaster Recovery ambiental validado!'),
    onError: (err: unknown) => setMsg((err as Error).message),
  });

  const healthData = loadMetricsMutation.data?.health ?? null;
  const drInfo = checkDrMutation.data ?? null;

  const handleLoadMetrics = () => loadMetricsMutation.mutate();
  const handleEmitMetric = () => emitMetricMutation.mutate();
  const handleCheckDr = () => checkDrMutation.mutate();

  return (
    <div data-testid="observability-dashboard">
      <h2>Dashboard de Observabilidade, Telemetria & DR Ambiental (PRD-011..020)</h2>
      {msg && <p data-testid="obs-status-msg" className="mb-3 text-sm text-muted-foreground">{msg}</p>}

      <Card>
        <CardHeader className="text-sm font-semibold text-muted-foreground">1. Métricas & Saúde Operacional (PRD-015, PRD-019)</CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={handleEmitMetric} data-testid="emit-metric-btn">
              Emitir Telemetria de Latência
            </Button>
            <Button type="button" variant="secondary" onClick={handleLoadMetrics} data-testid="load-metrics-btn">
              Consultar Métricas
            </Button>
          </div>

          {healthData && (
            <div data-testid="health-summary" className="mt-3 space-y-1 text-sm">
              <p><strong>Disponibilidade:</strong> {healthData.availabilityPercent}%</p>
              <p><strong>Latência Média:</strong> {healthData.avgLatencyMs} ms</p>
              <p><strong>Status de Saúde:</strong> {healthData.isHealthy ? ' SAUDÁVEL' : ' ATENÇÃO'}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader className="text-sm font-semibold text-muted-foreground">2. Disaster Recovery Ambiental (PRD-011..014, PRD-020)</CardHeader>
        <CardContent>
          <Button type="button" onClick={handleCheckDr} data-testid="check-dr-btn">
            Validar DR Ambiental & Retenção
          </Button>

          {drInfo && (
            <div data-testid="dr-summary" className="mt-3 space-y-1 text-sm">
              <p><strong>Backup Off-site:</strong> {drInfo.offsiteBackup ? 'SIM' : 'NÃO'}</p>
              <p><strong>RPO Alvo:</strong> {drInfo.rpoMinutes} minutos</p>
              <p><strong>RTO Alvo:</strong> {drInfo.rtoMinutes} minutos</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
