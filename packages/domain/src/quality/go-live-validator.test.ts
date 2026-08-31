import { describe, it, expect } from 'vitest';
import { runGoLiveRealValidation } from './go-live-validator.js';

describe('Go-Live Real Validation Runner — Unit Tests', () => {
  it('1. Retorna CONDITIONAL quando não há falhas técnicas mas serviços externos estão ausentes (BLOCKED)', () => {
    const report = runGoLiveRealValidation({
      databaseConnected: true,
      dockerAvailable: false,
      rndsCredentialsAvailable: false,
      sisregCredentialsAvailable: false,
      pacsServerAvailable: false,
    });

    expect(report.gateResult).toBe('CONDITIONAL');
    expect(report.summary.fail).toBe(0);
    expect(report.summary.blocked).toBeGreaterThan(0);
    const rndsComp = report.components.find((c) => c.component === 'Integração RNDS / DATASUS');
    expect(rndsComp?.status).toBe('BLOCKED');
  });

  it('2. Retorna FAIL quando há privilégio indevido de superuser na conexão com o banco', () => {
    const report = runGoLiveRealValidation({
      databaseConnected: true,
      isSuperuser: true,
      hasBypassRls: true,
    });

    expect(report.gateResult).toBe('FAIL');
    expect(report.summary.fail).toBe(1);
  });

  it('3. Retorna PASS quando todas as infraestruturas e credenciais externas estão disponíveis', () => {
    const report = runGoLiveRealValidation({
      databaseConnected: true,
      dockerAvailable: true,
      rndsCredentialsAvailable: true,
      sisregCredentialsAvailable: true,
      pacsServerAvailable: true,
    });

    expect(report.gateResult).toBe('PASS');
    expect(report.summary.fail).toBe(0);
    expect(report.summary.blocked).toBe(0);
  });
});
