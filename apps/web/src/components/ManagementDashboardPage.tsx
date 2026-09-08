import React, { useEffect, useState } from 'react';
import { useSession } from '../context/session-context.js';
import { createManagementApi, type DashboardData, type ManagementAlertItem } from '../lib/management-api.js';

export const ManagementDashboardPage: React.FC = () => {
  const { api } = useSession();
  const managementApi = createManagementApi(api);

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await managementApi.fetchDashboardData();
      setData(res);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleExportCsv = async () => {
    try {
      const csvText = await managementApi.exportManagementReportCsv();
      const blob = new Blob([csvText], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'relatorio_atendimentos_upa.csv';
      a.click();
      setMsg('Relatório CSV gerado e baixado com sucesso!');
    } catch (err: unknown) {
      setError((err as Error).message);
    }
  };

  const handleAckAlert = async (alertId: string) => {
    try {
      await managementApi.acknowledgeAlert(alertId);
      setMsg('Alerta reconhecido com sucesso.');
      loadData();
    } catch (err: unknown) {
      setError((err as Error).message);
    }
  };

  if (loading) {
    return (
      <main>
        <p role="status" data-testid="loading-dashboard">Carregando Dashboard Operacional...</p>
      </main>
    );
  }
  if (error) {
    return (
      <main>
        <div role="alert" data-testid="error-dashboard">{error}</div>
      </main>
    );
  }

  const severityBadgeClass = (severity: string): string => {
    const s = severity.toLowerCase();
    if (s === 'critical' || s === 'danger') return 'vl-badge-danger';
    if (s === 'warning') return 'vl-badge-warning';
    return 'vl-badge-info';
  };

  return (
    <main aria-labelledby="mgmt-heading" data-testid="management-dashboard">
      <div className="vl-page-head">
        <div>
          <h1 id="mgmt-heading">Gestão Operacional UPA 24h (MGT-001..010)</h1>
        </div>
      </div>
      {msg && <p role="status" data-testid="management-msg">{msg}</p>}

      <div className="vl-panel" data-testid="kpis-summary">
        <div className="vl-panel-head">
          <h2>Métricas em Tempo Real (MGT-001..005)</h2>
        </div>
        <div className="vl-panel-body">
          <p>Atendimentos Ativos: <strong className="vl-mono">{data?.summary?.activeEncountersCount}</strong></p>
          <p>Aguardando Triagem: <strong className="vl-mono">{data?.summary?.triagePendingCount}</strong></p>
          <p>Aguardando Consulta: <strong className="vl-mono">{data?.summary?.consultationPendingCount}</strong></p>
          <p>Ocupação de Leitos: <strong className="vl-mono">{data?.summary?.bedOccupancyRate}%</strong> ({data?.summary?.occupiedBedsCount}/{data?.summary?.totalBedsCount})</p>
          <p>Tempo Médio de Permanência (TMP): <strong className="vl-mono">{data?.averageTmpHours}h</strong></p>
        </div>
      </div>

      <div className="vl-panel" data-testid="alerts-section" style={{ marginTop: 'var(--space-4)' }}>
        <div className="vl-panel-head">
          <h2>Alertas de Sobrecarga e Lotação (MGT-009)</h2>
        </div>
        <div className="vl-panel-body">
          {data?.alerts?.length === 0 ? (
            <p role="status">Nenhum alerta crítico no momento.</p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {data?.alerts?.map((alert: ManagementAlertItem) => (
                <li
                  key={alert.id}
                  data-testid={`alert-item-${alert.id}`}
                  className="vl-row-actions"
                  style={{ alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <span>
                    <span className={`vl-badge ${severityBadgeClass(alert.severity)}`}>{alert.severity.toUpperCase()}</span>{' '}
                    {alert.message}
                  </span>
                  <button className="vl-btn-sm vl-btn-ghost" onClick={() => handleAckAlert(alert.id)}>
                    Reconhecer
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="vl-panel" data-testid="export-section" style={{ marginTop: 'var(--space-4)' }}>
        <div className="vl-panel-head">
          <h2>Relatórios Gerenciais (MGT-008)</h2>
        </div>
        <div className="vl-panel-body">
          <button onClick={handleExportCsv} data-testid="export-csv-btn">
            Exportar Relatório Atendimentos (CSV)
          </button>
        </div>
      </div>
    </main>
  );
};
