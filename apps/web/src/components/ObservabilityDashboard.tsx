import React, { useState } from 'react';
import { fetchSystemMetrics, fetchDrStatus, postSystemMetric } from '../lib/observability-api.js';

export const ObservabilityDashboard: React.FC = () => {
  const [healthData, setHealthData] = useState<{ availabilityPercent?: number; avgLatencyMs?: number; isHealthy?: boolean } | null>(null);
  const [drInfo, setDrInfo] = useState<{ offsiteBackup?: boolean; rpoMinutes?: number; rtoMinutes?: number } | null>(null);
  const [msg, setMsg] = useState('');

  const handleLoadMetrics = async () => {
    try {
      const res = await fetchSystemMetrics();
      setHealthData(res.data.health);
      setMsg('Métricas de observabilidade carregadas com sucesso!');
    } catch (err: unknown) {
      setMsg((err as Error).message);
    }
  };

  const handleEmitMetric = async () => {
    try {
      await postSystemMetric('http_request_duration_ms', 145, { path: '/api/v1/patients' });
      setMsg('Métrica de telemetria emitida com sucesso!');
    } catch (err: unknown) {
      setMsg((err as Error).message);
    }
  };

  const handleCheckDr = async () => {
    try {
      const res = await fetchDrStatus();
      setDrInfo(res.data);
      setMsg('Status de Disaster Recovery ambiental validado!');
    } catch (err: unknown) {
      setMsg((err as Error).message);
    }
  };

  return (
    <div data-testid="observability-dashboard">
      <h2>Dashboard de Observabilidade, Telemetria & DR Ambiental (PRD-011..020)</h2>
      {msg && <p data-testid="obs-status-msg">{msg}</p>}

      <section>
        <h3>1. Métricas & Saúde Operacional (PRD-015, PRD-019)</h3>
        <button type="button" onClick={handleEmitMetric} data-testid="emit-metric-btn">
          Emitir Telemetria de Latência
        </button>
        <button type="button" onClick={handleLoadMetrics} data-testid="load-metrics-btn" style={{ marginLeft: '10px' }}>
          Consultar Métricas
        </button>

        {healthData && (
          <div data-testid="health-summary">
            <p><strong>Disponibilidade:</strong> {healthData.availabilityPercent}%</p>
            <p><strong>Latência Média:</strong> {healthData.avgLatencyMs} ms</p>
            <p><strong>Status de Saúde:</strong> {healthData.isHealthy ? ' SAUDÁVEL' : ' ATENÇÃO'}</p>
          </div>
        )}
      </section>

      <section style={{ marginTop: '15px' }}>
        <h3>2. Disaster Recovery Ambiental (PRD-011..014, PRD-020)</h3>
        <button type="button" onClick={handleCheckDr} data-testid="check-dr-btn">
          Validar DR Ambiental & Retenção
        </button>

        {drInfo && (
          <div data-testid="dr-summary">
            <p><strong>Backup Off-site:</strong> {drInfo.offsiteBackup ? 'SIM' : 'NÃO'}</p>
            <p><strong>RPO Alvo:</strong> {drInfo.rpoMinutes} minutos</p>
            <p><strong>RTO Alvo:</strong> {drInfo.rtoMinutes} minutos</p>
          </div>
        )}
      </section>
    </div>
  );
};
