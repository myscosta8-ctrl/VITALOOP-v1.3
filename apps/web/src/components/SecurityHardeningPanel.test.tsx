// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SecurityHardeningPanel } from './SecurityHardeningPanel.js';

const get = vi.fn();
const post = vi.fn();

const mockApi = { get, post };

vi.mock('../context/session-context.js', () => ({
  useSession: () => ({ api: mockApi }),
}));

describe('SecurityHardeningPanel Component Test (SEC-T-001..011)', () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
  });

  it('renderiza painel de segurança técnica, exibe checklist e registra alerta de auditoria', async () => {
    get.mockResolvedValue({
      idorProtection: true,
      privilegeEscalationProtection: true,
      rlsEnforcement: true,
      rbacEnforcement: true,
      sqliProtection: true,
      xssSanitizer: true,
      corsRestricted: true,
      securityHeaders: true,
      logsMasked: true,
    });
    post.mockResolvedValue({ id: 'evt-123', eventType: 'IDOR_ATTEMPT' });

    render(<SecurityHardeningPanel />);

    expect(screen.getByTestId('security-hardening-panel')).toBeTruthy();
    expect(screen.getByText('Painel de Segurança Técnica e Hardening (SEC-T-001..011)')).toBeTruthy();

    await waitFor(() => {
      expect(get).toHaveBeenCalledWith('/api/v1/security/hardening-status');
    });

    expect(screen.getByTestId('security-checklist')).toBeTruthy();

    const alertBtn = screen.getByTestId('test-alert-btn');
    fireEvent.click(alertBtn);

    await waitFor(() => {
      expect(post).toHaveBeenCalledWith('/api/v1/security/events', {
        eventType: 'IDOR_ATTEMPT',
        severity: 'WARNING',
        endpoint: '/api/v1/patients/pat-9999',
        payloadSummary: 'Tentativa não autorizada',
      });
    });

    expect(screen.getByTestId('security-status-msg').textContent).toContain('Alerta de segurança registrado no banco com sucesso');
  });
});
