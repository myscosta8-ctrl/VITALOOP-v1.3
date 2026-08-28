export async function fetchDashboardData() {
  const res = await fetch('/api/v1/management/dashboard');
  if (!res.ok) throw new Error('Erro ao carregar dashboard gerencial.');
  return res.json();
}

export async function fetchManagementAlerts() {
  const res = await fetch('/api/v1/management/alerts');
  if (!res.ok) throw new Error('Erro ao buscar alertas de sobrecarga.');
  return res.json();
}

export async function acknowledgeAlert(alertId: string) {
  const res = await fetch(`/api/v1/management/alerts/${alertId}/acknowledge`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Erro ao reconhecer alerta gerencial.');
  return res.json();
}

export async function exportManagementReportCsv() {
  const res = await fetch('/api/v1/management/reports/export?format=csv');
  if (!res.ok) throw new Error('Erro ao exportar relatório em CSV.');
  return res.text();
}
