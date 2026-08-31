export async function fetchSecurityHardeningStatus() {
  const res = await fetch('/api/v1/security/hardening-status');
  if (!res.ok) throw new Error('Erro ao buscar status de segurança técnica.');
  return res.json();
}

export async function sendSecurityAlertEvent(eventType: string, severity: 'INFO' | 'WARNING' | 'CRITICAL', endpoint: string, payloadSummary?: string) {
  const res = await fetch('/api/v1/security/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventType, severity, endpoint, payloadSummary }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Erro ao registrar evento de segurança.');
  }
  return res.json();
}

export async function exportLgpdPatientReport(patientId: string) {
  const res = await fetch(`/api/v1/lgpd/patients/${patientId}/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Erro ao gerar extrato LGPD de dados pessoais.');
  }
  return res.json();
}

export async function fetchLgpdRetentionPolicies() {
  const res = await fetch('/api/v1/lgpd/retention-policies');
  if (!res.ok) throw new Error('Erro ao buscar políticas de retenção legal.');
  return res.json();
}
