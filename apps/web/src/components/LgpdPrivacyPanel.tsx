import React, { useState } from 'react';
import { exportLgpdPatientReport, fetchLgpdRetentionPolicies } from '../lib/security-api.js';

interface LgpdPrivacyPanelProps {
  patientId: string;
}

export const LgpdPrivacyPanel: React.FC<LgpdPrivacyPanelProps> = ({ patientId }) => {
  const [report, setReport] = useState<Record<string, unknown> | null>(null);
  const [policies, setPolicies] = useState<Array<{ id: string; entityType: string; retentionYears: number; description: string }>>([]);
  const [msg, setMsg] = useState('');

  const handleExportLgpd = async () => {
    try {
      const res = await exportLgpdPatientReport(patientId);
      setReport(res.data);
      setMsg(`Extrato de transparência LGPD gerado com sucesso! N° Relatório: ${res.data.reportId}`);
    } catch (err: unknown) {
      setMsg((err as Error).message);
    }
  };

  const handleLoadRetention = async () => {
    try {
      const res = await fetchLgpdRetentionPolicies();
      setPolicies(res.data);
    } catch (err: unknown) {
      setMsg((err as Error).message);
    }
  };

  return (
    <div data-testid="lgpd-privacy-panel">
      <h3>Painel de Privacidade, Transparência LGPD e Retenção (SEC-T-012..016)</h3>
      {msg && <p data-testid="lgpd-status-msg">{msg}</p>}

      <section>
        <h4>1. Direitos do Titular LGPD (Art. 18)</h4>
        <button type="button" onClick={handleExportLgpd} data-testid="export-lgpd-btn">
          Gerar Extrato de Transparência de Dados do Paciente
        </button>

        {report && (
          <div data-testid="lgpd-report-display" style={{ marginTop: '10px', background: '#f5f5f5', padding: '10px' }}>
            <p><strong>Titular:</strong> {(report.personalData as Record<string, string>).fullName}</p>
            <p><strong>CPF Mascarado:</strong> {(report.personalData as Record<string, string>).maskedCpf}</p>
            <p><strong>Base Legal:</strong> {report.legalBasis as string}</p>
            <p><strong>Integridade (Data Hash):</strong> {report.dataHash as string}</p>
          </div>
        )}
      </section>

      <section style={{ marginTop: '20px' }}>
        <h4>2. Políticas de Retenção Legal Assistencial (Lei 13.787/2018)</h4>
        <button type="button" onClick={handleLoadRetention} data-testid="load-retention-btn">
          Consultar Prazos de Retenção
        </button>

        {policies.length > 0 && (
          <ul data-testid="retention-policies-list">
            {policies.map((p) => (
              <li key={p.id}>
                <strong>{p.entityType}:</strong> Retenção por {p.retentionYears} anos — {p.description}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};
