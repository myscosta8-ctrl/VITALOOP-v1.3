import React from 'react';
import type { EncounterOutcome, EncounterSummary, OutcomeType } from '../../../lib/outcomes-api.js';
import { MedicalSummaryView } from '../../../components/MedicalSummaryView.js';
import type { OutcomeForm } from '../hooks/useOutcome.js';

interface Props {
  outcome: EncounterOutcome | null;
  summary: EncounterSummary | null;
  form: OutcomeForm;
}

export const DesfechoTab: React.FC<Props> = ({ outcome, summary, form }) => {
  const {
    selectedOutcomeType, setSelectedOutcomeType,
    outcomeNotes, setOutcomeNotes,
    destinationUnit, setDestinationUnit,
    dischargeInstructions, setDischargeInstructions,
    causeMortisA, setCauseMortisA,
    causeMortisB, setCauseMortisB,
    causeMortisC, setCauseMortisC,
    causeMortisD, setCauseMortisD,
    deathManner, setDeathManner,
    declarantName, setDeclarantName,
    declarantDocument, setDeclarantDocument,
    submitting,
    handleCreateOutcome,
  } = form;

  return (
    <div style={{ marginTop: 20, borderTop: '3px solid #0f172a', paddingTop: 15, marginBottom: 20 }}>
      <h4 style={{ color: '#0f172a' }}>Encerramento do Atendimento & Sumário de Alta (OUT-001..014)</h4>

      {outcome ? (
        <div style={{ padding: 15, backgroundColor: '#f8fafc', border: '2px solid #0f172a', borderRadius: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <strong style={{ fontSize: 16, color: '#0f172a' }}>Atendimento Encerrado — Desfecho Assistencial</strong>
            <span style={{ padding: '4px 12px', borderRadius: 4, fontWeight: 'bold', backgroundColor: '#dcfce7', color: '#166534', fontSize: 13 }}>
              {outcome.outcomeType.toUpperCase()}
            </span>
          </div>
          {outcome.notes && <div style={{ fontSize: 13, color: '#475569', marginBottom: 10 }}><strong>Observações:</strong> {outcome.notes}</div>}
          {outcome.destinationUnit && <div style={{ fontSize: 13, color: '#475569', marginBottom: 10 }}><strong>Unidade de Destino:</strong> {outcome.destinationUnit}</div>}
          {outcome.deathCertificateData && (
            <div style={{ fontSize: 13, color: '#475569', marginBottom: 10 }}>
              <strong>Declaração de Óbito:</strong> Causa Mortis A: {outcome.deathCertificateData.causeMortisA}
              {outcome.deathCertificateData.causeMortisB && ` | B: ${outcome.deathCertificateData.causeMortisB}`}
              {outcome.deathCertificateData.causeMortisC && ` | C: ${outcome.deathCertificateData.causeMortisC}`}
              {outcome.deathCertificateData.causeMortisD && ` | D: ${outcome.deathCertificateData.causeMortisD}`}
              {' '}— Circunstância: {outcome.deathCertificateData.deathManner}
            </div>
          )}

          {summary && <MedicalSummaryView summary={summary} patientName="Paciente UPA" />}
        </div>
      ) : (
        <form onSubmit={handleCreateOutcome} style={{ backgroundColor: '#f1f5f9', padding: 15, borderRadius: 6, border: '1px solid #cbd5e1' }}>
          <h5 style={{ margin: '0 0 10px 0', color: '#0f172a' }}>Registrar Desfecho Assistencial</h5>

          <div style={{ marginBottom: 10 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 'bold', marginBottom: 4 }}>Tipo de Desfecho Assistencial *</label>
            <select
              value={selectedOutcomeType}
              onChange={(e) => setSelectedOutcomeType(e.target.value as OutcomeType)}
              style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
            >
              <option value="medical_discharge">Alta Médica com Orientações (Exige CID-10 Principal)</option>
              <option value="discharge_against_medical_advice">Alta a Pedido (Exige Justificativa em Notas)</option>
              <option value="administrative_discharge">Alta Administrativa</option>
              <option value="transfer">Transferência Externa Regulada (Exige Unidade de Destino)</option>
              <option value="admission_bed">Internação / Permanência em Leito UPA</option>
              <option value="evasion">Evasão / Saída Não Autorizada</option>
              <option value="death">Óbito (Exige Timestamp e Causa em Notas)</option>
            </select>
          </div>

          {selectedOutcomeType === 'transfer' && (
            <div style={{ marginBottom: 10 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold' }}>Unidade Hospitalar de Destino *</label>
              <input
                type="text"
                value={destinationUnit}
                onChange={(e) => setDestinationUnit(e.target.value)}
                placeholder="Ex: Hospital Regional de Referência / Santa Casa"
                style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
                required
              />
            </div>
          )}

          <div style={{ marginBottom: 10 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold' }}>Orientações Médicas de Alta / Prescrição Domiciliar</label>
            <textarea
              value={dischargeInstructions}
              onChange={(e) => setDischargeInstructions(e.target.value)}
              rows={2}
              placeholder="Orientações de cuidados, sinais de alarme, receitas..."
              style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
            />
          </div>

          {selectedOutcomeType === 'death' && (
            <div style={{ marginBottom: 15, padding: 12, backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6 }}>
              <h5 style={{ margin: '0 0 8px 0', color: '#7f1d1d' }}>Declaração de Óbito — Causa Mortis (Bloco V)</h5>
              <div style={{ marginBottom: 8 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold' }}>Causa Mortis A — Causa Terminal *</label>
                <input
                  type="text"
                  value={causeMortisA}
                  onChange={(e) => setCauseMortisA(e.target.value)}
                  placeholder="Causa imediata da morte"
                  style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
                  required
                />
              </div>
              <div style={{ marginBottom: 8 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold' }}>Causa Mortis B (antecedente)</label>
                <input
                  type="text"
                  value={causeMortisB}
                  onChange={(e) => setCauseMortisB(e.target.value)}
                  style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
                />
              </div>
              <div style={{ marginBottom: 8 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold' }}>Causa Mortis C (antecedente)</label>
                <input
                  type="text"
                  value={causeMortisC}
                  onChange={(e) => setCauseMortisC(e.target.value)}
                  style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
                />
              </div>
              <div style={{ marginBottom: 8 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold' }}>Causa Mortis D (causa básica)</label>
                <input
                  type="text"
                  value={causeMortisD}
                  onChange={(e) => setCauseMortisD(e.target.value)}
                  style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
                />
              </div>
              <div style={{ marginBottom: 8 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold' }}>Circunstância do Óbito *</label>
                <select
                  value={deathManner}
                  onChange={(e) => setDeathManner(e.target.value as typeof deathManner)}
                  style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
                >
                  <option value="natural">Natural</option>
                  <option value="violent">Violento (causa externa)</option>
                  <option value="undetermined">Indeterminado</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold' }}>Nome do Declarante</label>
                  <input
                    type="text"
                    value={declarantName}
                    onChange={(e) => setDeclarantName(e.target.value)}
                    style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold' }}>Documento do Declarante</label>
                  <input
                    type="text"
                    value={declarantDocument}
                    onChange={(e) => setDeclarantDocument(e.target.value)}
                    style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
                  />
                </div>
              </div>
            </div>
          )}

          <div style={{ marginBottom: 15 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 'bold' }}>Observações / Motivo / Justificativa *</label>
            <textarea
              value={outcomeNotes}
              onChange={(e) => setOutcomeNotes(e.target.value)}
              rows={2}
              placeholder="Observações do desfecho assistencial..."
              style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{ padding: '10px 20px', backgroundColor: '#0f172a', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold', fontSize: 14 }}
          >
            Concluir Atendimento e Emitir Sumário de Alta
          </button>
        </form>
      )}
    </div>
  );
};
