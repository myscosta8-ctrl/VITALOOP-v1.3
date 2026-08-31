import React, { useState, useEffect } from 'react';
import { fetchSecurityHardeningStatus, sendSecurityAlertEvent } from '../lib/security-api.js';

export const SecurityHardeningPanel: React.FC = () => {
  const [status, setStatus] = useState<Record<string, boolean> | null>(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetchSecurityHardeningStatus()
      .then((res) => setStatus(res.data))
      .catch((err: Error) => setMsg(err.message));
  }, []);

  const handleTestAlert = async () => {
    try {
      const res = await sendSecurityAlertEvent('IDOR_ATTEMPT', 'WARNING', '/api/v1/patients/pat-9999', 'Tentativa não autorizada');
      setMsg(`Alerta de segurança registrado no banco com sucesso! ID: ${res.data.id}`);
    } catch (err: unknown) {
      setMsg((err as Error).message);
    }
  };

  return (
    <div data-testid="security-hardening-panel">
      <h2>Painel de Segurança Técnica e Hardening (SEC-T-001..011)</h2>
      {msg && <p data-testid="security-status-msg">{msg}</p>}

      {status ? (
        <ul data-testid="security-checklist">
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
        <p>Carregando status de segurança...</p>
      )}

      <button type="button" onClick={handleTestAlert} data-testid="test-alert-btn">
        Registrar Alerta de Auditoria Técnica
      </button>
    </div>
  );
};
