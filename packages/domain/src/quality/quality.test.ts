import { describe, it, expect } from 'vitest';
import { assertNoConcurrentUpdateConflict } from './concurrency.js';
import { generateClinicalPrintPdf } from './pdf-generator.js';
import { validateComponentAccessibility } from './accessibility-checker.js';
import { validateMigrationsPipeline, validateRollbackSafety } from './rollback-validator.js';

describe('Domain Unit Tests — Qualidade, Concorrência, Impressão PDF & Acessibilidade (QLT-001..015)', () => {
  it('1. QLT-007 — Valida conflito de versão em atualizações concorrentes', () => {
    expect(() => assertNoConcurrentUpdateConflict({ currentVersion: 2, expectedVersion: 1 })).toThrow('Conflito de concorrência');
    expect(() => assertNoConcurrentUpdateConflict({ currentVersion: 2, expectedVersion: 2 })).not.toThrow();
  });

  it('2. QLT-014 — Gera leiaute de documento PDF assistencial com checksum', () => {
    const pdf = generateClinicalPrintPdf({
      documentId: 'doc-999',
      documentType: 'Atestado Médico',
      patientName: 'João da Silva',
      issuerName: 'Dr. Roberto',
      content: 'Atesto 3 dias de repouso.',
    });

    expect(pdf.pdfHeader).toContain('%PDF-1.7');
    expect(pdf.formattedText).toContain('Atesto 3 dias de repouso.');
    expect(pdf.footerChecksum).toBeTruthy();
  });

  it('3. QLT-015 — Valida acessibilidade ARIA e foco de componentes frontend', () => {
    const report = validateComponentAccessibility([
      { elementId: 'btn-1', hasAriaLabel: true, hasKeyboardFocus: true, contrastRatioPass: true },
      { elementId: 'btn-2', hasAriaLabel: true, hasKeyboardFocus: true, contrastRatioPass: true },
    ]);

    expect(report.isCompliant).toBe(true);
    expect(report.score).toBe(100);
  });

  it('4. PRD-007 / PRD-008 — Valida ordenação da pipeline de migrations e segurança do rollback', () => {
    const result = validateMigrationsPipeline(['0001_init.sql', '0002_schema.sql', '0003_rbac.sql']);
    expect(result.total).toBe(3);
    expect(result.isSequential).toBe(true);

    const rollback = validateRollbackSafety(43, 44);
    expect(rollback.canRollback).toBe(true);
    expect(rollback.requiresBackup).toBe(true);
  });
});
