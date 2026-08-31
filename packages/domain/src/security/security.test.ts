import { describe, it, expect } from 'vitest';
import { escapeHtml, detectSqlInjectionPattern, validateOwnershipIdor } from './security-sanitizer.js';
import { maskSensitiveLogData } from './log-masker.js';

describe('Regras de Domínio de Segurança Técnica (SEC-T-001..011)', () => {
  it('escapa caracteres especiais HTML para prevenir ataques XSS (SEC-T-006)', () => {
    const rawInput = `<script>alert("XSS")</script>`;
    const escaped = escapeHtml(rawInput);
    expect(escaped).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');
  });

  it('detecta padrões suspeitos de SQL Injection em entradas de dados (SEC-T-005)', () => {
    expect(detectSqlInjectionPattern("1' OR '1'='1")).toBe(true);
    expect(detectSqlInjectionPattern('UNION SELECT username, password FROM app.users')).toBe(true);
    expect(detectSqlInjectionPattern('DROP TABLE app.patients;--')).toBe(true);
    expect(detectSqlInjectionPattern('João da Silva')).toBe(false);
  });

  it('valida autorização IDOR baseada em escopo de recursos (SEC-T-001)', () => {
    expect(() => {
      validateOwnershipIdor('pat-123', ['pat-123', 'pat-456']);
    }).not.toThrow();

    expect(() => {
      validateOwnershipIdor('pat-999', ['pat-123', 'pat-456']);
    }).toThrow('Acesso negado: você não possui permissão para acessar o recurso especificado.');
  });

  it('mascara credenciais e dados sensíveis em logs operacionais (SEC-T-010, SEC-T-011)', () => {
    const payload = {
      username: 'dr_medico',
      password: 'SuperSecretPassword123!',
      authorization: 'Bearer token-xyz',
      patientCpf: '123.456.789-00',
    };

    const masked = maskSensitiveLogData(payload);
    expect(masked.password).toBe('[REDACTED_SECRET]');
    expect(masked.authorization).toBe('[REDACTED_SECRET]');
    expect(masked.patientCpf).toBe('123.***.***-00');
    expect(masked.username).toBe('dr_medico');
  });
});
