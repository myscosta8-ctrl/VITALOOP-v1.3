import React from 'react';
import type { BedData } from '../../../lib/bed-api.js';
import type { Admission, AdmissionStatus } from '../../../lib/admission-api.js';
import type { AdmissionForm } from '../hooks/useAdmission.js';

interface Props {
  bedInfo: BedData | null;
  admission: Admission | null;
  form: AdmissionForm;
}

const DISCHARGE_STATUS_LABEL: Record<Extract<AdmissionStatus, 'discharged' | 'transferred_out' | 'deceased'>, string> = {
  discharged: 'Alta hospitalar',
  transferred_out: 'Transferência para outra unidade',
  deceased: 'Óbito',
};

export const InternacaoTab: React.FC<Props> = ({ bedInfo, admission, form }) => {
  const {
    diagnosisCode, setDiagnosisCode,
    diagnosisDescription, setDiagnosisDescription,
    justification, setJustification,
    evolutionJustification, setEvolutionJustification,
    dischargeStatus, setDischargeStatus,
    dischargeReason, setDischargeReason,
    submitting,
    handleAdmit,
    handleEvolve,
    handleDischarge,
  } = form;

  const isActiveAdmission = admission?.status === 'active';

  return (
    <div style={{ marginTop: 20 }}>
      <h4 style={{ color: '#0f172a' }}>Internação (ADM-001..008)</h4>

      {bedInfo && (
        <div style={{ padding: 15, backgroundColor: '#f8fafc', borderRadius: 6, border: '1px solid #cbd5e1', marginBottom: 15 }}>
          <p><strong>Setor:</strong> {bedInfo.sectorName ?? '—'}</p>
          <p><strong>Leito:</strong> {bedInfo.bedNumber} {bedInfo.isIsolation && '(Isolamento)'}</p>
          {bedInfo.allocatedAt && (
            <p><strong>Alocado em:</strong> {new Date(bedInfo.allocatedAt).toLocaleString('pt-BR')}</p>
          )}
          {bedInfo.stayHours !== undefined && (
            <p>
              <strong>Permanência:</strong> {bedInfo.stayHours}h{' '}
              {bedInfo.is24hLimitExceeded && '⚠️ Estouro de 24h!'}
            </p>
          )}
          <a href="#/leitos" className="vl-btn vl-btn-ghost vl-btn-sm">
            Ver Mapa de Leitos
          </a>
        </div>
      )}

      {isActiveAdmission && admission ? (
        <div style={{ padding: 15, backgroundColor: '#fefce8', border: '2px solid #ca8a04', borderRadius: 8, marginBottom: 15 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <strong style={{ fontSize: 16, color: '#0f172a' }}>Paciente Internado</strong>
            <span style={{ padding: '4px 12px', borderRadius: 4, fontWeight: 'bold', backgroundColor: '#fef08a', color: '#713f12', fontSize: 13 }}>
              ATIVA
            </span>
          </div>
          <p><strong>Diagnóstico de admissão:</strong> {admission.admissionDiagnosisDescription}{admission.admissionDiagnosisCode ? ` (${admission.admissionDiagnosisCode})` : ''}</p>
          <p><strong>Justificativa:</strong> {admission.admissionJustification}</p>
          <p><strong>Internado desde:</strong> {new Date(admission.admittedAt).toLocaleString('pt-BR')}</p>

          <form onSubmit={handleEvolve} style={{ marginTop: 15, borderTop: '1px solid #ca8a04', paddingTop: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold', marginBottom: 4 }}>Evolução da Internação</label>
            <textarea
              value={evolutionJustification}
              onChange={(e) => setEvolutionJustification(e.target.value)}
              rows={2}
              placeholder="Nova justificativa/evolução clínica do quadro de internação..."
              style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc', marginBottom: 8 }}
            />
            <button
              type="submit"
              disabled={submitting || evolutionJustification.trim().length < 10}
              style={{ padding: '8px 16px', backgroundColor: '#ca8a04', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold', fontSize: 13 }}
            >
              Registrar Evolução
            </button>
          </form>

          <form onSubmit={handleDischarge} style={{ marginTop: 15, borderTop: '1px solid #ca8a04', paddingTop: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold', marginBottom: 4 }}>Encerrar Internação</label>
            <select
              value={dischargeStatus}
              onChange={(e) => setDischargeStatus(e.target.value as typeof dischargeStatus)}
              style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc', marginBottom: 8 }}
            >
              {(Object.keys(DISCHARGE_STATUS_LABEL) as Array<keyof typeof DISCHARGE_STATUS_LABEL>).map((key) => (
                <option key={key} value={key}>{DISCHARGE_STATUS_LABEL[key]}</option>
              ))}
            </select>
            {dischargeStatus === 'deceased' && (
              <textarea
                value={dischargeReason}
                onChange={(e) => setDischargeReason(e.target.value)}
                rows={2}
                placeholder="Causa/circunstância do óbito (obrigatório)..."
                style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc', marginBottom: 8 }}
              />
            )}
            <button
              type="submit"
              disabled={submitting}
              style={{ padding: '8px 16px', backgroundColor: '#b91c1c', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold', fontSize: 13 }}
            >
              Encerrar Internação
            </button>
            <p style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>
              Isso encerra o registro de internação. Pra concluir o atendimento (status "Concluído"),
              registre o desfecho na aba "Desfecho" em seguida.
            </p>
          </form>
        </div>
      ) : bedInfo ? (
        <form onSubmit={handleAdmit} style={{ backgroundColor: '#f1f5f9', padding: 15, borderRadius: 6, border: '1px solid #cbd5e1' }}>
          <h5 style={{ margin: '0 0 10px 0', color: '#0f172a' }}>Internar Paciente</h5>

          <div style={{ marginBottom: 10 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold' }}>Código CID-10 (opcional)</label>
            <input
              type="text"
              value={diagnosisCode}
              onChange={(e) => setDiagnosisCode(e.target.value)}
              placeholder="Ex: J18.9"
              style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
            />
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold' }}>Diagnóstico de Admissão *</label>
            <input
              type="text"
              value={diagnosisDescription}
              onChange={(e) => setDiagnosisDescription(e.target.value)}
              placeholder="Ex: Pneumonia bacteriana grave"
              required
              style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
            />
          </div>

          <div style={{ marginBottom: 15 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold' }}>Justificativa Clínica de Internação *</label>
            <textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              rows={2}
              placeholder="Motivo clínico pelo qual o paciente precisa permanecer internado..."
              required
              style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
            />
          </div>

          <button
            type="submit"
            disabled={submitting || diagnosisDescription.trim().length < 3 || justification.trim().length < 10}
            style={{ padding: '10px 20px', backgroundColor: '#0f172a', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold', fontSize: 14 }}
          >
            Internar Paciente
          </button>
        </form>
      ) : (
        <p style={{ color: '#64748b' }}>
          Nenhum leito alocado para este atendimento. Aloque um leito no{' '}
          <a href="#/leitos">Mapa de Leitos</a> antes de internar — a internação exige leito ativo
          (regra aplicada também no banco).
        </p>
      )}
    </div>
  );
};
