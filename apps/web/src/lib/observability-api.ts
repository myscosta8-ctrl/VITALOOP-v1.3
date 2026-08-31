export async function postSystemMetric(metricName: string, metricValue: number, tags?: Record<string, string>) {
  const res = await fetch('/api/v1/observability/metrics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ metricName, metricValue, tags }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Erro ao registrar métrica de observabilidade.');
  }
  return res.json();
}

export async function fetchSystemMetrics() {
  const res = await fetch('/api/v1/observability/metrics');
  if (!res.ok) throw new Error('Erro ao consultar métricas de observabilidade.');
  return res.json();
}

export async function fetchDrStatus() {
  const res = await fetch('/api/v1/observability/dr-status');
  if (!res.ok) throw new Error('Erro ao consultar status de Disaster Recovery.');
  return res.json();
}
