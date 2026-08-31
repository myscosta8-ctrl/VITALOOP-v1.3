import { describe, it, expect } from 'vitest';
import {
  buildStructuredJsonLog,
  sanitizeLogData,
  validateCorrelationId,
  computeMetricHealth,
  validateEnvironmentalDr,
} from './observability.js';

describe('Regras de Domínio — Observabilidade, Métricas, Logs & Correlation ID (PRD-011..020)', () => {
  it('1. PRD-017 — Constrói log estruturado JSON com sanitização de CPF e secrets', () => {
    const rawContext = {
      userCpf: '12345678901',
      userToken: 'Bearer secret-jwt-token-xyz',
      nested: { password: 'mySecretPassword123' },
    };

    const sanitized = sanitizeLogData(rawContext);
    expect(sanitized.userCpf).toBe('123.***.***-01');

    const logString = buildStructuredJsonLog({
      level: 'info',
      message: 'Operação de teste',
      correlationId: 'req-abc-123',
      context: rawContext,
    });

    const parsed = JSON.parse(logString);
    expect(parsed.level).toBe('info');
    expect(parsed.correlationId).toBe('req-abc-123');
    expect(parsed.userCpf).toBe('123.***.***-01');
    expect(parsed.userToken).toBe('[REDACTED_SECRET]');
    expect(parsed.nested.password).toBe('[REDACTED_SECRET]');
  });

  it('2. PRD-018 — Propaga e valida Correlation ID (x-request-id)', () => {
    expect(validateCorrelationId('  custom-req-777  ')).toBe('custom-req-777');
    expect(validateCorrelationId(undefined)).toContain('req-');
  });

  it('3. PRD-015 / PRD-016 / PRD-019 — Calcula telemetria de saúde e métricas de sistema', () => {
    const metrics = [
      { name: 'http_request_duration_ms', value: 120, timestamp: new Date().toISOString() },
      { name: 'http_request_duration_ms', value: 180, timestamp: new Date().toISOString() },
      { name: 'error_count', value: 2, timestamp: new Date().toISOString() },
    ];

    const health = computeMetricHealth(metrics);
    expect(health.isHealthy).toBe(true);
    expect(health.avgLatencyMs).toBe(150);
    expect(health.availabilityPercent).toBe(99.9);
  });

  it('4. PRD-011..014 / PRD-020 — Valida integridade do Disaster Recovery ambiental e retenção', () => {
    const dr = validateEnvironmentalDr();
    expect(dr.offsiteBackup).toBe(true);
    expect(dr.encryptionAtRest).toBe(true);
    expect(dr.rpoMinutes).toBe(15);
    expect(dr.rtoMinutes).toBe(60);
  });
});
