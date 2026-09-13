import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useSession } from '../context/session-context.js';
import { createSecurityApi } from '../lib/security-api.js';
import { Card, CardContent } from './ui/card.js';
import { Button } from './ui/button.js';

export const SecurityHardeningPanel: React.FC = () => {
  const { api } = useSession();
  const securityApi = createSecurityApi(api);

  const [alertMsg, setAlertMsg] = useState('');

  const statusQuery = useQuery({
    queryKey: ['security-hardening-status'],
    queryFn: () => securityApi.fetchSecurityHardeningStatus(),
  });

  const status = statusQuery.data ?? null;

  const testAlertMutation = useMutation({
    mutationFn: () => securityApi.sendSecurityAlertEvent('IDOR_ATTEMPT', 'WARNING', '/api/v1/patients/pat-9999', 'Tentativa não autorizada'),
    onSuccess: (res) => setAlertMsg(`Alerta de segurança registrado no banco com sucesso! ID: ${res.id}`),
    onError: (err: unknown) => setAlertMsg((err as Error).message),
  });

  const handleTestAlert = () => testAlertMutation.mutate();

  const msg = alertMsg || (statusQuery.isError ? (statusQuery.error as Error).message : '');

  return (
    <div data-testid="security-hardening-panel">
      <h2>Painel de Segurança Técnica e Hardening (SEC-T-001..011)</h2>
      {msg && <p data-testid="security-status-msg" className="mb-3 text-sm text-muted-foreground">{msg}</p>}

      <Card>
        <CardContent>
          {status ? (
            <ul data-testid="security-checklist" className="list-disc space-y-1 pl-5 text-sm">
              <li>Proteção IDOR / BOLA: {status.idorProtection ? 'ATIVO' : 'INATIVO'}</li>
              <li>Proteção Escalonamento de Privilégios: {status.privilegeEscalationProtection ? 'ATIVO' : 'INATIVO'}</li>
              <li>Inviolabilidade RLS: {status.rlsEnforcement ? 'ATIVO' : 'INATIVO'}</li>
              <li>Verificação Granular RBAC: {status.rbacEnforcement ? 'ATIVO' : 'INATIVO'}</li>
              <li>Sanitização contra SQL Injection: {status.sqliProtection ? 'ATIVO' : 'INATIVO'}</li>
              <li>Proteção XSS e Escape HTML: {status.xssSanitizer ? 'ATIVO' : 'INATIVO'}</li>
              <li>CORS Restritivo: {status.corsRestricted ? 'ATIVO' : 'INATIVO'}</li>
              <li>Cabeçalhos de Segurança HTTP (HSTS, CSP): {status.securityHeaders ? 'ATIVO' : 'INATIVO'}</li>
              <li>Redação de Secrets e Logs Sanitizados: {status.logsMasked ? 'ATIVO' : 'INATIVO'}</li>
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Carregando status de segurança...</p>
          )}

          <Button type="button" className="mt-4" onClick={handleTestAlert} data-testid="test-alert-btn">
            Registrar Alerta de Auditoria Técnica
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
