// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SecurityHardeningPanel } from './SecurityHardeningPanel.js';
import * as secApi from '../lib/security-api.js';

vi.mock('../lib/security-api.js', () => ({
  fetchSecurityHardeningStatus: vi.fn(),
  sendSecurityAlertEvent: vi.fn(),
}));

describe('SecurityHardeningPanel Component Test (SEC-T-001..011)', () => {
  it('renderiza painel de segurança técnica, exibe checklist e registra alerta de auditoria', async () => {
    vi.mocked(secApi.fetchSecurityHardeningStatus).mockResolvedValue({
      data: {
        idorProtection: true,
        privilegeEscalationProtection: true,
        rlsEnforcement: true,
        rbacEnforcement: true,
        sqliProtection: true,
        xssSanitizer: true,
        corsRestricted: true,
        securityHeaders: true,
        logsMasked: true,
      },
    });

    vi.mocked(secApi.sendSecurityAlertEvent).mockResolvedValue({
      data: { id: 'evt-123', eventType: 'IDOR_ATTEMPT' },
    });

    render(<SecurityHardeningPanel />);

    expect(screen.getByTestId('security-hardening-panel')).toBeTruthy();
    expect(screen.getByText('Painel de Segurança Técnica e Hardening (SEC-T-001..011)')).toBeTruthy();

    await waitFor(() => {
      expect(secApi.fetchSecurityHardeningStatus).toHaveBeenCalled();
    });

    expect(screen.getByTestId('security-checklist')).toBeTruthy();

    const alertBtn = screen.getByTestId('test-alert-btn');
    fireEvent.click(alertBtn);

    await waitFor(() => {
      expect(secApi.sendSecurityAlertEvent).toHaveBeenCalledWith('IDOR_ATTEMPT', 'WARNING', '/api/v1/patients/pat-9999', expect.any(String));
    });

    expect(screen.getByTestId('security-status-msg').textContent).toContain('Alerta de segurança registrado no banco com sucesso');
  });
});
