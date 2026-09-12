import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '../context/session-context.js';
import { createManagementApi, type ManagementAlertItem } from '../lib/management-api.js';
import { Card, CardContent, CardHeader } from './ui/card.js';
import { Badge } from './ui/badge.js';
import { Button } from './ui/button.js';
import { EmptyState } from './ui/empty-state.js';
import { toast } from '../lib/toast.js';

export const ManagementDashboardPage: React.FC = () => {
  const { api } = useSession();
  const managementApi = createManagementApi(api);
  const queryClient = useQueryClient();

  const dashboardQuery = useQuery({
    queryKey: ['management-dashboard'],
    queryFn: () => managementApi.fetchDashboardData(),
  });

  const data = dashboardQuery.data ?? null;
  const loading = dashboardQuery.isLoading;
  const error = dashboardQuery.isError ? (dashboardQuery.error as Error).message : '';

  const exportCsvMutation = useMutation({
    mutationFn: () => managementApi.exportManagementReportCsv(),
    onSuccess: (csvText) => {
      const blob = new Blob([csvText], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'relatorio_atendimentos_upa.csv';
      a.click();
      toast.success('Relatório CSV gerado e baixado com sucesso!');
    },
    onError: (err: unknown) => toast.error((err as Error).message),
  });

  const ackAlertMutation = useMutation({
    mutationFn: (alertId: string) => managementApi.acknowledgeAlert(alertId),
    onSuccess: () => {
      toast.success('Alerta reconhecido com sucesso.');
      return queryClient.invalidateQueries({ queryKey: ['management-dashboard'] });
    },
    onError: (err: unknown) => toast.error((err as Error).message),
  });

  const handleExportCsv = () => exportCsvMutation.mutate();
  const handleAckAlert = (alertId: string) => ackAlertMutation.mutate(alertId);

  if (loading) {
    return (
      <main>
        <p role="status" data-testid="loading-dashboard" className="text-sm text-muted-foreground">Carregando Dashboard Operacional...</p>
      </main>
    );
  }
  if (error) {
    return (
      <main>
        <div role="alert" data-testid="error-dashboard" className="rounded-md bg-[var(--color-danger-soft)] px-3 py-2 text-sm text-[var(--color-danger)]">{error}</div>
      </main>
    );
  }

  const severityBadgeVariant = (severity: string): 'destructive' | 'warning' | 'secondary' => {
    const s = severity.toLowerCase();
    if (s === 'critical' || s === 'danger') return 'destructive';
    if (s === 'warning') return 'warning';
    return 'secondary';
  };

  return (
    <main aria-labelledby="mgmt-heading" data-testid="management-dashboard">
      <div className="vl-page-head">
        <div>
          <h1 id="mgmt-heading">Gestão Operacional UPA 24h (MGT-001..010)</h1>
        </div>
      </div>

      <Card data-testid="kpis-summary">
        <CardHeader className="text-sm font-semibold text-muted-foreground">Métricas em Tempo Real (MGT-001..005)</CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <p>Atendimentos Ativos: <strong className="font-mono">{data?.summary?.activeEncountersCount}</strong></p>
          <p>Aguardando Triagem: <strong className="font-mono">{data?.summary?.triagePendingCount}</strong></p>
          <p>Aguardando Consulta: <strong className="font-mono">{data?.summary?.consultationPendingCount}</strong></p>
          <p>Ocupação de Leitos: <strong className="font-mono">{data?.summary?.bedOccupancyRate}%</strong> ({data?.summary?.occupiedBedsCount}/{data?.summary?.totalBedsCount})</p>
          <p>Tempo Médio de Permanência (TMP): <strong className="font-mono">{data?.averageTmpHours}h</strong></p>
        </CardContent>
      </Card>

      <Card className="mt-4" data-testid="alerts-section">
        <CardHeader className="text-sm font-semibold text-muted-foreground">Alertas de Sobrecarga e Lotação (MGT-009)</CardHeader>
        <CardContent>
          {data?.alerts?.length === 0 ? (
            <EmptyState className="border-none p-0" title="Nenhum alerta crítico no momento" />
          ) : (
            <ul className="flex flex-col gap-2">
              {data?.alerts?.map((alert: ManagementAlertItem) => (
                <li
                  key={alert.id}
                  data-testid={`alert-item-${alert.id}`}
                  className="flex items-center justify-between gap-2 rounded-md border border-border p-2"
                >
                  <span>
                    <Badge variant={severityBadgeVariant(alert.severity)}>{alert.severity.toUpperCase()}</Badge>{' '}
                    {alert.message}
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => handleAckAlert(alert.id)}>
                    Reconhecer
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="mt-4" data-testid="export-section">
        <CardHeader className="text-sm font-semibold text-muted-foreground">Relatórios Gerenciais (MGT-008)</CardHeader>
        <CardContent>
          <Button onClick={handleExportCsv} data-testid="export-csv-btn">
            Exportar Relatório Atendimentos (CSV)
          </Button>
        </CardContent>
      </Card>
    </main>
  );
};
