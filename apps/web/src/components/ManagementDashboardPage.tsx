import React, { useEffect, useState } from 'react';
import { fetchDashboardData, exportManagementReportCsv, acknowledgeAlert } from '../lib/management-api.js';

interface ManagementAlertItem {
  id: string;
  severity: string;
  message: string;
}

interface DashboardData {
  summary: {
    activeEncountersCount: number;
    triagePendingCount: number;
    consultationPendingCount: number;
    occupiedBedsCount: number;
    totalBedsCount: number;
    bedOccupancyRate: number;
  };
  averageTmpHours: number;
  alerts: ManagementAlertItem[];
}

export const ManagementDashboardPage: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetchDashboardData();
      setData(res.data);
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
      const csvText = await exportManagementReportCsv();
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
      await acknowledgeAlert(alertId);
      setMsg('Alerta reconhecido com sucesso.');
      loadData();
    } catch (err: unknown) {
      setError((err as Error).message);
    }
  };

  if (loading) return <div data-testid="loading-dashboard">Carregando Dashboard Operacional...</div>;
  if (error) return <div data-testid="error-dashboard">{error}</div>;

  return (
    <div data-testid="management-dashboard">
      <h2>Gestão Operacional UPA 24h (MGT-001..010)</h2>
      {msg && <p data-testid="management-msg">{msg}</p>}

      <div data-testid="kpis-summary">
        <h3>Métricas em Tempo Real (MGT-001..005)</h3>
        <p>Atendimentos Ativos: {data?.summary?.activeEncountersCount}</p>
        <p>Aguardando Triagem: {data?.summary?.triagePendingCount}</p>
        <p>Aguardando Consulta: {data?.summary?.consultationPendingCount}</p>
        <p>Ocupação de Leitos: {data?.summary?.bedOccupancyRate}% ({data?.summary?.occupiedBedsCount}/{data?.summary?.totalBedsCount})</p>
        <p>Tempo Médio de Permanência (TMP): {data?.averageTmpHours}h</p>
      </div>

      <div data-testid="alerts-section">
        <h3>Alertas de Sobrecarga e Lotação (MGT-009)</h3>
        {data?.alerts?.length === 0 ? (
          <p>Nenhum alerta crítico no momento.</p>
        ) : (
          <ul>
            {data?.alerts?.map((alert: ManagementAlertItem) => (
              <li key={alert.id} data-testid={`alert-item-${alert.id}`}>
                [{alert.severity.toUpperCase()}] {alert.message}
                <button onClick={() => handleAckAlert(alert.id)}>Reconhecer</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div data-testid="export-section">
        <h3>Relatórios Gerenciais (MGT-008)</h3>
        <button onClick={handleExportCsv} data-testid="export-csv-btn">
          Exportar Relatório Atendimentos (CSV)
        </button>
      </div>
    </div>
  );
};
