import React from 'react';
import type { EncounterSummary } from '../lib/outcomes-api.js';

interface Props {
  summary: EncounterSummary;
  patientName?: string;
}

export const MedicalSummaryView: React.FC<Props> = ({ summary, patientName }) => {
  return (
    <div
      style={{
        padding: 20,
        backgroundColor: '#fff',
        border: '2px solid #0f172a',
        borderRadius: 8,
        fontFamily: 'sans-serif',
        maxWidth: 800,
        margin: '15px 0',
      }}
    >
      <div style={{ textAlign: 'center', borderBottom: '2px solid #0f172a', paddingBottom: 10, marginBottom: 15 }}>
        <h3 style={{ margin: 0, color: '#0f172a' }}>UNIDADE DE PRONTO ATENDIMENTO — UPA 24H</h3>
        <h4 style={{ margin: '5px 0 0 0', color: '#2563eb' }}>SUMÁRIO DE ALTA ASSISTENCIAL E ORIENTAÇÕES</h4>
        <span style={{ fontSize: 12, color: '#64748b' }}>Emitido em: {new Date(summary.issuedAt).toLocaleString()}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13, marginBottom: 15, backgroundColor: '#f8fafc', padding: 10, borderRadius: 4 }}>
        <div><strong>Paciente:</strong> {patientName || 'Paciente UPA'}</div>
        <div><strong>Atendimento #:</strong> {summary.encounterId.substring(0, 8)}</div>
        <div><strong>Médico Responsável #:</strong> {summary.doctorId.substring(0, 8)}</div>
        <div><strong>Desfecho #:</strong> {summary.outcomeId.substring(0, 8)}</div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <strong style={{ fontSize: 13, color: '#0f172a' }}>Queixa Principal de Admissão:</strong>
        <div style={{ fontSize: 13, color: '#334155', marginTop: 2 }}>{summary.chiefComplaint || 'Não informada'}</div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <strong style={{ fontSize: 13, color: '#991b1b' }}>Diagnóstico Principal (CID-10):</strong>
        <div style={{ fontSize: 14, fontWeight: 'bold', color: '#991b1b', marginTop: 2 }}>
          {summary.primaryDiagnosisCode ? `[${summary.primaryDiagnosisCode}] ${summary.primaryDiagnosisDescription || ''}` : 'Alta sem CID específico registrado'}
        </div>
      </div>

      {summary.summaryNotes && (
        <div style={{ marginBottom: 12 }}>
          <strong style={{ fontSize: 13, color: '#0f172a' }}>Resumo Clínico / Observações:</strong>
          <div style={{ fontSize: 13, color: '#334155', marginTop: 2 }}>{summary.summaryNotes}</div>
        </div>
      )}

      {summary.dischargeInstructions && (
        <div style={{ marginBottom: 15, padding: 10, backgroundColor: '#f0fdf4', border: '1px solid #16a34a', borderRadius: 4 }}>
          <strong style={{ fontSize: 13, color: '#15803d' }}>Orientações Médicas de Alta:</strong>
          <div style={{ fontSize: 13, color: '#14532d', marginTop: 2 }}>{summary.dischargeInstructions}</div>
        </div>
      )}

      <div style={{ marginTop: 25, borderTop: '1px dashed #cbd5e1', paddingTop: 15, textAlign: 'center', fontSize: 12, color: '#64748b' }}>
        Documento Assistencial Eletrônico Autenticado pelo Sistema VITALOOP v1.3 — UPA 24h
      </div>
    </div>
  );
};
