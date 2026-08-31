import { describe, it, expect } from 'vitest';
import { buildLgpdPersonalDataReport } from './lgpd-exporter.js';
import { validateMedicalRecordRetention } from './retention-checker.js';

describe('Regras de Domínio de Direitos do Titular LGPD e Retenção (SEC-T-012..016)', () => {
  it('gera relatório/extrato de transparência de dados pessoais LGPD com CPF mascarado (SEC-T-012, SEC-T-014)', () => {
    const report = buildLgpdPersonalDataReport({
      id: 'pat-123456',
      fullName: 'Carlos Alberto de Souza',
      cpf: '123.456.789-00',
      cns: '700000000000001',
      birthDate: '1980-01-01',
      sex: 'male',
      encountersCount: 3,
    });

    expect(report.reportId).toContain('LGPD-EXT-REL-');
    expect(report.personalData.fullName).toBe('Carlos Alberto de Souza');
    expect(report.personalData.maskedCpf).toBe('123.***.***-00');
    expect(report.processingSummary.dataRetentionYears).toBe(20);
    expect(report.dataHash).toBeTruthy();
  });

  it('calcula o prazo de retenção legal assistencial de 20 anos para prontuários (SEC-T-015)', () => {
    const result = validateMedicalRecordRetention('2026-08-30T10:00:00Z');
    expect(result.isSubjectToRetention).toBe(true);
    expect(result.expiryYear).toBe(2046);
  });
});
